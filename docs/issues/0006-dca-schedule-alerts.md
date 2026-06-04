---
title: "Slice 6: DCA Schedule Editor & Depletion Alerts (Interactive UI)"
type: "AFK"
labels: ["ready-for-agent"]
blocked_by: ["0005-dca-transition-liquidation.md"]
---

## What to build

Build the interactive simulation warnings and dynamic DCA schedule planner. The backend must report the months when Cash depletion or Bond liquidation begins. The frontend SPA must plot these events as vertical marker lines on the chart, display warnings, and allow the user to click to apply recommended lower DCA step-down values starting from the depletion month.

## Acceptance criteria

- [ ] Backend API includes `alerts` array in its response, detailing the month and type of cash flow depletion.
- [ ] Backend API accepts a multi-segment `dcaSchedule` array (startMonth, dcaAmount) instead of a single static DCA value, applying the scheduled amount for each month.
- [ ] React UI renders vertical reference lines on the Recharts chart at the months where Cash depletion or Bond liquidation starts.
- [ ] React UI renders a detailed warning card suggesting a recommended lower DCA step-down amount (e.g., equal to active salary surplus + yield) starting in that depletion month.
- [ ] Clicking "Apply recommendation" updates the DCA Schedule array in the React state and instantly triggers a re-simulation.
- [ ] React UI renders a dynamic list of DCA Schedule segments that the user can add to, edit, or delete.
- [ ] Tests verify: multi-segment DCA schedule simulation logic and alert generation triggers.

## Blocked by

- [0005-dca-transition-liquidation.md](file:///D:/Projects/portfolioplanner/docs/issues/0005-dca-transition-liquidation.md)
