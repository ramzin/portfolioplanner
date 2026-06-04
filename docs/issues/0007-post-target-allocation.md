---
title: "Slice 7: Post-Target Allocation Strategies"
type: "AFK"
labels: ["ready-for-agent"]
blocked_by: ["0005-dca-transition-liquidation.md"]
---

## What to build

Implement the selectable Post-Target Allocation Strategies that dictate how new monthly savings and investment yields are allocated once the Target Equity Ratio has been met.

## Acceptance criteria

- [ ] Backend API accepts `postTargetStrategy` parameter with options: `PROPORTIONAL_REBALANCE`, `HOLD_CASH`, and `ALL_EQUITY`.
- [ ] Backend simulation loop evaluates the post-target state:
  - If `PROPORTIONAL_REBALANCE`: splits monthly savings (Salary - Expenses + yields) using the Target Equity Ratio (e.g. 80% to Equity, 20% to Cash).
  - If `HOLD_CASH`: accumulates 100% of savings in Cash.
  - If `ALL_EQUITY`: invests 100% of savings in Equity.
- [ ] React UI includes a dropdown selector for the Post-Target Allocation Strategy.
- [ ] Tests verify: correct allocation of monthly savings under each of the three strategy options in the post-target phase.

## Blocked by

- [0005-dca-transition-liquidation.md](file:///D:/Projects/portfolioplanner/docs/issues/0005-dca-transition-liquidation.md)
