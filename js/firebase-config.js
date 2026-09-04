// js/firebase-config.js
// Configuración compartida de Firebase para todo el proyecto

const firebaseConfig = {
  apiKey: "AIzaSyAEj22gE5UySwWVwIec6jpBiZ2nb1OBftM",
  authDomain: "agromaxgt-app.firebaseapp.com",
  projectId: "agromaxgt-app",
  storageBucket: "agromaxgt-app.firebasestorage.app",
  messagingSenderId: "648144313047",
  appId: "1:648144313047:web:118a67464d99f2d0462e92"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage ? firebase.storage() : null;
