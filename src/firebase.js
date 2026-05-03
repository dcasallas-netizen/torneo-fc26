import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey:            "AIzaSyBCf9BXXBESCXs6Jceq6pn2PlFBtneaESo",
  authDomain:        "fifa-26-643a7.firebaseapp.com",
  databaseURL:       "https://fifa-26-643a7-default-rtdb.firebaseio.com",
  projectId:         "fifa-26-643a7",
  storageBucket:     "fifa-26-643a7.firebasestorage.app",
  messagingSenderId: "454345611979",
  appId:             "1:454345611979:web:1bc65b913cd4677f41d94e",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
