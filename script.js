// ===============================
// CONSOLIDATED JAVASCRIPT - NO DUPLICATES
// ===============================
// This file combines everything without conflicts

// ===============================
// ELEMENT COLLECTION
// ===============================
const signupModal = document.getElementById("signupModal");
const modal = document.getElementById("signinModal");
const otpModal = document.getElementById("otpModal");

const sections = document.querySelectorAll(".section");
const sectionsList = document.querySelectorAll("section[id], .footer[id]");
const navLinks = document.querySelectorAll(".nav-links a");
const cta = document.querySelector(".cta");

const backToTop = document.getElementById("backToTop");

const bubblesList = document.querySelectorAll(".timeline-bubble");
const timelineCards = document.querySelectorAll(".timeline-card");
const vines = document.querySelectorAll(".vine");

const signupForm = document.getElementById("signupForm");
const signinForm = document.getElementById("signinForm");
const otpForm = document.getElementById("otpForm");

const BACKEND_URL = "https://smart-kisan-jznw.onrender.com";



async function fetchWithRenderWake(url, options = {}, delayMs = 8000) {
  let wakeTimer;
  let popupShown = false;

  try {
    wakeTimer = setTimeout(() => {
      showRenderWakeupCountdown();   // ✅ Only after 8 seconds
      popupShown = true;
    }, delayMs);

    const res = await fetch(url, options);
    return res;

  } finally {
    clearTimeout(wakeTimer);

    if (popupShown) {
      stopRenderWakeupCountdown();  // ✅ Auto close when response arrives
    }
  }
}


// ===============================
// OTP MODAL SYSTEM
// ===============================
function unlockBody() {
  document.body.classList.remove("modal-lock");
  document.body.classList.remove("modal-open");
}

function showPopup(message, type = "success") {

  // ✅ BLOCK normal popups when Render popup is active
  const renderPopup = document.getElementById("renderPopup");
  if (renderPopup && renderPopup.classList.contains("show")) {
    console.warn("⛔ Normal popup blocked because Render popup is active");
    return;
  }

  const popup = document.getElementById("customPopup");
  const msg = document.getElementById("popupMessage");

  // ✅ UNIVERSAL AUTO-TRANSLATION FOR ALL POPUPS
  if (selectedLanguage === "hindi") {
    for (let key in siteTranslations.hindi) {
      if (message.includes(key)) {
        message = message.replaceAll(key, siteTranslations.hindi[key]);
      }
    }
  }

  popup.className = "custom-popup";
  popup.classList.add(type);
  msg.textContent = message;

  popup.classList.add("show");

  setTimeout(() => {
    popup.classList.remove("show");
  }, 2500);
}

// ===============================
// ✅ TRUE NON-STOP RENDER WAKE TIMER (INFINITE LOOP)
// ===============================

let renderTotalSeconds = 60;
let renderRemainingSeconds = 60;
let renderPopupVisible = false;

// ✅ START TIMER ONCE WHEN PAGE LOADS
(function startRenderInfiniteTimer() {
  setInterval(() => {
    renderRemainingSeconds--;

    // ✅ AUTO RESET AT 0 → 60 AGAIN (NEVER STOPS)
    if (renderRemainingSeconds <= 0) {
      renderRemainingSeconds = renderTotalSeconds;
    }

  }, 1000);
})();

// ✅ SHOW POPUP (DOES NOT TOUCH TIMER)
let renderAutoCloseTimer = null;

function showRenderWakeupCountdown() {
  const popup = document.getElementById("renderPopup");
  const msg = document.getElementById("renderPopupMessage");
  if (!popup || !msg) return;

  if (renderPopupVisible) return; // ✅ Prevent spam

  renderPopupVisible = true;
  popup.classList.add("show");

  msg.textContent = `⚠️ Our AI server is waking up... Please wait ${renderRemainingSeconds}s`;

  // ✅ AUTO CLOSE AFTER 3 SECONDS (LIKE NORMAL POPUPS)
  // ✅ SAFETY AUTO-CLOSE (only if fetch somehow fails)
clearTimeout(renderAutoCloseTimer);
renderAutoCloseTimer = setTimeout(() => {
  if (renderPopupVisible) {
    stopRenderWakeupCountdown();
  }
}, 10000); // failsafe after 10s
}


// ✅ LIVE TEXT UPDATE (EVERY 300ms)
setInterval(() => {
  if (!renderPopupVisible) return;

  const msg = document.getElementById("renderPopupMessage");
  if (!msg) return;

  msg.textContent = `⚠️ Our AI server is waking up... Please wait ${renderRemainingSeconds}s`;
}, 300);

// ✅ HIDE POPUP (TIMER CONTINUES)
function stopRenderWakeupCountdown() {
  const popup = document.getElementById("renderPopup");
  if (!popup) return;

  renderPopupVisible = false;
  popup.classList.remove("show");

  clearTimeout(renderAutoCloseTimer);
}

function openOtpModal() {
  signupModal.style.display = "none";
  otpModal.style.display = "flex";
  document.body.classList.add("modal-lock");
  //otpModal.addEventListener("click", blockOtpOutside, true);
}

function blockOtpOutside(e) {
  if (!e.target.closest(".modal-box")) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}

document.getElementById("closeOtpModal").addEventListener("click", () => {
  otpModal.style.display = "none";
  unlockBody();
  document.body.classList.remove("modal-lock");
  //otpModal.removeEventListener("click", blockOtpOutside, true);
  window.signupInfo = null;
});

// ===============================
// SIGNUP FORM HANDLER
// ===============================
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();

      // FIX: Do not show alerts when clicking X on sign-up modal
  if (e.submitter && e.submitter.id === "closeSignup") {
    return;
  }

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();

    if (name.length < 2) {
      showPopup("Enter your name", "error");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      showPopup("Enter a valid email", "error");
      return;
    }
    if (password.length < 6) {
      showPopup("Password must be at least 6 characters", "error");
      return;
    }

    // Send to backend first (BEFORE opening OTP modal)

    const res = await fetchWithRenderWake(
    BACKEND_URL + "/auth/send-otp",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    }
  );


    const data = await res.json();

    // EMAIL EXISTS → redirect to login
    if (data.status === "exists") {
      showPopup("Account already exists. Please sign in.", "error");
      signupModal.style.display = "none";
      modal.style.display = "flex";
      return;
    }

    // OTP SENT → now open modal
    if (data.status === "otp_sent") {
      window.signupInfo = { name, email, password };
      openOtpModal();
      startOtpTimer();
      return;
    }

    // Any other backend issue
    showPopup("Could not send OTP. Try again.", "error");
  });
}


// ===============================
// OTP INPUT HANDLING
// ===============================
const otpInputs = document.querySelectorAll("#otpInputs input");
const verifyBtn = document.getElementById("verifyBtn");

function checkOtpFilled() {
  const entered = Array.from(otpInputs).map(i => i.value).join("");
  if (verifyBtn) verifyBtn.disabled = entered.length !== 6;
}

otpInputs.forEach((input, idx) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^0-9]/g, "");
    if (input.value && idx < otpInputs.length - 1) {
      otpInputs[idx + 1].focus();
    }
    checkOtpFilled();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
    if (e.key === "Backspace" && !input.value && idx > 0) {
      otpInputs[idx - 1].focus();
    }
  });

  input.addEventListener("paste", (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    pasted.split("").forEach((v, i) => {
      if (otpInputs[i]) otpInputs[i].value = v;
    });
    checkOtpFilled();
  });
});

if (verifyBtn) {
  verifyBtn.setAttribute("type", "submit");
}

// ===============================
// OTP FORM SUBMISSION
// ===============================
if (otpForm) {
  otpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    console.log("✅ OTP form submitted");

    if (!window.signupInfo) {
      showPopup("Session expired. Please sign up again.", "warn");
      return;
    }

    const otp = Array.from(otpInputs).map(i => i.value).join("");

    if (otp.length !== 6) {
      showPopup("Please enter 6-digit OTP", "warn");
      return;
    }

    const { name, email, password } = window.signupInfo;

    try {
      const res = await fetchWithRenderWake(
      BACKEND_URL + "/auth/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, otp })
      }
    );


      const data = await res.json();

      if (data.status === "registered") {
        localStorage.setItem("AUTH_USER", JSON.stringify({ name, email }));

        otpModal.style.display = "none";
        unlockBody();
        signupModal.style.display = "none";
        modal.style.display = "none";
        document.body.classList.remove("modal-open");
        document.body.classList.remove("modal-lock");
        window.signupInfo = null;
        updateAuthUI();
        showPopup("Account created successfully! 🎉", "success");
      } else if (data.status === "expired") {
        otpModal.style.display = "none";
        unlockBody();
        signupModal.style.display = "flex";
        window.signupInfo = null;
        showPopup("OTP expired! Please try again.", "warn");
      } else {
        otpInputs.forEach(inpt => inpt.classList.add("shake"));
        setTimeout(() => {
          otpInputs.forEach(inpt => {
            inpt.classList.remove("shake");
            inpt.value = "";
          });
          otpInputs[0].focus();
        }, 400);
        showPopup("Invalid OTP. Try again.", "error");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      showPopup("Network error. Please try again.", "warn");
    }
  }, false);
}

// ===============================
// RESEND OTP + TIMER
// ===============================
const resendBtn = document.getElementById("resendBtn");
const timerText = document.getElementById("timerText");

let timeLeft = 30;
let timer = null;

function startOtpTimer() {
  if (!resendBtn || !timerText) return;
  timeLeft = 30;
  resendBtn.style.display = "none";
  timerText.style.display = "inline-block";
  timerText.textContent = `Resend in ${timeLeft}s`;

  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    timerText.textContent = `Resend in ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      timerText.style.display = "none";
      resendBtn.style.display = "inline-block";
    }
  }, 1000);
}

if (resendBtn) {
  resendBtn.setAttribute("type", "button");
  resendBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();

    if (!window.signupInfo) {
      showPopup("Session expired. Please sign up again.", "warn");
      return;
    }

    resendBtn.style.display = "none";
    timerText.style.display = "inline-block";
    timerText.textContent = "Sending...";

    try {
      const res = await fetchWithRenderWake(BACKEND_URL + "/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: window.signupInfo.email })
      });

      if (res.ok) {
        timerText.textContent = "OTP sent! Check your email.";
        startOtpTimer();
      } else {
        timerText.textContent = "Failed to send. Try again.";
        resendBtn.style.display = "inline-block";
      }
    } catch (error) {
      console.error("Resend error:", error);
      timerText.textContent = "Network error. Try again.";
      resendBtn.style.display = "inline-block";
    }
  });
}

// ===============================
// SMOOTH NAVBAR SCROLL - GUARANTEED WORKING
// ===============================

document.addEventListener("click", (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;

  const id = link.getAttribute("href");
  const target = document.querySelector(id);
  if (!target) return;

  e.preventDefault();

  const NAV_OFFSET = 70;
  const targetY = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
  const startY = window.scrollY;
  const distance = targetY - startY;
  const duration = 1000; // 1 second smooth scroll
  let startTime = null;

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function smoothScroll(currentTime) {
    if (startTime === null) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeInOutQuad(progress);
    const currentY = startY + distance * ease;

    window.scrollTo(0, currentY);

    if (progress < 1) {
      requestAnimationFrame(smoothScroll);
    }
  }

  requestAnimationFrame(smoothScroll);
});


// =======================================
// CROPS SCROLL WITH CORRECT OFFSET
// =======================================
function smoothScrollTo(targetY, duration = 1000) {
  const startY = window.scrollY;
  const distance = targetY - startY;
  let startTime = null;

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function animation(currentTime) {
    if (startTime === null) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeInOutQuad(progress);

    window.scrollTo(0, startY + distance * easedProgress);

    if (progress < 1) requestAnimationFrame(animation);
  }

  requestAnimationFrame(animation);
}

document.querySelector('a[href="#crops"]').addEventListener("click", function (e) {
    e.preventDefault();

    // STOP the global smooth-scroll from firing
    e.stopImmediatePropagation();

    const crops = document.querySelector("#crops");

    const NAV_OFFSET = 70;     // same as main scroll
    const EXTRA_OFFSET = 75;  // adjust until perfect

    const targetY =
      crops.getBoundingClientRect().top +
      window.scrollY -
      NAV_OFFSET +
      EXTRA_OFFSET;

    smoothScrollTo(targetY, 1000);
});




// ===============================
// CTA RIPPLE
// ===============================
if (cta) {
  cta.addEventListener("click", e => {
    e.preventDefault();
    const circle = document.createElement("span");
    circle.style.left = `${e.offsetX}px`;
    circle.style.top = `${e.offsetY}px`;
    cta.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  });
}

// ===============================
// SCROLL OBSERVER
// ===============================
function onScroll() {
  const scrollY = window.scrollY;
  const viewHeight = window.innerHeight;

  sections.forEach(sec => {
    if (sec.id !== "weather-advisory" &&
        sec.getBoundingClientRect().top < viewHeight - 150) {
      sec.classList.add("active");
    }
  });

  sectionsList.forEach(sec => {
    if (
      scrollY + 120 >= sec.offsetTop &&
      scrollY + 120 < sec.offsetTop + sec.offsetHeight
    ) {
      navLinks.forEach(a => a.classList.remove("active"));
      document
        .querySelector(`.nav-links a[href="#${sec.id}"]`)
        ?.classList.add("active");
    }

    if (sec.id === "footer" &&
        scrollY + window.innerHeight >= document.body.scrollHeight - 10) {
      navLinks.forEach(a => a.classList.remove("active"));
      document.querySelector('.nav-links a[href="#footer"]')?.classList.add("active");
    }
  });

  if (scrollY > 350) {
    backToTop.style.opacity = "1";
    backToTop.style.pointerEvents = "auto";
  } else {
    backToTop.style.opacity = "0";
    backToTop.style.pointerEvents = "none";
  }

  timelineCards.forEach((card, i) => {
    const pos = card.getBoundingClientRect().top;
    if (pos < viewHeight - 120) {
      card.classList.add("active");
      vines[i]?.classList.add("active");
    }
  });

  const maxScroll = document.body.scrollHeight - viewHeight;
  const progressBar = document.getElementById("progressBar");
  if (progressBar) {
    progressBar.style.width = (scrollY / maxScroll) * 100 + "%";
  }
}

window.addEventListener("scroll", onScroll);
onScroll();

// ===============================
// BACK TO TOP
// ===============================
// TRUE smooth scroll for Back To Top
backToTop.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopImmediatePropagation(); // stop global scroll if any

  smoothScrollTo(0, 1000); // same timing as navbar & crops
});


// ===============================
// TIMELINE CONNECTIONS
// ===============================
function drawConnections() {
  const svg = document.getElementById("timelineSVG");
  if (!svg) return;

  svg.innerHTML = "";
  const connectors = document.querySelectorAll(".connector");

  connectors.forEach(conn => {
    const [a, b] = conn.dataset.connect.split("-");
    const itemA = document.querySelector(`[data-step="${a}"]`);
    const itemB = document.querySelector(`[data-step="${b}"]`);

    if (!itemA || !itemB) return;

    const cardA = itemA.querySelector(".timeline-card");
    const cardB = itemB.querySelector(".timeline-card");
    if (!cardA || !cardB) return;

    const rA = cardA.getBoundingClientRect();
    const rB = cardB.getBoundingClientRect();

    const y1 = rA.top + rA.height / 2 + window.scrollY;
    const y2 = rB.top + rB.height / 2 + window.scrollY;

    const offset = 18;
    let x1, x2;

    if (itemA.classList.contains("left")) x1 = rA.right + offset;
    else x1 = rA.left - offset;

    if (itemB.classList.contains("left")) x2 = rB.right + offset;
    else x2 = rB.left - offset;

    const mid = (y1 + y2) / 2;
    const d = `M ${x1},${y1} C ${x1},${mid} ${x2},${mid} ${x2},${y2}`;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("stroke", "#2e7d32");
    path.setAttribute("stroke-width", "4");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-dasharray", "12 8");
    path.setAttribute("stroke-linecap", "round");

    svg.appendChild(path);
  });
}

window.addEventListener("load", () => setTimeout(drawConnections, 300));
window.addEventListener("resize", drawConnections);
window.addEventListener("scroll", drawConnections);

// ===============================
// TIMELINE GLOW
// ===============================
function updateTimelineGlow() {
  const vh = window.innerHeight;
  let activeIndex = -1;

  timelineCards.forEach((card, index) => {
    const rect = card.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (mid > vh * 0.25 && mid < vh * 0.65) activeIndex = index;
  });

  bubblesList.forEach(b => b.classList.remove("active"));
  if (activeIndex >= 0) {
    bubblesList[activeIndex].classList.add("active");
  }
}

window.addEventListener("scroll", updateTimelineGlow);
window.addEventListener("load", updateTimelineGlow);

// ===============================
// WEATHER CONFIG
// ===============================
const cities = [
  { name: "Delhi", lat: 28.66, lon: 77.23 },
  { name: "Mumbai", lat: 19.07, lon: 72.87 },
  { name: "Kolkata", lat: 22.57, lon: 88.36 },
  { name: "Chennai", lat: 13.08, lon: 80.27 },
  { name: "Bengaluru", lat: 12.97, lon: 77.59 },
  { name: "Hyderabad", lat: 17.38, lon: 78.48 },
  { name: "Ahmedabad", lat: 23.02, lon: 72.57 },
  { name: "Pune", lat: 18.52, lon: 73.85 },
  { name: "Jaipur", lat: 26.91, lon: 75.79 },
  { name: "Lucknow", lat: 26.85, lon: 80.95 },
  { name: "Patna", lat: 25.59, lon: 85.14 },
  { name: "Bhopal", lat: 23.26, lon: 77.40 },
  { name: "Indore", lat: 22.72, lon: 75.86 },
  { name: "Nagpur", lat: 21.14, lon: 79.08 },
  { name: "Surat", lat: 21.17, lon: 72.83 },
  { name: "Vadodara", lat: 22.30, lon: 73.19 },
  { name: "Guwahati", lat: 26.14, lon: 91.74 },
  { name: "Ranchi", lat: 23.36, lon: 85.33 },
  { name: "Chandigarh", lat: 30.73, lon: 76.78 },
  { name: "Thiruvananthapuram", lat: 8.52, lon: 76.93 }
];

async function getWeather(city) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true&hourly=precipitation&forecast_days=1`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const cw = data.current_weather;
    const hourly = data.hourly;

    const temp = cw.temperature;
    const wind = cw.windspeed;
    const code = cw.weathercode;
    const rain = hourly?.precipitation?.[0] ?? 0;

    let emoji = "🌤️";
    if (code === 0) emoji = "☀️";
    else if (code <= 3) emoji = "☁️";
    else if (code <= 67) emoji = "🌧️";
    else if (code <= 79) emoji = "❄️";
    else emoji = "⛈️";

    if (temp >= 38) emoji = "🔥";
    if (rain >= 5) emoji = "🌧️🌧️";

    return `${emoji} ${city.name} — 🌡️ ${temp}°C | 💨 ${wind} km/h | 🌧️ ${rain}mm`;
  } catch (e) {
    return `${city.name} — Weather unavailable`;
  }
}

let weatherIndex = 0;
const ticker = document.querySelector(".weather-slide");

async function rotateWeather() {
  if (!ticker) return;

  ticker.classList.remove("fade-in");
  ticker.classList.add("fade-out");

  setTimeout(async () => {
    const text = await getWeather(cities[weatherIndex]);
    ticker.textContent = text;

    ticker.classList.remove("fade-out");
    ticker.classList.add("fade-in");

    weatherIndex = (weatherIndex + 1) % cities.length;
  }, 350);
}

if (ticker) {
  rotateWeather();
  setInterval(rotateWeather, 5000);
}

// ===============================
// SIGN IN / SIGN UP MODALS
// ===============================
const signInNavBtn = document.getElementById("signInNavBtn");
const closeModal = document.getElementById("closeModal");
const closeSignup = document.getElementById("closeSignup");
const swapToSignup = document.getElementById("goSignup");
const swapToSignin = document.getElementById("swapToSignin");

signInNavBtn.addEventListener("click", (e) => {
  e.preventDefault();

  if (localStorage.getItem("AUTH_USER")) {
    localStorage.removeItem("AUTH_USER");
    window.signupInfo = null;
    updateAuthUI();
    return;
  }

  modal.style.display = "flex";
  document.body.classList.add("modal-open");
});

closeModal.addEventListener("click", () => {
  modal.style.display = "none";
  document.body.classList.remove("modal-open");
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
  }
});

swapToSignup.addEventListener("click", () => {
  modal.style.display = "none";
  signupModal.style.display = "flex";
});

swapToSignin.addEventListener("click", () => {
  signupModal.style.display = "none";
  modal.style.display = "flex";
});

closeSignup.addEventListener("click", () => {
  signupModal.style.display = "none";
  document.body.classList.remove("modal-open");
});

signupModal.addEventListener("click", (e) => {
  if (e.target === signupModal) {
    signupModal.style.display = "none";
    document.body.classList.remove("modal-open");
  }
});

// ===============================
// SURVEY FORM - SINGLE DOMContentLoaded
// ===============================
window.addEventListener("DOMContentLoaded", () => {
  // ===== Prevent form submission on survey buttons =====
  const nextBtns = document.querySelectorAll(".next-btn");
  const backBtns = document.querySelectorAll(".back-btn");
  
  nextBtns.forEach(btn => {
    btn.setAttribute("type", "button");
  });
  
  backBtns.forEach(btn => {
    btn.setAttribute("type", "button");
  });
  
  // ===== Survey Logic =====
  const surveyCards = document.querySelectorAll(".survey-card");
  const submitSurvey = document.getElementById("submitSurvey");

  let currentStep = 1;
  const TOTAL_STEPS = 6;

  function updateProgress() {
    const percent = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
    const bar = document.querySelector(".survey-progress-bar");
    if (bar) bar.style.width = percent + "%";
    updateContainerHeight();
  }

  const surveyContainer = document.querySelector(".survey-container");

  function updateContainerHeight() {
    if (!surveyContainer) return;

    const activeCard = document.querySelector(
      `.survey-card[data-step="${currentStep}"]`
    );

    if (!activeCard) return;

    // ✅ FIXED height for result screen so scrolling works
    if (currentStep === 6) {
      surveyContainer.style.height = "460px";
    } else {
      const cardHeight = activeCard.scrollHeight;
      surveyContainer.style.height = cardHeight + "px";
    }
  }


  window.addEventListener("resize", updateContainerHeight);

  function showStep(step, reverse = false) {
    // Hide all cards
    surveyCards.forEach(c => {
      c.classList.remove("active", "slide-back");
      c.style.display = "none";
      c.style.transform = "translateX(0)"; // RESET transform for ALL cards
    });

    const card = document.querySelector(`.survey-card[data-step="${step}"]`);
    if (!card) return;

    // Ensure no transform is carried over
    card.style.transform = "translateX(0)";

    card.style.display = "block";

    // If going backward, play reverse animation
    if (reverse) {
      card.classList.add("slide-back");
    }

    // Activate the card
    card.classList.add("active");

    updateProgress();
    updateContainerHeight();
  }


  function validateStep(step) {
    const card = document.querySelector(`.survey-card[data-step="${step}"]`);
    if (!card) return true;

    const fields = card.querySelectorAll("input, select");
    for (let f of fields) {
      if (f.value.trim() === "") return false;
    }
    return true;
  }

  function attachValidation() {
    surveyCards.forEach(card => {
      const step = Number(card.dataset.step);
      const btn = card.querySelector(".next-btn") || card.querySelector("#submitSurvey");
      if (!btn) return;

      const fields = card.querySelectorAll("input, select");
      btn.disabled = true;

      fields.forEach(f => {
        f.addEventListener("input", () => {
          btn.disabled = !validateStep(step);
        });
      });
    });
  }

  attachValidation();
  showStep(currentStep);

  const firstNextBtn = document.querySelector('.survey-card[data-step="1"] .next-btn');

  if (firstNextBtn) {
    firstNextBtn.addEventListener("click", (e) => {
      if (!localStorage.getItem("AUTH_USER")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        signInNavBtn.click();
      }
    });
  }

  nextBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (!validateStep(currentStep)) return;
      if (currentStep < TOTAL_STEPS) {
        currentStep++;
        showStep(currentStep);
      }
    });
  });

  backBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (currentStep > 1) {
        currentStep--;
        showStep(currentStep, true);
      }
    });
  });

  if (submitSurvey) {
    submitSurvey.addEventListener("click", () => {
    if (!validateStep(currentStep)) return;

    currentStep = 6;
    showStep(currentStep);

    sendSurveyToModel(); // ✅ CALL ML MODEL
  });
  }

  // ===== Update Auth UI on DOMContentLoaded =====
  updateAuthUI();
});

// ===============================
// CROPS CAROUSEL
// ===============================
const cropsData = [
  { name: "Wheat", key: "wheat", img: "images/wheat.jpg", duration: "110–130 days", temp: "10–25°C", rain: "300–900 mm", soil: "Loamy / Clayey", profit: "High" },
  { name: "Rice (Paddy)", key: "paddy", img: "images/rice.jpg", duration: "120–150 days", temp: "20–35°C", rain: "1000–1500 mm", soil: "Clay / Silty", profit: "High" },
  { name: "Maize", key: "maize", img: "images/maize.jpg", duration: "90–110 days", temp: "18–27°C", rain: "500–800 mm", soil: "Well-drained loamy", profit: "Medium" },
  { name: "Soybean", key: "soybean", img: "images/soybean.jpg", duration: "90–110 days", temp: "18–30°C", rain: "600–1000 mm", soil: "Black / Loamy", profit: "High" },
  { name: "Cotton", key: "cotton", img: "images/cotton.jpg", duration: "150–180 days", temp: "20–35°C", rain: "600–800 mm", soil: "Black soil", profit: "High" },
  { name: "Groundnut", key: "groundnut", img: "images/groundnut.jpg", duration: "100–120 days", temp: "21–27°C", rain: "500–1000 mm", soil: "Sandy loam", profit: "Medium" },
  { name: "Mustard", key: "mustard", img: "images/mustard.jpg", duration: "90–110 days", temp: "10–25°C", rain: "400–500 mm", soil: "Loam / Clay loam", profit: "Medium" },
  { name: "Potato", key: "potato", img: "images/potato.jpg", duration: "90–120 days", temp: "15–25°C", rain: "500–700 mm", soil: "Well-drained loam", profit: "High" },
  { name: "Sugarcane", key: "sugarcane", img: "images/sugarcane.jpg", duration: "10–18 months", temp: "20–35°C", rain: "1200–1500 mm", soil: "Deep rich loam", profit: "High" },
  { name: "Chana", key: "chana", img: "images/chana.jpg", duration: "100–120 days", temp: "10–30°C", rain: "400–600 mm", soil: "Well-drained loam", profit: "Medium" }
];

const mandiCities = [
  "Delhi", "Mumbai", "Pune", "Jaipur", "Nagpur",
  "Ahmedabad", "Kolkata", "Hyderabad", "Indore", "Bengaluru"
];

function generateMockPrices(key) {
  const baseMap = {
    wheat: 2400, paddy: 2300, maize: 2100,
    soybean: 4200, cotton: 6500, groundnut: 5200,
    mustard: 5400, potato: 1400, sugarcane: 320, chana: 5200,
  };
  const base = baseMap[key] || 3000;

  return mandiCities.map(city => {
    const jitter = (Math.random() * 0.16 - 0.08) * base;
    return { city, price: Math.round(base + jitter) };
  });
}

window.addEventListener("load", () => {
  const carousel = document.getElementById("cropCarousel");
  const track = document.getElementById("cropTrack");
  if (!carousel || !track) return;

  cropsData.forEach(crop => {
    const prices = generateMockPrices(crop.key);
    const ticker = prices.map(p => `${p.city}: ₹${p.price}/qtl`).join(" | ");

    const card = document.createElement("div");
    card.className = "crop-card";
    card.innerHTML = `
      <div class="price-ticker-bar">
        <div class="price-ticker-inner">${ticker}</div>
      </div>
      <img src="${crop.img}" class="crop-image">
      <div class="crop-body">
        <h3>${crop.name}</h3>
        <p><strong>Duration:</strong> ${crop.duration}</p>
        <p><strong>Temp:</strong> ${crop.temp}</p>
        <p><strong>Rainfall:</strong> ${crop.rain}</p>
        <p><strong>Soil:</strong> ${crop.soil}</p>
        <span class="profit-tag">Profit: ${crop.profit}</span>
      </div>
    `;
    track.appendChild(card);
  });

  const clone = track.cloneNode(true);
  clone.querySelectorAll(".price-ticker-inner").forEach(t => {
    t.style.animation = "none";
  });
  track.appendChild(clone);

  let pos = 0;
  const speed = 0.8;

  function loop() {
    pos -= speed;
    const half = track.scrollWidth / 2;

    if (pos <= -half) pos += half;
    if (pos >= 0) pos -= half;

    track.style.transform = `translateX(${pos}px)`;
    requestAnimationFrame(loop);
  }

  loop();

  carousel.addEventListener("wheel", e => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      pos -= e.deltaX * 1.2;
    }
  });

  let dragging = false;
  let startX = 0;
  let startPos = 0;

  carousel.addEventListener("mousedown", e => {
    dragging = true;
    startX = e.clientX;
    startPos = pos;
    track.style.transition = "none";
  });

  window.addEventListener("mousemove", e => {
    if (!dragging) return;

    const half = track.scrollWidth / 2;
    pos = startPos + (e.clientX - startX);

    if (pos <= -half) pos += half;
    if (pos >= 0) pos -= half;
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
    track.style.transition = "";
  });

  if (selectedLanguage === "hindi") {
  translateCarouselToHindi();
}

});

// ===============================
// SIGN IN FORM
// ===============================
if (signinForm) {
  signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    // ⛔ SHOW CUSTOM POPUP WHEN FIELDS ARE EMPTY
    if (!email && !password) {
      showPopup("Please enter email and password", "error");
      return;
    }
    if (!email) {
      showPopup("Please enter your email", "error");
      return;
    }
    if (!password) {
      showPopup("Please enter your password", "error");
      return;
    }

    // Proceed with backend login only after validation
    try {
      const res = await fetchWithRenderWake(
      BACKEND_URL + "/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      }
    );


      const data = await res.json();

      if (data.status === "ok") {
        localStorage.setItem("AUTH_USER", JSON.stringify(data.user));
        modal.style.display = "none";
        document.body.classList.remove("modal-open");
        updateAuthUI();
      } 
      else if (data.status === "wrong_password") {
        showPopup("Incorrect password.", "error");
      } 
      else if (data.status === "not_found") {
        showPopup("User not found. Please sign up.", "error");
      }
    } catch (error) {
      console.error("Login error:", error);
      showPopup("Network error. Please try again.", "error");
    }
  }, false);
}


// ===============================
// UPDATE AUTH UI
// ===============================
function updateAuthUI() {
  const user = localStorage.getItem("AUTH_USER");
  const btn = document.getElementById("signInNavBtn");

  if (user) {
    btn.classList.add("logout-btn");
    btn.classList.remove("signin-btn");

    btn.innerHTML = `
  Logout
  <svg>
    <rect x="1.5" y="1.5" width="calc(100% - 3px)" height="calc(100% - 3px)" rx="10" ry="10"/>
  </svg>
`;

  } else {
    btn.classList.remove("logout-btn");
    btn.classList.add("signin-btn");
    btn.innerHTML = "Sign In";
  }
}

// ================= SMART KISAN SILENT LANGUAGE AI CHATBOT =================

const aiToggle = document.getElementById("aiToggle");
const aiBot = document.getElementById("aiBot");
const aiInput = document.getElementById("aiInput");
const aiSend = document.getElementById("aiSend");
const aiMessages = document.getElementById("aiMessages");

let chatbotOpened = false;
let selectedLanguage = null;

// ✅ BOT NAME
const BOT_NAME = "Kisan AI 🌱";

// ✅ DETAILED FAQ IN BOTH LANGUAGES
const faqData = {
  english: [
    { 
      q: "Best crop for my land", 
      a: "The best crop for your land depends on soil type, rainfall, temperature, and season. For areas with good rainfall and clay soil, rice is ideal. For dry regions with loamy soil, wheat and soybean are excellent choices." 
    },
    { 
      q: "Kharif crops", 
      a: "Kharif crops are grown during the monsoon season from June to October. Major Kharif crops include Rice, Maize, Cotton, Soybean, Bajra and Groundnut. These crops require warm weather and good rainfall." 
    },
    { 
      q: "Rabi crops", 
      a: "Rabi crops are cultivated in the winter season from October to March. Common Rabi crops include Wheat, Mustard, Gram (Chana), Peas and Barley. These crops grow best in cool temperatures and require less water." 
    },
    { 
      q: "Best soil type", 
      a: "Loamy soil is considered the most suitable soil for farming. It has a balanced mix of sand, silt and clay, which provides good drainage, aeration and nutrient availability for healthy crop growth." 
    },
    { 
      q: "Ideal rainfall", 
      a: "Most agricultural crops require rainfall between 500mm to 1200mm annually. Crops like Rice require heavy rainfall, whereas crops like Mustard and Gram grow well in low rainfall conditions." 
    },
    { 
      q: "Most profitable crop", 
      a: "Highly profitable crops in India include Cotton, Sugarcane, Soybean, Potato and Chilli. Profit depends on market demand, irrigation availability, fertilizer use and pest management." 
    },
    { 
      q: "Soil pH value", 
      a: "The ideal soil pH value for most crops ranges between 6.0 and 7.5. If soil becomes too acidic or alkaline, crop productivity reduces and nutrients become unavailable to plants." 
    },
    { 
      q: "Irrigation method", 
      a: "Drip irrigation is the most water-efficient method as it supplies water directly to plant roots. It reduces water wastage, improves crop yield and saves electricity and labor costs." 
    },
    { 
      q: "Which fertilizer to use", 
      a: "NPK fertilizer containing Nitrogen, Phosphorus and Potassium is widely used for balanced crop nutrition. Nitrogen promotes leaf growth, Phosphorus strengthens roots and Potassium improves crop resistance." 
    },
    { 
      q: "How to control pests", 
      a: "Pest control should be done using integrated pest management (IPM). Neem-based organic pesticides are safe for soil and human health. Chemical pesticides should be used only when infestation is severe." 
    }
  ],

  hindi: [
    { 
      q: "मेरी जमीन के लिए सबसे अच्छी फसल", 
      a: "आपकी जमीन के लिए सबसे अच्छी फसल मिट्टी, वर्षा, तापमान और मौसम पर निर्भर करती है। अच्छी वर्षा और चिकनी मिट्टी वाले क्षेत्रों में धान सबसे उपयुक्त है। कम वर्षा और दोमट मिट्टी में गेहूं और सोयाबीन अच्छी फसलें हैं।" 
    },
    { 
      q: "खरीफ फसलें", 
      a: "खरीफ फसलें जून से अक्टूबर के बीच मानसून के मौसम में उगाई जाती हैं। प्रमुख खरीफ फसलें हैं: धान, मक्का, कपास, सोयाबीन, बाजरा और मूंगफली। इन फसलों को अधिक गर्मी और अच्छी बारिश की जरूरत होती है।" 
    },
    { 
      q: "रबी फसलें", 
      a: "रबी फसलें अक्टूबर से मार्च के बीच सर्दियों में उगाई जाती हैं। प्रमुख रबी फसलें हैं: गेहूं, सरसों, चना, मटर और जौ। इन फसलों को ठंडा तापमान और कम पानी की आवश्यकता होती है।" 
    },
    { 
      q: "सबसे अच्छी मिट्टी", 
      a: "दोमट मिट्टी खेती के लिए सबसे अच्छी मानी जाती है। इसमें रेत, चिकनी मिट्टी और गाद का संतुलन होता है, जिससे पानी का निकास अच्छा रहता है और फसलों को पोषक तत्व आसानी से मिलते हैं।" 
    },
    { 
      q: "आदर्श वर्षा", 
      a: "अधिकतर फसलों के लिए 500mm से 1200mm तक की वर्षा उपयुक्त मानी जाती है। धान अधिक पानी में उगता है जबकि सरसों और चना कम वर्षा में अच्छी पैदावार देते हैं।" 
    },
    { 
      q: "सबसे लाभदायक फसल", 
      a: "भारत में कपास, गन्ना, सोयाबीन, आलू और मिर्च सबसे अधिक लाभ देने वाली फसलें हैं। फसल का लाभ बाजार भाव, सिंचाई सुविधा और कीट नियंत्रण पर भी निर्भर करता है।" 
    },
    { 
      q: "मिट्टी का pH", 
      a: "अधिकतर फसलों के लिए मिट्टी का सही pH मान 6.0 से 7.5 के बीच होना चाहिए। यदि pH ज्यादा बिगड़ जाए तो पौधों को पोषक तत्व नहीं मिलते और उत्पादन घट जाता है।" 
    },
    { 
      q: "सिंचाई विधि", 
      a: "ड्रिप सिंचाई सबसे आधुनिक और पानी बचाने वाली विधि है। इससे पानी सीधे पौधों की जड़ों तक पहुंचता है, जिससे पानी की बचत होती है और उत्पादन बढ़ता है।" 
    },
    { 
      q: "कौन सा उर्वरक उपयोग करें", 
      a: "NPK उर्वरक में नाइट्रोजन, फॉस्फोरस और पोटाश होते हैं। नाइट्रोजन पत्तियों की वृद्धि करता है, फॉस्फोरस जड़ों को मजबूत बनाता है और पोटाश फसल को बीमारी से बचाता है।" 
    },
    { 
      q: "कीट नियंत्रण कैसे करें", 
      a: "कीट नियंत्रण के लिए नीम आधारित जैविक कीटनाशक सबसे सुरक्षित माने जाते हैं। अधिक संक्रमण होने पर ही रासायनिक दवाइयों का उपयोग करना चाहिए।" 
    }
  ]
};

// ✅ TOGGLE CHATBOT
aiToggle.addEventListener("click", () => {
  aiBot.style.display = aiBot.style.display === "flex" ? "none" : "flex";

  if (!chatbotOpened && aiBot.style.display === "flex") {
    chatbotOpened = true;
    showLanguageSelection();
  }
});

// ✅ ADD MESSAGE
function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = `ai-msg ${type}`;
  div.innerText = text;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}

// ✅ AI TYPING EFFECT
function botTyping(text, delay = 800) {
  setTimeout(() => addMessage(text, "ai-bot"), delay);
}

// ✅ LANGUAGE SELECTION (SILENT)
function showLanguageSelection() {
  botTyping(`Hello! I am ${BOT_NAME}.`, 400);
  botTyping("Please choose your preferred language to start the conversation.", 1300);
  botTyping("कृपया बातचीत शुरू करने के लिए अपनी भाषा चुनें।", 2400);

  setTimeout(showLanguageButtons, 3600);
}

// ✅ LANGUAGE BUTTONS
function showLanguageButtons() {
  const wrapper = document.createElement("div");

  const engBtn = document.createElement("button");
  engBtn.innerText = "English";
  styleBtn(engBtn);
  engBtn.onclick = () => silentSelectLanguage("english");

  const hinBtn = document.createElement("button");
  hinBtn.innerText = "हिंदी";
  styleBtn(hinBtn);
  hinBtn.onclick = () => silentSelectLanguage("hindi");

  wrapper.appendChild(engBtn);
  wrapper.appendChild(hinBtn);
  aiMessages.appendChild(wrapper);
}

// ✅ STYLE
function styleBtn(btn) {
  btn.style.margin = "6px";
  btn.style.padding = "6px 12px";
  btn.style.border = "none";
  btn.style.borderRadius = "8px";
  btn.style.background = "#2e7d32";
  btn.style.color = "white";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "13px";
}

// ✅ SILENT APPLY LANGUAGE (NO MESSAGE SHOWN)
function silentSelectLanguage(lang) {
  selectedLanguage = lang;

  if (lang === "hindi") {
    // Ask confirmation before changing site language
    botTyping(
      "क्या आप पूरी वेबसाइट की भाषा हिंदी में बदलना चाहते हैं?",
      400
    );

    setTimeout(showSiteChangeConfirmButtons, 1400);
  } else {
    // English → No confirmation needed
    setTimeout(showQuickQuestions, 400);
  }
}
// ✅ SHOW YES / NO BUTTONS FOR SITE LANGUAGE CHANGE
function showSiteChangeConfirmButtons() {
  const wrapper = document.createElement("div");

  const yesBtn = document.createElement("button");
  yesBtn.innerText = "✅ हाँ";
  styleBtn(yesBtn);

  const noBtn = document.createElement("button");
  noBtn.innerText = "❌ नहीं";
  styleBtn(noBtn);

  // ✅ YES → Apply Hindi to entire site
    yesBtn.onclick = () => {
    showPlantLoader();              // 🌱 SHOW TRANSPARENT ANIMATED LOADER

    setTimeout(() => {
      applySiteLanguage("hindi");
      translateCarouselToHindi();
      hidePlantLoader();            // 🌱 HIDE LOADER AFTER DONE
      showQuickQuestions();
    }, 1600); // matches plant growth cycle
  };



  // ✅ NO → Only chatbot stays Hindi
  noBtn.onclick = () => {
    setTimeout(showQuickQuestions, 500);
  };

  wrapper.appendChild(yesBtn);
  wrapper.appendChild(noBtn);
  aiMessages.appendChild(wrapper);
}



// ✅ QUICK QUESTIONS
function showQuickQuestions() {
  const instruction =
    selectedLanguage === "english"
      ? "👇 Click on the questions below to get instant solutions."
      : "👇 तुरंत समाधान पाने के लिए नीचे दिए गए प्रश्नों पर क्लिक करें।";

  // ✅ Show instruction first (with typing effect feel)
  botTyping(instruction, 300);

  setTimeout(() => {
    const wrapper = document.createElement("div");
    const data = faqData[selectedLanguage];

    data.forEach(item => {
      const btn = document.createElement("button");
      btn.innerText = item.q;
      styleBtn(btn);

      btn.onclick = () => {
        addMessage(item.q, "ai-user");
        setTimeout(() => addMessage(item.a, "ai-bot"), 500);
      };

      wrapper.appendChild(btn);
    });

    aiMessages.appendChild(wrapper);
    aiMessages.scrollTop = aiMessages.scrollHeight;
  }, 900); // small delay so instruction feels natural
}


// ✅ USER MESSAGE MATCHING
function getBotReply(userMsg) {
  const data = faqData[selectedLanguage];
  userMsg = userMsg.toLowerCase();

  for (let item of data) {
    if (userMsg.includes(item.q.toLowerCase())) {
      return item.a;
    }
  }

  return selectedLanguage === "english"
    ? "Please select one of the farming questions shown above for accurate guidance."
    : "सटीक जानकारी के लिए कृपया ऊपर दिए गए किसी भी खेती से जुड़े प्रश्न को चुनें।";
}

// ✅ SEND MESSAGE
function sendMessage() {
  if (!selectedLanguage) return;

  const msg = aiInput.value.trim();
  if (!msg) return;

  addMessage(msg, "ai-user");
  aiInput.value = "";

  const reply = getBotReply(msg);

  setTimeout(() => {
    addMessage(reply, "ai-bot");
  }, 600);
}

aiSend.addEventListener("click", sendMessage);
aiInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

// ================= SITE LANGUAGE TRANSLATION MAP =================

const siteTranslations = {
  hindi: {
    // NAVBAR
    "How It Works": "यह कैसे काम करता है",
    "Weather AI": "मौसम एआई",
    "Crops": "फसलें",
    "Contact": "संपर्क करें",
    "Sign In": "लॉग इन",

    // HERO
    "Grow the Right Crop This Season": "इस मौसम सही फसल उगाएं",
    "AI-powered recommendations based on climate, soil & profitability.": "मौसम, मिट्टी और लाभ के आधार पर एआई सुझाव।",
    "Get Started": "शुरू करें",

    // HOW IT WORKS
    "How It Works": "यह कैसे काम करता है",
    "Select Month & Location": "महीना और स्थान चुनें",
    "AI Weather Understanding": "एआई मौसम विश्लेषण",
    "Recommended Crops": "अनुशंसित फसलें",
    "Profit & Growth": "लाभ और वृद्धि",

    // WEATHER SECTION
    "Weather-Based Crop Advisory": "मौसम आधारित फसल सलाह",
    "Answer a few simple questions. Smart Kisan will predict the best crops.": "कुछ आसान सवालों के जवाब दें। स्मार्ट किसान आपको सही फसल बताएगा।",

    // SURVEY
    "Where is your farm located?": "आपका खेत कहां स्थित है?",
    "State": "राज्य",
    "District": "जिला",
    "When will you sow?": "आप बुवाई कब करेंगे?",
    "Sowing Month": "बुवाई महीना",
    "Soil Information": "मिट्टी की जानकारी",
    "Soil Type": "मिट्टी का प्रकार",
    "Soil pH": "मिट्टी का pH",
    "Soil Nutrient Levels": "मिट्टी के पोषक तत्व",
    "Land Details": "भूमि विवरण",
    "Land Size (acres)": "भूमि का आकार (एकड़)",

    // CROPS
    "Live Market Crops": "लाइव मंडी फसलें",
    "See real-time mandi prices & key growing conditions for major Indian crops.": "भारत की प्रमुख फसलों के रियल टाइम भाव देखें।",

    // FOOTER
    "Quick Links": "त्वरित लिंक",
    "Home": "होम",
    "Contact": "संपर्क",
    "Smart agriculture insights, weather, and crop advisory.": "स्मार्ट खेती, मौसम और फसल सलाह।",

    // TIMELINE DESCRIPTIONS
    "You enter your sowing month and region, Smart Kisan adapts to local climate.":
    "आप अपना बुवाई महीना और क्षेत्र दर्ज करते हैं, स्मार्ट किसान स्थानीय मौसम के अनुसार सुझाव देता है।",

    "We analyze rainfall, soil moisture, humidity & temperature to avoid crop failure.":
    "हम वर्षा, मिट्टी की नमी, आर्द्रता और तापमान का विश्लेषण करके फसल नुकसान से बचाते हैं।",

    "Get 3 ranked crops optimized for yield, climate & season.":
    "आपको उपज, मौसम और फसल के अनुसार 3 सर्वोत्तम फसलें मिलती हैं।",

    "See estimated profit per acre, harvest time & risk factors.":
    "आप प्रति एकड़ अनुमानित लाभ, कटाई समय और जोखिम कारक देख सकते हैं।",

        // ✅ CROUSEL LABELS
    "Duration:": "अवधि:",
    "Temp:": "तापमान:",
    "Rainfall:": "वर्षा:",
    "Soil:": "मिट्टी:",
    "Profit:": "लाभ:",

    // ✅ CROUSEL PROFIT VALUES
    "High": "उच्च",
    "Medium": "मध्यम",

    // ✅ CROUSEL CROP NAMES
    "Wheat": "गेहूं",
    "Rice (Paddy)": "धान",
    "Maize": "मक्का",
    "Soybean": "सोयाबीन",
    "Cotton": "कपास",
    "Groundnut": "मूंगफली",
    "Mustard": "सरसों",
    "Potato": "आलू",
    "Sugarcane": "गन्ना",
    "Chana": "चना",

        // ✅ RESULT BOX TRANSLATIONS
    "✅ AI Crop Recommendations": "✅ एआई फसल सिफारिश",
    "📍 Location:": "📍 स्थान:",
    "🌱 Season Detected:": "🌱 पहचाना गया मौसम:",
    "🌦️ Climate Used:": "🌦️ उपयोग किया गया मौसम:",
    "✅ Best for season": "✅ मौसम के लिए सर्वोत्तम",
    "⚠️ Off-season": "⚠️ ऑफ-सीजन",
    "Total Profit": "कुल लाभ",
    "Net Profit": "शुद्ध लाभ",
    "Revenue": "कुल आय",
    "Cost": "कुल लागत",
    "per acre": "प्रति एकड़",
    "/ qtl": "/ क्विंटल",

    // ✅ ERROR CARD TRANSLATIONS
    "Uh, oh something went wrong": "उफ! कुछ गलत हो गया",
    "Server not responding": "सर्वर से संपर्क नहीं हो पा रहा",
    "Prediction failed": "भविष्यवाणी विफल हो गई",
    "Invalid district/state": "अमान्य जिला या राज्य",
    "Sowing month is too far for accurate 90-day prediction.":
    "बुवाई का महीना बहुत दूर है, 90 दिन की सही भविष्यवाणी संभव नहीं है।",

        // ✅ UNIVERSAL POPUP TRANSLATIONS
    "Enter your name": "अपना नाम दर्ज करें",
    "Enter a valid email": "मान्य ईमेल दर्ज करें",
    "Password must be at least 6 characters": "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए",
    "Could not send OTP. Try again.": "ओटीपी भेजने में असफल। पुनः प्रयास करें।",
    "OTP expired! Please try again.": "ओटीपी समाप्त हो गया। पुनः प्रयास करें।",
    "Invalid OTP. Try again.": "गलत ओटीपी। पुनः प्रयास करें।",
    "Network error. Please try again.": "नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।",
    "Account created successfully! 🎉": "खाता सफलतापूर्वक बन गया! 🎉",
    "Incorrect password.": "गलत पासवर्ड।",
    "User not found. Please sign up.": "उपयोगकर्ता नहीं मिला। कृपया साइन अप करें।",

    "❌ Server not responding": "❌ सर्वर प्रतिक्रिया नहीं दे रहा",
    "Prediction failed": "भविष्यवाणी विफल रही",
    "Session expired. Please sign up again.": "सत्र समाप्त हो गया। फिर से साइन अप करें।",

    "⚠️ Please select sowing month within the next 3 months only for accurate prediction.":
    "⚠️ कृपया अगले 3 महीनों के भीतर ही बुवाई का महीना चुनें।",

    "❌ Form fields missing! Check input IDs in HTML.":
    "❌ फॉर्म इनपुट फ़ील्ड गायब हैं। कृपया HTML आईडी जांचें।"
  }
};
// ================= APPLY SITE LANGUAGE =================

function applySiteLanguage(lang) {
  if (lang !== "hindi") return;

  // ✅ TRANSLATION AFTER SHORT DELAY (FOR REALISTIC LOADING)
  setTimeout(() => {
    const elements = document.querySelectorAll("*");

    elements.forEach(el => {

      // ✅ TEXT NODES
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
        let text = el.innerText;

        for (let key in siteTranslations.hindi) {
          if (text.includes(key)) {
            text = text.replaceAll(key, siteTranslations.hindi[key]);
          }
        }

        el.innerText = text;
      }

      // ✅ PLACEHOLDERS
      if (el.placeholder) {
        let p = el.placeholder;
        for (let key in siteTranslations.hindi) {
          if (p.includes(key)) {
            p = p.replaceAll(key, siteTranslations.hindi[key]);
          }
        }
        el.placeholder = p;
      }

      // ✅ BUTTONS, LINKS, TITLES
      if (el.tagName === "BUTTON" || el.tagName === "A" || el.tagName === "H3") {
        let t = el.innerText;
        for (let key in siteTranslations.hindi) {
          if (t.includes(key)) {
            t = t.replaceAll(key, siteTranslations.hindi[key]);
          }
        }
        el.innerText = t;
      }

    });

    document.documentElement.setAttribute("lang", "hi");

  }, 800);
}


// ✅ SAFE TRANSLATION FOR CROUSEL (DOES NOT BREAK HTML)
function translateCarouselToHindi() {
  const cropElements = document.querySelectorAll(
    ".crop-card h3, .crop-card p, .crop-card span"
  );

  cropElements.forEach(el => {
    let text = el.innerText;

    for (let key in siteTranslations.hindi) {
      if (text.includes(key)) {
        text = text.replaceAll(key, siteTranslations.hindi[key]);
      }
    }

    el.innerText = text;
  });
}
// ===============================
// CLOSE CHATBOT ON OUTSIDE CLICK
// ===============================

document.addEventListener("click", function (e) {
  if (!aiBot || aiBot.style.display !== "flex") return;

  const clickedInsideBot = aiBot.contains(e.target);
  const clickedOnToggle = aiToggle.contains(e.target);

  if (!clickedInsideBot && !clickedOnToggle) {
    aiBot.style.display = "none";
  }
});

// ===============================
// GLOBAL PLANT LOADER CONTROL
// ===============================

function showPlantLoader() {
  const renderPopup = document.getElementById("renderPopup");
  if (renderPopup && renderPopup.classList.contains("show")) return;

  const loader = document.getElementById("globalPlantLoader");
  if (!loader) return;

  loader.classList.add("show");

  setTimeout(() => {
    loader.classList.remove("show");
  }, 5000);
}

function hidePlantLoader() {
  const loader = document.getElementById("globalPlantLoader");
  if (!loader) return;
  loader.classList.remove("show");
}

function sendSurveyToModel() {
  showPlantLoader();

  // ✅ SAFE ELEMENT FETCHING
  const N_el = document.getElementById("N");
  const P_el = document.getElementById("P");
  const K_el = document.getElementById("K");
  const ph_el = document.getElementById("ph");

  const state_el = document.getElementById("state");
  const district_el = document.getElementById("district");
  const sowing_el = document.getElementById("sowingMonth");

  // ✅ HARD VALIDATION (PREVENT NULL CRASH)
  if (!N_el || !P_el || !K_el || !ph_el || !state_el || !district_el || !sowing_el) {
    hidePlantLoader();
    showPopup("❌ Form fields missing! Check input IDs in HTML.", "error");
    console.error("❌ Missing Input Elements:", {
      N_el, P_el, K_el, ph_el, state_el, district_el, sowing_el
    });
    return;
  }

  // ✅ SAFE PAYLOAD
    const payload = {
      N: Number(N_el.value),
      P: Number(P_el.value),
      K: Number(K_el.value),
      ph: Number(ph_el.value),

      land_size: Number(document.getElementById("landSize").value), // ✅ acres

      state: state_el.value,
      district: district_el.value,
      sowing_month: sowing_el.value
    };


const sowingMonth = document.getElementById("sowingMonth").value.toLowerCase();

const allMonths = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december"
];

const now = new Date().getMonth();
const allowed = [
  allMonths[now],
  allMonths[(now + 1) % 12],
  allMonths[(now + 2) % 12],
  allMonths[(now + 3) % 12]
];

if (!allowed.includes(sowingMonth)) {
  hidePlantLoader();   // ✅ ADD THIS
  showPopup(
    "⚠️ Please select sowing month within the next 3 months only for accurate prediction.",
    "warn"
  );
  return;
}

fetchWithRenderWake(BACKEND_URL + "/predict-crop", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
})

.then(async res => {
  const data = await res.json();

  console.log("✅ RAW RESPONSE FROM SERVER:", data);

  if (!res.ok) {
    throw new Error(data.message || "Backend error");
  }

  return data;
})
.then(data => {
  if (data.status === "success") {
    showTop3Results(
      data.top_3,
      data.weather_used,
      data.location_used,
      data.season_detected
    );
  } else {
    showPopup(data.message || "Prediction failed", "error");
  }
})
.catch(err => {
  console.error("❌ FETCH FAILED:", err);
  hidePlantLoader();
  showPopup("❌ Server not responding", "error");
});
}

function showTop3Results(results, weather, location, season) {
  const step6 = document.querySelector('.survey-card[data-step="6"]');

  let html = `
    <h3>✅ AI Crop Recommendations</h3>

    <p style="font-weight:600;color:#2e7d32">
      📍 Location: ${location}
    </p>

    <p style="font-weight:600;color:#2e7d32">
      🌱 Season Detected: ${season}
    </p>

    <p style="margin-bottom:10px;font-weight:600;color:#2e7d32">
      🌦️ Climate Used:
      ${weather.temperature}°C | 💧 ${weather.humidity}% | 🌧️ ${weather.rainfall} mm
    </p>

    <div style="display:flex;flex-direction:column;gap:10px;">
  `;

  results.forEach((item, index) => {
    const badge = item.season_match ? "✅ Best for season" : "⚠️ Off-season";

    html += `
      <div style="display:flex;justify-content:space-between;align-items:center;
      padding:12px 18px;border-radius:10px;background:rgba(46,125,50,0.12);
      font-size:15px;font-weight:600;">
        <span>🌾 ${index + 1}. ${item.crop}</span>
        <!-- confidence hidden -->
        <span style="font-size:12px">${badge}</span>
        <div style="text-align:right;font-size:13px;color:#2e7d32">
          <div>💰 ₹ ${item.price_per_quintal.toLocaleString()} / qtl</div>
          <div>🌾 ${item.yield_per_acre} qtl / acre</div>
          <div>✅ ₹ ${item.total_profit.toLocaleString()} Total Profit</div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  step6.innerHTML = html;
  // ✅ AUTO-TRANSLATE RESULT BOX IF HINDI IS ACTIVE
if (selectedLanguage === "hindi") {
  translateDynamicContentToHindi(step6);
}
}
// ✅ TRANSLATE DYNAMIC CONTENT LIKE RESULTS & ERROR CARDS
function translateDynamicContentToHindi(container) {
  if (!container) return;

  const elements = container.querySelectorAll("*");

  elements.forEach(el => {
    if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
      let text = el.innerText;

      for (let key in siteTranslations.hindi) {
        if (text.includes(key)) {
          text = text.replaceAll(key, siteTranslations.hindi[key]);
        }
      }

      el.innerText = text;
    }
  });
}
