import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Credenciais explicitas (Bypass do Vite .env)
const firebaseConfig = {
  apiKey: "AIzaSyAunB95d4h98NM8Q8Zt2XwfyCkWLeqs1RU",
  authDomain: "jbstore-b8bb7.firebaseapp.com",
  projectId: "jbstore-b8bb7",
  storageBucket: "jbstore-b8bb7.firebasestorage.app",
  messagingSenderId: "161004891665",
  appId: "1:161004891665:web:71b929617afda8fc0fcbb0",
  measurementId: "G-GP43L050H7",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export { app, firebaseConfig };

export function getSecondaryAuth() {
  const secondaryApp = getApps().some((firebaseApp) => firebaseApp.name === "secondary")
    ? getApp("secondary")
    : initializeApp(firebaseConfig, "secondary");

  return getAuth(secondaryApp);
}
