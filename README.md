# KFUPM To Do

KFUPM To Do is a React web app for students to organize tasks by semester,
week, and day. It automatically generates semester weeks from the official
date range, then stores tasks locally in the browser so they remain available
after refreshing the page.

## Features

- Semester selector for KFUPM terms.
- Automatic week generation from semester start and end dates.
- Accordion layout for weekly planning.
- Sunday-to-Saturday day tabs with real dates for each week.
- Add, remove, edit, and complete tasks.
- Notebook-style checkboxes with a hand-drawn strike-through effect.
- Light notebook/glassmorphism UI with a ShaderGradient background.
- Persistent localStorage task data.
- Responsive layout for desktop and mobile.

## Semesters

| Semester | Start date | End date |
| --- | --- | --- |
| 252 | Jan 11, 2026 | May 20, 2026 |
| 261 | Aug 19, 2026 | Dec 24, 2026 |
| 262 | Jan 10, 2027 | Jun 6, 2027 |
| 263 | Jan 30, 2027 | Aug 15, 2027 |

## Tech Stack

- React
- Vite
- ShaderGradient
- Three.js
- CSS
- localStorage

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Task Data

Tasks are saved in `localStorage` and include:

- `id`
- `text`
- `completed`
- `semester`
- `weekNumber`
- `day`
- `date`
