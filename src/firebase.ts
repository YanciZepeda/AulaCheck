import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCa2fDwkBDUZBAdvnFPwZCFJdxtkfLXBfY",
  authDomain: "aulacheck-app.firebaseapp.com",
  projectId: "aulacheck-app",
  storageBucket: "aulacheck-app.firebasestorage.app",
  messagingSenderId: "740289406351",
  appId: "1:740289406351:web:c84cc734521dd08fd4d7fa"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);