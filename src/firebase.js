import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA-88XxRnAqNVXYjJVSeUIg2lNozvjfnbM",
  authDomain: "vyoma2board.firebaseapp.com",
  projectId: "vyoma2board",
  storageBucket: "vyoma2board.firebasestorage.app",
  messagingSenderId: "617996920667",
  appId: "1:617996920667:web:fc730fde17a22698a95c7e",
  measurementId: "G-JRBXEEXTCT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
