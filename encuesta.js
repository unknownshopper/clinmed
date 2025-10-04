import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore,
  collection, addDoc, doc, getDoc, updateDoc, deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const actions = document.getElementById("view-actions");
const btnViewImg = document.getElementById("btn-view-img");
const btnEdit    = document.getElementById("btn-edit");
const btnDelete  = document.getElementById("btn-delete");
const captureArea = document.getElementById("capture-area");

async function getMyRole() {
    if (!currentUser) return null;
    const r = await getDoc(doc(db, "profiles", currentUser.uid));
    return r.exists() ? (r.data().role || null) : null;
  }

  function boot() {
    bindEvents();
    onAuthStateChanged(auth, async (user) => {
      currentUser = user || null;
      userEmail.textContent = user?.email ?? "";
      if (!user) {
        window.location.href = "index.html";
        return;
      }
      currentRole = await getMyRole(); // NUEVO: conocer rol
      await maybeLoadReadOnlySurvey();  // sigue igual
      const paramsHash = location.hash;
      if (paramsHash === "#edit" && ["supervisor","admin"].includes(currentRole)) {
        document.getElementById("btn-edit")?.click();
      }
    });
  }

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

async function getGeo() {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  async function saveSurvey(status = "submitted") {
    if (!currentUser) throw new Error("Sesión no válida.");
    validateForm();
    const payload = serializePayload();
  
    // Geolocalización: una sola lectura (rápida y con timeout)
    const geo = await getGeo(); // {lat, lng, accuracy} | null
  
    await addDoc(collection(db, "surveys"), {
      created_by: currentUser.uid,
      status,                 // 'submitted' o 'draft'
      payload,
      created_at: serverTimestamp(),
      location: geo,          // simple: solo coordenadas
      user_agent: navigator.userAgent
    });
  }

import {
    initializeFirestore,
    collection, addDoc, doc, getDoc,
    serverTimestamp
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
  
  // ...
  
  function setFormDisabled(disabled) {
    Object.values(fields).forEach((input) => {
      if (input) input.disabled = disabled;
    });
  }
  
  function fillFormFromPayload(payload = {}) {
    if ("age" in payload) fields.age.value = payload.age ?? "";
    if ("gender" in payload) fields.gender.value = payload.gender ?? "";
    if ("service_type" in payload) fields.service_type.value = payload.service_type ?? "";
    if ("wait_time" in payload) fields.wait_time.value = payload.wait_time ?? "";
    if ("satisfaction" in payload) fields.satisfaction.value = payload.satisfaction ?? "";
    if ("nps" in payload) fields.nps.value = payload.nps ?? "";
    if ("comments" in payload) fields.comments.value = payload.comments ?? "";
    // consentimiento no se almacena; solo aplica en captura
  }
  
  async function maybeLoadReadOnlySurvey() {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if (!id) return false;
  
    // Cargar encuesta y mostrarla de solo lectura
    const ref = doc(db, "surveys", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      setMessage("Encuesta no encontrada", true);
      return true;
    }
    const data = snap.data();
    fillFormFromPayload(data.payload || {});
    setFormDisabled(true);
    // Ocultar acciones de guardado
    btnSave?.classList.add("hidden");
    btnSaveSubmit?.classList.add("hidden");
    // setMessage(`Modo lectura · Estado: ${data.status || "-"}`);
    // return true;
  }

  // Mostrar metadata (fecha y link a mapa)
const createdAt = data.created_at?.toDate ? data.created_at.toDate().toLocaleString() : "";
let metaHtml = `Creada: ${createdAt} · Estado: ${data.status || "-"}`;
if (data.location?.lat && data.location?.lng) {
  const { lat, lng, accuracy } = data.location;
  const gmaps = `https://www.google.com/maps?q=${lat},${lng}`;
  metaHtml += ` · Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}${accuracy ? ` (~${Math.round(accuracy)}m)` : ""} · <a href="${gmaps}" target="_blank" rel="noopener">Abrir mapa</a>`;
}
const meta = document.getElementById("meta");
if (meta) meta.innerHTML = metaHtml;

// Acciones: ver imagen (todos), editar (supervisor/admin), eliminar (admin)
if (actions) {
  actions.style.display = "flex"; // mostrar barra
  // Ver imagen
  btnViewImg?.addEventListener("click", async () => {
    try {
      const canvas = await html2canvas(captureArea, { scale: 2 });
      const url = canvas.toDataURL("image/png");
      // abrir en pestaña nueva (ligero para móvil)
      const w = window.open();
      w.document.write(`<img src="${url}" style="max-width:100%"/>`);
    } catch (_) {
      setMessage("No se pudo generar imagen", true);
    }
  });

  // Editar (supervisor/admin)
  if (["supervisor","admin"].includes(currentRole)) {
    btnEdit?.classList.remove("hidden");
    btnEdit?.addEventListener("click", async () => {
      setFormDisabled(false);
      setMessage("Modo edición. Guarda con el botón de abajo.");
      // Reusar el submit existente para guardar edición:
      form.onsubmit = async (e) => {
        e.preventDefault();
        try {
          validateForm();
          const newPayload = serializePayload();
          await updateDoc(doc(db, "surveys", id), {
            payload: newPayload,
            updated_at: serverTimestamp()
          });
          setMessage("Encuesta actualizada.");
          setFormDisabled(true);
        } catch (err) {
          setMessage(err.message || "No se pudo actualizar", true);
        }
      };
    });
  } else {
    btnEdit?.classList.add("hidden");
  }

  // Eliminar (admin)
  if (currentRole === "admin") {
    btnDelete?.classList.remove("hidden");
    btnDelete?.addEventListener("click", async () => {
      const ok = confirm("¿Eliminar esta encuesta de forma permanente?");
      if (!ok) return;
      try {
        await deleteDoc(doc(db, "surveys", id));
        window.location.href = "index.html";
      } catch (err) {
        setMessage("No se pudo eliminar", true);
      }
    });
  } else {
    btnDelete?.classList.add("hidden");
  }
}

setMessage("Modo lectura");

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