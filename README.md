# Selene: Adaptive Symptothermal Cycle Tracker & Ovulation Predictor

Selene is an adaptive, symptothermal cycle tracking and ovulation prediction engine built using React, Vite, and custom biological algorithms. 

Unlike traditional cycle trackers that rely on static, generic assumptions (e.g., assuming every user has a fixed 28-day cycle), Selene adaptively recalculates fertility windows, rolling cycle averages, and post-ovulation temperature shifts in real-time as logs are added.

---

## 📂 Project Case Study & Architecture

To showcase how Selene translates physical biological indicators into clean software architecture, this project is documented as a complete case study:

* **[Biological Engine & Calculations](./docs/BIOLOGY.md):** The math and biology behind rolling averages, ovulation offsets, and symptothermal double-check validation.
* **[React State & Grid Geometry](./docs/STATE.md):** Deep-dive into hook architecture, local storage persistence, and coordinate shift calculations for the cycle-specific calendar view.
* **[AI Collaboration & Resolution Log](./docs/AI_COLLABORATION.md):** Prompts, architectural debates, and corrections applied to AI hallucinations (e.g. column-shifting grids and phase overlaps).

---

## ✨ Key Features & UX Design

* **Dynamic Symptothermal Calendar Grid:**
  * **Gregorian View:** Standard calendar view with responsive month navigation.
  * **Cycle View:** Rearranges the grid starting exactly on the cycle's Day 1, with leading/trailing padding days from adjacent cycles rendered dynamically.
* **Analytics Insights Dashboard:**
  * Displays dynamic health analytics (period durations, cycle length ranges, variation limits, average waking temperatures).
  * Layered, non-overwhelming double-modal UI (clicking a category pops up details on the right; clicking outside returns to the main stats menu).
* **Waking Temperature (BBT) Tracker:**
  * Renders interactive temperature charts with active thermal shift indicators.
* **Cycle Logs Manager:**
  * Allows users to add, edit, and delete period logs with automatic collision/overlap prevention.
* **Fertility Deduction Math Review:**
  * Clicking "Review Math" on any day opens a mathematical breakdown explaining exactly how the system calculated its fertility status.

---

## 🛠️ Technology Stack

* **Frontend:** React, HTML5, Vanilla CSS
* **Build System:** Vite (Fast Refresh & HMR)
* **Icons:** Lucide React
* **Data Visualization:** Custom SVG/CSS charts
* **State Management:** Custom React hooks with LocalStorage serialization
