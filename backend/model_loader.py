import pickle
import pandas as pd

with open("crop_model.pkl", "rb") as f:
    model = pickle.load(f)

def predict_crop(data):
    input_df = pd.DataFrame([data])
    prediction = model.predict(input_df)[0]
    return prediction
