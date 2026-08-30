import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Credenciais do Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-e2e-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-e2e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-fincontrol-e2e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-e2e.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:demo12345",
};

// Inicializar a aplicação Firebase
const app = initializeApp(firebaseConfig);

// Inicializar os serviços essenciais do client
const db = getFirestore(app);
const auth = getAuth(app);

// Conectar aos Emuladores Locais quando a flag estiver habilitada
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  const host = 'localhost';
  try {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
  } catch (err) {
    console.warn("Emuladores Firebase já conectados ou indisponíveis:", err.message);
  }
}

// Helper para carregar instância de Cloud Functions sob demanda (code splitting de backend SDK)
async function getAppFunctions() {
  const { getFunctions, connectFunctionsEmulator } = await import('firebase/functions');
  const functionsInstance = getFunctions(app, 'southamerica-east1');
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    try {
      connectFunctionsEmulator(functionsInstance, 'localhost', 5001);
    } catch {
      // Ignora se já conectado
    }
  }
  return functionsInstance;
}

export { app, db, auth, getAppFunctions };