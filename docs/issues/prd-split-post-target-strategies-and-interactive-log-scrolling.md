## Problem Statement

When the portfolio value transitions from defensive assets to equity, users wanted more granular control once their Target Equity Ratio was achieved. The existing simulation automatically stopped programmatic bond withdrawals and only allowed a single post-target strategy (which was applied to all savings, cash yields, and bond coupons, but lacked the ability to selectively reinvest coupon yields or continue principal withdrawals). In addition, when viewing the wealth accumulation chart, users could not easily drill down into the calculation trace log for a specific month, making it difficult to analyze complex tax and asset transaction steps for that specific time period.

## Solution

1. Split the post-target strategy into two separate policies:
   - **Bond Income Strategy**: Dictates where bond yields (coupons) and scheduled principal withdrawals are routed post-target (Equity, Bonds, or Cash).
   - **Cash Allocation Strategy**: Dictates where the cash pile (savings, cash interest, and cash above the emergency fund) is routed via DCA post-target (Equity, Bonds, or Cash).
2. Ensure both strategies strictly respect the emergency fund limit (for Cash) and the minimum bond balance floor (for Bonds).
3. Enable month-clicking on the chart to expand the corresponding trace log month, smoothly scroll it into view, and briefly highlight it with an eye-catching background/border pulse animation.

## User Stories

1. As a portfolio planner, I want to separate my post-target strategy into one for bonds and one for cash, so that I can configure different reinvestment behaviors for bond yields versus regular salary savings.
2. As a portfolio planner, I want bond coupon yields and scheduled withdrawals to flow into equity post-target, so that I can continue transition momentum even after my target equity ratio is achieved.
3. As a portfolio planner, I want bond coupon yields to automatically reinvest back into bonds post-target, so that I can maintain my bond balance without manual intervention.
4. As a portfolio planner, I want bond coupon yields and withdrawals to pile up in cash post-target, so that I can accumulate dry powder for future allocation choices.
5. As a portfolio planner, I want my regular monthly savings to continue flowing into equity post-target, so that I can maximize stock market accumulation.
6. As a portfolio planner, I want my monthly savings to flow into bonds post-target, so that I can build up a defensive asset buffer after achieving my equity goal.
7. As a portfolio planner, I want my monthly savings to remain in cash post-target, so that I can build a highly liquid cash reserve.
8. As a portfolio planner, I want the simulation to respect my emergency fund floor when allocating cash post-target, so that I don't accidentally invest cash that was reserved for emergencies.
9. As a portfolio planner, I want the simulation to respect my minimum bond amount when withdrawing from bonds post-target, so that my defensive buffer is never depleted below my safety limit.
10. As a dashboard user, I want to click on a month on the chart, so that the page automatically scrolls to that month's trace log, expands it, and highlights it so I can inspect the exact transaction ledger for that month.

## Implementation Decisions

- The simulation data transfer classes will be updated to include `bondIncomeStrategy` and `cashAllocationStrategy` instead of `postTargetStrategy`.
- The simulation engine's logic will evaluate whether target is reached, and route bond coupon, principal withdrawals, and cash DCA according to the selected strategies.
- The UI will render separate dropdown selectors for Bond Income Strategy and Cash Allocation Strategy.
- The Recharts onClick handler will fetch the active tooltip payload index/month and trigger a hook update to expand that month in the list.
- CSS classes with a keyframe animation will be added to briefly highlight the targeted log card.

## Testing Decisions

- Good tests only verify the external behavior of the engine and API under different strategy configurations and boundary values, without checking private implementation details.
- We will test:
  - Simulation engine coupon and withdrawal routing for all combinations of the two strategies post-target.
  - Verification that the minimum bond limit and emergency fund floor restrict transfers correctly.
  - The API endpoints to confirm they accept and return the new parameters.
- Prior art in the codebase includes existing tests in `SimulationEngineTest.kt` such as `test post-target strategy ACCUMULATE_CASH` and `test explanation logs generation`.

## Out of Scope

- Adding new asset classes (e.g. real estate or gold) or additional tax regulations.
- Configuring a different strategy for different coupon types or specific bond tranches.

## Further Notes

None.
