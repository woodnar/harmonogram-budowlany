const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const TEAM_PASSWORD = process.env.TEAM_PASSWORD || 'budowa2024';

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const DB_PATH = path.join(dataDir, 'db.json');

function readDB() {
  try { if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch(e) {}
  return { projects:[], subcontractors:[], nextProjectId:1, nextStageId:1, nextSubId:1 };
}
function writeDB(data) {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); } catch(e) { console.error('DB write error:', e.message); }
}

const DEFAULT_STAGES = [
  'PAB','PT Konstrukcja + płyta','PT Warsztatowo-montażowy',
  'PT Instalacje sanitarne','PT Instalacje elektryczne',
  'Płyta fundamentowa','Wiązary – projekt','Prefabrykacja',
  'Montaż konstrukcji','Montaż pokrycia','Montaż okien',
  'Wylewki','Montaż instalacji sanitarnych','Montaż instalacji elektrycznych',
  'Sufity','Elewacja + drzwi + parapety','Protokół końcowy'
];

function seedIfEmpty() {
  const data = readDB();
  if (data.projects.length > 0) return;
  data.subcontractors = [
    {id:1,name:'Kowalski Ziemne',contact:'Marek Kowalski',phone:'600 111 222',email:'kowalski@ziemne.pl',specs:['Roboty ziemne','Wykopy'],notes:'Dobra ekipa, zawsze na czas',active:true},
    {id:2,name:'Beton-Bud Sp. z o.o.',contact:'Andrzej Bednarz',phone:'601 222 333',email:'a.bednarz@betonbud.pl',specs:['Fundamenty','Beton','Żelbet'],notes:'Wymaga zaliczki 30%',active:true},
    {id:3,name:'Mur-Pol Wojtas',contact:'Stanisław Wojtas',phone:'602 333 444',email:'wojtas@murpol.pl',specs:['Murowanie','Stan surowy'],notes:'',active:true},
    {id:4,name:'Ciesielstwo Nowak',contact:'Piotr Nowak',phone:'603 444 555',email:'pnowak@ciesielstwo.pl',specs:['Dach','Wiązary','Prefabrykacja'],notes:'Tylko południe Polski',active:true},
    {id:5,name:'Elektro-Plus',contact:'Tomasz Krawczyk',phone:'604 555 666',email:'biuro@elektroplus.pl',specs:['Instalacje elektryczne','Fotowoltaika'],notes:'',active:true},
    {id:6,name:'Hydro Serwis',contact:'Krzysztof Zając',phone:'605 666 777',email:'k.zajac@hydroserwis.pl',specs:['Instalacje sanitarne','CO','Wentylacja'],notes:'Certyfikat UDT',active:true},
    {id:7,name:'Tynk-Art Pietrzak',contact:'Józef Pietrzak',phone:'606 777 888',email:'tynkart@wp.pl',specs:['Sufity','Elewacja','Wylewki'],notes:'',active:true},
    {id:8,name:'Finish Pro',contact:'Kamil Wiśniewski',phone:'607 888 999',email:'kamil@finishpro.pl',specs:['Wykończenie wnętrz','Podłogi','Drzwi'],notes:'Sezonowo IV–X',active:false},
    {id:9,name:'Green-Land',contact:'Agnieszka Bąk',phone:'608 999 000',email:'a.bak@greenland.pl',specs:['Zagospodarowanie terenu'],notes:'',active:true},
    {id:10,name:'SteelPol Nowy Sącz',contact:'Ryszard Dąbrowski',phone:'609 000 111',email:'r.dabrowski@steelpol.pl',specs:['Konstrukcja stalowa','Montaż konstrukcji','Pokrycie'],notes:'Min. zlecenie 50k PLN',active:true},
  ];
  data.nextSubId = 11;

  // Generuj etapy wg nowej listy
  const makeStages = (startId, startWeek) => DEFAULT_STAGES.map((name, i) => ({
    id: startId + i, name, subId: null,
    start: startWeek + i * 1, dur: 2, status: 'notstarted'
  }));

  data.projects = [
    {id:1,name:'Projekt przykładowy',short:'Przykład',location:'—',client:'—',weeks:36,progress:0,
     stages: makeStages(1, 1)},
  ];
  data.nextProjectId = 2;
  data.nextStageId = 100;
  writeDB(data);
  console.log('Przykładowe dane załadowane');
}

seedIfEmpty();

// ── SESJE w pliku ──
const SESS_PATH = path.join(dataDir, 'sessions.json');
function readSess() { try { if (fs.existsSync(SESS_PATH)) return JSON.parse(fs.readFileSync(SESS_PATH,'utf8')); } catch(e){} return {}; }
function writeSess(s) { try { fs.writeFileSync(SESS_PATH, JSON.stringify(s)); } catch(e){} }

class FileStore extends session.Store {
  get(sid,cb){const s=readSess()[sid];if(!s)return cb(null,null);if(s.exp&&Date.now()>s.exp){const ss=readSess();delete ss[sid];writeSess(ss);return cb(null,null);}cb(null,s.data);}
  set(sid,data,cb){const ss=readSess();ss[sid]={data,exp:Date.now()+7*24*60*60*1000};writeSess(ss);cb(null);}
  destroy(sid,cb){const ss=readSess();delete ss[sid];writeSess(ss);if(cb)cb(null);}
}

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({store:new FileStore(),secret:process.env.SESSION_SECRET||'harm-secret-2024',resave:false,saveUninitialized:false,cookie:{maxAge:7*24*60*60*1000}}));
app.use(express.static(path.join(__dirname,'public')));

function auth(req,res,next){if(req.session&&req.session.ok)return next();res.status(401).json({error:'Wymagane logowanie'});}

// AUTH
app.post('/api/login',(req,res)=>{
  if(req.body.password===TEAM_PASSWORD){req.session.ok=true;req.session.save(e=>e?res.status(500).json({error:'session'}):res.json({ok:true}));}
  else res.status(401).json({error:'Nieprawidłowe hasło'});
});
app.post('/api/logout',(req,res)=>{req.session.destroy();res.json({ok:true});});
app.get('/api/me',(req,res)=>res.json({authenticated:!!(req.session&&req.session.ok)}));

// Zwróć też domyślne etapy żeby frontend mógł je podpowiadać
app.get('/api/default-stages',(req,res)=>res.json(DEFAULT_STAGES));

// PROJECTS
app.get('/api/projects',auth,(req,res)=>res.json(readDB().projects));
app.post('/api/projects',auth,(req,res)=>{
  const data=readDB();const id=data.nextProjectId;
  data.projects.push({id,stages:[],progress:0,...req.body,short:req.body.short||req.body.name.split(' ')[0]});
  data.nextProjectId=id+1;writeDB(data);res.json({id});
});
app.put('/api/projects/:id',auth,(req,res)=>{
  const data=readDB();const id=+req.params.id;const i=data.projects.findIndex(p=>p.id===id);
  if(i!==-1)data.projects[i]={...data.projects[i],...req.body,id,stages:data.projects[i].stages};
  writeDB(data);res.json({ok:true});
});
app.delete('/api/projects/:id',auth,(req,res)=>{
  const data=readDB();data.projects=data.projects.filter(p=>p.id!==+req.params.id);writeDB(data);res.json({ok:true});
});

// STAGES
app.post('/api/projects/:pid/stages',auth,(req,res)=>{
  const data=readDB();const p=data.projects.find(p=>p.id===+req.params.pid);
  if(!p)return res.status(404).json({error:'Brak projektu'});
  const id=data.nextStageId;p.stages.push({id,...req.body});data.nextStageId=id+1;writeDB(data);res.json({id});
});
app.put('/api/stages/:id',auth,(req,res)=>{
  const data=readDB();const id=+req.params.id;
  for(const p of data.projects){const i=p.stages.findIndex(s=>s.id===id);if(i!==-1){p.stages[i]={...p.stages[i],...req.body,id};writeDB(data);return res.json({ok:true});}}
  res.status(404).json({error:'Brak etapu'});
});
app.delete('/api/stages/:id',auth,(req,res)=>{
  const data=readDB();const id=+req.params.id;
  for(const p of data.projects){const i=p.stages.findIndex(s=>s.id===id);if(i!==-1){p.stages.splice(i,1);writeDB(data);return res.json({ok:true});}}
  res.status(404).json({error:'Brak etapu'});
});

// SUBCONTRACTORS
app.get('/api/subcontractors',auth,(req,res)=>res.json(readDB().subcontractors));
app.post('/api/subcontractors',auth,(req,res)=>{
  const data=readDB();const id=data.nextSubId;data.subcontractors.push({id,...req.body});data.nextSubId=id+1;writeDB(data);res.json({id});
});
app.put('/api/subcontractors/:id',auth,(req,res)=>{
  const data=readDB();const id=+req.params.id;const i=data.subcontractors.findIndex(s=>s.id===id);
  if(i!==-1)data.subcontractors[i]={...data.subcontractors[i],...req.body,id};writeDB(data);res.json({ok:true});
});
app.delete('/api/subcontractors/:id',auth,(req,res)=>{
  const data=readDB();data.subcontractors=data.subcontractors.filter(s=>s.id!==+req.params.id);writeDB(data);res.json({ok:true});
});

// EXPORT EXCEL (jako CSV z UTF-8 BOM — otwiera się w Excelu)
app.get('/api/export/:projectId',auth,(req,res)=>{
  const data=readDB();
  const p=data.projects.find(p=>p.id===+req.params.projectId);
  if(!p)return res.status(404).json({error:'Brak projektu'});
  const subs=data.subcontractors;
  const SL={done:'Zakończony',inprogress:'W trakcie',planned:'Planowany',delayed:'Opóźniony',notstarted:'Nie rozpoczęty'};
  const rows=[
    [`Projekt:`,p.name],
    [`Lokalizacja:`,p.location||''],
    [`Klient:`,p.client||''],
    [`Tygodnie:`,p.weeks],
    [],
    ['Etap','Podwykonawca','Tydzień start','Czas trwania (tyg.)','Tydzień końca','Status'],
    ...p.stages.map(s=>{
      const sub=subs.find(x=>x.id===s.subId);
      return[s.name,sub?sub.name:'—',s.start,s.dur,s.start+s.dur-1,SL[s.status]||s.status];
    })
  ];
  const csv='\uFEFF'+rows.map(r=>r.length===0?'':r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const filename=`harmonogram_${p.name.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g,'_')}.csv`;
  res.setHeader('Content-Type','text/csv;charset=utf-8');
  res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
  res.send(csv);
});

// Eksport wszystkich projektów
app.get('/api/export-all',auth,(req,res)=>{
  const data=readDB();
  const subs=data.subcontractors;
  const SL={done:'Zakończony',inprogress:'W trakcie',planned:'Planowany',delayed:'Opóźniony',notstarted:'Nie rozpoczęty'};
  const rows=[['Projekt','Lokalizacja','Klient','Etap','Podwykonawca','Tydzień start','Czas trwania (tyg.)','Tydzień końca','Status']];
  data.projects.forEach(p=>{
    if(!p.stages||!p.stages.length){rows.push([p.name,p.location||'',p.client||'','—','—','','','','']);return;}
    p.stages.forEach(s=>{
      const sub=subs.find(x=>x.id===s.subId);
      rows.push([p.name,p.location||'',p.client||'',s.name,sub?sub.name:'—',s.start,s.dur,s.start+s.dur-1,SL[s.status]||s.status]);
    });
  });
  const csv='\uFEFF'+rows.map(r=>r.length===0?'':r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(';')).join('\r\n');
  res.setHeader('Content-Type','text/csv;charset=utf-8');
  res.setHeader('Content-Disposition','attachment; filename="harmonogram_wszystkie_projekty.csv"');
  res.send(csv);
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

app.listen(PORT,()=>{
  console.log(`Aplikacja działa na porcie ${PORT}`);
  console.log(`Hasło: ${TEAM_PASSWORD}`);
});
