const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const TEAM_PASSWORD = process.env.TEAM_PASSWORD || 'budowa2024';

// Upewnij się że folder data istnieje
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Baza danych
const db = new Database(path.join(dataDir, 'harmonogram.db'));

// Inicjalizacja tabel
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short TEXT,
    location TEXT,
    client TEXT,
    weeks INTEGER DEFAULT 16,
    progress INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sub_id INTEGER,
    start_week INTEGER DEFAULT 1,
    duration INTEGER DEFAULT 2,
    status TEXT DEFAULT 'planned',
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subcontractors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    phone TEXT,
    email TEXT,
    specs TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Wstaw przykładowe dane jeśli baza jest pusta
const projCount = db.prepare('SELECT COUNT(*) as n FROM projects').get();
if (projCount.n === 0) {
  const insertProj = db.prepare('INSERT INTO projects (name, short, location, client, weeks, progress) VALUES (?, ?, ?, ?, ?, ?)');
  const insertStage = db.prepare('INSERT INTO stages (project_id, name, sub_id, start_week, duration, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertSub = db.prepare('INSERT INTO subcontractors (name, contact, phone, email, specs, notes, active) VALUES (?, ?, ?, ?, ?, ?, ?)');

  const subs = [
    ['Kowalski Ziemne','Marek Kowalski','600 111 222','kowalski@ziemne.pl','["Roboty ziemne","Wykopy","Niwelacja"]','Dobra ekipa, zawsze na czas',1],
    ['Beton-Bud Sp. z o.o.','Andrzej Bednarz','601 222 333','a.bednarz@betonbud.pl','["Fundamenty","Beton","Żelbet"]','Wymaga zaliczki 30%',1],
    ['Mur-Pol Wojtas','Stanisław Wojtas','602 333 444','wojtas@murpol.pl','["Murowanie","Stan surowy","Ściany nośne"]','',1],
    ['Ciesielstwo Nowak','Piotr Nowak','603 444 555','pnowak@ciesielstwo.pl','["Dach","Więźba","Konstrukcja drewniana"]','Tylko południe Polski',1],
    ['Elektro-Plus','Tomasz Krawczyk','604 555 666','biuro@elektroplus.pl','["Instalacje elektryczne","Odgromówka","Fotowoltaika"]','',1],
    ['Hydro Serwis','Krzysztof Zając','605 666 777','k.zajac@hydroserwis.pl','["Instalacje wod-kan","CO","Wentylacja"]','Certyfikat UDT',1],
    ['Tynk-Art Pietrzak','Józef Pietrzak','606 777 888','tynkart@wp.pl','["Tynki","Elewacja","Gładzie"]','',1],
    ['Finish Pro','Kamil Wiśniewski','607 888 999','kamil@finishpro.pl','["Wykończenie wnętrz","Podłogi","Malowanie"]','Sezonowo – dostępny IV–X',0],
    ['Green-Land','Agnieszka Bąk','608 999 000','a.bak@greenland.pl','["Zieleń","Zagospodarowanie terenu","Małarchitektura"]','',1],
    ['SteelPol Nowy Sącz','Ryszard Dąbrowski','609 000 111','r.dabrowski@steelpol.pl','["Konstrukcja stalowa","Hale","Wiaty"]','Min. zlecenie 50k PLN',1],
  ];
  subs.forEach(s => insertSub.run(...s));

  const p1 = insertProj.run('Osiedle Słoneczne – blok A','Słoneczne','Bielsko-Biała','TBS Południe Sp. z o.o.',20,62).lastInsertRowid;
  [[1,'Roboty ziemne',1,1,3,'done',1],[2,'Fundamenty',2,3,4,'done',2],[3,'Stan surowy zamknięty',3,6,7,'inprogress',3],[4,'Dach – konstrukcja',4,12,3,'planned',4],[5,'Instalacje elektryczne',5,10,6,'planned',5],[6,'Instalacje wod-kan',6,10,6,'planned',6],[7,'Elewacja i tynki',7,15,4,'planned',7],[8,'Odbiór techniczny',null,20,1,'planned',8]].forEach(s => insertStage.run(p1,...s.slice(1)));

  const p2 = insertProj.run('Willa pod Skarpą','Willa Skarpa','Żywiec','Jan Wróblewski',16,85).lastInsertRowid;
  [[1,'Roboty ziemne',1,1,2,'done',1],[2,'Fundamenty i piwnica',2,3,3,'done',2],[3,'Ściany nośne',3,6,4,'done',3],[4,'Strop i dach',4,9,3,'done',4],[5,'Okna i drzwi',null,12,2,'inprogress',5],[6,'Wykończenie wnętrz',8,14,3,'planned',6],[7,'Zagospodarowanie terenu',9,16,2,'notstarted',7]].forEach(s => insertStage.run(p2,...s.slice(1)));

  const p3 = insertProj.run('Pawilon Galeria Beskidy','Beskidy','Sucha Beskidzka','Beskid Invest S.A.',24,28).lastInsertRowid;
  [[1,'Projekt wykonawczy',null,1,4,'done',1],[2,'Roboty ziemne',1,4,3,'done',2],[3,'Fundamenty',2,6,4,'inprogress',3],[4,'Konstrukcja stalowa',10,9,6,'planned',4],[5,'Instalacje',5,12,8,'delayed',5],[6,'Tynki i elewacja',7,18,4,'notstarted',6],[7,'Wykończenie',8,21,4,'notstarted',7]].forEach(s => insertStage.run(p3,...s.slice(1)));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: dataDir }),
  secret: process.env.SESSION_SECRET || 'harmonogram-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 dni
}));
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.status(401).json({ error: 'Wymagane logowanie' });
}

// ── AUTH ──
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === TEAM_PASSWORD) {
    req.session.authenticated = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Nieprawidłowe hasło' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

// ── PROJECTS ──
app.get('/api/projects', requireAuth, (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY id').all();
  const stages = db.prepare('SELECT * FROM stages ORDER BY project_id, sort_order').all();
  const result = projects.map(p => ({
    ...p,
    stages: stages.filter(s => s.project_id === p.id).map(s => ({
      ...s,
      subId: s.sub_id,
      start: s.start_week,
      dur: s.duration,
    }))
  }));
  res.json(result);
});

app.post('/api/projects', requireAuth, (req, res) => {
  const { name, short, location, client, weeks, progress } = req.body;
  const r = db.prepare('INSERT INTO projects (name, short, location, client, weeks, progress) VALUES (?, ?, ?, ?, ?, ?)').run(name, short || name.split(' ')[0], location || '—', client || '—', weeks || 16, progress || 0);
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/projects/:id', requireAuth, (req, res) => {
  const { name, short, location, client, weeks, progress } = req.body;
  db.prepare('UPDATE projects SET name=?, short=?, location=?, client=?, weeks=?, progress=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(name, short || name.split(' ')[0], location, client, weeks, progress, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/projects/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM stages WHERE project_id=?').run(req.params.id);
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── STAGES ──
app.post('/api/projects/:projectId/stages', requireAuth, (req, res) => {
  const { name, subId, start, dur, status } = req.body;
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM stages WHERE project_id=?').get(req.params.projectId);
  const r = db.prepare('INSERT INTO stages (project_id, name, sub_id, start_week, duration, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(req.params.projectId, name, subId || null, start || 1, dur || 2, status || 'planned', (maxOrder.m || 0) + 1);
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/stages/:id', requireAuth, (req, res) => {
  const { name, subId, start, dur, status } = req.body;
  db.prepare('UPDATE stages SET name=?, sub_id=?, start_week=?, duration=?, status=? WHERE id=?').run(name, subId || null, start, dur, status, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/stages/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM stages WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── SUBCONTRACTORS ──
app.get('/api/subcontractors', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM subcontractors ORDER BY name').all();
  res.json(rows.map(s => ({ ...s, specs: JSON.parse(s.specs || '[]'), active: !!s.active })));
});

app.post('/api/subcontractors', requireAuth, (req, res) => {
  const { name, contact, phone, email, specs, notes, active } = req.body;
  const r = db.prepare('INSERT INTO subcontractors (name, contact, phone, email, specs, notes, active) VALUES (?, ?, ?, ?, ?, ?, ?)').run(name, contact || '', phone || '', email || '', JSON.stringify(specs || []), notes || '', active !== false ? 1 : 0);
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/subcontractors/:id', requireAuth, (req, res) => {
  const { name, contact, phone, email, specs, notes, active } = req.body;
  db.prepare('UPDATE subcontractors SET name=?, contact=?, phone=?, email=?, specs=?, notes=?, active=? WHERE id=?').run(name, contact || '', phone || '', email || '', JSON.stringify(specs || []), notes || '', active !== false ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/subcontractors/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM subcontractors WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Fallback do index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Harmonogram budowlany działa na porcie ${PORT}`);
  console.log(`Hasło zespołu: ${TEAM_PASSWORD}`);
});
