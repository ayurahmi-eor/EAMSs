/* ================= DATA DEMO ================= */
const SHIFTS=[
  {id:'S1',name:'Pagi',in:'07:00',out:'15:00'},
  {id:'S2',name:'Normal',in:'08:00',out:'17:00'},
  {id:'S3',name:'Siang',in:'15:00',out:'23:00'},
  {id:'S4',name:'Malam',in:'23:00',out:'07:00'}
];
const DEPTS=['Human Resources','Design','Finance','Marketing','Sales','Software Engineer','Data Science','Development'];
const NAMES=[
 ['Olivia Thompson','Marketing','Manager','female','S4'],
 ['Adrian Legi','Design','Content Creator','male','S2'],
 ['Rodes Johnes','Data Science','Data Scientist','male','S2'],
 ['Steven Williw','Development','Project Manager','male','S2'],
 ['Brian Malik','Software Engineer','Software Engineer','male','S2'],
 ['Dominique Halin','Development','Developer','female','S2'],
 ['Emily Buttle','Human Resources','HR Head','female','S2'],
 ['Hanah Smeet','Design','UI Designer','female','S2'],
 ['Carmen Rodriguez','Sales','Sales Lead','female','S1'],
 ['Mark Stewart','Finance','Accountant','male','S1'],
 ['Sharon Neville','Finance','Analyst','female','S1'],
 ['Rachel Lorrence','Marketing','Copywriter','female','S3'],
 ['Dwayne Stevens','Development','DevOps','male','S4'],
 ['Roger Patrick','Sales','Sales','male','S1'],
 ['Jennifer Muller','Design','UX Researcher','female','S2'],
 ['Adrian Goia','Data Science','ML Engineer','male','S3'],
 ['Nadia Putri','Human Resources','Recruiter','female','S2'],
 ['Bagas Pratama','Software Engineer','Backend Dev','male','S3'],
 ['Sari Wulandari','Sales','Sales','female','S1'],
 ['Tono Suprapto','Development','QA Engineer','male','S4']
];

async function seedIfEmpty(){
  if((await getAll('users')).length) return;

  await bulkPut('users',[
    {id:'u1',username:'superadmin',password:'superadmin',name:'Andi Wijaya',role:'superadmin',color:'#7c3aed'},
    {id:'u2',username:'hrd',password:'hrd',name:'Emily Buttle',role:'hrd',employeeId:'EMP-1007',color:'#0ea5e9'},
    {id:'u3',username:'manager',password:'manager',name:'Steven Williw',role:'manager',employeeId:'EMP-1004',color:'#f97316'},
    {id:'u4',username:'employee',password:'employee',name:'Olivia Thompson',role:'employee',employeeId:'EMP-1001',color:'#22c55e'},
    {id:'u5',username:'auditor',password:'auditor',name:'CV Prima Audit',role:'auditor',color:'#eab308'}
  ]);
  await bulkPut('shifts',SHIFTS);
  await bulkPut('departments',DEPTS.map((d,i)=>({id:'D'+(i+1),name:d,head:['Emily Buttle','Hanah Smeet','Mark Stewart','Olivia Thompson','Carmen Rodriguez','Brian Malik','Rodes Johnes','Steven Williw'][i]})));

  const emps=NAMES.map((n,i)=>({
    id:'EMP-'+(1001+i),name:n[0],department:n[1],position:n[2],gender:n[3],
    shiftId:n[4],email:n[0].toLowerCase().replace(/\s/g,'.')+'@eams.co',
    phone:'0812'+(3456700+i),address:'Jakarta',status:i===19?'inactive':'active',
    joinDate:'202'+(2+i%3)+'-0'+(1+i%9)+'-15',photo:null,qr:'EAMS:EMP-'+(1001+i)
  }));
  await bulkPut('employees',emps);

  /* Riwayat absensi 30 hari terakhir */
  const att=[];const now=new Date();
  for(let d=29;d>=0;d--){
    const day=new Date(now);day.setDate(now.getDate()-d);
    const dow=day.getDay();
    if(dow===0||dow===6) continue; // hari libur
    const ds=day.toISOString().slice(0,10);
    for(const e of emps){
      if(e.status==='inactive') continue;
      const sh=SHIFTS.find(s=>s.id===e.shiftId);
      const r=Math.random();
      if(r<0.05){ att.push({id:ds+e.id,empId:e.id,date:ds,checkIn:null,checkOut:null,status:'absent',method:'-',lateMin:0}); continue; }
      if(r<0.09){ att.push({id:ds+e.id,empId:e.id,date:ds,checkIn:null,checkOut:null,status:'leave',method:'-',lateMin:0}); continue; }
      let late=0, ciMin=tMin(sh.in)+(Math.random()<0.18? (5+Math.floor(Math.random()*40)) : -10+Math.floor(Math.random()*10));
      if(ciMin>tMin(sh.in)+10) late=ciMin-tMin(sh.in);
      const ci=minT(ciMin), co=minT(tMin(sh.out)+Math.floor(Math.random()*40)-10);
      att.push({id:ds+e.id,empId:e.id,date:ds,checkIn:ci,checkOut:co,status:late>0?'late':'present',method:['face','qr','manual'][Math.floor(Math.random()*3)],lateMin:late});
    }
  }
  await bulkPut('attendance',att);

  await bulkPut('leaves',[
    {id:'l1',serial:'LEAV-717',empId:'EMP-1002',type:'Maternity',amount:'12 Weeks',reason:'Proses persalinan',status:'pending',submittedAt:'2026-11-20'},
    {id:'l2',serial:'LEAV-718',empId:'EMP-1003',type:'Personal',amount:'2 Days',reason:'Acara keluarga',status:'approved',submittedAt:'2026-11-18'},
    {id:'l3',serial:'LEAV-719',empId:'EMP-1005',type:'Medical',amount:'3 Days',reason:'Sakit + surat dokter',status:'pending',submittedAt:'2026-11-22'},
    {id:'l4',serial:'LEAV-720',empId:'EMP-1006',type:'Study',amount:'1 Day',reason:'Ujian sertifikasi',status:'approved',submittedAt:'2026-11-15'},
    {id:'l5',serial:'LEAV-721',empId:'EMP-1001',type:'Sick Day',amount:'1 Day',reason:'Demam',status:'approved',submittedAt:'2026-11-14'},
    {id:'l6',serial:'LEAV-722',empId:'EMP-1008',type:'Vacation',amount:'5 Days',reason:'Liburan tahunan',status:'rejected',submittedAt:'2026-11-10'},
    {id:'l7',serial:'LEAV-723',empId:'EMP-1001',type:'Personal',amount:'1 Day',reason:'Urusan bank',status:'pending',submittedAt:'2026-11-24'}
  ]);
  await bulkPut('overtime',[
    {id:'o1',empId:'EMP-1004',date:'2026-11-24',start:'17:00',end:'20:30',hours:3.5,reason:'Deploy rilis',status:'approved'},
    {id:'o2',empId:'EMP-1006',date:'2026-11-24',start:'17:00',end:'19:00',hours:2,reason:'Bug fix',status:'pending'},
    {id:'o3',empId:'EMP-1018',date:'2026-11-23',start:'23:00',end:'01:00',hours:2,reason:'Monitoring server',status:'approved'}
  ]);
  await bulkPut('notifications',[
    {msg:'3 pengajuan izin menunggu persetujuan Anda',ts:'2026-11-26 08:10',read:false},
    {msg:'Shift Malam Olivia Thompson dimulai 21:00',ts:'2026-11-26 08:00',read:false},
    {msg:'Backup sistem belum dilakukan 7 hari terakhir',ts:'2026-11-25 17:00',read:true}
  ]);
  await addLog('system','SEED','Data demo dibuat');
}