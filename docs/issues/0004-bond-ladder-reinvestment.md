---
title: "Slice 4: 9-Month Bond Ladder & Reinvestment Math"
type: "AFK"
labels: ["ready-for-agent"]
blocked_by: ["0001-basic-accumulation-engine.md"]
---

## What to build

Model the Bond portfolio as a 9-month ladder of 3 tranches maturing sequentially every 3 months. Implement quarterly coupon yields and the specific reinvestment logic where cash kept from bond maturities is limited to a user-specified withdrawal amount, reinvesting any excess coupon or principal back into bonds.

## Acceptance criteria

- [ ] Backend splits the initial bond balance into three equal tranches maturing in months 3, 6, and 9.
- [ ] Every 3 months (quarterly):
  - Coupon yield is calculated: $Bonds \times (BondYield / 4)$.
  - $33.33\%$ of the Bond balance matures.
- [ ] Cash is kept from maturities/coupons according to the reinvestment withdrawal goal ($W$):
  - If $W < Coupon$: keep $W$ in Cash, reinvest $Coupon - W$ and $100\%$ of matured bonds.
  - If $W \ge Coupon$: keep entire Coupon and $W - Coupon$ of matured bonds in Cash, reinvest the rest.
- [ ] Wires inputs for Bond Yield and Quarterly Withdrawal Goal ($W$) in the React SPA.
- [ ] Tests verify: tranche split, quarterly trigger, Case A ($W < Coupon$) and Case B ($W \ge Coupon$) math logic.

## Blocked by

- [0001-basic-accumulation-engine.md](file:///D:/Projects/portfolioplanner/docs/issues/0001-basic-accumulation-engine.md)
