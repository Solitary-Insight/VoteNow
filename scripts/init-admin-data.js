// Script to initialize admin data in Firebase Realtime Database
import { initializeApp } from "firebase/app"
import { getDatabase, ref, set } from "firebase/database"

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

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

async function initializeAdminData() {
  try {
    const adminData = {
      auth: {
        admins: {
          main_admin: {
            email: "abdulhaseeb.solitarydeveloper@gmail.com",
            passwordHash: "$2b$12$d/RUiXtuZ0h7ZO4xQFZaZemjS6UwOSIvLytVH4zCXoWuOurrc4b5O", // admin123
            role: "super-admin",
            active: true,
            createdAt: { ".sv": "timestamp" },
            updatedAt: { ".sv": "timestamp" },
          },
        },
        adminIndexByEmail: {
          "abdulhaseeb,solitarydeveloper,gmail,com": "main_admin",
        },
        voters: {},
        voterIndexByPhone: {},
      },
      elections: {
        categories: {},
        candidates: {},
        votes: {},
        tokens: {},
      },
    }

    await set(ref(database, "/"), adminData)
    console.log("Admin data initialized successfully!")
    console.log("Login with:")
    console.log("Email: abdulhaseeb.solitarydeveloper@gmail.com")
    console.log("Password: admin123")
  } catch (error) {
    console.error("Error initializing admin data:", error)
  }
}

initializeAdminData()
