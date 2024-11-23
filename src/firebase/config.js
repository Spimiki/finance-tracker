import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBEW3J2p7Q2KbX46lz_ODUnNvd0a1KRrU0",
  authDomain: "crypto-journal-a3dcc.firebaseapp.com",
  projectId: "crypto-journal-a3dcc",
  storageBucket: "crypto-journal-a3dcc.firebasestorage.app",
  messagingSenderId: "511340214848",
  appId: "1:511340214848:web:cc057e4a184cc64c2ffda5",
  measurementId: "G-YBSWREYVRK"
};

// Initialize Firebase only once
const app = initializeApp(firebaseConfig);

// Export initialized instances
export const auth = getAuth(app);
export const db = getFirestore(app); 