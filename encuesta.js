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
const btnClear = el("btn-clear");
const btnSave = el("btn-save");

const fields = {
  surveyor_id: el("surveyor_id"),
  age: el("age"),
  gender: document.getElementsByName("gender"),
  education: document.getElementsByName("education"),
  occupation: document.getElementsByName("occupation"),
  neighborhood: el("neighborhood"),
  insurance: document.getElementsByName("insurance"),
  has_children: document.getElementsByName("has_children"),
  num_children: el("num_children"),
  child_last_visit: el("child_last_visit"),
  child_service_location: el("child_service_location"),
  child_cost: el("child_cost"),
  child_wait_time: el("child_wait_time"),
  child_distance: el("child_distance"),
  child_satisfaction: el("child_satisfaction"),
  last_personal_visit: el("last_personal_visit"),
  main_provider: el("main_provider"),
  service_type: document.getElementsByName("service_type"),
  wait_time: el("wait_time"),
  first_visit: document.getElementsByName("first_visit"),
  reason_choice: document.getElementsByName("reason_choice"),
  quality: document.getElementsByName("quality"),
  staff_treatment: document.getElementsByName("staff_treatment"),
  cleanliness: document.getElementsByName("cleanliness"),
  value_for_money: document.getElementsByName("value_for_money"),
  satisfaction: document.getElementsByName("satisfaction"),
  nps: document.getElementsByName("nps"),
  vs_public: document.getElementsByName("vs_public"),
  vs_pharmacy: document.getElementsByName("vs_pharmacy"),
  desired_service: el("desired_service"),
  comments: el("comments"),
  consent: el("consent"),
};

let currentUser = null;
let currentRole = null; // opcional si luego validamos rol para entrar aquí

function setMessage(text, isError = false) {
  msg.textContent = text;
  msg.style.display = "block";
  msg.className = isError ? "error" : "success";
  msg.style.color = isError ? "#b91c1c" : "#15803d";
}

// Helper para obtener valor de radio buttons
function getRadioValue(radioNodeList) {
  for (let radio of radioNodeList) {
    if (radio.checked) return radio.value;
  }
  return "";
}

// Helper para obtener valores de checkboxes (múltiples)
function getCheckboxValues(checkboxNodeList) {
  const values = [];
  for (let checkbox of checkboxNodeList) {
    if (checkbox.checked) values.push(checkbox.value);
  }
  return values;
}

// Helper para setear radio button
function setRadioValue(radioNodeList, value) {
  for (let radio of radioNodeList) {
    radio.checked = (radio.value === value);
  }
}

// Helper para setear checkboxes
function setCheckboxValues(checkboxNodeList, values) {
  const valuesArray = Array.isArray(values) ? values : (values ? [values] : []);
  for (let checkbox of checkboxNodeList) {
    checkbox.checked = valuesArray.includes(checkbox.value);
  }
}

function serializePayload() {
  return {
    surveyor_id: (fields.surveyor_id.value || "").trim(),
    age: Number(fields.age.value),
    gender: getRadioValue(fields.gender),
    education: getRadioValue(fields.education),
    occupation: getRadioValue(fields.occupation),
    neighborhood: (fields.neighborhood.value || "").trim(),
    has_children: getRadioValue(fields.has_children),
    num_children: getRadioValue(fields.has_children) === "yes" ? Number(fields.num_children.value) || null : null,
    child_last_visit: getRadioValue(fields.has_children) === "yes" ? fields.child_last_visit.value : null,
    child_service_location: getRadioValue(fields.has_children) === "yes" ? fields.child_service_location.value : null,
    child_cost: getRadioValue(fields.has_children) === "yes" ? Number(fields.child_cost.value) || null : null,
    child_wait_time: getRadioValue(fields.has_children) === "yes" ? Number(fields.child_wait_time.value) || null : null,
    child_distance: getRadioValue(fields.has_children) === "yes" ? Number(fields.child_distance.value) || null : null,
    child_satisfaction: getRadioValue(fields.has_children) === "yes" ? fields.child_satisfaction.value : null,
    last_personal_visit: fields.last_personal_visit.value,
    insurance: getRadioValue(fields.insurance),
    main_provider: fields.main_provider.value,
    service_type: getCheckboxValues(fields.service_type), // Array de valores
    wait_time: Number(fields.wait_time.value),
    first_visit: getRadioValue(fields.first_visit),
    reason_choice: getRadioValue(fields.reason_choice),
    quality: Number(getRadioValue(fields.quality)),
    staff_treatment: Number(getRadioValue(fields.staff_treatment)),
    cleanliness: Number(getRadioValue(fields.cleanliness)),
    value_for_money: Number(getRadioValue(fields.value_for_money)),
    satisfaction: Number(getRadioValue(fields.satisfaction)),
    nps: Number(getRadioValue(fields.nps)),
    vs_public: getRadioValue(fields.vs_public),
    vs_pharmacy: getRadioValue(fields.vs_pharmacy),
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
  if (!getRadioValue(fields.gender)) throw new Error("Selecciona género.");
  if (!getRadioValue(fields.education)) throw new Error("Selecciona nivel de estudios.");
  if (!getRadioValue(fields.occupation)) throw new Error("Selecciona ocupación.");
  if (!getRadioValue(fields.insurance)) throw new Error("Selecciona seguro médico.");
  if (!getRadioValue(fields.has_children)) throw new Error("Indica si tiene hijos.");
  if (getRadioValue(fields.has_children) === "yes") {
    if (!fields.num_children.value) throw new Error("Indica cuántos hijos tiene.");
    if (!fields.child_last_visit.value) throw new Error("Indica cuándo llevó a su hijo a consulta.");
    if (!fields.child_service_location.value) throw new Error("Indica dónde llevó a su hijo.");
  }
  if (!fields.last_personal_visit.value) throw new Error("Indica cuándo fue su última consulta personal.");
  if (!fields.main_provider.value) throw new Error("Selecciona proveedor principal.");
  if (getCheckboxValues(fields.service_type).length === 0) throw new Error("Selecciona al menos un tipo de servicio.");
  if (!fields.wait_time.value || Number(fields.wait_time.value) < 0) {
    throw new Error("Tiempo de espera inválido.");
  }
  if (!getRadioValue(fields.first_visit)) throw new Error("Indica si es primera visita.");
  if (!getRadioValue(fields.reason_choice)) throw new Error("Selecciona razón de elección.");
  if (!getRadioValue(fields.quality)) throw new Error("Selecciona calidad de atención.");
  if (!getRadioValue(fields.staff_treatment)) throw new Error("Selecciona trato del personal.");
  if (!getRadioValue(fields.cleanliness)) throw new Error("Selecciona limpieza.");
  if (!getRadioValue(fields.value_for_money)) throw new Error("Selecciona relación calidad-precio.");
  if (!getRadioValue(fields.satisfaction)) throw new Error("Selecciona satisfacción.");
  if (!getRadioValue(fields.nps)) throw new Error("Selecciona NPS.");
  if (!getRadioValue(fields.vs_public)) throw new Error("Selecciona comparación con centros públicos.");
  if (!getRadioValue(fields.vs_pharmacy)) throw new Error("Selecciona comparación con farmacias.");
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

  
  
  function setFormDisabled(disabled) {
    Object.values(fields).forEach((input) => {
      if (input) input.disabled = disabled;
    });
  }
  
  function fillFormFromPayload(payload = {}) {
    if ("surveyor_id" in payload) fields.surveyor_id.value = payload.surveyor_id ?? "";
    if ("age" in payload) fields.age.value = payload.age ?? "";
    if ("gender" in payload) setRadioValue(fields.gender, payload.gender);
    if ("education" in payload) setRadioValue(fields.education, payload.education);
    if ("occupation" in payload) setRadioValue(fields.occupation, payload.occupation);
    if ("neighborhood" in payload) fields.neighborhood.value = payload.neighborhood ?? "";
    if ("has_children" in payload) setRadioValue(fields.has_children, payload.has_children);
    if ("num_children" in payload) fields.num_children.value = payload.num_children ?? "";
    if ("child_last_visit" in payload) fields.child_last_visit.value = payload.child_last_visit ?? "";
    if ("child_service_location" in payload) fields.child_service_location.value = payload.child_service_location ?? "";
    if ("child_cost" in payload) fields.child_cost.value = payload.child_cost ?? "";
    if ("child_wait_time" in payload) fields.child_wait_time.value = payload.child_wait_time ?? "";
    if ("child_distance" in payload) fields.child_distance.value = payload.child_distance ?? "";
    if ("child_satisfaction" in payload) fields.child_satisfaction.value = payload.child_satisfaction ?? "";
    if ("last_personal_visit" in payload) fields.last_personal_visit.value = payload.last_personal_visit ?? "";
    if ("insurance" in payload) setRadioValue(fields.insurance, payload.insurance);
    if ("main_provider" in payload) fields.main_provider.value = payload.main_provider ?? "";
    if ("service_type" in payload) setCheckboxValues(fields.service_type, payload.service_type);
    if ("wait_time" in payload) fields.wait_time.value = payload.wait_time ?? "";
    if ("first_visit" in payload) setRadioValue(fields.first_visit, payload.first_visit);
    if ("reason_choice" in payload) setRadioValue(fields.reason_choice, payload.reason_choice);
    if ("quality" in payload) setRadioValue(fields.quality, payload.quality);
    if ("staff_treatment" in payload) setRadioValue(fields.staff_treatment, payload.staff_treatment);
    if ("cleanliness" in payload) setRadioValue(fields.cleanliness, payload.cleanliness);
    if ("value_for_money" in payload) setRadioValue(fields.value_for_money, payload.value_for_money);
    if ("satisfaction" in payload) setRadioValue(fields.satisfaction, payload.satisfaction);
    if ("nps" in payload) setRadioValue(fields.nps, payload.nps);
    if ("vs_public" in payload) setRadioValue(fields.vs_public, payload.vs_public);
    if ("vs_pharmacy" in payload) setRadioValue(fields.vs_pharmacy, payload.vs_pharmacy);
    if ("desired_service" in payload) fields.desired_service.value = payload.desired_service ?? "";
    if ("comments" in payload) fields.comments.value = payload.comments ?? "";
    
    // Mostrar sección de hijos si tiene hijos
    if (payload.has_children === "yes") {
      const childrenSection = document.getElementById("children-section");
      if (childrenSection) childrenSection.style.display = "block";
    }
    
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
    
    setMessage("Modo lectura");
    return true;
  }

 

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


function bindEvents() {
  // Cancelar -> regresar al dashboard
  btnCancel?.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  // Limpiar formulario
  btnClear?.addEventListener("click", () => {
    if (confirm("¿Estás seguro de limpiar el formulario? Se perderán todos los datos.")) {
      form.reset();
      document.getElementById("children-section").style.display = "none";
      setMessage("Formulario limpiado", false);
      setTimeout(() => {
        const msgEl = document.getElementById("msg");
        msgEl.textContent = "";
        msgEl.style.display = "none";
      }, 2000);
    }
  });

  // Enviar (submit del formulario)
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Validar que al menos un tipo de servicio esté seleccionado
    const serviceTypes = document.querySelectorAll('input[name="service_type"]:checked');
    if (serviceTypes.length === 0) {
      setMessage("Por favor selecciona al menos un tipo de servicio", true);
      return;
    }
    
    btnSave.disabled = true;
    btnClear.disabled = true;
    setMessage("Enviando encuesta…");
    
    try {
      await saveSurvey("submitted");
      setMessage("✅ Encuesta enviada exitosamente", false);
      // Regresar al dashboard
      setTimeout(() => (window.location.href = "index.html"), 1500);
    } catch (err) {
      setMessage("❌ " + (err.message || "No se pudo enviar"), true);
    } finally {
      btnSave.disabled = false;
      btnClear.disabled = false;
    }
  });

  // Mostrar/ocultar sección de hijos
  const hasChildrenRadios = document.getElementsByName("has_children");
  const childrenSection = document.getElementById("children-section");
  
  hasChildrenRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (getRadioValue(hasChildrenRadios) === "yes") {
        childrenSection.style.display = "block";
      } else {
        childrenSection.style.display = "none";
      }
    });
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
