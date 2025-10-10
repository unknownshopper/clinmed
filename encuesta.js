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
    gender_other: document.getElementById("gender_other")?.value || "",
    education: getRadioValue(fields.education),
    occupation: getRadioValue(fields.occupation),
    occupation_other: document.getElementById("occupation_other")?.value || "",
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
    insurance_other: document.getElementById("insurance_other")?.value || "",
    main_provider: fields.main_provider.value,
    main_provider_other: document.getElementById("main_provider_other")?.value || "",
    service_type: getCheckboxValues(fields.service_type),
    service_type_other: document.getElementById("service_type_other")?.value || "",
    wait_time: Number(fields.wait_time.value),
    first_visit: getRadioValue(fields.first_visit),
    reason_choice: getRadioValue(fields.reason_choice),
    reason_choice_other: document.getElementById("reason_choice_other")?.value || "",
    quality: Number(getRadioValue(fields.quality)),
    staff_treatment: Number(getRadioValue(fields.staff_treatment)),
    cleanliness: Number(getRadioValue(fields.cleanliness)),
    value_for_money: Number(getRadioValue(fields.value_for_money)),
    satisfaction: Number(getRadioValue(fields.satisfaction)),
    nps: Number(getRadioValue(fields.nps)),
    vs_public: getRadioValue(fields.vs_public),
    vs_pharmacy: getRadioValue(fields.vs_pharmacy),
    desired_service: fields.desired_service.value || "",
    desired_service_other: document.getElementById("desired_service_other")?.value || "",
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
    if ("quality" in payload) setRadioValue(fields.quality, String(payload.quality));
    if ("staff_treatment" in payload) setRadioValue(fields.staff_treatment, String(payload.staff_treatment));
    if ("cleanliness" in payload) setRadioValue(fields.cleanliness, String(payload.cleanliness));
    if ("value_for_money" in payload) setRadioValue(fields.value_for_money, String(payload.value_for_money));
    if ("satisfaction" in payload) setRadioValue(fields.satisfaction, String(payload.satisfaction));
    if ("nps" in payload) setRadioValue(fields.nps, String(payload.nps));
    if ("vs_public" in payload) setRadioValue(fields.vs_public, payload.vs_public);
    if ("vs_pharmacy" in payload) setRadioValue(fields.vs_pharmacy, payload.vs_pharmacy);
    if ("desired_service" in payload) fields.desired_service.value = payload.desired_service ?? "";
    if ("comments" in payload) fields.comments.value = payload.comments ?? "";
    
    // Cargar campos "Otro" si existen
    if ("gender_other" in payload && payload.gender_other) {
      const genderOther = document.getElementById("gender_other");
      if (genderOther) {
        genderOther.value = payload.gender_other;
        genderOther.classList.add("show");
      }
    }
    if ("occupation_other" in payload && payload.occupation_other) {
      const occupationOther = document.getElementById("occupation_other");
      if (occupationOther) {
        occupationOther.value = payload.occupation_other;
        occupationOther.classList.add("show");
      }
    }
    if ("insurance_other" in payload && payload.insurance_other) {
      const insuranceOther = document.getElementById("insurance_other");
      if (insuranceOther) {
        insuranceOther.value = payload.insurance_other;
        insuranceOther.classList.add("show");
      }
    }
    if ("main_provider_other" in payload && payload.main_provider_other) {
      const mainProviderOther = document.getElementById("main_provider_other");
      if (mainProviderOther) {
        mainProviderOther.value = payload.main_provider_other;
        mainProviderOther.classList.add("show");
      }
    }
    if ("service_type_other" in payload && payload.service_type_other) {
      const serviceTypeOther = document.getElementById("service_type_other");
      if (serviceTypeOther) {
        serviceTypeOther.value = payload.service_type_other;
        serviceTypeOther.classList.add("show");
      }
    }
    if ("reason_choice_other" in payload && payload.reason_choice_other) {
      const reasonOther = document.getElementById("reason_choice_other");
      if (reasonOther) {
        reasonOther.value = payload.reason_choice_other;
        reasonOther.classList.add("show");
      }
    }
    if ("desired_service_other" in payload && payload.desired_service_other) {
      const desiredServiceOther = document.getElementById("desired_service_other");
      if (desiredServiceOther) {
        desiredServiceOther.value = payload.desired_service_other;
        desiredServiceOther.classList.add("show");
      }
    }
    
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
    
    // Siempre deshabilitar formulario al cargar
    setFormDisabled(true);
    
    // Ocultar botones de guardado
    btnSave?.classList.add("hidden");
    btnClear?.classList.add("hidden");
    
    // Mostrar metadatos
    const metadataContainer = document.getElementById("survey-metadata");
    const metadataContent = document.getElementById("metadata-content");
    
    if (metadataContainer && metadataContent) {
      metadataContainer.style.display = "block";
      
      // Formatear fecha
      const createdAt = data.created_at?.toDate ? 
        data.created_at.toDate().toLocaleString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) : "Sin fecha";
      
      // Construir HTML de metadatos
      let metaHtml = `
        <div style="display:grid; gap:8px;">
          <div><strong>👤 Encuestador:</strong> ${data.payload?.surveyor_id || "Desconocido"}</div>
          <div><strong>📅 Fecha y hora:</strong> ${createdAt}</div>
          <div><strong>📊 Estado:</strong> <span style="background:#dbeafe; padding:2px 8px; border-radius:4px;">${data.status || 'submitted'}</span></div>
      `;
      
      // Agregar ubicación si existe
      if (data.location?.lat && data.location?.lng) {
        const { lat, lng, accuracy } = data.location;
        const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        metaHtml += `
          <div>
            <strong>📍 Ubicación:</strong> 
            <a href="${gmapsUrl}" target="_blank" rel="noopener" style="color:#1e88e5; text-decoration:none;">
              ${coords}${accuracy ? ` (~${Math.round(accuracy)}m de precisión)` : ''}
            </a>
          </div>
        `;
      } else {
        metaHtml += `<div><strong>📍 Ubicación:</strong> No disponible</div>`;
      }
      
      metaHtml += `</div>`;
      metadataContent.innerHTML = metaHtml;
    }
    
    // Mostrar mensaje según rol
    const role = await getMyRole();
    if (role === "admin") {
      setMessage("📖 Modo lectura - Puedes editar esta encuesta usando el hash #edit en la URL");
    } else {
      setMessage("📖 Modo solo lectura");
    }
    
    return true;
  }



// Acciones: editar (solo admin)
// Esta lógica solo se ejecuta si hay un ID de encuesta en la URL
const urlParams = new URLSearchParams(location.search);
const surveyId = urlParams.get("id");

if (surveyId) {
  // Solo admin puede editar encuestas existentes
  async function setupEditMode() {
    const role = await getMyRole();
    
    if (role === "admin") {
      // Crear botón de editar si no existe
      let btnEdit = document.getElementById("btn-edit");
      if (!btnEdit) {
        btnEdit = document.createElement("button");
        btnEdit.id = "btn-edit";
        btnEdit.className = "btn";
        btnEdit.textContent = "✏️ Editar";
        btnEdit.style.marginLeft = "10px";
        btnCancel?.parentElement?.insertBefore(btnEdit, btnCancel.nextSibling);
      }
      
      btnEdit.addEventListener("click", async () => {
        setFormDisabled(false);
        btnSave?.classList.remove("hidden");
        btnClear?.classList.remove("hidden");
        setMessage("✏️ Modo edición activado. Guarda los cambios cuando termines.");
        
        // Reusar el submit existente para guardar edición
        form.onsubmit = async (e) => {
          e.preventDefault();
          try {
            validateForm();
            const newPayload = serializePayload();
            await updateDoc(doc(db, "surveys", surveyId), {
              payload: newPayload,
              updated_at: serverTimestamp()
            });
            setMessage("✅ Encuesta actualizada exitosamente.");
            setFormDisabled(true);
            btnSave?.classList.add("hidden");
            btnClear?.classList.add("hidden");
            
            // Recargar para mostrar cambios
            setTimeout(() => location.reload(), 1500);
          } catch (err) {
            setMessage("❌ " + (err.message || "No se pudo actualizar"), true);
          }
        };
      });
    }
  }
  
  // Ejecutar después de cargar el usuario
  setTimeout(setupEditMode, 500);
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
  
  // Configurar campos "Otro"
  setupOtherFields();
}
 


// Manejar campos "Otro" dinámicos
function setupOtherFields() {
  // Género
  const genderRadios = document.getElementsByName("gender");
  const genderOther = document.getElementById("gender_other");
  genderRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "Otro" && radio.checked) {
        genderOther?.classList.add("show");
      } else if (radio.checked) {
        genderOther?.classList.remove("show");
      }
    });
  });

  // Ocupación
  const occupationRadios = document.getElementsByName("occupation");
  const occupationOther = document.getElementById("occupation_other");
  occupationRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "Otro" && radio.checked) {
        occupationOther?.classList.add("show");
      } else if (radio.checked) {
        occupationOther?.classList.remove("show");
      }
    });
  });

  // Seguro médico
  const insuranceRadios = document.getElementsByName("insurance");
  const insuranceOther = document.getElementById("insurance_other");
  insuranceRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "Otro" && radio.checked) {
        insuranceOther?.classList.add("show");
      } else if (radio.checked) {
        insuranceOther?.classList.remove("show");
      }
    });
  });

  // Proveedor principal
  const mainProvider = document.getElementById("main_provider");
  const mainProviderOther = document.getElementById("main_provider_other");
  mainProvider?.addEventListener("change", () => {
    if (mainProvider.value === "Otro") {
      mainProviderOther?.classList.add("show");
    } else {
      mainProviderOther?.classList.remove("show");
    }
  });

  // Tipo de servicio (checkbox)
  const serviceTypeCheckboxes = document.getElementsByName("service_type");
  const serviceTypeOther = document.getElementById("service_type_other");
  serviceTypeCheckboxes.forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      const otroChecked = Array.from(serviceTypeCheckboxes).some(cb => cb.value === "Otro" && cb.checked);
      if (otroChecked) {
        serviceTypeOther?.classList.add("show");
      } else {
        serviceTypeOther?.classList.remove("show");
      }
    });
  });

  // Razón de elección
  const reasonRadios = document.getElementsByName("reason_choice");
  const reasonOther = document.getElementById("reason_choice_other");
  reasonRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "Otro" && radio.checked) {
        reasonOther?.classList.add("show");
      } else if (radio.checked) {
        reasonOther?.classList.remove("show");
      }
    });
  });

  // Servicio deseado
  const desiredService = document.getElementById("desired_service");
  const desiredServiceOther = document.getElementById("desired_service_other");
  desiredService?.addEventListener("change", () => {
    if (desiredService.value === "Otro") {
      desiredServiceOther?.classList.add("show");
    } else {
      desiredServiceOther?.classList.remove("show");
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
    if (paramsHash === "#edit" && currentRole === "admin") {
      document.getElementById("btn-edit")?.click();
    }
  });
}
window.addEventListener("DOMContentLoaded", boot);
