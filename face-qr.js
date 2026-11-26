/* ================= INTI PROSES ABSENSI ================= */
async function processAttendance(empId,type,method,photo){
 const emp=await getOne('employees',empId);if(!emp)return toast('Karyawan tidak ditemukan','err');
 const shift=await getOne('shifts',emp.shiftId),st=await getSettings(),d=today();
 const id=d+empId;let rec=await getOne('attendance',id);
 const now=nowT();
 if(type==='in'){
  if(rec&&rec.checkIn)return toast('Sudah absen masuk hari ini','warn');
  let late=Math.max(0,tMin(now)-tMin(shift.in)-st.tolerance);
  const status=late>0?'late':'present';
  await put('attendance',rec?{...rec,checkIn:now,status,lateMin:late,method,photo:!!photo}:{id,empId,date:d,checkIn:now,checkOut:null,status,lateMin:late,method,photo:!!photo});
  await addLog(emp.name,'ABSEN_MASUK',empId+' '+now+' ('+method+')'+(late?' TELAT '+late+'m':''));
  toast(late?`⏰ Masuk tercatat — TERLAMBAT ${late} menit`:`✅ Masuk tercatat ${now}`,late?'warn':'ok');
 }else{
  if(!rec||!rec.checkIn)return toast('Belum absen masuk','err');
  if(rec.checkOut)return toast('Sudah absen pulang','warn');
  await put('attendance',{...rec,checkOut:now});
  await addLog(emp.name,'ABSEN_PULANG',empId+' '+now);
  toast('👋 Pulang tercatat '+now,'ok');
 }
 if(photo)await put('facePhotos',{empId,date:d,type,photo,ts:new Date().toISOString()});
 refreshBell();
}

/* ================= FACE ATTENDANCE ================= */
let camStream=null;
ROUTES.face={view:()=>`
 <div class="page-head"><h2><span class="hicon">📷</span> Face Attendance</h2></div>
 <div class="cam-wrap">
  <div class="card glow">
   <div class="filters"><div class="f"><label>Karyawan</label><select id="faceEmp">${''}</select></div>
   <div class="f"><label>Jenis</label><select id="faceType"><option value="in">Absen Masuk</option><option value="out">Absen Pulang</option></select></div></div>
   <div class="cam-box" style="margin-top:14px"><video id="faceVideo" autoplay playsinline></video><div class="face-overlay"><div class="face-ring"></div></div></div>
   <div style="display:flex;gap:10px;margin-top:14px">
    <button class="btn btn-outline" id="btnCam">▶ Aktifkan Kamera</button>
    <button class="btn btn-grad" id="btnSnap">📸 Ambil Foto & Absen</button></div>
   <p style="color:var(--muted);font-size:12px;margin-top:10px">ℹ️ Ini adalah <b>dokumentasi foto wajah</b>, bukan face recognition biometrik. Untuk pencocokan identitas diperlukan model face recognition + liveness detection terpisah.</p>
  </div>
  <div class="card"><b>Riwayat Foto</b><div id="faceHist" style="margin-top:12px"></div></div>
 </div>`,
 init:async()=>{
  const emps=await getAll('employees');
  $('#faceEmp').innerHTML=(currentUser.employeeId?emps.filter(e=>e.id===currentUser.employeeId):emps).map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  const drawHist=async()=>{const ps=await getAll('facePhotos');
   $('#faceHist').innerHTML=ps.slice(-9).reverse().map(p=>`<div class="chip" style="width:100%">${p.type==='in'?'🟢 Masuk':'🔴 Pulang'} ${p.ts.slice(11,16)}<br><img src="${p.photo}" style="width:100%;border-radius:8px;margin-top:6px"></div>`).join('')||'<p style="color:var(--muted)">Belum ada foto</p>';};
  drawHist();
  $('#btnCam').onclick=async()=>{try{camStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}});$('#faceVideo').srcObject=camStream}catch{toast('Kamera ditolak / tidak tersedia','err')}};
  $('#btnSnap').onclick=()=>{
   const v=$('#faceVideo');if(!camStream)return toast('Aktifkan kamera dulu','err');
   const c=document.createElement('canvas');c.width=320;c.height=240;c.getContext('2d').drawImage(v,0,0,320,240);
   processAttendance($('#faceEmp').value,$('#faceType').value,'face',c.toDataURL('image/jpeg',.7)).then(drawHist);
  };
 }};

/* ================= QR ATTENDANCE ================= */
let qrScanner=null;
ROUTES.qr={view:()=>`
 <div class="page-head"><h2><span class="hicon">▦</span> QR Attendance</h2></div>
 <div class="grid g2">
  <div class="card"><b>📡 Scan QR Code</b>
   <div id="qrReader" style="margin-top:14px"></div>
   <div style="display:flex;gap:10px;margin-top:12px"><button class="btn btn-grad" id="btnScan">▶ Mulai Scan</button>
   <button class="btn" id="btnStopScan">⏹ Stop</button></div>
   <label style="margin-top:16px">Atau input manual ID</label>
   <div class="filters"><input id="qrManual" placeholder="EMP-1001"><select id="qrType"><option value="in">Masuk</option><option value="out">Pulang</option></select>
   <button class="btn btn-outline" id="btnQrGo">Proses</button></div>
   <p style="color:var(--muted);font-size:12px;margin-top:10px">⚠️ QR statis dapat difoto/dibagikan. Untuk produksi, gunakan QR dinamis + token masa berlaku.</p>
  </div>
  <div class="card"><b>🎫 Generate & Cetak QR</b>
   <div class="filters" style="margin-top:12px"><div class="f"><label>Karyawan</label><select id="qrEmp"></select></div></div>
   <div id="qrPreview" style="text-align:center;margin-top:16px"></div>
  </div>
 </div>`,
 init:async()=>{
  const emps=await getAll('employees');
  $('#qrEmp').innerHTML=emps.map(e=>`<option value="${e.id}">${e.name} (${e.id})</option>`).join('');
  const preview=async()=>{const e=await getOne('employees',$('#qrEmp').value);
   $('#qrPreview').innerHTML=`<div class="idcard"><div class="row"><span class="avatar" style="width:44px;height:44px">${initials(e.name)}</span><div><b>${esc(e.name)}</b><br><small style="color:var(--muted)">${e.id}</small></div></div><div id="qrBox2" style="margin:14px auto;width:fit-content;background:#fff;padding:8px;border-radius:8px"></div></div><button class="btn btn-outline btn-sm" onclick="window.print()">🖨 Cetak Kartu</button>`;
   new QRCode($('#qrBox2'),{text:e.qr,width:140,height:140});};
  preview();$('#qrEmp').onchange=preview;
  $('#btnScan').onclick=()=>{
   qrScanner=new Html5Qrcode('qrReader');
   qrScanner.start({facingMode:'environment'},{fps:10,qrbox:250},async txt=>{
    const id=txt.replace('EAMS:','');
    qrScanner.stop().catch(()=>{});
    await processAttendance(id,'in','qr');
   },e=>{});};
  $('#btnStopScan').onclick=()=>qrScanner&&qrScanner.stop().catch(()=>{});
  $('#btnQrGo').onclick=()=>processAttendance($('#qrManual').value.trim().toUpperCase(),$('#qrType').value,'qr');
 }};