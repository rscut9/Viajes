// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD6LZzBGZkJZ1bKJZUpnZeT_RTEu76zCfk",
  authDomain: "viaje-32788.firebaseapp.com",
  projectId: "viaje-32788",
  storageBucket: "viaje-32788.firebasestorage.app",
  messagingSenderId: "835863081833",
  appId: "1:835863081833:web:5fdd8f1f4268633a5b03f8",
  measurementId: "G-8BB4NZ007K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);