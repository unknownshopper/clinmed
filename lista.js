// Fixed lista.js - Complete file with corrections

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  deleteDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBlwKRRryoxAK620PmE8GorHrne5tE9t8Q",
  authDomain: "clinmed-d9151.firebaseapp.com",
  projectId: "clinmed-d9151",
  storageBucket: "clinmed-d9151.appspot.com",
  messagingSenderId: "779598822875",
  appId: "1:779598822875:web:c155fbbe83cbdc6ba2fbfe"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false
});

// UI Elements
const el = (id) => document.getElementById(id);
const userEmail = el("user-email");
const btnBack = el("btn-back");
const btnRefresh = el("btn-refresh");
const btnExport = el("btn-export");
const searchInput = el("search-input");
const filterStatus = el("filter-status");
const surveysTbody = el("surveys-tbody");
const totalCount = el("total-count");
const lastUpdate = el("last-update");
const statTotal = el("stat-total");
const statSubmitted = el("stat-submitted");
const statDraft = el("stat-draft");
const statApproved = el("stat-approved");

// Estado
let currentUser = null;
let currentRole = null;
let allSurveys = [];
let filteredSurveys = [];

// Obtener rol del usuario
async function getMyRole() {
  if (!currentUser) return null;
  const email = currentUser.email.toLowerCase();
  
  if (email === "admin@unknownshoppers.com") return "admin";
  if (email === "supervision@clinmed.com") return "supervisor";
  if (email === "encuestra@clinmed.com") return "encuestador";
  if (email === "encuestador1@clinmed.com") return "encuestador";
  if (email === "encuestador2@clinmed.com") return "encuestador";
  if (email === "encuestador3@clinmed.com") return "encuestador";
  
  const r = await getDoc(doc(db, "profiles", currentUser.uid));
  return r.exists() ? (r.data().role || null) : null;
}

function isAdmin() {
  return currentRole === "admin";
}

function canEdit() {
  return currentRole === "admin";
}

// Cargar encuestas
async function loadSurveys() {
  if (!currentUser) return;
  
  const coll = collection(db, "surveys");
  try {
    let q;
    if (isAdmin() || currentRole === "supervisor") {
      q = query(coll, orderBy("created_at", "desc"), limit(250));
    } else {
      q = query(
        coll,
        where("created_by", "==", currentUser.uid),
        orderBy("created_at", "desc"),
        limit(250)
      );
    }
    
    const qs = await getDocs(q);
    allSurveys = qs.docs.map((d, i) => ({
      id: d.id,
      index: i + 1,
      ...d.data()
    }));
    
  } catch (e) {
    if (e?.code === "failed-precondition") {
      let q2;
      if (isAdmin() || currentRole === "supervisor") {
        q2 = query(coll, limit(250));
      } else {
        q2 = query(coll, where("created_by", "==", currentUser.uid), limit(250));
      }
      const qs = await getDocs(q2);
      
      const docs = qs.docs.slice().sort((a, b) => {
        const ta = a.data().created_at?.toMillis?.() ?? 0;
        const tb = b.data().created_at?.toMillis?.() ?? 0;
        return tb - ta;
      });
      
      allSurveys = docs.map((d, i) => ({
        id: d.id,
        index: i + 1,
        ...d.data()
      }));
    } else {
      console.error(e);
      surveysTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:60px 20px;color:#b91c1c;">
        <div style="font-size: 48px;margin-bottom: 16px;">⚠️</div>
        <div style="font-size: 16px;font-weight: 500;">Error al cargar encuestas</div>
        <div style="font-size: 14px;margin-top: 8px;">${e.message}</div>
      </td></tr>`;
      return;
    }
  }
  
  filteredSurveys = [...allSurveys];
  updateStats();
  renderTable();
  updateLastUpdate();
}

// Actualizar estadísticas
function updateStats() {
  const total = allSurveys.length;
  const submitted = allSurveys.filter(s => s.status === 'submitted').length;
  const draft = allSurveys.filter(s => s.status === 'draft').length;
  const approved = allSurveys.filter(s => s.status === 'approved').length;
  
  statTotal.textContent = total;
  statSubmitted.textContent = submitted;
  statDraft.textContent = draft;
  statApproved.textContent = approved;
}

// Filtrar encuestas
function filterSurveys() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const statusFilter = filterStatus.value;
  
  filteredSurveys = allSurveys.filter(survey => {
    const matchesSearch = !searchTerm || 
      (survey.payload?.surveyor_id || "").toLowerCase().includes(searchTerm);
    const matchesStatus = !statusFilter || survey.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  renderTable();
}

// Renderizar tabla
function renderTable() {
  if (filteredSurveys.length === 0) {
    surveysTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:60px 20px;color:var(--muted);">
      <div style="font-size: 48px;margin-bottom: 16px;">🔍</div>
      <div style="font-size: 16px;font-weight: 500;">No se encontraron encuestas</div>
      <div style="font-size: 14px;margin-top: 8px;">Intenta ajustar los filtros de búsqueda</div>
    </td></tr>`;
    totalCount.textContent = `0 resultados`;
    return;
  }
  
  surveysTbody.innerHTML = filteredSurveys.map(survey => {
    const label = `Clinmed${String(survey.index).padStart(3, "0")}`;
    const encuestador = survey.payload?.surveyor_id || "Desconocido";
    const fecha = survey.created_at?.toDate ? 
      survey.created_at.toDate().toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }) : "Sin fecha";
    
    let ubicacion = '<span style="color:var(--muted);font-size:13px;">Sin ubicación</span>';
    if (survey.location?.lat && survey.location?.lng) {
      const { lat, lng, accuracy } = survey.location;
      const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      ubicacion = `<a href="${gmapsUrl}" target="_blank" rel="noopener" class="location-link">
        📍 ${coords}${accuracy ? ` <span style="color:var(--muted);">(~${Math.round(accuracy)}m)</span>` : ''}
      </a>`;
    }
    
    const estado = survey.status || "submitted";
    const estadoClass = {
      'submitted': 'status-submitted',
      'draft': 'status-draft',
      'approved': 'status-approved'
    }[estado] || 'status-submitted';
    
    const estadoLabel = {
      'submitted': 'Enviada',
      'draft': 'Borrador',
      'approved': 'Aprobada'
    }[estado] || estado;
    
    return `<tr>
      <td><span class="survey-number">${label}</span></td>
      <td>${encuestador}</td>
      <td style="font-size:13px;color:var(--muted);">${fecha}</td>
      <td>${ubicacion}</td>
      <td><span class="status-badge ${estadoClass}">${estadoLabel}</span></td>
      <td>
        <div class="action-buttons">
          <a href="encuesta.html?id=${survey.id}" class="btn-action">👁️ Ver</a>
          <button onclick="window.open('encuesta.html?id=${survey.id}', '_blank')" class="btn-action">📸 Captura</button>
          ${canEdit() ? `<a href="encuesta.html?id=${survey.id}#edit" class="btn-action">✏️ Editar</a>` : ''}
          ${isAdmin() ? `<button class="btn-action btn-delete" data-del="${survey.id}">🗑️ Eliminar</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
  
  totalCount.textContent = `${filteredSurveys.length} resultado${filteredSurveys.length !== 1 ? 's' : ''}`;
}

// Eliminar encuesta
async function deleteSurvey(id) {
  if (!id) return;
  if (!isAdmin()) {
    return alert("Solo admin puede eliminar encuestas.");
  }
  
  const ok = confirm("¿Eliminar esta encuesta de forma permanente?");
  if (!ok) return;
  
  try {
    const ref = doc(db, "surveys", id);
    await deleteDoc(ref);
    await loadSurveys();
  } catch (e) {
    console.error(e);
    alert("Error al eliminar: " + e.message);
  }
}

// Actualizar última actualización
function updateLastUpdate() {
  const now = new Date().toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  lastUpdate.textContent = `Última actualización: ${now}`;
}

// Exportar a CSV
function exportToCSV() {
  if (filteredSurveys.length === 0) {
    return alert("No hay encuestas para exportar");
  }
  
  const headers = ['N° Encuesta', 'Encuestador', 'Fecha', 'Latitud', 'Longitud', 'Precisión', 'Estado'];
  const rows = filteredSurveys.map(survey => {
    const label = `Clinmed${String(survey.index).padStart(3, "0")}`;
    const encuestador = survey.payload?.surveyor_id || "Desconocido";
    const fecha = survey.created_at?.toDate ? 
      survey.created_at.toDate().toLocaleString('es-MX') : "Sin fecha";
    const lat = survey.location?.lat || '';
    const lng = survey.location?.lng || '';
    const accuracy = survey.location?.accuracy || '';
    const estado = survey.status || "submitted";
    
    return [label, encuestador, fecha, lat, lng, accuracy, estado];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `encuestas_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Event Listeners
btnBack?.addEventListener('click', () => {
  window.location.href = 'index.html';
});

btnRefresh?.addEventListener('click', loadSurveys);

btnExport?.addEventListener('click', exportToCSV);

searchInput?.addEventListener('input', filterSurveys);

filterStatus?.addEventListener('change', filterSurveys);

surveysTbody?.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-del]');
  if (!btn) return;
  const id = btn.getAttribute('data-del');
  await deleteSurvey(id);
});

// Auth state
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  
  currentUser = user;
  userEmail.textContent = user.email;
  
  currentRole = await getMyRole();
  
  await loadSurveys();
});