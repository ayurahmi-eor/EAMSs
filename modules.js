/* ================= DASHBOARD ================= */
ROUTES.dashboard={view:()=>`
 <div class="page-head"><h2><span class="hicon">🏠</span> Dashboard</h2>
 <div class="breadcrumb">Home • Dashboard — ${esc((await0)||'')}</div></div>
 <div id="dashStats" class="grid g4"></div>
 <div class="grid g2" style="margin-top:16px">
   <div class="card glow"><b>📈 Attendance Trend (14 hari)</b><canvas id="chTrend" height="130"></canvas></div>
   <div class="card"><b>🏢 Kehadiran per Departemen (hari ini)</b><canvas id="chDept" height="130"></canvas></div>
 </div>
 <div class="card" style="margin-top:16px"><b>🕒 Aktivitas Absensi Terbaru</b><div id="dashRecent" style="margin-top:12px"></div></div>`,
 init:async()=>{
  const emps=(await getAll('employees')).filter(e=>e.status==='active');
  const att=await getAll('attendance'); const td=today();
  const t=att.filter(a=>a.date===td);
  const hadir=t.filter(a=>['present','late'].includes(a.status)).length;
  const telat=t.filter(a=>a.status==='late').length;
  const cuti=t.filter(a=>a.status==='leave').length;
  const absen=t.filter(a=>a.status==='absent').length;
  const kerja=t.filter(a=>a.checkIn&&!a.checkOut).length;
  const belum=emps.length-hadir-cuti-absen;
  $('#dashStats').innerHTML=[
   ['👥','Total Karyawan',emps.length,'s-blue'],['✅','Hadir Hari Ini',hadir,'s-green'],
   ['⏳','Belum Hadir',Math.max(belum,0),'s-yellow'],['⏰','Terlambat',telat,'s-orange'],
   ['📄','Izin / Cuti',cuti,'s-purple'],['❌','Tidak Hadir',absen,'s-red'],
   ['🔧','Sedang Bekerja',kerja,'s-blue'],['🕐','Jam Sistem',new Date().toTimeString().slice(0,5),'s-green']
  ].map(([ic,l,v,c])=>`<div class="stat ${c}"><div class="ic">${ic}</div><h3>${v}</h3><p>${l}</p>
   <div class="spark">${[3,6,4,8,5].map(h=>`<i style="height:${h*4}px"></i>`).join('')}</div></div>`).join('');

  /* trend */
  const days=[...new Set(att.map(a=>a.date))].sort().slice(-14);
  const mk=st=>days.map(d=>att.filter(a=>a.date===d&&a.status===st).length);
  charts.trend=new Chart($('#chTrend'),{type:'line',data:{labels:days.map(d=>d.slice(5)),
   datasets:[{label:'Hadir',data:mk('present'),borderColor:'#7c3aed',tension:.4,fill:true,backgroundColor:'rgba(124,58,237,.15)'},
   {label:'Telat',data:mk('late'),borderColor:'#f97316',tension:.4},{label:'Absen',data:mk('absent'),borderColor:'#ef4444',tension:.4}]},
   options:{plugins:{legend:{labels:{color:'#8b93b8'}}},scales:{x:{ticks:{color:'#8b93b8'}},y:{ticks:{color:'#8b93b8'}}}}});

  /* dept */
  const depts=[...new Set(emps.map(e=>e.department))];
  charts.dept=new Chart($('#chDept'),{type:'bar',data:{labels:depts.map(d=>d.split(' ')[0]),
   datasets:[{label:'Hadir',data:depts.map(d=>t.filter(a=>['present','late'].includes(a.status)&&emps.find(e=>e.id===a.empId)?.department===d).length),backgroundColor:'#7c3aed'},
   {label:'Telat',data:depts.map(d=>t.filter(a=>a.status==='late'&&emps.find(e=>e.id===a.empId)?.department===d).length),backgroundColor:'#f97316'}]},
   options:{plugins:{legend:{labels:{color:'#8b93b8'}}},scales:{x:{ticks:{color:'#8b93b8'}},y:{ticks:{color:'#8b93b8'}}}}});

  const logs=await getAll('logs');
  $('#dashRecent').innerHTML=(logs.slice(-8).reverse().map(l=>
   `<div class="chip" style="width:100%">🕐 ${new Date(l.ts).toLocaleString('id-ID')} — <b>${esc(l.user)}</b> ${esc(l.action)}: ${esc(l.detail)}</div>`).join(''))||'<p style="color:var(--muted)">Belum ada aktivitas.</p>';
 }};
const await0=''; // placeholder breadcrumb

/* ================= DATA KARYAWAN ================= */
ROUTES.karyawan={view:()=>`
 <div class="page-head"><h2><span class="hicon">👥</span> Data Karyawan</h2>
 <div>${can('karyawan')?`<button class="btn btn-grad" id="btnAddEmp">＋ Tambah Karyawan</button>`:''}
 <button class="btn btn-outline" id="btnCsvEmp">Export CSV</button></div></div>
 <div class="card filters">
  <div class="f"><label>Cari</label><input id="empSearch" placeholder="Nama / ID..."></div>
  <div class="f"><label>Departemen</label><select id="empDept"><option value="">Semua</option></select></div>
  <div class="f"><label>Status</label><select id="empStatus"><option value="">Semua</option><option>active</option><option>inactive</option></select></div>
 </div>
 <div class="card"><table><thead><tr><th>ID</th><th>Nama</th><th>Dept</th><th>Jabatan</th><th>Shift</th><th>Kontak</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="empBody"></tbody></table></div>`,
 init:async()=>{
  const emps=await getAll('employees'),depts=await getAll('departments'),shifts=await getAll('shifts');
  $('#empDept').innerHTML+=depts.map(d=>`<option>${d.name}</option>`).join('');
  const draw=()=>{
   const q=$('#empSearch').value.toLowerCase(),d=$('#empDept').value,s=$('#empStatus').value;
   $('#empBody').innerHTML=emps.filter(e=>(!q||e.name.toLowerCase().includes(q)||e.id.toLowerCase().includes(q))&&(!d||e.department===d)&&(!s||e.status===s))
   .map(e=>`<tr><td><code>${e.id}</code></td>
    <td><span class="avatar" style="margin-right:8px">${initials(e.name)}</span>${esc(e.name)}</td>
    <td>${e.department}</td><td>${e.position}</td><td>${shifts.find(x=>x.id===e.shiftId)?.name||'-'}</td>
    <td>${e.email}</td><td><span class="badge ${e.status==='active'?'b-green':'b-gray'}">${e.status}</span></td>
    <td>${can('karyawan')?`<button class="btn btn-sm btn-outline" onclick="empForm('${e.id}')">✏️</button>
    <button class="btn btn-sm btn-outline" onclick="showQR('${e.id}')">▦</button>
    <button class="btn btn-sm btn-danger" onclick="delEmp('${e.id}')">🗑</button>`:`<button class="btn btn-sm btn-outline" onclick="showQR('${e.id}')">▦</button>`}</td></tr>`).join('');
  };draw();
  ['empSearch','empDept','empStatus'].forEach(id=>$('#'+id).addEventListener('input',draw));
  $('#btnCsvEmp').onclick=()=>download('karyawan.csv','ID,Nama,Dept,Jabatan,Email,Status\n'+emps.map(e=>[e.id,e.name,e.department,e.position,e.email,e.status].join(',')).join('\n'));
  if($('#btnAddEmp'))$('#btnAddEmp').onclick=()=>empForm();
 }};

async function empForm(id){
 const e=id?await getOne('employees',id):{id:'',name:'',gender:'male',position:'',department:'',email:'',phone:'',address:'',status:'active',shiftId:'S2'};
 const depts=await getAll('departments'),shifts=await getAll('shifts');
 modal(`<h3>${id?'Edit':'Tambah'} Karyawan</h3><div class="form-grid">
  <div><label>Nama</label><input id="fName" value="${esc(e.name)}"></div>
  <div><label>Jenis Kelamin</label><select id="fGender"><option value="male" ${e.gender==='male'?'selected':''}>Laki-laki</option><option value="female" ${e.gender==='female'?'selected':''}>Perempuan</option></select></div>
  <div><label>Jabatan</label><input id="fPos" value="${esc(e.position)}"></div>
  <div><label>Departemen</label><select id="fDept">${depts.map(d=>`<option ${d.name===e.department?'selected':''}>${d.name}</option>`).join('')}</select></div>
  <div><label>Shift</label><select id="fShift">${shifts.map(s=>`<option value="${s.id}" ${s.id===e.shiftId?'selected':''}>${s.name} (${s.in}-${s.out})</option>`).join('')}</select></div>
  <div><label>Status</label><select id="fStatus"><option value="active" ${e.status==='active'?'selected':''}>Aktif</option><option value="inactive" ${e.status==='inactive'?'selected':''}>Nonaktif</option></select></div>
  <div><label>Email</label><input id="fEmail" value="${esc(e.email)}"></div>
  <div><label>No. HP</label><input id="fPhone" value="${esc(e.phone)}"></div>
  <div style="grid-column:1/-1"><label>Alamat</label><input id="fAddr" value="${esc(e.address)}"></div></div>
 <div class="modal-actions"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-grad" id="fSave">Simpan</button></div>`);
 $('#fSave').onclick=async()=>{
  if(!$('#fName').value.trim())return toast('Nama wajib diisi','err');
  const obj={...e,name:$('#fName').value,gender:$('#fGender').value,position:$('#fPos').value,department:$('#fDept').value,shiftId:$('#fShift').value,status:$('#fStatus').value,email:$('#fEmail').value,phone:$('#fPhone').value,address:$('#fAddr').value};
  if(!id){obj.id='EMP-'+(1000+(await getAll('employees')).length+1);obj.qr='EAMS:'+obj.id;obj.joinDate=today();obj.photo=null}
  await put('employees',obj);await addLog(currentUser.name,id?'EDIT_KARYAWAN':'TAMBAH_KARYAWAN',obj.name+' ('+obj.id+')');
  closeModal();toast('Data tersimpan','ok');route();
 };
}
function delEmp(id){confirmModal('Hapus karyawan '+id+' beserta riwayatnya?',async()=>{await del('employees',id);await addLog(currentUser.name,'HAPUS_KARYAWAN',id);toast('Terhapus','ok');route()})}

async function showQR(id){
 const e=await getOne('employees',id);
 modal(`<h3>Kartu Identitas & QR</h3><div class="idcard">
  <div class="row"><span class="avatar" style="width:48px;height:48px;font-size:16px">${initials(e.name)}</span>
  <div><b style="font-size:16px">${esc(e.name)}</b><br><small style="color:var(--muted)">${e.position} • ${e.department}</small></div></div>
  <div class="row" style="margin-top:14px"><div id="qrBox"></div>
  <div><small style="color:var(--muted)">ID</small><br><code>${e.id}</code><br>
  <small style="color:var(--muted)">Shift</small><br><span class="badge b-purple">${(await getAll('shifts')).find(s=>s.id===e.shiftId)?.name}</span></div></div>
  <small style="color:var(--muted)">Scan QR untuk absensi • ${esc((await getSettings()).company)}</small></div>
 <div class="modal-actions"><button class="btn" onclick="closeModal()">Tutup</button><button class="btn btn-grad" onclick="window.print()">🖨 Cetak</button></div>`);
 new QRCode($('#qrBox'),{text:e.qr,width:110,height:110});
}

/* ================= MANAJEMEN ABSENSI (ala Staff7) ================= */
ROUTES.absensi={view:()=>`
 <div class="page-head"><h2><span class="hicon">📋</span> Employee Attendance</h2>
 <button class="btn btn-grad" onclick="window.print()">📄 Export PDF</button></div>
 <div class="card filters">
  <div class="f"><label>From Date</label><input type="date" id="fA1" value="${monthStart()}"></div>
  <div class="f"><label>To Date</label><input type="date" id="fA2" value="${today()}"></div>
  <div class="f"><label>Department</label><select id="fAD"><option value="">All Departments</option></select></div>
  <div class="f"><label>Search Employee</label><input id="fAQ" placeholder="Search employee..."></div>
  <button class="btn btn-grad" id="fGo">⚙ Filter Attendance</button>
 </div>
 <div id="aStats" class="grid g4"></div>
 <div class="grid g2" style="margin-top:16px">
  <div class="card"><b>Attendance Trend</b><canvas id="chA" height="120"></canvas></div>
  <div class="card"><b>Distribusi Status</b><canvas id="chP" height="120"></canvas></div>
 </div>
 <div class="card" style="margin-top:16px"><b>📅 Attendance Records</b>
  <div style="overflow-x:auto"><table><thead><tr><th>#</th><th>Date</th><th>Day</th><th>Shift Time</th><th>Check In</th><th>Check Out</th><th>Working Hours</th><th>Status</th></tr></thead><tbody id="aBody"></tbody></table></div></div>`,
 init:async()=>{
  const depts=await getAll('departments');$('#fAD').innerHTML+=depts.map(d=>`<option>${d.name}</option>`).join('');
  $('#fGo').onclick=drawA;drawA();
  async function drawA(){
   const emps=await getAll('employees'),shifts=await getAll('shifts'),att=await getAll('attendance');
   const d1=$('#fA1').value,d2=$('#fA2').value,dp=$('#fAD').value,q=$('#fAQ').value.toLowerCase();
   const rows=att.filter(a=>{const e=emps.find(x=>x.id===a.empId);return e&&a.date>=d1&&a.date<=d2&&(!dp||e.department===dp)&&(!q||e.name.toLowerCase().includes(q)||e.id.toLowerCase().includes(q))}).sort((a,b)=>b.date.localeCompare(a.date));
   const cnt=s=>rows.filter(r=>r.status===s).length;
   $('#aStats').innerHTML=[
    ['📅','Total Days',rows.length,'s-purple'],['✅','Present Days',cnt('present'),'s-blue'],
    ['⏰','Late Days',cnt('late'),'s-orange'],['❌','Absent Days',cnt('absent'),'s-yellow']
   ].map(([ic,l,v,c])=>`<div class="stat ${c}"><div class="ic">${ic}</div><h3>${v}</h3><p>${l}</p></div>`).join('');
   $('#aBody').innerHTML=rows.slice(0,100).map((a,i)=>{const e=emps.find(x=>x.id===a.empId),s=shifts.find(x=>x.id===e.shiftId);
    const wh=(a.checkIn&&a.checkOut)?fmtWH(a.checkIn,a.checkOut):'00:00';
    return `<tr><td>${i+1}</td><td>${fmtD(a.date)}</td><td>${DAYN[new Date(a.date+'T00:00').getDay()]}</td>
    <td><span class="time-pill">${s?s.in+' - '+s.out:'-'}</span></td>
    <td>${a.checkIn?`<span class="time-pill ${a.status==='late'?'time-late':'time-ok'}">${a.checkIn}</span>`:'<span class="time-pill">-</span>'}</td>
    <td>${a.checkOut?`<span class="time-pill time-late">${a.checkOut}</span>`:'<span class="time-pill">-</span>'}</td>
    <td><span class="badge b-blue">${wh}</span></td>
    <td><span class="badge ${a.status==='present'?'b-green':a.status==='late'?'b-orange':a.status==='absent'?'b-red':'b-yellow'}">${a.status==='present'?'On Time':a.status.charAt(0).toUpperCase()+a.status.slice(1)}</span></td></tr>`}).join('');
   const days=[...new Set(rows.map(r=>r.date))].sort();
   charts.A=new Chart($('#chA'),{type:'line',data:{labels:days.map(d=>d.slice(8)),datasets:[{label:'%',data:days.map(d=>{const r=rows.filter(x=>x.date===d);return r.length?Math.round(r.filter(x=>['present','late'].includes(x.status)).length/r.length*100):0}),borderColor:'#7c3aed',tension:.4,fill:true,backgroundColor:'rgba(124,58,237,.2)'}]},options:{plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8b93b8'}},y:{max:100,ticks:{color:'#8b93b8'}}}}});
   charts.P=new Chart($('#chP'),{type:'doughnut',data:{labels:['Present','Late','Absent','Leave'],datasets:[{data:[cnt('present'),cnt('late'),cnt('absent'),cnt('leave')],backgroundColor:['#22c55e','#f97316','#ef4444','#7c3aed'],borderColor:'#0f1533'}]},options:{plugins:{legend:{labels:{color:'#8b93b8'}}}}});
  }
 }};
const monthStart=()=>today().slice(0,8)+'01';
function fmtWH(ci,co){let m=tMin(co)-tMin(ci);if(m<0)m+=1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}

/* ================= KETERLAMBATAN (ala Employment Hero) ================= */
ROUTES.telat={view:()=>`
 <div class="breadcrumb">Reports / Time / <b>Lateness Report</b></div>
 <div class="page-head"><h2><span class="hicon">⏰</span> Lateness Report</h2>
 <button class="btn btn-outline" onclick="window.print()">⬇ Export</button></div>
 <div class="card filters">
  <div class="f"><label>Date Range</label><input type="date" id="t1" value="${monthStart()}"> s/d <input type="date" id="t2" value="${today()}"></div>
  <div class="f"><label>Personnel</label><select id="tEmp"><option value="">Semua Karyawan</option></select></div>
  <button class="btn btn-grad" id="tGo">Filter</button><button class="btn" id="tReset">↺ Reset</button>
 </div>
 <div id="tChips"></div>
 <div id="tStats" class="grid g4"></div>
 <div class="card" style="margin-top:16px;overflow-x:auto"><table>
  <thead><tr><th>Employee ⇅</th><th>Day</th><th>Date</th><th>Timesheet</th><th>Time in</th><th>Time out</th><th>Hours worked</th><th>Hours late</th></tr></thead>
  <tbody id="tBody"></tbody></table></div>`,
 init:async()=>{
  const emps=await getAll('employees');$('#tEmp').innerHTML+=emps.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  $('#tGo').onclick=drawT;$('#tReset').onclick=()=>{$('#tEmp').value='';drawT()};drawT();
  async function drawT(){
   const shifts=await getAll('shifts'),att=await getAll('attendance'),st=await getSettings();
   const d1=$('#t1').value,d2=$('#t2').value,eid=$('#tEmp').value;
   const rows=att.filter(a=>a.status==='late'&&a.date>=d1&&a.date<=d2&&(!eid||a.empId===eid)).sort((a,b)=>b.date.localeCompare(a.date));
   $('#tChips').innerHTML=`<span class="chip">Date Range: <b>${d1} – ${d2}</b><span class="x">✕</span></span>`+(eid?`<span class="chip">Personnel: <b>${esc(emps.find(e=>e.id===eid).name)}</b></span>`:'');
   const totMin=rows.reduce((s,r)=>s+r.lateMin,0);
   $('#tStats').innerHTML=[
    ['👤','Karyawan Terlambat',new Set(rows.map(r=>r.empId)).size,'s-orange'],
    ['⏱','Total Menit Terlambat',totMin,'s-red'],
    ['📊','Rata-rata / Kejadian',rows.length?Math.round(totMin/rows.length):0,'s-purple'],
    ['🛡','Toleransi Aktif',st.tolerance+' mnt','s-blue']
   ].map(([ic,l,v,c])=>`<div class="stat ${c}"><div class="ic">${ic}</div><h3>${v}</h3><p>${l}</p></div>`).join('');
   $('#tBody').innerHTML=rows.map(a=>{const e=emps.find(x=>x.id===a.empId),s=shifts.find(x=>x.id===e.shiftId);
    const wh=(a.checkIn&&a.checkOut)?fmtWH(a.checkIn,a.checkOut):'-';
    return `<tr><td><span class="avatar" style="margin-right:7px">${initials(e.name)}</span>${esc(e.name)}</td>
    <td>${DAYN[new Date(a.date+'T00:00').getDay()].slice(0,3)}</td><td>${a.date}</td>
    <td><span class="badge b-green">Approved</span></td>
    <td title="Scheduled ${s?.in} + ${st.tolerance}m tolerance"><span class="time-pill time-late" style="border-color:#7a2740">${a.checkIn}</span><span class="late-sub">${Math.floor(a.lateMin/60)}h ${a.lateMin%60}m late</span></td>
    <td>${a.checkOut||'-'}</td><td>${wh}</td>
    <td><span class="late-sub" style="display:inline">${a.lateMin} mnt</span></td></tr>`}).join('')||'<tr><td colspan="8" style="text-align:center;color:var(--muted)">Tidak ada keterlambatan 🎉</td></tr>';
  }
 }};

/* ================= JADWAL & SHIFT (ala Hubstaff) ================= */
let schedOffset=0, schedView='week';
ROUTES.jadwal={view:()=>`
 <div class="page-head"><h2><span class="hicon">🗓️</span> Schedules</h2>
 <div class="tabs"><span class="tab ${schedView==='week'?'active':''}" onclick="schedView='week';route()">Week</span>
 <span class="tab ${schedView==='day'?'active':''}" onclick="schedView='day';route()">Day</span></div>
 <button class="btn btn-grad" id="btnAddSched">＋ Add a schedule</button></div>
 <div class="card" style="overflow-x:auto" id="schedWrap"></div>`,
 init:async()=>{
  const emps=(await getAll('employees')).filter(e=>e.status==='active'),shifts=await getAll('shifts'),att=await getAll('attendance'),leaves=await getAll('leaves');
  const base=new Date();base.setDate(base.getDate()+schedOffset*7);
  const monday=new Date(base);monday.setDate(base.getDate()-((base.getDay()+6)%7));
  const cols=schedView==='week'?7:1;
  const days=[...Array(cols)].map((_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d});
  let html=`<div class="sched-grid" style="grid-template-columns:230px repeat(${cols},1fr)">
   <div class="sched-head">Members</div>`+days.map(d=>`<div class="sched-head ${d.toISOString().slice(0,10)===today()?'sched-today':''}">${d.getDate()}<small>${DAYN[d.getDay()].slice(0,3)}</small></div>`).join('');
  for(const e of emps){
   html+=`<div class="member-cell"><span class="avatar">${initials(e.name)}</span><div><b>${esc(e.name)}</b><br><small style="color:var(--muted)">${e.position}</small></div></div>`;
   for(const d of days){
    const ds=d.toISOString().slice(0,10),dow=d.getDay();
    const rec=att.find(a=>a.empId===e.id&&a.date===ds),s=shifts.find(x=>x.id===e.shiftId);
    const lv=leaves.find(l=>l.empId===e.id&&l.status==='approved'&&ds>=l.startDate&&ds<=addDays(l.startDate,l.days));
    if(dow===0||dow===6) html+=`<div><div class="shift-block sb-holiday">🌴 Holiday<br>All day</div></div>`;
    else if(lv) html+=`<div><div class="shift-block sb-out">${esc(lv.type)}<br>All day</div></div>`;
    else if(s) html+=`<div><div class="shift-block ${ds===today()?'sb-today':'sb-shift'}">Shift • ${s.in} - ${s.out}<br>${rec?dotStatus(rec):'<span class="status-dot"><i style="background:#64748b"></i> Scheduled</span>'}</div></div>`;
    else html+='<div></div>';
   }
  }
  html+='</div>';$('#schedWrap').innerHTML=html;
  $('#btnAddSched').onclick=()=>modal(`<h3>Tambah Jadwal</h3><label>Karyawan</label><select id="sE">${emps.map(e=>`<option value="${e.id}">${e.name}</option>`).join('')}</select><label>Tanggal</label><input type="date" id="sD" value="${today()}"><label>Catatan</label><input id="sN" placeholder="mis. Shift khusus"><div class="modal-actions"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-grad" id="sSave">Simpan</button></div>`);
  if($('#sSave'))$('#sSave').onclick=async()=>{await put('schedules',{id:uid('sc'),empId:$('#sE').value,date:$('#sD').value,note:$('#sN').value});toast('Jadwal ditambahkan','ok');closeModal()};
  $('#schedWrap').insertAdjacentHTML('beforebegin','');
  $('#view').querySelector('.page-head').insertAdjacentHTML('afterbegin',
   `<div class="tabs"><button class="btn btn-sm btn-outline" onclick="schedOffset--;route()">←</button>
    <span class="chip">${days[0].toLocaleDateString('id-ID',{day:'numeric',month:'short'})} – ${days.at(-1).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</span>
    <button class="btn btn-sm btn-outline" onclick="schedOffset++;route()">→</button>
    <button class="btn btn-sm btn-outline" onclick="schedOffset=0;route()">Today</button></div>`);
 }};
function dotStatus(r){if(r.status==='late')return`<span class="status-dot"><i style="background:#f97316"></i> Late</span>`;if(r.status==='absent')return`<span class="status-dot"><i style="background:#ef4444"></i> Absent</span>`;if(r.status==='leave')return`<span class="status-dot"><i style="background:#7c3aed"></i> OOO</span>`;return`<span class="status-dot"><i style="background:#22c55e"></i> On time</span>`}
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};

/* ================= IZIN & CUTI (ala ZenHR) ================= */
let izinTab='team', izinType='';
ROUTES.izin={view:()=>`
 <div class="page-head"><h2><span class="hicon">📄</span> Approvals & Requests</h2>
 ${can('izin')&&currentUser.role==='employee'?`<button class="btn btn-grad" id="btnNewLeave">＋ Ajukan Izin/Cuti</button>`:''}</div>
 <div class="tabs"><span class="tab ${izinTab==='my'?'active':''}" onclick="izinTab='my';route()">My Requests</span>
 <span class="tab ${izinTab==='team'?'active':''}" onclick="izinTab='team';route()">Team Requests</span></div>
 <div class="split">
  <div class="card type-list" id="typeList"></div>
  <div class="card" style="overflow-x:auto"><table><thead><tr><th>☐</th><th>Serial Number</th><th>Request Type</th><th>Amount</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="lvBody"></tbody></table></div>
 </div>`,
 init:async()=>{
  const types=['Time Off','Sick','Maternity','Vacation','Study','Personal'];
  $('#typeList').innerHTML='<b>Status Type</b>'+types.map(t=>`<div class="t ${izinType===t?'active':''}" onclick="izinType=izinType==='${t}'?'':'${t}';route()">${t}</div>`).join('');
  const leaves=await getAll('leaves'),emps=await getAll('employees');
  let rows=leaves;
  if(izinTab==='my'||currentUser.role==='employee')rows=rows.filter(l=>l.empId===currentUser.employeeId);
  if(izinType)rows=rows.filter(l=>l.type===izinType||izinType==='Time Off'&&['Personal','Vacation','Study'].includes(l.type));
  const canApp=isStaff();
  $('#lvBody').innerHTML=rows.map(l=>{const e=emps.find(x=>x.id===l.empId);
   return `<tr><td><input type="checkbox"></td><td><code>${l.serial}</code></td><td>${l.type}</td><td>${l.amount}</td>
   <td><span class="badge ${l.status==='approved'?'b-green':l.status==='rejected'?'b-red':'b-yellow'}">${l.status}</span></td>
   <td>${canApp&&l.status==='pending'?`<button class="btn btn-sm btn-green" onclick="decideLeave('${l.id}','approved')">✓</button>
   <button class="btn btn-sm btn-danger" onclick="decideLeave('${l.id}','rejected')">✕</button>`:`<button class="btn btn-sm btn-outline" onclick="viewLeave('${l.id}')">✎</button>`}</td></tr>`}).join('')||'<tr><td colspan="6" style="color:var(--muted);text-align:center">Tidak ada pengajuan</td></tr>';
  if($('#btnNewLeave'))$('#btnNewLeave').onclick=newLeaveForm;
 }};
function newLeaveForm(){modal(`<h3>Ajukan Izin / Cuti</h3><div class="form-grid">
 <div><label>Jenis</label><select id="lT"><option>Personal</option><option>Sick</option><option>Maternity</option><option>Vacation</option><option>Study</option></select></div>
 <div><label>Mulai</label><input type="date" id="lD" value="${today()}"></div>
 <div><label>Jumlah (hari)</label><input type="number" id="lN" value="1" min="1"></div>
 <div style="grid-column:1/-1"><label>Alasan</label><textarea id="lR" rows="3"></textarea></div></div>
 <div class="modal-actions"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-grad" id="lSave">Kirim</button></div>`);
 $('#lSave').onclick=async()=>{const n=await getAll('leaves');
  await put('leaves',{id:uid('l'),serial:'LEAV-'+(724+n.length),empId:currentUser.employeeId||'EMP-1001',type:$('#lT').value,startDate:$('#lD').value,days:+$('#lN').value,amount:$('#lN').value+' Days',reason:$('#lR').value,status:'pending',submittedAt:today()});
  await addLog(currentUser.name,'PENGAJUAN_IZIN',$('#lT').value);closeModal();toast('Pengajuan terkirim','ok');route()};
}
async function decideLeave(id,st){const l=await getOne('leaves',id);l.status=st;await put('leaves',l);
 await addLog(currentUser.name,'APPROVAL_'+st.toUpperCase(),l.serial);toast('Pengajuan '+st,l.status==='approved'?'ok':'err');route()}
function viewLeave(id){getOne('leaves',id).then(l=>modal(`<h3>${l.serial}</h3><p>${l.type} — ${l.amount}<br>${esc(l.reason)}<br><small style="color:var(--muted)">Diajukan ${l.submittedAt}</small></p><div class="modal-actions"><button class="btn" onclick="closeModal()">Tutup</button></div>`))}

/* ================= LEMBUR ================= */
ROUTES.lembur={view:()=>`
 <div class="page-head"><h2><span class="hicon">💼</span> Manajemen Lembur</h2>
 <button class="btn btn-grad" id="btnOT">＋ Ajukan Lembur</button></div>
 <div id="otStats" class="grid g3"></div>
 <div class="card" style="overflow-x:auto"><table><thead><tr><th>Karyawan</th><th>Tanggal</th><th>Mulai</th><th>Selesai</th><th>Durasi</th><th>Alasan</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="otBody"></tbody></table></div>`,
 init:async()=>{
  const ot=await getAll('overtime'),emps=await getAll('employees');
  const tot=ot.filter(o=>o.status==='approved').reduce((s,o)=>s+o.hours,0);
  $('#otStats').innerHTML=[['🕐','Total Jam Lembur (disetujui)',tot.toFixed(1)+' h','s-purple'],['📋','Pengajuan',ot.length,'s-blue'],['⏳','Menunggu',ot.filter(o=>o.status==='pending').length,'s-yellow']].map(([ic,l,v,c])=>`<div class="stat ${c}"><div class="ic">${ic}</div><h3>${v}</h3><p>${l}</p></div>`).join('');
  $('#otBody').innerHTML=ot.map(o=>`<tr><td>${esc(emps.find(e=>e.id===o.empId)?.name||o.empId)}</td><td>${o.date}</td><td>${o.start}</td><td>${o.end}</td><td><span class="badge b-blue">${o.hours} h</span></td><td>${esc(o.reason)}</td>
  <td><span class="badge ${o.status==='approved'?'b-green':o.status==='rejected'?'b-red':'b-yellow'}">${o.status}</span></td>
  <td>${isStaff()&&o.status==='pending'?`<button class="btn btn-sm btn-green" onclick="decideOT('${o.id}','approved')">✓</button> <button class="btn btn-sm btn-danger" onclick="decideOT('${o.id}','rejected')">✕</button>`:'-'}</td></tr>`).join('');
  $('#btnOT').onclick=()=>modal(`<h3>Ajukan Lembur</h3><div class="form-grid"><div><label>Tanggal</label><input type="date" id="oD" value="${today()}"></div><div><label>Mulai</label><input type="time" id="oS" value="17:00"></div><div><label>Selesai</label><input type="time" id="oE" value="20:00"></div><div style="grid-column:1/-1"><label>Alasan</label><input id="oR"></div></div><div class="modal-actions"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-grad" id="oSave">Simpan</button></div>`);
  $('#oSave').onclick=async()=>{let h=(tMin($('#oE').value)-tMin($('#oS').value))/60;if(h<0)h+=24;
   await put('overtime',{id:uid('o'),empId:currentUser.employeeId||'EMP-1001',date:$('#oD').value,start:$('#oS').value,end:$('#oE').value,hours:+h.toFixed(1),reason:$('#oR').value,status:'pending'});
   closeModal();toast('Lembur diajukan','ok');route()};
 }};
async function decideOT(id,st){const o=await getOne('overtime',id);o.status=st;await put('overtime',o);toast('Lembur '+st,st==='approved'?'ok':'err');route()}

/* ================= LAPORAN ================= */
ROUTES.laporan={view:()=>`
 <div class="page-head"><h2><span class="hicon">📊</span> Laporan & Analitik</h2>
 <div><button class="btn btn-outline" id="expCsv">⬇ CSV</button> <button class="btn btn-grad" onclick="window.print()">📄 PDF</button></div></div>
 <div class="grid g2"><div class="card"><b>Tingkat Kehadiran Bulanan</b><canvas id="chL1" height="140"></canvas></div>
 <div class="card"><b>Keterlambatan per Departemen</b><canvas id="chL2" height="140"></canvas></div></div>
 <div class="card" style="margin-top:16px"><b>Rekapitulasi per Karyawan (30 hari)</b><div style="overflow-x:auto"><table><thead><tr><th>Karyawan</th><th>Hadir</th><th>Telat</th><th>Absen</th><th>Izin</th><th>% Kehadiran</th></tr></thead><tbody id="repBody"></tbody></table></div></div>`,
 init:async()=>{
  const emps=await getAll('employees'),att=await getAll('attendance'),depts=await getAll('departments');
  const stat={};emps.forEach(e=>stat[e.id]={p:0,l:0,a:0,lv:0});
  att.forEach(a=>{if(stat[a.empId]){stat[a.empId][{present:'p',late:'l',absent:'a',leave:'lv'}[a.status]]++}});
  $('#repBody').innerHTML=emps.map(e=>{const s=stat[e.id],tot=s.p+s.l+s.a+s.lv,pct=tot?Math.round((s.p+s.l)/tot*100):0;
   return `<tr><td>${esc(e.name)}</td><td>${s.p}</td><td>${s.l}</td><td>${s.a}</td><td>${s.lv}</td><td><span class="badge ${pct>85?'b-green':pct>70?'b-yellow':'b-red'}">${pct}%</span></td></tr>`}).join('');
  charts.L1=new Chart($('#chL1'),{type:'bar',data:{labels:['Agg','Sep','Okt','Nov'],datasets:[{label:'%',data:[92,88,94,91],backgroundColor:'#7c3aed',borderRadius:6}]},options:{plugins:{legend:{display:false}},scales:{y:{max:100,ticks:{color:'#8b93b8'}},x:{ticks:{color:'#8b93b8'}}}}});
  charts.L2=new Chart($('#chL2'),{type:'bar',data:{labels:depts.map(d=>d.name.split(' ')[0]),datasets:[{label:'Telat',data:depts.map(d=>att.filter(a=>a.status==='late'&&emps.find(e=>e.id===a.empId)?.department===d.name).length),backgroundColor:'#f97316',borderRadius:6}]},options:{plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#8b93b8'}},x:{ticks:{color:'#8b93b8'}}}}});
  $('#expCsv').onclick=()=>download('laporan.csv','Nama,Hadir,Telat,Absen,Izin\n'+emps.map(e=>{const s=stat[e.id];return [e.name,s.p,s.l,s.a,s.lv].join(',')}).join('\n'));
 }};

/* ================= ADMIN: DEPARTEMEN / PENGGUNA / LOG / PENGATURAN / BACKUP / NOTIF ================= */
ROUTES.departemen={view:()=>`<div class="page-head"><h2><span class="hicon">🏢</span> Departemen & Jabatan</h2><button class="btn btn-grad" id="addDept">＋ Tambah</button></div><div class="card g4" id="deptGrid"></div>`,
 init:async()=>{const ds=await getAll('departments'),es=await getAll('employees');
  $('#deptGrid').innerHTML=ds.map(d=>`<div class="stat s-purple"><div class="ic">🏢</div><h3>${es.filter(e=>e.department===d.name).length}</h3><p><b>${d.name}</b><br>Kepala: ${d.head||'-'}</p>
  ${isStaff()?`<button class="btn btn-sm btn-danger" style="margin-top:8px" onclick="delDept('${d.id}')">Hapus</button>`:''}</div>`).join('');
  $('#addDept').onclick=()=>modal(`<h3>Tambah Departemen</h3><label>Nama</label><input id="dN"><label>Kepala</label><input id="dH"><div class="modal-actions"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-grad" id="dS">Simpan</button></div>`);
  $('#dS').onclick=async()=>{const n=await getAll('departments');await put('departments',{id:'D'+(n.length+1),name:$('#dN').value,head:$('#dH').value});closeModal();route()};
 }};
async function delDept(id){confirmModal('Hapus departemen ini?',async()=>{await del('departments',id);route()})}

ROUTES.pengguna={view:()=>`<div class="page-head"><h2><span class="hicon">🛡️</span> Role & Hak Akses</h2></div>
 <div class="card" style="overflow-x:auto"><table><thead><tr><th>Nama</th><th>Username</th><th>Role</th><th>Akses Menu</th></tr></thead><tbody id="uBody"></tbody></table></div>
 <div class="card"><b>Matriks Hak Akses</b><div style="overflow-x:auto"><table><thead><tr><th>Role</th><th>Dashboard</th><th>Karyawan</th><th>Absensi</th><th>Laporan</th><th>Admin</th></tr></thead>
 <tbody>${Object.keys(PERMS).map(r=>`<tr><td><b>${r}</b></td><td>✅</td><td>${PERMS[r].includes('*')||PERMS[r].includes('karyawan')?'✅':'❌'}</td><td>✅</td><td>✅</td><td>${['superadmin','hrd'].includes(r)?'✅':'❌'}</td></tr>`).join('')}</tbody></table></div></div>`,
 init:async()=>{const us=await getAll('users');
  $('#uBody').innerHTML=us.map(u=>`<tr><td><span class="avatar" style="background:${u.color};margin-right:7px">${initials(u.name)}</span>${esc(u.name)}</td><td><code>${u.username}</code></td>
  <td>${currentUser.role==='superadmin'?`<select onchange="setRole('${u.id}',this.value)">${Object.keys(PERMS).map(r=>`<option ${r===u.role?'selected':''}>${r}</option>`).join('')}</select>`:`<span class="badge b-purple">${u.role}</span>`}</td>
  <td style="color:var(--muted);font-size:11px">${PERMS[u.role].includes('*')?'SEMUA':PERMS[u.role].length+' menu'}</td></tr>`).join('');
 }};
async function setRole(id,r){const u=await getOne('users',id);u.role=r;await put('users',u);toast('Role diubah','ok')}

ROUTES.log={view:()=>`<div class="page-head"><h2><span class="hicon">📜</span> Log Aktivitas</h2></div><div class="card" style="overflow-x:auto"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Detail</th></tr></thead><tbody id="lgBody"></tbody></table></div>`,
 init:async()=>{const ls=await getAll('logs');
  $('#lgBody').innerHTML=ls.slice().reverse().slice(0,100).map(l=>`<tr><td>${new Date(l.ts).toLocaleString('id-ID')}</td><td>${esc(l.user)}</td><td><span class="badge b-blue">${l.action}</span></td><td>${esc(l.detail)}</td></tr>`).join('');
 }};

ROUTES.pengaturan={view:()=>`<div class="page-head"><h2><span class="hicon">⚙️</span> Pengaturan Sistem</h2></div>
 <div class="grid g2"><div class="card" id="setForm"></div><div class="card"><b>Konfigurasi Shift</b><div id="shiftList" style="margin-top:10px"></div></div></div>`,
 init:async()=>{const s=await getSettings(),shifts=await getAll('shifts');
  $('#setForm').innerHTML=`<b>Umum</b>
  <label>Nama Perusahaan</label><input id="gCo" value="${esc(s.company)}">
  <div class="form-grid"><div><label>Toleransi Terlambat (menit)</label><input type="number" id="gTol" value="${s.tolerance}"></div>
  <div><label>Auto-Logout (menit)</label><input type="number" id="gIdle" value="${s.autoLogout}"></div></div>
  <button class="btn btn-grad" style="margin-top:16px" id="gSave">💾 Simpan Pengaturan</button>`;
  $('#shiftList').innerHTML=shifts.map(sh=>`<div class="chip" style="width:100%;justify-content:space-between">${sh.name} <span><input type="time" value="${sh.in}" data-id="${sh.id}" data-f="in" class="shIn" style="padding:4px"> → <input type="time" value="${sh.out}" data-id="${sh.id}" data-f="out" class="shOut" style="padding:4px"></span></div>`).join('');
  $('#gSave').onclick=async()=>{await saveSettings({...s,company:$('#gCo').value,tolerance:+$('#gTol').value,autoLogout:+$('#gIdle').value});
   for(const i of $$('.shIn,.shOut')){const sh=await getOne('shifts',i.dataset.id);sh[i.dataset.f]=i.value;await put('shifts',sh)}
   toast('Pengaturan disimpan','ok');addLog(currentUser.name,'PENGATURAN','Ubah konfigurasi')};
 }};

ROUTES.backup={view:()=>`<div class="page-head"><h2><span class="hicon">💾</span> Penyimpanan & Backup</h2></div>
 <div class="grid g3"><div class="card"><b>Ukuran Data</b><p id="usage" style="font-size:22px;font-weight:800;margin-top:8px">...</p><small style="color:var(--muted)">IndexedDB lokal browser</small></div>
 <div class="card"><b>Backup</b><p style="color:var(--muted);margin:8px 0">Ekspor seluruh data ke file JSON.</p><button class="btn btn-grad" id="bkExp">⬇ Export JSON</button></div>
 <div class="card"><b>Restore</b><p style="color:var(--muted);margin:8px 0">Impor dari file JSON backup.</p><input type="file" id="bkImp" accept=".json" style="padding:6px"><br><button class="btn btn-danger" id="bkDel" style="margin-top:10px">🗑 Hapus Semua Data</button></div></div>`,
 init:async()=>{const u=await storageUsage();$('#usage').textContent=u.mb+' MB ('+u.kb+' KB)';
  $('#bkExp').onclick=async()=>{download('eams-backup-'+today()+'.json',await exportAll(),'application/json');toast('Backup diunduh','ok')};
  $('#bkImp').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async()=>{try{await importAll(r.result);toast('Data dipulihkan','ok')}catch(x){toast('Backup tidak valid','err')}};r.readAsText(f)};
  $('#bkDel').onclick=()=>confirmModal('PERINGATAN: semua data akan dihapus permanen!',async()=>{for(const s of STORES)await clearStore(s);await seedIfEmpty();toast('Data direset','warn')});
 }};

ROUTES.notifikasi={view:()=>`<div class="page-head"><h2><span class="hicon">🔔</span> Notifikasi</h2></div><div class="card" id="notifList"></div>`,
 init:async()=>{const ns=await getAll('notifications');
  $('#notifList').innerHTML=ns.slice().reverse().map(n=>`<div class="chip" style="width:100%;background:${n.read?'#141a3d':'#1c1440'}">${n.read?'✅':'⏳'} <b>${esc(n.msg)}</b> <small style="margin-left:auto;color:var(--muted)">${n.ts}</small></div>`).join('')||'<p style="color:var(--muted)">Kosong</p>';
 }};