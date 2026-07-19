# AI Collaboration Log: Hallucinations & Corrections

This document exposes the developmental timeline of Selene under pair-programming with the AI coding assistant (**Anti-Gravity**). It documents the original user prompts, moments of AI reasoning failure (hallucinations), and the structural corrections applied to make the application client-ready.

---

## 1. Timeline of Core Prompts

Below are the pivotal prompts fed to Anti-Gravity that defined Selene's feature set:

1. **Cycle-Specific View Pivot:**
   > *"The cycle view of our cycle specific grid layout is only working for the current or running period... Say I move to the April month and I switch to cycle view, it should show the cycle view of the April month, because that would have its own start date and end date..."*
2. **Cycle Day Count Logic:**
   > *"For the screenshot I added, showing the very first cycle... It ended on the 13th of May, which, when you count, becomes 26 days cycle for the month of April. On the 14th of May, the next period started. Shouldn't that be day one of another cycle? The cycle is not fixed as 28 days..."*
3. **Double-Modal Analytics Overlay:**
   > *"Let's modify the UI of the analytics pop-up modal. When it first pops up, all the analytics should be closed, and when one is clicked, it opens a pop-up modal on the right showing the details of that specific one. And when any other place else is clicked outside of that modal, it automatically closes..."*

---

## 2. AI Hallucinations & Architectural Defects

During development, the AI assistant proposed several flawed approaches that would have degraded user experience or violated biological tracking standards. These defects were caught and corrected:

### ⚠️ Defect 1: The Shifting Weekday Header Hallucination
* **The AI's Flawed Proposal:** To align the start of a cycle to Day 1, the AI originally suggested dynamically rearranging the weekday column headers at the top of the grid. For instance, if a cycle started on a Thursday, the calendar columns would change to read `THU`, `FRI`, `SAT`, `SUN`, `MON`, `TUE`, `WED`.
* **Why it was Broken:** Re-ordering weekday names is highly confusing for users accustomed to traditional calendar grids (where columns are permanently Sunday-to-Saturday). It also made it impossible to transition between the Gregorian and Cycle views without completely disorienting the user.
* **The Correction:** The columns headers were kept fixed as `SUN`–`SAT`. Instead, the date index was mathematically shifted using negative grid offset calculations:
  $$\text{offsetIndex} = i - \text{startDayOfWeek}$$
  This allowed the cells to shift position while keeping the weekday structure unchanged.

### ⚠️ Defect 2: Blanket "Follicular Phase" Over-simplification
* **The AI's Flawed Proposal:** In the initial dashboard design, the AI calculated the active cycle phase using a simple day-number check:
  `currentCycleDay <= 13 ? 'Follicular phase' : ...`
* **Why it was Broken:** While menstruation is technically part of the follicular phase, users tracking their fertility expect the app to display "Menstrual phase" or "Menstruation" when they are actively bleeding. Labeling active bleeding days as "Follicular phase" conflicted with the status cards and confused the user.
* **The Correction:** A custom memoized evaluator `currentCyclePhase` was built. It checks if the day's classification is `PERIOD` or `PREDICTED_PERIOD` first to show **Menstrual phase**, only reverting to **Follicular phase** once active bleeding has ceased.

### ⚠️ Defect 3: Inline Drawer Bloat & Lag
* **The AI's Flawed Proposal:** Originally, the AI rendered the Basal Body Temperature (BBT) trend graph and the scrollable list of historical periods inline directly inside the slide-out hamburger navigation drawer.
* **Why it was Broken:** Rendering high-density charting components and scrollable database logs inside an off-screen panel created significant rendering lag during drawer slide-out animations. It also overwhelmed the drawer's visual hierarchy, cluttering the workspace.

### ⚠️ Defect 4: The Infinite Bleeding Bug (isOngoing Override)
* **The AI's Flawed Proposal:** In `cycleEngine.js`, the AI originally set the `isOngoing` flag of the latest cycle using a simple position check:
  `isOngoing: isLast` (where `isLast` checks if the period is the latest one logged in the database).
* **Why it was Broken:** Even if the user logged an explicit `endDate` for their latest period and set its status to completed, the engine still evaluated it as `isOngoing: true` because it was the last element in the array. This caused the calendar to display active bleeding for all days after the period ended up to the current date.
* **The Correction:** The `isOngoing` evaluator was updated to honor the presence of an explicit end date:
  `isOngoing: isLast && (period.isOngoing || !period.endDate)`
  This stops active bleeding calculations exactly on the logged `endDate` for completed cycles.
