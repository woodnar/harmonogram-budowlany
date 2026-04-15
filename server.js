const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const TEAM_PASSWORD = process.env.TEAM_PASSWORD || 'budowa2024';

// ── BAZA DANYCH (czysty JSON, bez zewnętrznych bibliotek) ──
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const DB_PATH = path.join(dataDir, 'db.json');

function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch(e) { console.error('DB read error:', e.message); }
  return { projects:[], subcontractors:[], nextProjectId:1, nextStageId:1, nextSubId:1 };
}
function writeDB(data) {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }
  catch(e) { console.error('DB write error:', e.message); }
}

function seedIfEmpty() {
  const data = readDB();
  if (data.projects.length > 0) return;
  data.subcontractors = [
    {id:1,name:'Kowalski Ziemne',contact:'Marek Kowalski',phone:'600 111 222',email:'kowalski@ziemne.pl',specs:['Roboty ziemne','Wykopy'],notes:'Dobra ekipa, zawsze na czas',active:true},
    {id:2,name:'Beton-Bud Sp. z o.o.',contact:'Andrzej Bednarz',phone:'601 222 333',email:'a.bednarz@betonbud.pl',specs:['Fundamenty','Beton','Żelbet'],notes:'Wymaga zaliczki 30%',active:true},
    {id:3,name:'Mur-Pol Wojtas',contact:'Stanisław Wojtas',phone:'602 333 444',email:'wojtas@murpol.pl',specs:['Murowanie','Stan surowy'],notes:'',active:true},
    {id:4,name:'Ciesielstwo Nowak',contact:'Piotr Nowak',phone:'603 444 555',email:'pnowak@ciesielstwo.pl',specs:['Dach','Więźba'],notes:'Tylko południe Polski',active:true},
    {id:5,name:'Elektro-Plus',contact:'Tomasz Krawczyk',phone:'604 555 666',email:'biuro@elektroplus.pl',specs:['Instalacje elektryczne','Fotowoltaika'],notes:'',active:true},
    {id:6,name:'Hydro Serwis',contact:'Krzysztof Zając',phone:'605 666 777',email:'k.zajac@hydroserwis.pl',specs:['Instalacje wod-kan','CO'],notes:'Certyfikat UDT',active:true},
    {id:7,name:'Tynk-Art Pietrzak',contact:'Józef Pietrzak',phone:'606 777 888',email:'tynkart@wp.pl',specs:['Tynki','Elewacja'],notes:'',active:true},
    {id:8,name:'Finish Pro',contact:'Kamil Wiśniewski',phone:'607 888 999',email:'kamil@finishpro.pl',specs:['Wykończenie wnętrz','Podłogi'],notes:'Sezonowo IV–X',active:false},
    {id:9,name:'Green-Land',contact:'Agnieszka Bąk',phone:'608 999 000',email:'a.bak@greenland.pl',specs:['Zieleń','Zagospodarowanie terenu'],notes:'',active:true},
    {id:10,name:'SteelPol Nowy Sącz',contact:'Ryszard Dąbrowski',phone:'609 000 111',email:'r.dabrowski@steelpol.pl',specs:['Konstrukcja stalowa','Hale'],notes:'Min. zlecenie 50k PLN',active:true},
  ];
  data.nextSubId = 11;
  data.projects = [
    {id:1,name:'Osiedle Słoneczne – blok A',short:'Słoneczne',location:'Bielsko-Biała',client:'TBS Południe Sp. z o.o.',weeks:20,progress:0,stages:[
      {id:1,name:'Roboty ziemne',subId:1,start:1,dur:3,status:'done'},
      {id:2,name:'Fundamenty',subId:2,start:3,dur:4,status:'done'},
      {id:3,name:'Stan surowy zamknięty',subId:3,start:6,dur:7,status:'inprogress'},
      {id:4,name:'Dach – konstrukcja',subId:4,start:12,dur:3,status:'planned'},
      {id:5,name:'Instalacje elektryczne',subId:5,start:10,dur:6,status:'planned'},
      {id:6,name:'Instalacje wod-kan',subId:6,start:10,dur:6,status:'planned'},
      {id:7,name:'Elewacja i tynki',subId:7,start:15,dur:4,status:'planned'},
      {id:8,name:'Odbiór techniczny',subId:null,start:20,dur:1,status:'planned'},
    ]},
    {id:2,name:'Willa pod Skarpą',short:'Willa Skarpa',location:'Żywiec',client:'Jan Wróblewski',weeks:16,progress:0,stages:[
      {id:9,name:'Roboty ziemne',subId:1,start:1,dur:2,status:'done'},
      {id:10,name:'Fundamenty i piwnica',subId:2,start:3,dur:3,status:'done'},
      {id:11,name:'Ściany nośne',subId:3,start:6,dur:4,status:'done'},
      {id:12,name:'Strop i dach',subId:4,start:9,dur:3,status:'done'},
      {id:13,name:'Okna i drzwi',subId:null,start:12,dur:2,status:'inprogress'},
      {id:14,name:'Wykończenie wnętrz',subId:8,start:14,dur:3,status:'planned'},
      {id:15,name:'Zagospodarowanie terenu',subId:9,start:16,dur:2,status:'notstarted'},
    ]},
    {id:3,name:'Pawilon Galeria Beskidy',short:'Beskidy',location:'Sucha Beskidzka',client:'Beskid Invest S.A.',weeks:24,progress:0,stages:[
      {id:16,name:'Projekt wykonawczy',subId:null,start:1,dur:4,status:'done'},
      {id:17,name:'Roboty ziemne',subId:1,start:4,dur:3,status:'done'},
      {id:18,name:'Fundamenty',subId:2,start:6,dur:4,status:'inprogress'},
      {id:19,name:'Konstrukcja stalowa',subId:10,start:9,dur:6,status:'planned'},
      {id:20,name:'Instalacje',subId:5,start:12,dur:8,status:'delayed'},
      {id:21,name:'Tynki i elewacja',subId:7,start:18,dur:4,status:'notstarted'},
      {id:22,name:'Wykończenie',subId:8,start:21,dur:4,status:'notstarted'},
    ]},
  ];
  data.nextProjectId = 4;
  data.nextStageId = 30;
  writeDB(data);
  console.log('✓ Przykładowe dane załadowane');
}

seedIfEmpty();

// ── SESJE przechowywane w pliku JSON (bez zewnętrznych bibliotek) ──
const SESSIONS_PATH = path.join(dataDir, 'sessions.json');
function readSessions() {
  try { if (fs.existsSync(SESSIONS_PATH)) return JSON.parse(fs.readFileSync(SESSIONS_PATH, 'utf8')); } catch(e) {}
  return {};
}
function writeSessions(s) {
  try { fs.writeFileSync(SESSIONS_PATH, JSON.stringify(s)); } catch(e) {}
}

// Prosty session store oparty na plikach
class FileSessionStore extends session.Store {
  get(sid, cb) {
    const sessions = readSessions();
    const s = sessions[sid];
    if (!s) return cb(null, null);
    if (s.expires && Date.now() > s.expires) { delete sessions[sid]; writeSessions(sessions); return cb(null, null); }
    cb(null, s.data);
  }
  set(sid, sessionData, cb) {
    const sessions = readSessions();
    sessions[sid] = { data: sessionData, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 };
    writeSessions(sessions);
    cb(null);
  }
  destroy(sid, cb) {
    const sessions = readSessions();
    delete sessions[sid];
    writeSessions(sessions);
    if (cb) cb(null);
  }
}

// ── MIDDLEWARE ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  store: new FileSessionStore(),
  secret: process.env.SESSION_SECRET || 'harmonogram-tajny-klucz-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.status(401).json({ error: 'Wymagane logowanie' });
}

// ── AUTH ──
app.post('/api/login', (req, res) => {
  if (req.body.password === TEAM_PASSWORD) {
    req.session.authenticated = true;
    req.session.save(err => {
      if (err) return res.status(500).json({ error: 'Błąd sesji' });
      res.json({ ok: true });
    });
  } else {
    res.status(401).json({ error: 'Nieprawidłowe hasło' });
  }
});
app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }); });
app.get('/api/me', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

// ── PROJECTS ──
app.get('/api/projects', requireAuth, (req, res) => { res.json(readDB().projects); });

app.post('/api/projects', requireAuth, (req, res) => {
  const data = readDB();
  const id = data.nextProjectId;
  const proj = { id, stages:[], progress:0, ...req.body };
  proj.short = proj.short || proj.name.split(' ')[0];
  data.projects.push(proj);
  data.nextProjectId = id + 1;
  writeDB(data);
  res.json({ id });
});

app.put('/api/projects/:id', requireAuth, (req, res) => {
  const data = readDB();
  const id = parseInt(req.params.id);
  const idx = data.projects.findIndex(p => p.id === id);
  if (idx !== -1) {
    data.projects[idx] = { ...data.projects[idx], ...req.body, id, stages: data.projects[idx].stages };
    writeDB(data);
  }
  res.json({ ok: true });
});

app.delete('/api/projects/:id', requireAuth, (req, res) => {
  const data = readDB();
  data.projects = data.projects.filter(p => p.id !== parseInt(req.params.id));
  writeDB(data);
  res.json({ ok: true });
});

// ── STAGES ──
app.post('/api/projects/:projectId/stages', requireAuth, (req, res) => {
  const data = readDB();
  const proj = data.projects.find(p => p.id === parseInt(req.params.projectId));
  if (!proj) return res.status(404).json({ error: 'Projekt nie znaleziony' });
  const id = data.nextStageId;
  proj.stages.push({ id, ...req.body });
  data.nextStageId = id + 1;
  writeDB(data);
  res.json({ id });
});

app.put('/api/stages/:stageId', requireAuth, (req, res) => {
  const data = readDB();
  const id = parseInt(req.params.stageId);
  for (const p of data.projects) {
    const idx = p.stages.findIndex(s => s.id === id);
    if (idx !== -1) { p.stages[idx] = { ...p.stages[idx], ...req.body, id }; writeDB(data); return res.json({ ok:true }); }
  }
  res.status(404).json({ error: 'Etap nie znaleziony' });
});

app.delete('/api/stages/:stageId', requireAuth, (req, res) => {
  const data = readDB();
  const id = parseInt(req.params.stageId);
  for (const p of data.projects) {
    const idx = p.stages.findIndex(s => s.id === id);
    if (idx !== -1) { p.stages.splice(idx, 1); writeDB(data); return res.json({ ok:true }); }
  }
  res.status(404).json({ error: 'Etap nie znaleziony' });
});

// ── SUBCONTRACTORS ──
app.get('/api/subcontractors', requireAuth, (req, res) => { res.json(readDB().subcontractors); });

app.post('/api/subcontractors', requireAuth, (req, res) => {
  const data = readDB();
  const id = data.nextSubId;
  data.subcontractors.push({ id, ...req.body });
  data.nextSubId = id + 1;
  writeDB(data);
  res.json({ id });
});

app.put('/api/subcontractors/:id', requireAuth, (req, res) => {
  const data = readDB();
  const id = parseInt(req.params.id);
  const idx = data.subcontractors.findIndex(s => s.id === id);
  if (idx !== -1) { data.subcontractors[idx] = { ...data.subcontractors[idx], ...req.body, id }; writeDB(data); }
  res.json({ ok:true });
});

app.delete('/api/subcontractors/:id', requireAuth, (req, res) => {
  const data = readDB();
  data.subcontractors = data.subcontractors.filter(s => s.id !== parseInt(req.params.id));
  writeDB(data);
  res.json({ ok:true });
});

// Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✓ Aplikacja działa na porcie ${PORT}`);
  console.log(`✓ Hasło zespołu: ${TEAM_PASSWORD}`);
  console.log(`✓ Baza danych: ${DB_PATH}`);
});
