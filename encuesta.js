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
  surveyor_id: el("surveyor_id"),
  age: el("age"),
  gender: el("gender"),
  education: el("education"),
  occupation: el("occupation"),
  neighborhood: el("neighborhood"),
  insurance: el("insurance"),
  main_provider: el("main_provider"),
  service_type: el("service_type"),
  wait_time: el("wait_time"),
  first_visit: el("first_visit"),
  reason_choice: el("reason_choice"),
  quality: el("quality"),
  staff_treatment: el("staff_treatment"),
  cleanliness: el("cleanliness"),
  value_for_money: el("value_for_money"),
  satisfaction: el("satisfaction"),
  nps: el("nps"),
  vs_public: el("vs_public"),
  vs_pharmacy: el("vs_pharmacy"),
  desired_service: el("desired_service"),
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
    surveyor_id: (fields.surveyor_id.value || "").trim(),
    age: Number(fields.age.value),
    gender: fields.gender.value,
    education: fields.education.value,
    occupation: fields.occupation.value,
    neighborhood: (fields.neighborhood.value || "").trim(),
    insurance: fields.insurance.value,
    main_provider: fields.main_provider.value,
    service_type: fields.service_type.value,
    wait_time: Number(fields.wait_time.value),
    first_visit: fields.first_visit.value,
    reason_choice: fields.reason_choice.value,
    quality: Number(fields.quality.value),
    staff_treatment: Number(fields.staff_treatment.value),
    cleanliness: Number(fields.cleanliness.value),
    value_for_money: Number(fields.value_for_money.value),
    satisfaction: Number(fields.satisfaction.value),
    nps: Number(fields.nps.value),
    vs_public: fields.vs_public.value,
    vs_pharmacy: fields.vs_pharmacy.value,
    desired_service: fields.desired_service.value || "",
    comments: (fields.comments.value || "").trim(),
  };
}

function validateForm() {
  if (!fields.consent.checked) {
    throw new Error("Falta consentimiento informado.");
  }
  if (!fields.surveyor_id.value || fields.surveyor_id.value.trim() === "") {
    throw new Error("Ingresa el ID del encuestador.");
  }
  if (!fields.age.value || Number(fields.age.value) < 0) {
    throw new Error("Edad inválida.");
  }
  if (!fields.gender.value) throw new Error("Selecciona género.");
  if (!fields.education.value) throw new Error("Selecciona nivel de estudios.");
  if (!fields.occupation.value) throw new Error("Selecciona ocupación.");
  if (!fields.insurance.value) throw new Error("Selecciona seguro médico.");
  if (!fields.main_provider.value) throw new Error("Selecciona proveedor principal.");
  if (!fields.service_type.value) throw new Error("Selecciona tipo de servicio.");
  if (!fields.wait_time.value || Number(fields.wait_time.value) < 0) {
    throw new Error("Tiempo de espera inválido.");
  }
  if (!fields.first_visit.value) throw new Error("Indica si es primera visita.");
  if (!fields.reason_choice.value) throw new Error("Selecciona razón de elección.");
  if (!fields.quality.value) throw new Error("Selecciona calidad de atención.");
  if (!fields.staff_treatment.value) throw new Error("Selecciona trato del personal.");
  if (!fields.cleanliness.value) throw new Error("Selecciona limpieza.");
  if (!fields.value_for_money.value) throw new Error("Selecciona relación calidad-precio.");
  if (!fields.satisfaction.value) throw new Error("Selecciona satisfacción.");
  if (fields.nps.value === "") throw new Error("Selecciona NPS.");
  if (!fields.vs_public.value) throw new Error("Selecciona comparación con centros públicos.");
  if (!fields.vs_pharmacy.value) throw new Error("Selecciona comparación con farmacias.");
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
    if ("surveyor_id" in payload) fields.surveyor_id.value = payload.surveyor_id ?? "";
    if ("age" in payload) fields.age.value = payload.age ?? "";
    if ("gender" in payload) fields.gender.value = payload.gender ?? "";
    if ("education" in payload) fields.education.value = payload.education ?? "";
    if ("occupation" in payload) fields.occupation.value = payload.occupation ?? "";
    if ("neighborhood" in payload) fields.neighborhood.value = payload.neighborhood ?? "";
    if ("insurance" in payload) fields.insurance.value = payload.insurance ?? "";
    if ("main_provider" in payload) fields.main_provider.value = payload.main_provider ?? "";
    if ("service_type" in payload) fields.service_type.value = payload.service_type ?? "";
    if ("wait_time" in payload) fields.wait_time.value = payload.wait_time ?? "";
    if ("first_visit" in payload) fields.first_visit.value = payload.first_visit ?? "";
    if ("reason_choice" in payload) fields.reason_choice.value = payload.reason_choice ?? "";
    if ("quality" in payload) fields.quality.value = payload.quality ?? "";
    if ("staff_treatment" in payload) fields.staff_treatment.value = payload.staff_treatment ?? "";
    if ("cleanliness" in payload) fields.cleanliness.value = payload.cleanliness ?? "";
    if ("value_for_money" in payload) fields.value_for_money.value = payload.value_for_money ?? "";
    if ("satisfaction" in payload) fields.satisfaction.value = payload.satisfaction ?? "";
    if ("nps" in payload) fields.nps.value = payload.nps ?? "";
    if ("vs_public" in payload) fields.vs_public.value = payload.vs_public ?? "";
    if ("vs_pharmacy" in payload) fields.vs_pharmacy.value = payload.vs_pharmacy ?? "";
    if ("desired_service" in payload) fields.desired_service.value = payload.desired_service ?? "";
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
  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;
    userEmail.textContent = user?.email ?? "";
    if (!user) {
      // si no hay sesión, regresar a login
      window.location.href = "index.html";
      return;
    }
    
    // Llenar automáticamente el ID del encuestador con el email del usuario
    if (fields.surveyor_id) {
      fields.surveyor_id.value = user.email || "";
    }
    
    currentRole = await getMyRole();
    await maybeLoadReadOnlySurvey();
    const paramsHash = location.hash;
    if (paramsHash === "#edit" && ["supervisor","admin"].includes(currentRole)) {
      document.getElementById("btn-edit")?.click();
    }
  });
}
window.addEventListener("DOMContentLoaded", boot);