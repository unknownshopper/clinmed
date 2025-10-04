// script.js — Firebase Auth + Firestore (type=module en index.html)

// 1) Importar SDK modular desde CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, query, where, orderBy, limit,
  getDocs, serverTimestamp,
  getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 2) Configuración Firebase (rellena con tus datos)
const firebaseConfig = {
    apiKey: "AIzaSyBlwKRRryoxAK620PmE8GorHrne5tE9t8Q",
    authDomain: "clinmed-d9151.firebaseapp.com",
    projectId: "clinmed-d9151",
    storageBucket: "clinmed-d9151.firebasestorage.app",
    messagingSenderId: "779598822875",
    appId: "1:779598822875:web:c155fbbe83cbdc6ba2fbfe"
  };

// 3) Inicializar
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 4) UI refs
const el = (id) => document.getElementById(id);
const viewAuth = el("view-auth");
const viewDashboard = el("view-dashboard");
const userEmail = el("user-email");
const btnLogout = el("btn-logout");

const tabs = document.querySelectorAll(".tab");
const panelEncuestador = el("view-encuestador");
const panelSupervisor = el("view-supervisor");
const panelAdmin = el("view-admin");

const formAuth = el("form-auth");
const inputEmail = el("auth-email");
const inputPassword = el("auth-password");
const btnSignup = el("btn-signup");
const btnNewSurvey = el("btn-new-survey");
const counter = el("counter");
const surveysList = el("surveys-list");
const queueList = el("queue-list");
const usersList = el("users-list");
const formAssignRole = el("form-assign-role");
const roleEmail = el("role-email");
const roleSelect = el("role-select");

// 5) Estado
let currentUser = null;     // auth.currentUser
let currentProfile = null;  // { email, role }

// 6) Vistas
function showAuth() {
  viewAuth.style.display = "block";
  viewDashboard.style.display = "none";
  userEmail.textContent = "";
  btnLogout.style.display = "none";
}
function showDashboard() {
  viewAuth.style.display = "none";
  viewDashboard.style.display = "block";
  btnLogout.style.display = "inline-flex";
}
function setActiveTab(name) {
  tabs.forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => (p.style.display = "none"));
  const btn = document.querySelector(`.tab[data-tab="${name}"]`);
  const panel = el(`view-${name}`);
  if (btn) btn.classList.add("active");
  if (panel) panel.style.display = "block";
}
function applyRoleVisibility(role) {
  const tabEncu = document.querySelector('.tab[data-tab="encuestador"]');
  const tabSup = document.querySelector('.tab[data-tab="supervisor"]');
  const tabAdm = document.querySelector('.tab[data-tab="admin"]');

  if (role === "encuestador") {
    tabEncu.style.display = "inline-flex";
    tabSup.style.display = "none";
    tabAdm.style.display = "none";
    setActiveTab("encuestador");
  } else if (role === "supervisor") {
    tabEncu.style.display = "inline-flex";
    tabSup.style.display = "inline-flex";
    tabAdm.style.display = "none";
    setActiveTab("supervisor");
  } else if (role === "admin") {
    tabEncu.style.display = "inline-flex";
    tabSup.style.display = "inline-flex";
    tabAdm.style.display = "inline-flex";
    setActiveTab("admin");
  } else {
    tabEncu.style.display = "none";
    tabSup.style.display = "none";
    tabAdm.style.display = "none";
  }
}

// 7) Perfiles y roles
async function ensureProfile(user) {
  const ref = doc(db, "profiles", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { email: user.email ?? "", role: null });
    return { email: user.email ?? "", role: null };
  }
  return snap.data();
}

async function upsertRoleByEmail(email, role) {
  // Búsqueda simple: iterar (en producción usarías un índice por email o almacenar UID aparte).
  const profilesRef = collection(db, "profiles");
  const q = query(profilesRef, where("email", "==", email));
  const qs = await getDocs(q);
  if (qs.empty) throw new Error("Usuario no encontrado");
  const ref = qs.docs[0].ref;
  await updateDoc(ref, { role });
}

// 8) Encuestas
async function loadCounts() {
    // Si no hay perfil o no hay rol, no intentes contar
    if (!currentProfile?.role) {
      if (counter) counter.textContent = `— / 250`;
      return;
    }
    // Solo supervisor/admin pueden contar todas las encuestas (reglas lo permiten)
    if (['supervisor','admin'].includes(currentProfile.role)) {
      try {
        const coll = collection(db, "surveys");
        const snap = await getCountFromServer(coll);
        const total = snap.data().count ?? 0;
        if (counter) counter.textContent = `${total} / 250`;
        if (btnNewSurvey && total >= 250) btnNewSurvey.disabled = true;
      } catch (e) {
        // En caso de restricciones o error de red
        if (counter) counter.textContent = `— / 250`;
      }
    } else {
      // Encuestador: no intentamos leer global para evitar 403
      if (counter) counter.textContent = `— / 250`;
    }
  }

async function listOwnSurveys() {
  if (!currentUser) return;
  const coll = collection(db, "surveys");
  const q1 = query(
    coll,
    where("created_by", "==", currentUser.uid),
    orderBy("created_at", "desc"),
    limit(50)
  );
  const qs = await getDocs(q1);
  surveysList.innerHTML = qs.docs
    .map((d) => {
      const s = d.data();
      const createdAt = s.created_at?.toDate
        ? s.created_at.toDate().toLocaleString()
        : "";
      return `<div class="card"><strong>${d.id}</strong><div class="muted">${s.status} — ${createdAt}</div></div>`;
    })
    .join("");
}

async function listQueue() {
  if (!currentProfile?.role || !["supervisor", "admin"].includes(currentProfile.role)) return;
  const coll = collection(db, "surveys");
  const q1 = query(coll, where("status", "==", "submitted"), orderBy("created_at", "desc"), limit(50));
  const qs = await getDocs(q1);
  queueList.innerHTML = qs.docs
    .map((d) => {
      const s = d.data();
      const createdAt = s.created_at?.toDate
        ? s.created_at.toDate().toLocaleString()
        : "";
      return `<div class="card">
        <div><strong>${d.id}</strong> · ${s.status}</div>
        <div class="muted">${createdAt}</div>
        <div class="row">
          <button class="btn" data-approve="${d.id}">Aprobar</button>
          <button class="btn btn-outline" data-reject="${d.id}">Rechazar</button>
        </div>
      </div>`;
    })
    .join("");
}

async function listUsers() {
  if (currentProfile?.role !== "admin") return;
  const coll = collection(db, "profiles");
  const qs = await getDocs(coll);
  usersList.innerHTML = qs.docs
    .map((d) => {
      const u = d.data();
      return `<div class="card"><strong>${u.email}</strong><div class="muted">rol: ${u.role ?? "(pendiente)"}</div></div>`;
    })
    .join("");
}

async function createSurveyDraft() {
    if (!currentUser) return;
  
    // Solo supervisor/admin validan el límite global mediante agregación.
    // Los encuestadores no consultan el conteo global para evitar 403 por reglas.
    if (['supervisor','admin'].includes(currentProfile?.role)) {
      const cnt = await getCountFromServer(collection(db, "surveys"));
      if ((cnt.data().count ?? 0) >= 250) {
        alert("Se alcanzó el límite de 250 encuestas.");
        return;
      }
    }
  
    const payload = { demo: true }; // TODO: reemplazar por datos reales del formulario
    await addDoc(collection(db, "surveys"), {
      created_by: currentUser.uid,
      status: "submitted",
      payload,
      created_at: serverTimestamp(),
    });
  
    await loadCounts();
    await listOwnSurveys();
  }
async function updateSurveyStatus(id, status) {
  const ref = doc(db, "surveys", id);
  await updateDoc(ref, { status });
  await listQueue();
}

// 9) Eventos
function bindEvents() {
  tabs.forEach((t) => t.addEventListener("click", () => setActiveTab(t.dataset.tab)));

  formAuth?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (inputEmail.value || "").trim();
    const password = inputPassword.value;
    if (!email || !password) return;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      alert("Credenciales inválidas");
    }
  });

  btnSignup?.addEventListener("click", async () => {
    const email = (inputEmail.value || "").trim();
    const password = inputPassword.value;
    if (!email || !password) return alert("Completa email y contraseña");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Cuenta creada. Solicita asignación de rol a un admin.");
    } catch {
      alert("No se pudo crear la cuenta");
    }
  });

  btnLogout?.addEventListener("click", async () => {
    await signOut(auth);
  });

  btnNewSurvey?.addEventListener("click", () => {
    window.location.href = "encuesta.html";
  });

  queueList?.addEventListener("click", async (e) => {
    const target = e.target.closest("button");
    if (!target) return;
    const idApprove = target.getAttribute("data-approve");
    const idReject = target.getAttribute("data-reject");
    if (idApprove) return updateSurveyStatus(idApprove, "approved");
    if (idReject) return updateSurveyStatus(idReject, "rejected");
  });

  formAssignRole?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (roleEmail.value || "").trim();
    const role = roleSelect.value;
    try {
      await upsertRoleByEmail(email, role);
      alert("Rol asignado");
      await listUsers();
    } catch {
      alert("No se pudo asignar el rol");
    }
  });
}

// 10) Sesión
async function refreshAppState() {
  currentUser = auth.currentUser;
  if (!currentUser) {
    showAuth();
    return;
  }
  userEmail.textContent = currentUser.email ?? "";
  try {
    currentProfile = await ensureProfile(currentUser);
  } catch (e) {
    console.error(e);
  }
  applyRoleVisibility(currentProfile?.role);
  showDashboard();
  await loadCounts();
  await listOwnSurveys();
  await listQueue();
  await listUsers();
}

// 11) Boot
function boot() {
  bindEvents();
  onAuthStateChanged(auth, async () => {
    await refreshAppState();
  });
  // Primer render
  refreshAppState();
}
window.addEventListener("DOMContentLoaded", boot);