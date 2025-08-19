import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyCR_HwfAV9Oqsea62jv0qZNbNdBVPpB8tQ",
  authDomain: "syslab-mita.firebaseapp.com",
  databaseURL: "https://syslab-mita-default-rtdb.firebaseio.com",
  projectId: "syslab-mita",
  storageBucket: "syslab-mita.firebasestorage.app",
  messagingSenderId: "185993944220",
  appId: "1:185993944220:web:14f9aecdb51dc4bde4e159",
  measurementId: "G-8PYDVPFRSH",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app)

export default app
