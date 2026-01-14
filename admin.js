// ===================== seamless-dash-admin / admin.js =====================

// 🔥 Firebase config (same project as game)
const firebaseConfig = {
  apiKey: "AIzaSyBJcK4zEK2Rb-Er8O7iDNYsGW2HUJANPBc",
  authDomain: "seamless-dash.firebaseapp.com",
  projectId: "seamless-dash"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let AES_KEY = null;
let refreshTimer = null;

// ---------- AES-GCM DECRYPT ----------
async function decrypt(encData, encIv) {
  const keyData = new TextEncoder().encode(AES_KEY);
  const hash = await crypto.subtle.digest("SHA-256", keyData);
  const key = await crypto.subtle.importKey("raw", hash, { name:"AES-GCM" }, false, ["decrypt"]);

  const iv = Uint8Array.from(atob(encIv), c=>c.charCodeAt(0));
  const data = Uint8Array.from(atob(encData), c=>c.charCodeAt(0));

  const plain = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plain);
}

// ---------- AUTH ----------
document.getElementById("btn-login").onclick = async () => {
  try {
    await auth.signInWithEmailAndPassword(
      email.value,
      password.value
    );
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("key-screen").classList.remove("hidden");
  } catch(e) {
  document.getElementById("auth-error").textContent = e.message;

  }
};

document.getElementById("btn-key").onclick = () => {
  AES_KEY = document.getElementById("aes-key").value;
  if(!AES_KEY) return;

  document.getElementById("key-screen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  loadPlayers();
  refreshTimer = setInterval(loadPlayers, 10 * 60 * 1000); // 10 min
};

document.getElementById("btn-logout").onclick = async () => {
  clearInterval(refreshTimer);
  AES_KEY = null;
  await auth.signOut();
  location.reload();
};

// ---------- LOAD PLAYERS ----------
async function loadPlayers() {
  const tbody = document.getElementById("player-table");
  tbody.innerHTML = "";

  const snap = await db.collection("players").get();

  for(const doc of snap.docs) {
    const p = doc.data();
    let pid = "❌";

    try {
      pid = await decrypt(p.pid_enc, p.pid_iv);
    } catch {}

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${pid}</td>
      <td>${p.highScore}</td>
      <td>${new Date(p.lastSeen).toLocaleString()}</td>
      <td><span class="badge ${p.banned?"yes":"no"}">${p.banned?"YES":"NO"}</span></td>
      <td><button data-id="${doc.id}">${p.banned?"Unban":"Ban"}</button></td>
    `;
    tr.querySelector("button").onclick = () => toggleBan(doc.id, p.banned);
    tbody.appendChild(tr);
  }
}

// ---------- BAN ----------
async function toggleBan(id, banned) {
  await db.collection("players").doc(id).update({ banned: !banned });
  loadPlayers();
}

// ---------- EXPORT ----------
function exportCSV() {
  let rows = [["Name","Poornata ID","High Score","Last Seen","Banned"]];
  document.querySelectorAll("#player-table tr").forEach(tr=>{
    rows.push([...tr.children].map(td=>td.innerText));
  });
  download(rows.map(r=>r.join(",")).join("\n"), "seamless-dash.csv");
}

function exportXLS() {
  exportCSV(); // Excel opens CSV cleanly
}

function download(data, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data]));
  a.download = name;
  a.click();
}

btn-export-csv.onclick = exportCSV;
btn-export-xls.onclick = exportXLS;
btn-refresh.onclick = loadPlayers;

// 🔏 Author watermark
Object.defineProperty(window,"__SD_ADMIN_AUTHOR__",{
  value:"© Prasidha Jagtap – Seamless Dash Admin",
  writable:false
});
