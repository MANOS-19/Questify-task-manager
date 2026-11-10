<div align="center">

# ⚔️ Questify

**A premium, full-stack productivity platform, not just a basic task manager.**
Turn tasks into quests. Earn XP, build streaks, unlock achievements and level up.

![React](https://img.shields.io/badge/React_19-20232a?logo=react&logoColor=61dafb)
![Vite](https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)

[Live Demo](#) · [Backend Repo](#) · [Demo Video (60s)](#)

<!-- Add a hero GIF or screenshot here: ![Questify](./docs/hero.gif) -->

</div>

## ✨ Features

| Area | What it does |
|---|---|
| 🎮 **Gamification** | XP by priority (10/20/40), scaling levels, daily streaks, 6 unlockable achievements |
| 📊 **Analytics** | 7-day activity chart, per-category completion breakdown, overall progress |
| ✅ **Task management** | Full CRUD, edit-in-place, priorities, categories, due dates, overdue / due-today status |
| 🔎 **Productivity tools** | Search, status + category filters, multi-key sorting, bulk "clear completed" |
| 📅 **Calendar** | Month view with tasks mapped to due dates and a jump-to-today control |
| 🎨 **UX polish** | Light/dark theme, persisted preferences, accessible modal (Esc, ARIA), responsive, reduced-motion support |

## 🏗️ Architecture

```
React 19 + Vite  ──REST/JSON──▶  Express API  ──Mongoose──▶  MongoDB
 (this repo)        /api/tasks     (backend repo)
```

```
src/
├── components/   Sidebar, TaskCard, Calendar, Insights
├── lib/          gamification.js (pure, testable XP / level / streak / badge logic)
├── pages/        DashBoard.jsx (state + API orchestration)
└── premium.css   design tokens, gradients, theme-aware surfaces
```

## 🔌 API contract

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update / toggle complete |
| DELETE | `/api/tasks/:id` | Delete task |

## 🚀 Getting started

```bash
npm install
cp .env.example .env     # set VITE_API_URL if your API isn't on :5000
npm run dev              # http://localhost:5173
```

## 🧠 Engineering highlights

- **Derived state, not duplicated state**: level, streak and badges are computed from tasks by a pure function (`computeProgress`), memoized in the UI.
- **Environment-driven config** via `VITE_API_URL`, with loading, error and retry states on every request.
- **Accessibility**: labelled controls, `role="dialog"`, `role="progressbar"`, keyboard dismissal, `prefers-reduced-motion`.
- **Theme system** built on CSS custom properties.

## 🗺️ Roadmap

JWT auth and per-user quests · recurring tasks · drag-and-drop board · unit tests for `gamification.js` · PWA / offline mode · TypeScript migration
