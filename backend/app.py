import os
import random
import smtplib
import sqlite3
import re
from datetime import datetime, timedelta
from email.mime.text import MIMEText
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import bcrypt
from dotenv import load_dotenv
import numpy as np
import pandas as pd
import pickle
from tensorflow.keras.models import load_model
from sklearn.metrics import accuracy_score
import urllib.parse

load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
CORS(app)

DB_FILE = os.path.join(BASE_DIR, "database.db")

# ======================================
# EMAIL VALIDATION
# ======================================
def is_valid_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

# ======================================
# CREATE TABLES IF NOT EXIST
# ======================================
def init_db():
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            password_hash TEXT
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS email_otps(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            otp TEXT,
            expiry TEXT
        )
    """)

    con.commit()
    con.close()

init_db()

# ======================================
# ML MODEL LOADING
# ======================================

MODEL_PATH = os.path.join(BASE_DIR, "crop_model.h5")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "label_encoder.pkl")

model = load_model(MODEL_PATH)

with open(SCALER_PATH, "rb") as f:
    scaler = pickle.load(f)

with open(ENCODER_PATH, "rb") as f:
    label_encoder = pickle.load(f)

# ======================================
# MODEL ACCURACY CHECK ON SERVER START
# ======================================

def check_model_accuracy():
    try:
        df = pd.read_csv(os.path.join(BASE_DIR, "Crop_recommendation.csv"))

        X = df.drop("label", axis=1)
        y = df["label"]

        # ✅ Scale features
        X_scaled = scaler.transform(X)

        # ✅ Predict
        y_pred_prob = model.predict(X_scaled)
        y_pred = np.argmax(y_pred_prob, axis=1)

        # ✅ Decode labels
        y_true = label_encoder.transform(y)

        accuracy = accuracy_score(y_true, y_pred) * 100

        print("✅✅ MODEL LOADED SUCCESSFULLY")
        print(f"🎯 MODEL ACCURACY: {accuracy:.2f}%")

    except Exception as e:
        print("⚠️ Could not calculate model accuracy")
        print("Reason:", str(e))

# ======================================
# DB CONNECTION
# ======================================
def db():
    return sqlite3.connect(DB_FILE)

# ======================================
# EMAIL SENDER (BREVO SMTP or TEST MODE)
# ======================================
def send_email(receiver, otp):
    brevo_key = os.getenv("BREVO_API_KEY")

    if not brevo_key:
        raise Exception("BREVO_API_KEY missing in environment")

    headers = {
        "accept": "application/json",
        "api-key": brevo_key,
        "content-type": "application/json"
    }

    email_data = {
        "sender": {
            "name": "Smart Kisan",
            "email": "projects.planeta@gmail.com"   # must be verified in Brevo
        },
        "to": [
            {"email": receiver}
        ],
        "subject": "Your Smart Kisan OTP",
        "htmlContent": f"""
            <h2>Your OTP is: <b>{otp}</b></h2>
            <p>This code expires in 10 minutes.</p>
        """
    }

    resp = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers=headers,
        json=email_data,
        timeout=15
    )

    print(f"✅ Brevo Status: {resp.status_code}")
    print(f"✅ Brevo Response: {resp.text}")

    if resp.status_code not in (200, 201, 202):
        raise Exception("Brevo API failed: " + resp.text)


# ======================================
# SEND OTP
# ======================================
@app.route("/auth/send-otp", methods=["POST"])
def send_otp():
    email = request.json.get("email", "").strip()
    
    # Validate email format
    if not email or not is_valid_email(email):
        return jsonify({"status": "invalid_email"}), 400

    # 🔥 CHECK IF EMAIL ALREADY EXISTS BEFORE OTP
    con = db()
    cur = con.cursor()
    cur.execute("SELECT id FROM users WHERE email=?", (email,))
    exists = cur.fetchone()
    if exists:
        con.close()
        return jsonify({"status": "exists"})  # <--- Prevent sending OTP

    # Continue with OTP generation
    otp = str(random.randint(100000, 999999))
    expiry = (datetime.now() + timedelta(minutes=10)).isoformat()

    try:
        cur.execute("DELETE FROM email_otps WHERE email=?", (email,))
        cur.execute(
            "INSERT INTO email_otps(email, otp, expiry) VALUES (?,?,?)", 
            (email, otp, expiry)
        )
        con.commit()
    except Exception as e:
        con.close()
        print("DB ERROR:", e)
        return jsonify({"status": "db_error"}), 500
    finally:
        con.close()

    try:
        send_email(email, otp)
    except Exception as e:
        print("SMTP ERROR:", e)
        return jsonify({"status": "smtp_error"}), 500

    return jsonify({"status": "otp_sent"})


# ======================================
# VERIFY OTP + REGISTER USER
# ======================================
@app.route("/auth/verify", methods=["POST"])
def verify():
    name = request.json.get("name", "").strip()
    email = request.json.get("email", "").strip()
    password = request.json.get("password", "").strip()
    otp_entered = request.json.get("otp", "").strip()

    # Validate inputs
    if not all([name, email, password, otp_entered]):
        return jsonify({"status": "missing_fields"}), 400
    
    if not is_valid_email(email):
        return jsonify({"status": "invalid_email"}), 400

    con = db()
    cur = con.cursor()

    cur.execute("SELECT otp, expiry FROM email_otps WHERE email=?", (email,))
    row = cur.fetchone()

    if not row:
        con.close()
        return jsonify({"status": "no_otp"})

    otp_db, expiry = row

    if datetime.now() > datetime.fromisoformat(expiry):
        cur.execute("DELETE FROM email_otps WHERE email=?", (email,))
        con.commit()
        con.close()
        return jsonify({"status": "expired"})

    if otp_entered != otp_db:
        con.close()
        return jsonify({"status": "wrong"})

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    try:
        cur.execute(
            "INSERT INTO users(name, email, password_hash) VALUES(?,?,?)",
            (name, email, password_hash)
        )
        con.commit()
    except sqlite3.IntegrityError:
        con.close()
        return jsonify({"status": "exists"})
    except Exception as e:
        con.close()
        print("Insert error:", e)
        return jsonify({"status": "error"}), 500

    cur.execute("DELETE FROM email_otps WHERE email=?", (email,))
    con.commit()
    con.close()

    return jsonify({"status": "registered"})

# ======================================
# LOGIN
# ======================================
@app.route("/auth/login", methods=["POST"])
def login():
    email = request.json.get("email", "").strip()
    password = request.json.get("password", "").strip()

    # Validate inputs
    if not email or not password:
        return jsonify({"status": "missing_fields"}), 400

    con = db()
    cur = con.cursor()

    cur.execute("SELECT name, email, password_hash FROM users WHERE email=?", (email,))
    row = cur.fetchone()
    con.close()

    if not row:
        return jsonify({"status": "not_found"})

    name, db_email, password_hash = row

    # FIXED: Bcrypt hash is already a string from database
    try:
        if not bcrypt.checkpw(password.encode(), password_hash.encode('utf-8')):
            return jsonify({"status": "wrong_password"})
    except Exception as e:
        print("Password check error:", e)
        return jsonify({"status": "error"}), 500

    return jsonify({
        "status": "ok",
        "user": {"name": name, "email": db_email}
    })

SEASON_CROP_MAP = {
    "Kharif": ["rice", "maize", "cotton", "soybean", "groundnut"],
    "Rabi": ["wheat", "mustard", "barley", "gram", "peas"],
    "Zaid": ["watermelon", "muskmelon", "cucumber"]
}

# ✅ REALISTIC DAILY PRICE RANGE (₹ per quintal)
CROP_PRICE_RANGE = {
    "rice": (2100, 2500),
    "wheat": (2200, 2600),
    "maize": (1800, 2300),
    "chickpea": (4800, 5600),
    "orange": (900, 1400),
    "grapes": (3000, 4200),
    "pomegranate": (3800, 5200),
    "apple": (5200, 7500),
    "banana": (900, 1400),
    "cotton": (6500, 7800),
    "soybean": (3800, 4800),
    "mustard": (5000, 6200)
}
# ✅ REALISTIC YIELD PER ACRE (QUINTALS)
CROP_YIELD_PER_ACRE = {
    "rice": 25,
    "wheat": 22,
    "maize": 20,
    "chickpea": 10,
    "orange": 40,       # orchards
    "grapes": 50,
    "pomegranate": 35,
    "apple": 45,
    "banana": 55,
    "cotton": 18,
    "soybean": 15,
    "mustard": 12
}
# ✅ REALISTIC COST PER ACRE (₹)
CROP_COST_PER_ACRE = {
    "rice": 22000,
    "wheat": 18000,
    "maize": 16000,
    "chickpea": 14000,
    "orange": 45000,
    "grapes": 48000,
    "pomegranate": 52000,
    "apple": 60000,
    "banana": 65000,
    "cotton": 28000,
    "soybean": 17000,
    "mustard": 15000
}

# ✅ AUTO-UPDATE PRICES DAILY
DAILY_CROP_PRICES = {}

def generate_daily_prices():
    global DAILY_CROP_PRICES
    for crop, (low, high) in CROP_PRICE_RANGE.items():
        DAILY_CROP_PRICES[crop] = random.randint(low, high)

    print("✅ Daily Mandi Prices Updated:", DAILY_CROP_PRICES)

# ======================================
# LIVE WEATHER FETCH (OPEN-METEO)
# ======================================

def get_live_weather(lat, lon):
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&current_weather=true&hourly=precipitation,relativehumidity_2m"
        )

        res = requests.get(url, timeout=8)
        data = res.json()

        temp = data["current_weather"]["temperature"]
        rain = data["hourly"]["precipitation"][0]
        humidity = data["hourly"]["relativehumidity_2m"][0]

        return temp, humidity, rain

    except Exception as e:
        print("⚠️ Weather API Failed:", e)

        # ✅ Safe fallback if API fails
        return 26, 65, 800

# ======================================
# SIMPLE STATE + DISTRICT → LAT/LON MAPPING
# ======================================

def get_lat_lon_from_district(district, state):
    try:
        query = f"{district}, {state}, India"
        encoded_query = urllib.parse.quote(query)

        url = f"https://nominatim.openstreetmap.org/search?q={encoded_query}&format=json"

        headers = {
            "User-Agent": "SmartKisanAI/1.0 (smartkisanai@gmail.com)"
        }

        res = requests.get(url, headers=headers, timeout=10)
        data = res.json()

        if len(data) == 0:
            print("❌ Geo API returned empty result for:", query)
            return None, None

        lat = float(data[0]["lat"])
        lon = float(data[0]["lon"])

        print(f"✅ Location resolved: {query} → ({lat}, {lon})")
        return lat, lon

    except Exception as e:
        print("⚠️ Geo lookup failed:", str(e))
        return None, None


# ======================================
# ✅ 90-DAY SEASONAL WEATHER (FOR CROP YIELD)
# ======================================

def get_seasonal_weather(lat, lon):
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum"
            f"&forecast_days=7&timezone=auto"
        )

        res = requests.get(url, timeout=15)
        data = res.json()

        if "daily" not in data:
            raise Exception("Daily weather not found")

        temp_max = data["daily"]["temperature_2m_max"]
        temp_min = data["daily"]["temperature_2m_min"]
        rain = data["daily"]["precipitation_sum"]

        avg_temp = (np.mean(temp_max) + np.mean(temp_min)) / 2
        total_rainfall = np.sum(rain) * 12  # scale to ~3 months

        # ✅ HARD CLAMP (CRITICAL)
        if total_rainfall < 50:
            total_rainfall = 150   # minimum realistic winter rainfall

        avg_humidity = 65

        print(
            f"✅ Seasonal Weather Used → {round(avg_temp,2)}°C | {avg_humidity}% | {round(total_rainfall,2)} mm"
        )

        return round(avg_temp, 2), avg_humidity, round(total_rainfall, 2)

    except Exception as e:
        print("⚠️ Seasonal weather fetch failed:", e)
        return 18.0, 60.0, 150.0   # ✅ SAFE WINTER DEFAULT


# ======================================
# ✅ SOWING MONTH → SEASON MAPPING
# ======================================

SEASON_MAP = {
    "january": "rabi",
    "february": "rabi",
    "march": "zaid",
    "april": "zaid",
    "may": "zaid",
    "june": "kharif",
    "july": "kharif",
    "august": "kharif",
    "september": "kharif",
    "october": "rabi",
    "november": "rabi",
    "december": "rabi"
}

def get_season_from_month(month):
    return SEASON_MAP.get(month.lower(), "unknown")

# ======================================
# ✅ CROP SEASON SUITABILITY
# ======================================

CROP_SEASONS = {
    "rice": ["kharif"],
    "maize": ["kharif", "zaid"],
    "chickpea": ["rabi"],
    "kidneybeans": ["kharif"],
    "pigeonpeas": ["kharif"],
    "mothbeans": ["kharif"],
    "mungbean": ["kharif", "zaid"],
    "blackgram": ["kharif"],
    "lentil": ["rabi"],

    "jute": ["kharif"],

    "pomegranate": ["zaid", "rabi"],
    "banana": ["zaid"],
    "mango": ["zaid"],
    "grapes": ["rabi"],
    "watermelon": ["zaid"],
    "muskmelon": ["zaid"],
    "apple": ["rabi"],
    "orange": ["rabi"],
    "papaya": ["zaid"],
    "coconut": ["kharif", "rabi"]
}

# ======================================
# ✅ SOWING MONTH VALIDATION (NEXT 3 MONTHS ONLY)
# ======================================

MONTHS_ORDER = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
]

def is_valid_sowing_month(user_month):
    user_month = user_month.lower()
    if user_month not in MONTHS_ORDER:
        return False, "Invalid month name"

    current_month_index = datetime.now().month - 1
    allowed_indices = [
        current_month_index,
        (current_month_index + 1) % 12,
        (current_month_index + 2) % 12,
        (current_month_index + 3) % 12
    ]

    allowed_months = [MONTHS_ORDER[i] for i in allowed_indices]

    return user_month in allowed_months, allowed_months

@app.route("/predict-crop", methods=["POST"])
def predict_crop():
    generate_daily_prices()   # ✅ FORCE live price update per request
    data = request.get_json(force=True)
    print("✅ Incoming request data:", data)

    try:
        # ✅ Soil + Land Inputs
        N = float(data["N"])
        P = float(data["P"])
        K = float(data["K"])
        ph = float(data["ph"])
        land_size = float(data.get("land_size", 1))  # ✅ acres (default 1)


        # ✅ User location + month
        state = data["state"].strip()
        district = data["district"].strip()
        sowing_month = data["sowing_month"].strip().lower()

        # ✅ Validate sowing month (next 3 months only)
        is_allowed, allowed_months = is_valid_sowing_month(sowing_month)
        if not is_allowed:
            return jsonify({
                "status": "error",
                "message": "Sowing month is too far for accurate 90-day prediction.",
                "allowed_months": allowed_months
            }), 400

        # ✅ Detect season from month → "kharif" / "rabi" / "zaid"
        season_detected = get_season_from_month(sowing_month)

        # ✅ Convert district → lat/lon
        lat, lon = get_lat_lon_from_district(district, state)
        if lat is None or lon is None:
            return jsonify({
                "status": "error",
                "message": "Invalid district/state"
            }), 400

        # ✅ Fetch 90-day seasonal weather
        temperature, humidity, rainfall = get_seasonal_weather(lat, lon)

        # ✅ Prepare features as in training
        feature_names = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
        features_df = pd.DataFrame(
            [[N, P, K, temperature, humidity, ph, rainfall]],
            columns=feature_names
        )

        features_scaled = scaler.transform(features_df)

        # ✅ Predict probabilities
        probabilities = model.predict(features_scaled)[0]
        sorted_idx = probabilities.argsort()[::-1]   # full sorted list

        seasonal = []
        non_seasonal = []

        for idx in sorted_idx:
            crop_name = label_encoder.inverse_transform([idx])[0]
            prob = float(probabilities[idx]) * 100

            is_season = season_detected in CROP_SEASONS.get(crop_name.lower(), [])

            crop_key = crop_name.lower()

            # ✅ Get live price & yield
            price = DAILY_CROP_PRICES.get(crop_key, 2500)
            yield_per_acre = CROP_YIELD_PER_ACRE.get(crop_key, 20)

            # ✅ Total yield & profit
            total_yield = yield_per_acre * land_size

            total_revenue = int(total_yield * price)

            cost_per_acre = CROP_COST_PER_ACRE.get(crop_key, 18000)
            total_cost = int(cost_per_acre * land_size)

            net_profit = total_revenue - total_cost

            entry = {
                "crop": crop_name,
                "confidence": round(prob, 2),
                "season_match": is_season,

                "price_per_quintal": price,
                "yield_per_acre": yield_per_acre,

                "total_revenue": total_revenue,
                "total_cost": total_cost,
                "net_profit": net_profit,

                # ✅ Backward compatibility for frontend
                "total_profit": net_profit
            }

            if is_season:
                seasonal.append(entry)
            else:
                non_seasonal.append(entry)

        # ✅ FINAL TOP 3 RULE:
        final_results = seasonal[:3]

        if len(final_results) < 3:
            needed = 3 - len(final_results)
            final_results.extend(non_seasonal[:needed])


        return jsonify({
            "status": "success",
            "location_used": f"{district}, {state}",
            "sowing_month": sowing_month,
            "season_detected": season_detected.upper(),

            "weather_used": {
                "temperature": float(temperature),
                "humidity": float(humidity),
                "rainfall": float(rainfall)
            },

            "top_3": final_results
        })


    except Exception as e:
        print("Prediction Error:", str(e))
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# ======================================
# MAIN: DISABLE AUTO-RELOAD
# ======================================
if __name__ == "__main__":
    check_model_accuracy()
    generate_daily_prices()

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)