# shift-planner — MVP development plan

Web app for preparing the weekly schedules of a store's workers.

---

## 1. MVP goal

Let the manager, on a single screen and without installing anything:

1. Define the store's opening and closing hours for each day of the week.
2. Add and remove workers.
3. Visually select (by painting on a grid) each worker's time slot per day.
4. See in real time, per worker: total hours for the week, days worked, and days off.
5. Clear the current schedule to start over.

**The MVP is considered done when those four things work and the data survives a browser refresh.**

### Out of scope for the MVP

Noted here so they don't sneak in along the way:

- Backend, login, multi-user and multi-store.
- Coverage view with all workers overlaid.
- Legal rest-period warnings (12 h between shifts, 6 consecutive days).
- Vacations, leave and public holidays.
- Copy previous week, shift templates.
- Printing / exporting to PDF.
- History and navigation between weeks (the MVP works on **one** week only).

---

## 2. Technical decisions

| Decision | Choice | Reason |
|---|---|---|
| App type | Web SPA, local-first | Zero install, works on laptop and tablet, and supports a backend later without a rewrite |
| Framework | React + TypeScript | Derived state (the totals) comes for free; types prevent hour-related bugs |
| Build | Vite | Instant startup, no configuration |
| Styling | Tailwind CSS | Fast grid and layout, no loose CSS to maintain |
| State | `useReducer` + Context | The model is small; no Redux/Zustand for now |
| Persistence | `localStorage` (serialized JSON) | Enough for a single store; migratable to IndexedDB or a backend |
| Dates | No library in the MVP | There are only 7 fixed days, no real dates are handled yet |
| Runtime management | **asdf** with `.tool-versions` | Already on the machine; pins the project's Node version |

### Golden rule of the hours model

**Hours are always stored as integers: minutes since midnight.** `09:30` → `570`.
They're converted to `"HH:MM"` only when rendering on screen. This eliminates at a
stroke the parsing, comparison and summing bugs where this kind of app usually breaks.

### Granularity

Blocks of **15 minutes**. A full day's store grid (e.g. 09:00–21:30) is
50 cells per column, perfectly manageable in the DOM.

---

## 3. Data model

```ts
type DayId = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Monday … 6 = Sunday

type DayHours = {
  closed: boolean;
  opens: number;   // minutes since midnight
  closes: number;
};

type Worker = {
  id: string;
  name: string;
  color: string;          // will be used in the coverage view (post-MVP)
  contractHours?: number; // 40, 30, 20… to compare against what's assigned
};

type Shift = {
  id: string;
  workerId: string;
  day: DayId;
  start: number;          // minutes since midnight
  end: number;            // exclusive: [start, end)
};

type AppState = {
  version: 1;                        // for future localStorage migrations
  granularityMin: 15;
  store: Record<DayId, DayHours>;
  workers: Worker[];
  shifts: Shift[];                   // flat list; several shifts per day and person
};
```

**A worker can have several shifts on the same day** (a split shift: 10:00–14:00 and
17:00–20:30). That's why `shifts` is a flat list rather than a field inside `Worker`.
Modeling it as a single start/end would force an almost immediate rewrite.

### Invariants the reducer must guarantee

- `start < end`.
- Every shift stays within `[store[day].opens, store[day].closes]`.
- No shift on a day marked `closed`.
- Two shifts of the same worker and day **never overlap**: when one is created or
  moved, contiguous or overlapping shifts are merged automatically.
- If the store's hours are reduced, shifts left outside get clipped (with a warning).

---

## 4. Folder structure

```
shift-planner/
├── PLAN.md
├── .tool-versions
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── domain/
    │   ├── types.ts          # the types above
    │   ├── time.ts           # minutes <-> "HH:MM", ranges, cells
    │   ├── shifts.ts         # merge, clip, validate shifts
    │   └── stats.ts          # hours/week, days worked and off
    ├── state/
    │   ├── reducer.ts        # actions and transitions
    │   ├── context.tsx
    │   └── storage.ts        # load/save to localStorage
    └── components/
        ├── StoreHoursPanel.tsx
        ├── WorkerList.tsx
        ├── WeekGrid.tsx      # the paintable grid
        ├── DayColumn.tsx
        ├── ShiftBlock.tsx
        └── StatsPanel.tsx
```

`domain/` is pure logic with no React: it's what can be tested without mounting
anything, and where all the delicate calculations live.

---

## 5. Phases

### F0 — Project scaffolding

- [x] `asdf local nodejs <LTS version>` → generates `.tool-versions`.
- [x] `npm create vite@latest . -- --template react-ts`.
- [x] Install and configure Tailwind.
- [x] `git init` and first commit.
- [x] Check that `npm run dev` serves the blank page.

**Done when:** `npm run dev` starts without errors and the Node version is pinned in the repo.

### F1 — Domain and state (no UI)

- [x] `domain/types.ts` with the full model.
- [x] `domain/time.ts`: `minutesToTime`, `timeToMinutes`, `generateCells(opens, closes, step)`.
- [x] `domain/shifts.ts`: `mergeShifts`, `clipToStore`, `validateShift`.
- [x] `domain/stats.ts`: `weekHours(worker)`, `workedDays`, `daysOff`, `hoursPerDay`.
- [x] `state/reducer.ts` with the actions: `SET_DAY_HOURS`, `TOGGLE_DAY_CLOSED`,
      `ADD_WORKER`, `RENAME_WORKER`, `DELETE_WORKER`, `ADD_SHIFT`, `MOVE_SHIFT`,
      `RESIZE_SHIFT`, `DELETE_SHIFT`, `LOAD_STATE`. (`RESET_SHIFTS` is also added for the
      "clear schedule" part of MVP goal 5.)
- [x] Sample initial state (a store Mon–Sat 09:30–21:00, Sunday closed).

**Done when:** the reducer can be exercised from the console and the calculations give
correct numbers with sample data. This is the phase that most deserves a few tests.

### F2 — Store hours

- [x] `StoreHoursPanel`: 7 rows (Monday…Sunday), each with opening, closing and a "closed" checkbox.
- [x] Time entry with `<input type="time">` with a 15-min `step` (simple and native).
- [x] Validate `opens < closes`; disable the time inputs if the day is closed.
- [x] When hours are reduced, clip the affected shifts and warn what was clipped.

**Done when:** changing a day's hours immediately resizes the grid column.

### F3 — Workers

- [x] `WorkerList`: add by name, rename inline, delete with confirmation.
- [x] Automatic color assignment from a fixed palette.
- [x] Optional contract hours field.
- [x] Active worker selection (the one whose schedule is being edited in the grid).

**Done when:** workers can be managed and switching between them changes what the
grid shows.

### F4 — The paintable grid (the heart of the app)

- [ ] `WeekGrid`: CSS grid of 7 columns (days) × N rows (15-min cells).
- [ ] Time axis on the left with a label on every hour mark.
- [ ] Cells outside the store hours shown in gray and non-interactive.
- [ ] **Create:** `pointerdown` on a cell + drag + `pointerup` → new shift, with a
      live preview while dragging.
- [ ] **Delete:** click on an existing shift, or drag over it in delete mode.
- [ ] **Resize:** drag the top or bottom edge of a `ShiftBlock`.
- [ ] **Move:** drag the body of the block within the same day.
- [ ] Each block shows its range (`10:00 – 14:00`) and its duration.
- [ ] Use `pointer` events (not `mouse`) so it works the same with a mouse and a finger.
- [ ] `Escape` cancels the drag in progress.

**Done when:** a worker's whole week can be assembled with just the mouse, including
split shifts, with no overlaps and no shifts outside the store hours.

### F5 — Real-time stats panel

- [ ] Per worker: **hours for the week**, **days worked**, **days off**.
- [ ] Difference against contract hours, in green or red (`38.5 h / 40 h → −1.5 h`).
- [ ] Total hours per day in each column's header.
- [ ] Total store hours for the week.
- [ ] Summary table with all workers at once.

**Done when:** the numbers update while dragging, not only on release.

### F6 — Persistence and polish

- [ ] Auto-save to `localStorage` on every change (with `debounce`).
- [ ] Load on startup, validating the state's `version`.
- [ ] Export and import JSON as a backup.
- [ ] "Clear all" with confirmation.
- [ ] Undo / redo (the reducer makes it almost free by keeping a history of states).
- [ ] Responsive pass: usable on a tablet.

**Done when:** the browser is closed, reopened, and everything is still there.

---

## 6. MVP acceptance criteria

Full walkthrough that must work end to end:

1. Open the app fresh.
2. Set the store hours: Mon–Fri 09:30–21:00, Sat 10:00–20:00, Sun closed.
3. Add three workers with 40 h, 30 h and 20 h contracts.
4. Paint each one's weekly schedule, one with a split shift.
5. Check that the hours, days worked and days off match what was painted.
6. Refresh the browser: everything is still there.
7. Reduce Saturday's closing time to 18:00 and check that the affected shifts are clipped.

---

## 7. Risks and things to watch

- **Dragging in the grid is the only technically delicate part.** It should be built with
  `pointer` events and coordinates computed over the container, not with cell-by-cell
  `onMouseEnter` (events get lost when dragging fast). It's the part deserving the most time.
- **Don't bring in a calendar library** (FullCalendar and the like). The grid needed is a
  few dozen lines of CSS grid, and a generic library would fight against the custom drag logic.
- **No hours as `string` in the logic.** Integers only; conversion to text happens at render time.
- **One week, no real dates, in the MVP.** Introducing weeks and dates is what opens the
  door to copying weeks and to history: it's the first step after the MVP, not part of it.

---

## 8. Next step after the MVP

In order of real usefulness to the manager:

1. Coverage view (all workers overlaid by color) + A4 printing.
2. Weeks with real dates, navigation between weeks and "copy previous week".
3. Shift templates applicable with one click.
4. Warnings: uncovered time slots, rest between shifts, consecutive days.
5. Vacations, leave and public holidays.
6. Only if the need arises: backend, multi-store and read-only access for workers.
