---
title: "Slice 2: German Tax Integration (Interest & Allowance)"
type: "AFK"
labels: ["ready-for-agent"]
blocked_by: ["0001-basic-accumulation-engine.md"]
---

## What to build

Integrate the German flat-rate capital gains tax (Abgeltungsteuer) and the annual tax-free allowance (Sparerpauschbetrag) into the simulation loop. Cash interest and bond coupon yields must consume this allowance first, with any excess being taxed at the flat rate and deducted from the Cash buffer.

## Acceptance criteria

- [ ] Backend API accepts `abgeltungsteuerPercent` (default 26.375%) and `sparerpauschbetrag` (default €1,000).
- [ ] Calendar-aware logic is added to the simulation loop (dates step month-by-month; the annual allowance resets to its maximum value on January 1st of every calendar year).
- [ ] Monthly Cash yields and quarterly Bond coupons calculate tax liabilities, which are deducted from Cash.
- [ ] React UI includes sliders for configuring the Abgeltungsteuer rate and annual Sparerpauschbetrag allowance.
- [ ] React UI displays the cumulative annual tax paid in a dashboard card or table.
- [ ] Tests verify: annual allowance resetting, tax exemption threshold limit, and tax deduction subtraction.

## Blocked by

- [0001-basic-accumulation-engine.md](file:///D:/Projects/portfolioplanner/docs/issues/0001-basic-accumulation-engine.md)
