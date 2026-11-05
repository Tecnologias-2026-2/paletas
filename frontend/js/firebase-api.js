import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const app = getApps().length ? getApp() : initializeApp({
  apiKey: "AIzaSyBrAVOQr7TQ-YMZidGw15__afkNMK5DJMc",
  authDomain: "paleteria-60039.firebaseapp.com",
  projectId: "paleteria-60039",
  storageBucket: "paleteria-60039.firebasestorage.app",
  messagingSenderId: "344009417792",
  appId: "1:344009417792:web:f5ff100da14b35e5e1eba5"
});

export const auth = getAuth(app);
const API_BASE = window.PALETAS_API_BASE ??
  (location.port === "5500" ? "http://localhost:3000" : "https://paletas-4vu7.onrender.com");

let authReady;
function waitForAuth() {
  if (!authReady) {
    authReady = new Promise(resolve => {
      const unsubscribe = onAuthStateChanged(auth, user => {
        unsubscribe();
        resolve(user);
      });
    });
  }
  return authReady;
}

export async function apiRequest(path, options = {}, admin = false) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (admin) {
    const user = await waitForAuth();
    if (!user) throw new Error("Debes iniciar sesión con la cuenta administradora.");
    headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Error HTTP ${response.status}`);
  return result;
}
