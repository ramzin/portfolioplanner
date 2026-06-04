## Parent

docs/issues/prd-granular-trace-logging.md

## What to build

Update the simulation to record structured ledger events for the Bonds and Cash categories, and update the UI to display them.

1. **Backend**: Update `TimelinePoint` to replace `bondExplanation` and `cashExplanation` with `bondEvents` and `cashEvents`. Refactor the engine to emit granular events (e.g., Vorabpauschale, Abgeltungsteuer, DCA deductions, Bond Liquidations).
2. **Frontend**: Update the `LogItemCard` to render structured tables for the Bonds and Cash categories alongside the existing Equity ledger.

## Acceptance criteria

- [ ] Backend emits lists of `LedgerEvent` objects for Bonds and Cash.
- [ ] All taxes, yields, and DCA steps are distinctly tracked with correct amounts and types.
- [ ] Frontend successfully parses the Bonds and Cash events and displays them in tabular ledger views.
- [ ] The sum of events for each category exactly matches their monthly balance change.

## Blocked by

docs/issues/001-ledger-schema-equity.md
