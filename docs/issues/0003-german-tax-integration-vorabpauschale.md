---
title: "Slice 3: German Tax Integration (Vorabpauschale)"
type: "AFK"
labels: ["ready-for-agent"]
blocked_by: ["0002-german-tax-integration-interest.md"]
---

## What to build

Implement the annual German *Vorabpauschale* tax on accumulating Equities. The tax is calculated in December and deducted from the Cash balance in January of the following calendar year, applying the 30% *Teilfreistellung* partial exemption.

## Acceptance criteria

- [ ] Backend simulation tracks starting and ending Equity balances for each calendar year.
- [ ] Backend calculates the annual *Basisertrag* using start-of-year Equity value, 70% factor, and the user-specified `basiszinsPercent`.
- [ ] Backend calculates the actual capital gain (accounting for monthly DCA purchases) and sets the *Vorabpauschale* to the minimum of Basisertrag and actual gain.
- [ ] Apply 30% Teilfreistellung (only 70% of the Vorabpauschale is taxable).
- [ ] Tax is deducted in January using the remaining Sparerpauschbetrag first, then taxing the excess.
- [ ] React UI includes inputs for `basiszinsPercent` (e.g. 2.29%).
- [ ] Tests verify: Vorabpauschale calculation logic, capital gain comparison, partial exemption, and January tax deduction.

## Blocked by

- [0002-german-tax-integration-interest.md](file:///D:/Projects/portfolioplanner/docs/issues/0002-german-tax-integration-interest.md)
