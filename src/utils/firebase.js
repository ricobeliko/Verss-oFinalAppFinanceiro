// src/utils/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// ✅ 1. IMPORTAR O SERVIÇO 'getFunctions'
import { getFunctions } from "firebase/functions";

// Suas credenciais do Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Inicializar a aplicação Firebase
const app = initializeApp(firebaseConfig);

// Inicializar os serviços
const db = getFirestore(app);
const auth = getAuth(app);
// ✅ 2. INICIALIZAR O SERVIÇO DE FUNCTIONS
const functions = getFunctions(app, 'southamerica-east1'); // É uma boa prática definir a região

// ✅ 3. EXPORTAR TODOS OS SERVIÇOS, INCLUINDO 'functions'
// Agora, qualquer arquivo que importar deste poderá acessar 'db', 'auth', e 'functions'.
export { db, auth, functions };