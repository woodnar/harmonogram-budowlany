const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const TEAM_PASSWORD = process.env.TEAM_PASSWORD || 'budowa2024';

// Folder na dane
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Baza danych JSON
const adapter = new FileSync(path.join(dataDir, 'db.json'));
const db = low(adapter);

// Domyślna struktura + przykładowe dane
db.defaults({
  projects: [],
  subcontractors: [],
  nextProjectId: 1,
  nextStageId: 1,
  nextSubId: 1,
}).write();

// Wstaw przykładowe dane jeśli baza pusta
if (db.get('projects').value().length === 0) {
  const subs = [
    {id:1,name:'Kowalski Ziemne',contact:'Marek Kowalski',phone:'600 111 222',email:'kowalski@ziemne.pl',specs:['Roboty ziemne','Wykopy'],notes:'Dobra ekipa, zawsze na czas',active:true},
    {id:2,name:'Beton-Bud Sp. z o.o.',contact:'Andrzej Bednarz',phone:'601 222 333',email:'a.bednarz@betonbud.pl',specs:['Fundamenty','Beton','Żelbet'],notes:'Wymaga zaliczki 30%',active:true},
    {id:3,name:'Mur-Pol Wojtas',contact:'Stanisław Wojtas',phone:'602 333 444',email:'wojtas@murpol.pl',specs:['Murowanie','Stan surowy','Ściany nośne'],notes:'',active:true},
    {id:4,name:'Ciesielstwo Nowak',contact:'Piotr Nowak',phone:'603 444 555',email:'pnowak@ciesielstwo.pl',specs:['Dach','Więźba'],notes:'Tylko południe Polski',active:true},
    {id:5,name:'Elektro-Plus',contact:'Tomasz Krawczyk',phone:'604 555 666',email:'biuro@elektroplus.pl',specs:['Instalacje elektryczne','Fotowoltaika'],notes:'',active:true},
    {id:6,name:'Hydro Serwis',contact:'Krzysztof Zając',phone:'605 666 777',email:'k.zajac@hydroserwis.pl',specs:['Instalacje wod-kan','CO','Wentylacja'],notes:'Certyfikat UDT',active:true},
    {id:7,name:'Tynk-Art Pietrzak',contact:'Józef Pietrzak',phone:'606 777 888',email:'tynkart@wp.pl',specs:['Tynki','Elewacja','Gładzie'],notes:'',active:true},
    {id:8,name:'Finish Pro',contact:'Kamil Wiśniewski',phone:'607 888 999',email:'kamil@finishpro.pl',specs:['Wykończenie wnętrz','Podłogi'],notes:'Sezonowo – dostępny IV–X',active:false},
    {id:9,name:'Green-Land',contact:'Agnieszka Bąk',phone:'608 999 000',email:'a.bak@greenland.pl',specs:['Zieleń','Zagospodarowanie terenu'],notes:'',active:true},
    {id:10,name:'SteelPol Nowy Sącz',contact:'Ryszard Dąbrowski',phone:'609 000 111',email:'r.dabrowski@steelpol.pl',specs:['Konstrukcja stalowa','Hale'],notes:'Min. zlecenie 50k PLN',active:true},
  ];
  db.set('subcontractors', subs).set('nextSubId', 11).write();

  const projects = [
    {
      id:1, name:'Osiedle Słoneczne – blok A', short:'Słoneczne',
      location:'Bielsko-Biała', client:'TBS Południe Sp. z o.o.', weeks:20, progress:62,
      stages:[
        {id:1,name:'Roboty ziemne',subId:1,start:1,dur:3,status:'done'},
        {id:2,name:'Fundamenty',subId:2,start:3,dur:4,status:'done'},
        {id:3,name:'Stan surowy zamknięty',subId:3,start:6,dur:7,status:'inprogress'},
        {id:4,name:'Dach – konstrukcja',subId:4,start:12,dur:3,status:'planned'},
        {id:5,name:'Instalacje elektryczne',subId:5,start:10,dur:6,status:'planned'},
        {id:6,name:'Instalacje wod-kan',subId:6,start:10,dur:6,status:'planned'},
        {id:7,name:'Elewacja i tynki',subId:7,start:15,dur:4,status:'planned'},
        {id:8,name:'Odbiór techniczny',subId:null,start:20,dur:1,status:'planned'},
      ]
    },
    {
      id:2, name:'Willa pod Skarpą', short:'Willa Skarpa',
      location:'Żywiec', client:'Jan Wróblewski', weeks:16, progress:85,
      stages:[
        {id:1,name:'Roboty ziemne',subId:1,start:1,dur:2,status:'done'},
        {id:2,name:'Fundamenty i piwnica',subId:2,start:3,dur:3,status:'done'},
        {id:3,name:'Ściany nośne',subId:3,start:6,dur:4,status:'done'},
        {id:4,name:'Strop i dach',subId:4,start:9,dur:3,status:'done'},
        {id:5,name:'Okna i drzwi',subId:null,start:12,dur:2,status:'inprogress'},
        {id:6,name:'Wykończenie wnętrz',subId:8,start:14,dur:3,status:'planned'},
        {id:7,name:'Zagospodarowanie terenu',subId:9,start:16,dur:2,status:'notstarted'},
      ]
    },
    {
      id:3, name:'Pawilon Galeria Beskidy', short:'Beskidy',
      location:'Sucha Beskidzka', client:'Beskid Invest S.A.', weeks:24, progress:28,
      stages:[
        {id:1,name:'Projekt wykonawczy',subId:null,start:1,dur:4,status:'done'},
        {id:2,name:'Roboty ziemne',subId:1,start:4,dur:3,status:'done'},
        {id:3,name:'Fundamenty',subId:2,start:6,dur:4,status:'inprogress'},
        {id:4,name:'Konstrukcja stalowa',subId:10,start:9,dur:6,status:'planned'},
        {id:5,name:'Instalacje',subId:5,start:12,dur:8,status:'delayed'},
        {id:6,name:'Tynki i elewacja',subId:7,start:18,dur:4,status:'notstarted'},
        {id:7,name:'Wykończenie',subId:8,start:21,dur:4,status:'notstarted'},
      ]
    },
  ];
  db.set('projects', projects).set('nextProjectId', 4).set('nextStageId', 20).write();
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'harmonogram-secret-2024',
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
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Nieprawidłowe hasło' });
  }
});
app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }); });
app.get('/api/me', (req, res) => { res.json({ authenticated: !!(req.session && req.session.authenticated) }); });

// ── PROJECTS ──
app.get('/api/projects', requireAuth, (req, res) => {
  res.json(db.get('projects').value());
});

app.post('/api/projects', requireAuth, (req, res) => {
  const id = db.get('nextProjectId').value();
  const proj = { id, stages: [], ...req.body };
  proj.short = proj.short || proj.name.split(' ')[0];
  db.get('projects').push(proj).write();
  db.set('nextProjectId', id + 1).write();
  res.json({ id });
});

app.put('/api/projects/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  db.get('projects').find({ id }).assign(req.body).write();
  res.json({ ok: true });
});

app.delete('/api/projects/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  db.get('projects').remove({ id }).write();
  res.json({ ok: true });
});

// ── STAGES ──
app.post('/api/projects/:projectId/stages', requireAuth, (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const stageId = db.get('nextStageId').value();
  const stage = { id: stageId, ...req.body };
  db.get('projects').find({ id: projectId }).get('stages').push(stage).write();
  db.set('nextStageId', stageId + 1).write();
  res.json({ id: stageId });
});

app.put('/api/stages/:stageId', requireAuth, (req, res) => {
  const stageId = parseInt(req.params.stageId);
  const projects = db.get('projects').value();
  for (const p of projects) {
    const stage = p.stages.find(s => s.id === stageId);
    if (stage) {
      Object.assign(stage, req.body);
      db.write();
      return res.json({ ok: true });
    }
  }
  res.status(404).json({ error: 'Nie znaleziono etapu' });
});

app.delete('/api/stages/:stageId', requireAuth, (req, res) => {
  const stageId = parseInt(req.params.stageId);
  const projects = db.get('projects').value();
  for (const p of projects) {
    const idx = p.stages.findIndex(s => s.id === stageId);
    if (idx !== -1) {
      p.stages.splice(idx, 1);
      db.write();
      return res.json({ ok: true });
    }
  }
  res.status(404).json({ error: 'Nie znaleziono etapu' });
});

// ── SUBCONTRACTORS ──
app.get('/api/subcontractors', requireAuth, (req, res) => {
  res.json(db.get('subcontractors').value());
});

app.post('/api/subcontractors', requireAuth, (req, res) => {
  const id = db.get('nextSubId').value();
  db.get('subcontractors').push({ id, ...req.body }).write();
  db.set('nextSubId', id + 1).write();
  res.json({ id });
});

app.put('/api/subcontractors/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  db.get('subcontractors').find({ id }).assign(req.body).write();
  res.json({ ok: true });
});

app.delete('/api/subcontractors/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  db.get('subcontractors').remove({ id }).write();
  res.json({ ok: true });
});

// Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Aplikacja działa na porcie ${PORT}`);
  console.log(`Hasło zespołu: ${TEAM_PASSWORD}`);
});
