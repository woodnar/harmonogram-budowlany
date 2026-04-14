# Harmonogramy budowlane — instrukcja wdrożenia

## Co to jest
Aplikacja webowa do zarządzania harmonogramami budowlanymi i podwykonawcami.
Wiele osób może pracować jednocześnie — dane zapisywane są na serwerze.

---

## Jak uruchomić online (Railway) — ~10 minut

### Krok 1 — Wgraj pliki na GitHub

1. Wejdź na https://github.com i załóż darmowe konto (jeśli nie masz)
2. Kliknij "New repository" → nazwij np. `harmonogram-budowlany` → Create
3. Wgraj wszystkie pliki z tego folderu do repozytorium
   (przeciągnij i upuść na stronie repozytorium lub użyj przycisku "Add file")

### Krok 2 — Załóż konto na Railway

1. Wejdź na https://railway.app
2. Kliknij "Login" → zaloguj się kontem GitHub

### Krok 3 — Utwórz projekt na Railway

1. Kliknij "New Project"
2. Wybierz "Deploy from GitHub repo"
3. Wybierz repozytorium `harmonogram-budowlany`
4. Railway automatycznie wykryje aplikację Node.js i ją wdroży

### Krok 4 — Ustaw hasło zespołu

1. W panelu Railway kliknij na swój projekt
2. Przejdź do zakładki "Variables"
3. Dodaj zmienną:
   - Nazwa: `TEAM_PASSWORD`
   - Wartość: (wpisz swoje hasło, np. `budowa2024`)
4. Opcjonalnie dodaj też:
   - Nazwa: `SESSION_SECRET`
   - Wartość: (dowolny długi ciąg znaków, np. `moj-tajny-klucz-abc123xyz`)

### Krok 5 — Uruchom

1. Railway automatycznie uruchomi aplikację po zapisaniu zmiennych
2. Kliknij "Deployments" → po chwili zobaczysz zielony status
3. Kliknij "Settings" → "Domains" → skopiuj adres URL
4. Wyślij adres URL i hasło zespołowi

---

## Domyślne hasło

Jeśli nie ustawisz zmiennej `TEAM_PASSWORD`, domyślne hasło to: **budowa2024**

Zmień je koniecznie przed udostępnieniem aplikacji!

---

## Lokalne uruchomienie (na własnym komputerze)

Wymagane: Node.js 18+ (https://nodejs.org)

```bash
npm install
npm start
```

Aplikacja będzie dostępna pod adresem: http://localhost:3000

---

## Koszty

- Railway: darmowy plan obejmuje ~$5 kredytu miesięcznie
  (dla małej aplikacji 2–3 osób to w zupełności wystarczy)
- Przy większym ruchu: ~$5–10/miesiąc

---

## Bezpieczeństwo

- Zmień hasło `TEAM_PASSWORD` na unikalne
- Aplikacja używa szyfrowanych sesji
- Baza danych SQLite jest przechowywana na serwerze Railway
- Dane są trwałe — nie znikają po restarcie

---

## Problemy?

Jeśli coś nie działa, sprawdź logi w Railway:
Panel projektu → "Deployments" → kliknij ostatnie wdrożenie → "View Logs"
