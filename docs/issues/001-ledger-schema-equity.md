## Parent

docs/issues/prd-granular-trace-logging.md

## What to build

Update the simulation to record structured ledger events for the Equity category, and update the UI to display them. Set new default values for the form.

1. **Frontend**: Update form default values to: Age 34, 39% Equity, 21% Cash, 40% Bonds, 6000 DCA, 80% Target Ratio, Proportional Rebalance, 7% Equity Yield, 2% Bond Yield, 2.5% Cash Yield.
2. **Backend**: Introduce `LedgerEvent` class (`amount: Double`, `type: String`). Update `TimelinePoint` to replace `equityExplanation` with `equityEvents: List<LedgerEvent>`. Modify `DefaultSimulationEngine` to emit specific equity events (e.g., Yield, DCA Additions).
3. **Frontend**: Update TypeScript types and render a structured ledger table for Equity in the expanded log card.

## Acceptance criteria

- [ ] Form initializes with the new default values.
- [ ] Backend emits a list of `LedgerEvent` objects for Equity instead of a string explanation.
- [ ] Frontend successfully parses the Equity events and displays them in a tabular ledger view.
- [ ] The sum of the Equity ledger events matches the monthly Equity balance change.

## Blocked by

None - can start immediately
