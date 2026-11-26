/* ================= HELPERS ================= */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const tMin=t=>{const[h,m]=t.split(':').map(Number);return h*60+m};
const minT=m=>{m=(m+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
const nowT=()=>{const d=new Date();return d.toTimeString().slice(0,5)};
const today=()=>new Date().toISOString().slice(0,10);
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const initials=n=>n.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DAYN=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const fmtD=d=>new Date(d+'T00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});

function toast(msg,type=''){const t=document.createElement('div');t.className='toast '+type;t.textContent=msg;$('#toastRoot').append(t);setTimeout(()=>t.remove(),3500)}
function modal(html){$('#modalRoot').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">${html}</div></div>`}
function closeModal(){$('#modalRoot').innerHTML=''}
function confirmModal(msg,cb){modal(`<h3>Konfirmasi</h3><p style="color:var(--muted)">${esc(msg)}</p>
<div class="modal-actions"><button class="btn" onclick="closeModal()">Batal</button>
<button class="btn btn-danger" id="cfmYes">Ya, Lanjutkan</button></div>`);$('#cfmYes').onclick=()=>{closeModal();cb()}}
function download(name,content,type='text/csv'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click()}

/* ================= RBAC ================= */
const PERMS={
 superadmin:['*'],
 hrd:['dashboard','karyawan','absensi','face','qr','telat','jadwal','izin','lembur','laporan','departemen','pengguna','notifikasi','log','backup','pengaturan'],
 manager:['dashboard','absensi','telat','jadwal','izin','lembur','laporan','notifikasi','face','qr'],
 employee:['dashboard','face','qr','jadwal','izin','lembur','notifikasi'],
 auditor:['dashboard','absensi','telat','laporan','log','notifikasi']
};
const can=r=>PERMS[currentUser.role]?.includes('*')||PERMS[currentUser.role]?.includes(r);
const isStaff=()=>['superadmin','hrd','manager'].includes(currentUser.role);

/* ================= NAV ================= */
const NAV=[
 {group:'MAIN MENU',items:[
  ['dashboard','Dashboard','🏠'],['karyawan','Data Karyawan','👥'],['absensi','Manajemen Absensi','📋'],
  ['face','Face Attendance','📷'],['qr','QR Attendance','▦'],['telat','Keterlambatan','⏰'],
  ['jadwal','Jadwal & Shift','🗓️'],['izin','Izin & Cuti','📄'],['lembur','Lembur','💼'],['laporan','Laporan & Analitik','📊']]},
 {group:'ADMINISTRATION',items:[
  ['departemen','Departemen & Jabatan','🏢'],['pengguna','Role & Hak Akses','🛡️'],['notifikasi','Notifikasi','🔔'],
  ['log','Log Aktivitas','📜'],['backup','Penyimpanan & Backup','💾'],['pengaturan','Pengaturan Sistem','⚙️']]}
];

let currentUser=null, idleTimer, charts={};

function buildNav(){
  $('#sideNav').innerHTML=NAV.map(sec=>{
    const items=sec.items.filter(([r])=>can(r));
    if(!items.length)return'';
    return `<div class="nav-group">${sec.group}</div>`+items.map(([r,label,ic])=>
      `<div class="nav-item" data-route="${r}">${ic} <span>${label}</span></div>`).join('');
  }).join('');
  $$('.nav-item').forEach(n=>n.onclick=()=>location.hash='#/'+n.dataset.route);
}

/* ================= ROUTER ================= */
const ROUTES={}; // diisi modules.js
window.addEventListener('hashchange',route);
function route(){
  const r=(location.hash||'#/dashboard').slice(2);
  if(!ROUTES[r]||!can(r)){location.hash='#/dashboard';return}
  $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.route===r));
  Object.values(charts).forEach(c=>c.destroy());charts={};
  $('#view').innerHTML=ROUTES[r].view();
  ROUTES[r].init&&ROUTES[r].init();
}

/* ================= AUTH ================= */
$('#loginForm').onsubmit=async e=>{
  e.preventDefault();
  const u=$('#loginUser').value.trim(),p=$('#loginPass').value;
  const users=await getAll('users');
  currentUser=users.find(x=>x.username===u&&x.password===p);
  if(!currentUser)return toast('Username/password salah','err');
  localStorage.setItem('eams_session',JSON.stringify({id:currentUser.id,at:Date.now()}));
  await addLog(currentUser.name,'LOGIN','Masuk sistem');
  startApp();
};
function startApp(){
  $('#loginScreen').style.display='none';$('#shell').hidden=false;
  $('#userName').textContent=currentUser.name;
  $('#userAvatar').textContent=initials(currentUser.name);
  $('#userAvatar').style.background=currentUser.color||'var(--grad)';
  buildNav();route();resetIdle();
}
async function logout(){await addLog(currentUser.name,'LOGOUT','Keluar');currentUser=null;localStorage.removeItem('eams_session');location.reload()}
$('#userChip').onclick=()=>modal(`<h3>${esc(currentUser.name)}</h3><p style="color:var(--muted)">Role: <b>${currentUser.role}</b></p>
<div class="modal-actions"><button class="btn" onclick="closeModal()">Tutup</button><button class="btn btn-danger" onclick="logout()">Logout</button></div>`);

/* idle auto-logout */
function resetIdle(){clearTimeout(idleTimer);getSettings().then(s=>{idleTimer=setTimeout(()=>{if(currentUser){toast('Sesi berakhir (auto-logout)','warn');logout()}},s.autoLogout*60000)})}
['mousemove','keydown','click'].forEach(e=>window.addEventListener(e,resetIdle));

/* clock */
setInterval(()=>{if(!currentUser)return;const d=new Date();
  $('#clockTime').textContent=d.toTimeString().slice(0,8);
  $('#clockDate').textContent=DAYN[d.getDay()]+', '+d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})},1000);

$('#btnToggle').onclick=()=>{const sb=$('#sidebar');if(innerWidth<=760)sb.classList.toggle('open');else{sb.classList.toggle('collapsed');$('.main').classList.toggle('full')}};

/* notifications bell */
async function refreshBell(){
  const ns=await getAll('notifications');const un=ns.filter(n=>!n.read).length;
  const b=$('#bellCount');b.hidden=!un;b.textContent=un;
}
$('#btnBell').onclick=async()=>{
  const ns=await getAll('notifications');
  modal(`<h3>🔔 Notifikasi</h3>`+ns.slice().reverse().map((n,i)=>
    `<div class="chip" style="display:flex;width:100%;align-items:flex-start">${n.read?'✅':'⏳'} <div><b>${esc(n.msg)}</b><br><small style="color:var(--muted)">${n.ts}</small></div></div>`).join('')+
    `<div class="modal-actions"><button class="btn" onclick="closeModal()">Tutup</button>
    <button class="btn btn-grad" id="markAll">Tandai semua dibaca</button></div>`);
  $('#markAll').onclick=async()=>{for(const n of ns){n.read=true;await put('notifications',n)}refreshBell();closeModal();toast('Notifikasi ditandai','ok')};
};

/* global search → karyawan */
$('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){location.hash='#/karyawan';setTimeout(()=>{const i=$('#empSearch');if(i){i.value=e.target.value;i.dispatchEvent(new Event('input'))}},100)}});

/* ================= BOOT ================= */
(async()=>{
  await openDB();await seedIfEmpty();
  const s=localStorage.getItem('eams_session');
  if(s){const u=await getAll('users');currentUser=u.find(x=>x.id===JSON.parse(s).id);if(currentUser)startApp();}
  setInterval(refreshBell,20000);refreshBell();
})();