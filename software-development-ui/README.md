# Software Development UI (Jira-style concept)

UI concept for a software-development / issue-tracking skin of the existing OpsPick
codebase — same shell, sidebar, and component system as the current product
(`marketing/mockups/*.html`, `frontend/tailwind.config.ts`, `frontend/src/app/globals.css`),
re-targeted with Jira-like concepts (Epics, Sprints, Backlog, Issue types) instead of
generic ops tasks.

Open `index.html` in a browser for a linked gallery of all screens, or open any file
below directly.

## Screens

| File | Screen | Notes |
|---|---|---|
| `board.html` | Sprint board | Active-sprint Kanban (To do / In progress / In review / Done) with issue-type icons (Bug/Story/Task), story-point badges, priority markers, epic color tags. |
| `backlog.html` | Backlog & sprint planning | Active sprint, planned sprint, and unscheduled backlog grouped by section, drag handles, epic chips. |
| `issue-detail.html` | Issue detail | Subtasks, linked issues, comments with @mentions, and a field sidebar (status, assignee, reporter, sprint, epic, priority, story points, labels). |
| `epics-roadmap.html` | Epics roadmap | Quarterly timeline bars per epic with progress % and status (on track / at risk / done). |
| `reports.html` | Sprint reports | Burndown chart, velocity chart, scope-change KPIs, completed issues by epic. |
| `projects.html` | Projects overview | Workspace-level grid of Scrum/Kanban projects with lead, team avatars, and progress. |

## Terminology mapping from the existing app

| OpsPick today | Software-development concept |
|---|---|
| Workspace | Workspace (unchanged) |
| Project | Project (adds Scrum/Kanban type) |
| Task | Issue, with a type: Bug / Story / Task |
| — | Epic (new: groups related issues) |
| Recurring Tasks | Replaced by Backlog + Sprints |
| Analytics | Sprint Reports (burndown, velocity) |
| Notifications / Activity | Unchanged |

## Design source

Colors, radii, type scale, and shadows were pulled from:
- `frontend/tailwind.config.ts` and `frontend/src/app/globals.css` (production design
  tokens — indigo primary `hsl(239 84% 67%)` ≈ `#6366f1`, violet gradient end
  `hsl(280 72% 60%)`, `0.75rem` radius, `54px` header, `18rem` sidebar).
- `marketing/mockups/dashboard.html`, `analytics.html`, `collaboration.html`,
  `recurring.html` — the existing reference mockups for this product, whose sidebar,
  card, chip, and avatar patterns these screens reuse directly.
- `opspick screenshot.pdf` — real mobile-app screenshots, used to confirm brand mark,
  gradient usage, and card conventions carry over consistently.

These are static, self-contained HTML files (no build step, no Figma file) — this
session had no Figma connector available, so the format matches the existing
`marketing/mockups/` convention in this repo rather than producing a `.fig` file.
