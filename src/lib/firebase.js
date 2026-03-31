// src/lib/firebase.js
// Firebase 프로젝트 설정 파일

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBjgNvjqLDBBZ-94PZN9boDcfsRep19LtU",
  authDomain: "today-food-837e2.firebaseapp.com",
  projectId: "today-food-837e2",
  storageBucket: "today-food-837e2.firebasestorage.app",
  messagingSenderId: "813272370513",
  appId: "1:813272370513:web:85b70c9e905dcb70531770",
  measurementId: "G-LTL67FT1SN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

