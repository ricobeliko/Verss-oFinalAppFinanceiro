import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// ✅ 1. IMPORTAR A FUNÇÃO getAuth
import { getAuth } from "firebase/auth";

// As suas credenciais do Firebase (mantidas como estão)
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
// ✅ 2. INICIALIZAR O SERVIÇO DE AUTENTICAÇÃO
const auth = getAuth(app);

// ✅ 3. EXPORTAR AMBOS OS SERVIÇOS
// Agora, qualquer arquivo que importar deste poderá aceder tanto ao 'db' quanto ao 'auth'.
export { db, auth };
