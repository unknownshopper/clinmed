// encuesta.js — captura de encuestas con Firebase (type=module)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore,
  collection, addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Usa la MISMA config que en script.js
const firebaseConfig = {
  apiKey: "AIzaSyBlwKRRryoxAK620PmE8GorHrne5tE9t8Q",
  authDomain: "clinmed-d9151.firebaseapp.com",
  projectId: "clinmed-d9151",
  storageBucket: "clinmed-d9151.appspot.com",
  messagingSenderId: "779598822875",
  appId: "1:779598822875:web:c155fbbe83cbdc6ba2fbfe"
};

// Inicializaciones
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false
});

// UI
const el = (id) => document.getElementById(id);
const userEmail = el("user-email");
const form = el("form-encuesta");
const msg = el("msg");
const btnCancel = el("btn-cancel");
const btnSave = el("btn-save");
const btnSaveSubmit = el("btn-save-submit");

const fields = {
  age: el("age"),
  gender: el("gender"),
  service_type: el("service_type"),
  wait_time: el("wait_time"),
  satisfaction: el("satisfaction"),
  nps: el("nps"),
  comments: el("comments"),
  consent: el("consent"),
};

let currentUser = null;
let currentRole = null; // opcional si luego validamos rol para entrar aquí

function setMessage(text, isError = false) {
  msg.textContent = text;
  msg.style.color = isError ? "#b91c1c" : "#64748b";
}

function serializePayload() {
  return {
    age: Number(fields.age.value),
    gender: fields.gender.value,
    service_type: fields.service_type.value,
    wait_time: Number(fields.wait_time.value),
    satisfaction: Number(fields.satisfaction.value),
    nps: Number(fields.nps.value),
    comments: (fields.comments.value || "").trim(),
  };
}

function validateForm() {
  if (!fields.consent.checked) {
    throw new Error("Falta consentimiento informado.");
  }
  if (!fields.age.value || Number(fields.age.value) < 0) {
    throw new Error("Edad inválida.");
  }
  if (!fields.gender.value) throw new Error("Selecciona género.");
  if (!fields.service_type.value) throw new Error("Selecciona tipo de servicio.");
  if (!fields.wait_time.value || Number(fields.wait_time.value) < 0) {
    throw new Error("Tiempo de espera inválido.");
  }
  if (!fields.satisfaction.value) throw new Error("Selecciona satisfacción.");
  if (fields.nps.value === "") throw new Error("Selecciona NPS.");
}

async function saveSurvey(status = "submitted") {
  if (!currentUser) throw new Error("Sesión no válida.");
  validateForm();
  const payload = serializePayload();

  // Insertar documento
  await addDoc(collection(db, "surveys"), {
    created_by: currentUser.uid,
    status,                // 'submitted' o 'draft' si quisieras borradores
    payload,
    created_at: serverTimestamp(),
  });
}

function bindEvents() {
  // Cancelar -> regresar al dashboard
  btnCancel?.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  // Guardar
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    btnSave.disabled = true;
    btnSaveSubmit.disabled = true;
    setMessage("Guardando…");
    try {
      await saveSurvey("submitted");
      setMessage("Encuesta guardada.");
      // Regresar al dashboard
      setTimeout(() => (window.location.href = "index.html"), 600);
    } catch (err) {
      setMessage(err.message || "No se pudo guardar", true);
    } finally {
      btnSave.disabled = false;
      btnSaveSubmit.disabled = false;
    }
  });

  // Guardar y enviar (igual que submit por ahora)
  btnSaveSubmit?.addEventListener("click", async () => {
    btnSave.disabled = true;
    btnSaveSubmit.disabled = true;
    setMessage("Guardando y enviando…");
    try {
      await saveSurvey("submitted");
      setMessage("Encuesta enviada.");
      setTimeout(() => (window.location.href = "index.html"), 600);
    } catch (err) {
      setMessage(err.message || "No se pudo guardar", true);
    } finally {
      btnSave.disabled = false;
      btnSaveSubmit.disabled = false;
    }
  });
}

function boot() {
  bindEvents();
  onAuthStateChanged(auth, (user) => {
    currentUser = user || null;
    userEmail.textContent = user?.email ?? "";
    if (!user) {
      // si no hay sesión, regresar a login
      window.location.href = "index.html";
    }
  });
}
window.addEventListener("DOMContentLoaded", boot);