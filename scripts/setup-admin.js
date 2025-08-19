import { initializeApp } from "firebase/app"
import { getDatabase, ref, set } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyBvOsYnK9gVXQhiDXtJmJc8sKQhFpQhFpQ",
  authDomain: "election-system-demo.firebaseapp.com",
  databaseURL: "https://election-system-demo-default-rtdb.firebaseio.com",
  projectId: "election-system-demo",
  storageBucket: "election-system-demo.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345678",
}

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

async function setupAdmin() {
  try {
    console.log("Setting up admin data...")

    const adminData = {
      auth: {
        admins: {
          main_admin: {
            email: "abdulhaseeb.solitarydeveloper@gmail.com",
            passwordHash: "admin123", // Simple hash for demo
            role: "super-admin",
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        adminIndexByEmail: {
          "abdulhaseeb,solitarydeveloper@gmail,com": "main_admin",
        },
      },
    }

    await set(ref(database), adminData)
    console.log("Admin data setup complete!")
    console.log("You can now login with:")
    console.log("Email: abdulhaseeb.solitarydeveloper@gmail.com")
    console.log("Password: admin123")
  } catch (error) {
    console.error("Error setting up admin:", error)
  }
}

setupAdmin()
