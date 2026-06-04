## Problem Statement

The user is currently tracing the simulation via a monthly log, but the logs are aggregated strings (e.g., a single text explanation for Equity). The user wants to see exactly what happened in each asset category (Equity, Bonds, Cash) and why their values changed month by month. They need a granular ledger that itemizes every transaction (such as Vorabpauschale, DCA transfers, and Yields) so that the math is traceable, transparent, and auditable from a human perspective. Additionally, the initial default values of the simulation form do not reflect the user's current baseline scenario.

## Solution

The solution is to transform the calculation logs from aggregated text explanations into structured ledger events. For each month in the simulation, the backend will return a list of specific events (e.g., Amount, Type) for Equity, Bonds, and Cash. The UI will render three distinct ledgers inside the expanded month view, explicitly breaking down how the balance of each category changed. We will also update the default form values to reflect the new baseline metrics.

## User Stories

1. As a user, I want the simulation to start with my current baseline values (Age 34, 39% Equity, 21% Cash, 40% Bonds, 6000 DCA, 80% Target Ratio, Proportional Rebalance, 7% Equity Yield, 2% Bond Yield, 2.5% Cash Yield) so that I don't have to enter them every time.
2. As a user, I want the backend to record every calculation (like taxes, yields, DCA transfers) as a distinct, structured ledger event, so that no calculation step is obscured.
3. As a user, I want the expanded month card to display three separate ledgers for Equity, Bonds, and Cash, so that I can easily see the movements for a specific asset class.
4. As a user, I want each ledger event to specify the exact amount, the type of the event (e.g., Vorabpauschale, Cash Interest), and whether it was a plus or minus, so that the math is transparent.
5. As a user, I want the sum of the events in each ledger to exactly match the change in balance for that category for the month, ensuring arithmetic validation.

## Implementation Decisions

- **Backend Changes**:
  - The `TimelinePoint` schema will be updated to replace `equityExplanation`, `bondExplanation`, and `cashExplanation` with `equityEvents`, `bondEvents`, and `cashEvents` (lists of `LedgerEvent`).
  - A new `LedgerEvent` data structure will be introduced containing `amount` (number) and `type` (string description).
  - The `DefaultSimulationEngine` will be modified to construct these events during the monthly loop, ensuring every calculation step pushes a corresponding event.
- **Frontend Changes**:
  - The main form state initialization will be updated to use the new defaults.
  - The `TimelinePoint` TypeScript interface will be updated to match the backend.
  - The `LogItemCard` (or equivalent component handling the expanded view) will be redesigned to render three separate tables/lists for the ledgers.
- **Data Validation**: We will rely on structured data so that the frontend can logically present `Starting Balance + SUM(Ledger Events) = Ending Balance`.

## Testing Decisions

- A good test should verify the external behavior and data structures rather than internal implementation details.
- **Backend Simulation Engine Tests**: We will test `DefaultSimulationEngine` to ensure `TimelinePoint` objects contain the correct lists of `LedgerEvent` objects with accurate amounts and types for a given scenario (e.g., DCA step-down, Vorabpauschale deduction).
- **Frontend UI Component Tests**: We will test the expanded timeline card component with a mock `TimelinePoint` to ensure the three separate ledgers (Equity, Bonds, Cash) are rendered with the correct event rows.
- **Frontend Form Tests**: We will verify the main form initializes correctly with the new default values.
- Prior art: We will follow existing patterns for backend unit tests and React component tests within the repository.

## Out of Scope

- E2E testing across the entire stack.
- Real-time backend updates or WebSockets (the simulation remains a single request/response).
- Creating new asset classes or alternative tax regimes outside of the German model defined in `CONTEXT.md`.

## Further Notes

- The terms used for events should match the project vocabulary in `CONTEXT.md` (e.g., `Vorabpauschale`, `DCA Transition`, `Abgeltungsteuer`).
