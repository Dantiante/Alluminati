// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBHR3RgO_nJ2hFKtLm7aDOirxYDG1LLCcs",
  authDomain: "project-alluminati.firebaseapp.com",
  projectId: "project-alluminati",
  storageBucket: "project-alluminati.firebasestorage.app",
  messagingSenderId: "382225911285",
  appId: "1:382225911285:web:158d6e74f7de145b2924bc",
  measurementId: "G-0M47XXWG7T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app); // Initialize Firestore