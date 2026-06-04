---
title: "Slice 5: DCA Transition, Cash Drawdowns & Bond Liquidation"
type: "AFK"
labels: ["ready-for-agent"]
blocked_by: ["0004-bond-ladder-reinvestment.md"]
---

## What to build

Implement the monthly Dollar-Cost Averaging (DCA) transfer from Cash to Equity. Include the drawdown hierarchy where Cash is depleted to fund the DCA, followed by automatic liquidation of Bond principal. Implement the transition completion logic: once the Target Equity Ratio is achieved, quarterly bond withdrawals instantly drop to €0, and 100% of matured bonds roll over.

## Acceptance criteria

- [ ] Backend simulation transfers the scheduled monthly DCA amount from Cash to Equity.
- [ ] If Cash is insufficient to cover the DCA, the engine draws Cash down to 0, then automatically liquidates Bond principal to cover the remaining DCA amount.
- [ ] The engine detects the month when the Target Equity Ratio is achieved.
- [ ] Once the Target Equity Ratio is reached, the quarterly bond cash withdrawal ($W$) drops to €0, preserving all bond principal to accumulate interest.
- [ ] React UI includes inputs for scheduled DCA amount and Target Equity Ratio %.
- [ ] UI displays the exact month (and year) when the target is reached in a prominent metric card.
- [ ] Tests verify: cash drawdown, bond liquidation, and stopping bond withdrawals when the target ratio is hit.

## Blocked by

- [0004-bond-ladder-reinvestment.md](file:///D:/Projects/portfolioplanner/docs/issues/0004-bond-ladder-reinvestment.md)
