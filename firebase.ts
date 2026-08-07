import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDwgUPKIk6TaaeXz_B7VX5_9aE8RpL66Oo",
  authDomain: "jayjaystyles.firebaseapp.com",
  projectId: "jayjaystyles",
  storageBucket: "jayjaystyles.firebasestorage.app",
  messagingSenderId: "989589458552",
  appId: "1:989589458552:web:5cb65900b50ee85ae9678d",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };