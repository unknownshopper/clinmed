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
const btnApplyFilters = el("btn-apply-filters");
const btnResetFilters = el("btn-reset-filters");
const btnExportReport = el("btn-export-report");
const dateFrom = el("date-from");
const dateTo = el("date-to");
const filterEncuestador = el("filter-encuestador");
const lastUpdate = el("last-update");

// Stats elements
const statTotal = el("stat-total");
const statSubmitted = el("stat-submitted");
const statApproved = el("stat-approved");
const statDraft = el("stat-draft");
const statApprovalRate = el("stat-approval-rate");
const statDailyAvg = el("stat-daily-avg");

// Chart elements
const chartBySurveyor = el("chart-by-surveyor");
const chartByDate = el("chart-by-date");
const rankingTbody = el("ranking-tbody");

// Info elements
const infoFirstDate = el("info-first-date");
const infoLastDate = el("info-last-date");
const infoActiveDays = el("info-active-days");
const infoActiveSurveyors = el("info-active-surveyors");

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

function isSupervisor() {
  return currentRole === "supervisor";
}

// Cargar encuestas
async function loadSurveys() {
  if (!currentUser) return;
  
  const coll = collection(db, "surveys");
  try {
    let q;
    if (isAdmin() || isSupervisor()) {
      q = query(coll, orderBy("created_at", "desc"), limit(500));
    } else {
      q = query(
        coll,
        where("created_by", "==", currentUser.uid),
        orderBy("created_at", "desc"),
        limit(500)
      );
    }
    
    const qs = await getDocs(q);
    allSurveys = qs.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    
  } catch (e) {
    if (e?.code === "failed-precondition") {
      let q2;
      if (isAdmin() || isSupervisor()) {
        q2 = query(coll, limit(500));
      } else {
        q2 = query(coll, where("created_by", "==", currentUser.uid), limit(500));
      }
      const qs = await getDocs(q2);
      
      const docs = qs.docs.slice().sort((a, b) => {
        const ta = a.data().created_at?.toMillis?.() ?? 0;
        const tb = b.data().created_at?.toMillis?.() ?? 0;
        return tb - ta;
      });
      
      allSurveys = docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
    } else {
      console.error(e);
      alert("Error al cargar encuestas: " + e.message);
      return;
    }
  }
  
  // Poblar filtro de encuestadores
  populateEncuestadorFilter();
  
  // Aplicar filtros y renderizar
  applyFilters();
}

// Poblar filtro de encuestadores
function populateEncuestadorFilter() {
  const encuestadores = new Set();
  allSurveys.forEach(survey => {
    const encuestador = survey.payload?.surveyor_id;
    if (encuestador) {
      encuestadores.add(encuestador);
    }
  });
  
  filterEncuestador.innerHTML = '<option value="">Todos los encuestadores</option>';
  Array.from(encuestadores).sort().forEach(enc => {
    const option = document.createElement('option');
    option.value = enc;
    option.textContent = enc;
    filterEncuestador.appendChild(option);
  });
}

// Aplicar filtros
function applyFilters() {
  const fromDate = dateFrom.value ? new Date(dateFrom.value) : null;
  const toDate = dateTo.value ? new Date(dateTo.value + 'T23:59:59') : null;
  const encuestadorFilter = filterEncuestador.value;
  
  filteredSurveys = allSurveys.filter(survey => {
    // Filtro por fecha
    if (fromDate || toDate) {
      const surveyDate = survey.created_at?.toDate ? survey.created_at.toDate() : null;
      if (!surveyDate) return false;
      if (fromDate && surveyDate < fromDate) return false;
      if (toDate && surveyDate > toDate) return false;
    }
    
    // Filtro por encuestador
    if (encuestadorFilter) {
      const surveyEncuestador = survey.payload?.surveyor_id || "";
      if (surveyEncuestador !== encuestadorFilter) return false;
    }
    
    return true;
  });
  
  renderDashboard();
}

// Renderizar dashboard completo
function renderDashboard() {
  updateStats();
  renderChartBySurveyor();
  renderChartByDate();
  renderRanking();
  updateInfo();
  updateLastUpdate();
}

// Actualizar estadísticas
function updateStats() {
  const total = filteredSurveys.length;
  const submitted = filteredSurveys.filter(s => s.status === 'submitted').length;
  const draft = filteredSurveys.filter(s => s.status === 'draft').length;
  const approved = filteredSurveys.filter(s => s.status === 'approved').length;
  
  statTotal.textContent = total;
  statSubmitted.textContent = submitted;
  statDraft.textContent = draft;
  statApproved.textContent = approved;
  
  // Tasa de aprobación
  const totalCompleted = submitted + approved;
  const approvalRate = totalCompleted > 0 ? ((approved / totalCompleted) * 100).toFixed(1) : 0;
  statApprovalRate.textContent = `${approvalRate}%`;
  
  // Promedio diario
  if (filteredSurveys.length > 0) {
    const dates = filteredSurveys
      .map(s => s.created_at?.toDate())
      .filter(d => d)
      .sort((a, b) => a - b);
    
    if (dates.length > 0) {
      const firstDate = dates[0];
      const lastDate = dates[dates.length - 1];
      const daysDiff = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1);
      const dailyAvg = (filteredSurveys.length / daysDiff).toFixed(1);
      statDailyAvg.textContent = dailyAvg;
    } else {
      statDailyAvg.textContent = '0';
    }
  } else {
    statDailyAvg.textContent = '0';
  }
}

// Renderizar gráfico por encuestador
function renderChartBySurveyor() {
  const surveyorCounts = {};
  
  filteredSurveys.forEach(survey => {
    const surveyor = survey.payload?.surveyor_id || "Desconocido";
    surveyorCounts[surveyor] = (surveyorCounts[surveyor] || 0) + 1;
  });
  
  const sorted = Object.entries(surveyorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  if (sorted.length === 0) {
    chartBySurveyor.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div style="font-size: 16px; font-weight: 500;">No hay datos para mostrar</div>
      </div>
    `;
    return;
  }
  
  const maxCount = Math.max(...sorted.map(s => s[1]));
  
  chartBySurveyor.innerHTML = sorted.map(([surveyor, count]) => {
    const percentage = (count / maxCount) * 100;
    return `
      <div class="bar-item">
        <div class="bar-label">${surveyor}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${percentage}%">${count}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Renderizar gráfico por fecha
function renderChartByDate() {
  const dateCounts = {};
  
  filteredSurveys.forEach(survey => {
    const date = survey.created_at?.toDate();
    if (date) {
      const dateStr = date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    }
  });
  
  const sorted = Object.entries(dateCounts)
    .sort((a, b) => new Date(a[0].split('/').reverse().join('-')) - new Date(b[0].split('/').reverse().join('-')))
    .slice(-15);
  
  if (sorted.length === 0) {
    chartByDate.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📈</div>
        <div style="font-size: 16px; font-weight: 500;">No hay datos para mostrar</div>
      </div>
    `;
    return;
  }
  
  const maxCount = Math.max(...sorted.map(s => s[1]));
  
  chartByDate.innerHTML = sorted.map(([date, count]) => {
    const percentage = (count / maxCount) * 100;
    return `
      <div class="bar-item">
        <div class="bar-label">${date}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${percentage}%">${count}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Renderizar ranking
function renderRanking() {
  const surveyorStats = {};
  
  filteredSurveys.forEach(survey => {
    const surveyor = survey.payload?.surveyor_id || "Desconocido";
    if (!surveyorStats[surveyor]) {
      surveyorStats[surveyor] = {
        total: 0,
        approved: 0,
        submitted: 0,
        draft: 0
      };
    }
    
    surveyorStats[surveyor].total++;
    if (survey.status === 'approved') surveyorStats[surveyor].approved++;
    if (survey.status === 'submitted') surveyorStats[surveyor].submitted++;
    if (survey.status === 'draft') surveyorStats[surveyor].draft++;
  });
  
  const ranking = Object.entries(surveyorStats)
    .map(([surveyor, stats]) => {
      const completedCount = stats.approved + stats.submitted;
      const approvalRate = completedCount > 0 ? ((stats.approved / completedCount) * 100).toFixed(1) : 0;
      return {
        surveyor,
        ...stats,
        approvalRate: parseFloat(approvalRate)
      };
    })
    .sort((a, b) => b.total - a.total);
  
  if (ranking.length === 0) {
    rankingTbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div class="empty-state-icon">🏆</div>
          <div style="font-size: 16px; font-weight: 500;">No hay datos para mostrar</div>
        </td>
      </tr>
    `;
    return;
  }
  
  rankingTbody.innerHTML = ranking.map((item, index) => `
    <tr>
      <td style="font-weight: 600; color: ${index < 3 ? 'var(--primary)' : 'inherit'};">
        ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
      </td>
      <td style="font-weight: 500;">${item.surveyor}</td>
      <td style="font-weight: 600;">${item.total}</td>
      <td style="color: #2e7d32;">${item.approved}</td>
      <td style="color: #1565c0;">${item.submitted}</td>
      <td style="font-weight: 600; color: ${item.approvalRate >= 80 ? '#2e7d32' : item.approvalRate >= 50 ? '#e65100' : '#b91c1c'};">
        ${item.approvalRate}%
      </td>
    </tr>
  `).join('');
}

// Actualizar información del período
function updateInfo() {
  if (filteredSurveys.length === 0) {
    infoFirstDate.textContent = '—';
    infoLastDate.textContent = '—';
    infoActiveDays.textContent = '—';
    infoActiveSurveyors.textContent = '—';
    return;
  }
  
  const dates = filteredSurveys
    .map(s => s.created_at?.toDate())
    .filter(d => d)
    .sort((a, b) => a - b);
  
  if (dates.length > 0) {
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    
    infoFirstDate.textContent = firstDate.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    infoLastDate.textContent = lastDate.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const daysDiff = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;
    infoActiveDays.textContent = daysDiff;
  }
  
  const uniqueSurveyors = new Set(
    filteredSurveys
      .map(s => s.payload?.surveyor_id)
      .filter(s => s)
  );
  infoActiveSurveyors.textContent = uniqueSurveyors.size;
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

// Restablecer filtros
function resetFilters() {
  dateFrom.value = '';
  dateTo.value = '';
  filterEncuestador.value = '';
  applyFilters();
}

// Exportar reporte
function exportReport() {
  if (filteredSurveys.length === 0) {
    return alert("No hay datos para exportar");
  }
  
  const headers = [
    'Encuestador',
    'Total',
    'Aprobadas',
    'Enviadas',
    'Borradores',
    'Tasa Aprobación (%)',
    'Fecha Primera',
    'Fecha Última'
  ];
  
  const surveyorStats = {};
  
  filteredSurveys.forEach(survey => {
    const surveyor = survey.payload?.surveyor_id || "Desconocido";
    const date = survey.created_at?.toDate();
    
    if (!surveyorStats[surveyor]) {
      surveyorStats[surveyor] = {
        total: 0,
        approved: 0,
        submitted: 0,
        draft: 0,
        dates: []
      };
    }
    
    surveyorStats[surveyor].total++;
    if (survey.status === 'approved') surveyorStats[surveyor].approved++;
    if (survey.status === 'submitted') surveyorStats[surveyor].submitted++;
    if (survey.status === 'draft') surveyorStats[surveyor].draft++;
    if (date) surveyorStats[surveyor].dates.push(date);
  });
  
  const rows = Object.entries(surveyorStats).map(([surveyor, stats]) => {
    const completedCount = stats.approved + stats.submitted;
    const approvalRate = completedCount > 0 ? ((stats.approved / completedCount) * 100).toFixed(1) : 0;
    
    const sortedDates = stats.dates.sort((a, b) => a - b);
    const firstDate = sortedDates.length > 0 ? sortedDates[0].toLocaleDateString('es-MX') : '';
    const lastDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1].toLocaleDateString('es-MX') : '';
    
    return [
      surveyor,
      stats.total,
      stats.approved,
      stats.submitted,
      stats.draft,
      approvalRate,
      firstDate,
      lastDate
    ];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `reporte_resultados_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Event Listeners
btnBack?.addEventListener('click', () => {
  window.location.href = 'index.html';
});

btnApplyFilters?.addEventListener('click', applyFilters);

btnResetFilters?.addEventListener('click', resetFilters);

btnExportReport?.addEventListener('click', exportReport);

// Auth state
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  
  currentUser = user;
  userEmail.textContent = user.email;
  
  currentRole = await getMyRole();
  
  // Verificar permisos
  if (!isAdmin() && !isSupervisor()) {
    alert("No tienes permisos para acceder a esta página");
    window.location.href = 'index.html';
    return;
  }
  
  await loadSurveys();
});