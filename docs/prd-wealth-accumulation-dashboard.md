# Product Requirements Document (PRD): Wealth Accumulation & Asset Transition Dashboard

## Problem Statement

As a software engineer residing in Germany managing personal wealth, I need a reliable, high-precision planning tool to simulate the transition of my fixed-income assets (Bonds and Cash) into Global Equities via a Dollar-Cost Averaging (DCA) strategy. I need to understand exactly how many months it will take to reach my Target Equity Ratio while accounting for monthly surplus savings, quarterly sovereign bond maturities, coupon reinvestments, and complex German tax regulations (Abgeltungsteuer, Sparerpauschbetrag, Teilfreistellung, and Vorabpauschale). 

Without a specialized high-precision simulator, it is difficult to predict whether my active savings surplus will accumulate faster than my scheduled DCA, causing cash to build up uninvested, or whether my liquid cash reserves will be depleted, forcing me to liquidate bonds or lower my DCA rate.

## Solution

A web-based interactive simulation dashboard comprising:
1.  **A React Frontend SPA** with premium input controls (sliders and validated input fields) to enter portfolio configurations, a dynamic and interactive chart to visualize net worth evolution and asset transitions, and smart indicators for critical cash flow events.
2.  **A Spring Boot + Kotlin Backend Service** containing a high-precision financial simulation engine using `BigDecimal` math to model compounding yields, quarterly bond ladder tranches, reinvestment rules, and calendar-aware German tax drag calculations.
3.  **An Interactive Feedback Loop** that detects "DCA Step-down Events" (cash depletion) and enables the user to directly adjust their DCA schedule on the chart, instantly recalculating the timeline.

## User Stories

### General & Setup
1.  As a user, I want to define my initial net worth, current age, and target retirement age, so that I can set the boundaries of my wealth accumulation timeline.
2.  As a user, I want to specify my initial asset allocation percentages for Equity, Bonds, and Cash, so that I can seed the starting state of my portfolio.
3.  As a user, I want the UI to ensure that my initial allocation percentages (Equity + Bonds + Cash) always sum to exactly 100%, so that I do not submit an invalid portfolio configuration.
4.  As a user, I want to input my monthly professional salary and monthly living expenses as fixed Euro values, so that the simulator can calculate my net active monthly savings surplus.

### Yields & Reinvestments
5.  As a user, I want to configure independent annual yields for Cash (Tagesgeld/MMFs), Bonds (sovereign coupons), and Equity, so that each asset class grows at its respective historical or expected rate.
6.  As a user, I want my quarterly bond coupons to be credited to my cash balance and subjected to immediate tax, so that the simulation models realistic cash flows.
7.  As a user, I want the simulator to roll over maturing bonds (using a 9-month ladder) and reinvest them, minus a user-defined fixed quarterly cash withdrawal, so that I can programmatically draw down my fixed-income portfolio during the transition.
8.  As a user, I want the bond withdrawal to automatically stop once the Target Equity Ratio is reached, so that my remaining bond principal is preserved to earn coupon yields.
9.  As a user, I want the coupon reinvestment logic to automatically reinvest excess coupon yields back into bonds if the desired cash withdrawal is smaller than the coupon payment, so that my bond principal is maximized.

### DCA Transition & Schedule
10. As a user, I want to configure a scheduled monthly DCA amount to transfer from my fixed-income assets (Cash) into Equity, so that I can systematically transition my capital.
11. As a user, I want the simulator to automatically draw down existing cash reserves if my salary surplus and bond withdrawals are insufficient to fund the scheduled DCA, so that the transition remains uninterrupted.
12. As a user, I want the simulator to automatically sell bond tranches if my Cash balance hits €0 during the accumulation phase, so that my scheduled DCA purchases are fully funded.
13. As a user, I want to be alerted in the UI of the exact month when Cash reserves are depleted or when bond liquidations start, so that I am aware of these critical cash flow inflection points.
14. As a user, I want to configure a multi-segment DCA Schedule (e.g. Month 0-42: €5,000; Month 43 onwards: €2,000), so that I can plan a step-down strategy to avoid running out of cash or liquidating bonds.
15. As a user, I want the UI to recommend a step-down DCA amount upon detecting a depletion event, allowing me to apply the change with a single click, so that I can quickly optimize my plan.

### German Tax Regulations
16. As a user, I want the simulator to deduct German capital gains tax (Abgeltungsteuer) from my cash balance for Cash and Bond yields, so that my net wealth reflects real-world tax drag.
17. As a user, I want to configure the Abgeltungsteuer rate (default 26.375% to cover base tax + Solidaritätszuschlag) and indicate whether church tax applies, so that my local tax jurisdiction is accurately represented.
18. As a user, I want to configure my annual Sparerpauschbetrag allowance (default €1,000 for single, €2,000 for married) and have it reset on January 1st of every calendar year, so that my tax-free buffer is applied correctly.
19. As a user, I want the simulator to calculate and deduct the annual Vorabpauschale tax on my accumulating equities in January of each year (applying the 30% Teilfreistellung exemption), so that I can model the tax drag of accumulating ETFs.
20. As a user, I want to specify a constant Basiszins rate (e.g., 2.29%) to be used in the annual Vorabpauschale calculations, so that I can test different baseline interest rate environments.

### Visualization & Dashboard
21. As a user, I want to see a top metric card showing the exact number of months and years it takes to reach the Target Equity Ratio, so that I can immediately judge the speed of my transition.
22. As a user, I want to view a stacked area chart showing the absolute balances of Equity, Bonds, and Cash over the entire accumulation period, so that I can visualize my net worth composition.
23. As a user, I want to view a line chart tracking my Current Equity Ratio over the period, overlaid with a static horizontal line representing my Target Equity Ratio, so that I can see when I cross the transition threshold.
24. As a user, I want to toggle between different Post-Target Allocation Strategies (Proportional Rebalance, Accumulate in Cash, 100% to Equity) once the Target Equity Ratio is reached, so that I can compare different long-term saving behaviors.

## Implementation Decisions

### 1. Architectural Design & Modules
*   **Spring Boot Kotlin API (`/api/simulate`)**: A stateless service that executes the monthly simulation loop.
*   **High-Precision Financial Math**: All monetary values, interest calculations, and taxes must strictly use Kotlin's `java.math.BigDecimal` with a scale of `8` and `RoundingMode.HALF_UP` for all intermediate steps. Final outputs are rounded to `2` decimal places.
*   **React Frontend SPA**: Built with React, Vite, and CSS variables for a premium look (supporting dark-mode glassmorphism). Uses `Recharts` for interactive graphing.

### 2. Domain Entities & Reinvestment Rules
*   **Bond Ladder Representation**: The bond portfolio is modeled as three tranches, maturing every 3 months. When $33.33\%$ of the bonds mature, the quarterly coupon interest is added. The cash kept from maturity is determined by:
    *   `fixedWithdrawalAmount` ($W$)
    *   `couponInterest` ($C$)
    *   If $W < C$: Cash gets $W$, Bonds get $C - W$, matured bonds are rolled over.
    *   If $W \ge C$: Cash gets $C + \min(W - C, B_{mature})$, Bonds get $B_{mature} - \min(W - C, B_{mature})$.
*   **Transition Termination**: The moment the portfolio hits the `Target Equity Ratio`, bond withdrawals ($W$) instantly drop to €0, and all matured bonds roll over automatically.
*   **Post-Target Strategies**:
    *   *Option A (Proportional Rebalance)*: Monthly savings are split: $\text{Savings} \times \text{TargetRatio}$ goes to Equity; $\text{Savings} \times (1 - \text{TargetRatio})$ goes to Cash.
    *   *Option B (Hold in Cash)*: $100\%$ of monthly savings is added to Cash.
    *   *Option C (100% to Equity)*: $100\%$ of monthly savings is added to Equity.

### 3. API Payload Specifications

#### Simulating Request Payload (`POST /api/simulate`)
```typescript
interface SimulationRequest {
  currentAge: number;
  retirementAge: number;
  initialNetWorth: number;
  monthlySalary: number;
  monthlyExpenses: number;
  allocation: {
    equityPercentage: number;  // e.g. 30.0
    bondPercentage: number;    // e.g. 50.0
    cashPercentage: number;    // e.g. 20.0
    equityYieldPercent: number; // e.g. 7.0 (p.a.)
    bondYieldPercent: number;   // e.g. 4.0 (p.a.)
    cashYieldPercent: number;   // e.g. 3.0 (p.a.)
  };
  dcaSchedule: Array<{
    startMonth: number;
    dcaAmount: number;
  }>;
  targetEquityRatioPercent: number; // e.g. 80.0
  bondQuarterlyWithdrawal: number;  // e.g. 15000.00
  taxSettings: {
    sparerpauschbetrag: number;     // e.g. 1000.00
    abgeltungsteuerPercent: number; // e.g. 26.375
    basiszinsPercent: number;       // e.g. 2.29
  };
  postTargetStrategy: 'PROPORTIONAL_REBALANCE' | 'HOLD_CASH' | 'ALL_EQUITY';
}
```

#### Response Payload
```typescript
interface SimulationResponse {
  monthsToTarget: number; // -1 if not reached
  timeline: Array<{
    month: number;
    age: number;
    cashBalance: number;
    bondBalance: number;
    equityBalance: number;
    netWorth: number;
    equityRatioPercent: number;
    taxPaidThisYear: number;
  }>;
  alerts: Array<{
    month: number;
    type: 'CASH_DEPLETION' | 'BOND_LIQUIDATION_STARTED';
    message: string;
  }>;
}
```

---

## Testing Decisions

### 1. Seams for Testing
*   **REST API Seam (Integration Tests)**: Tested using `@SpringBootTest` and `MockMvc` in Kotlin. These tests will submit real JSON payloads to `/api/simulate` and verify that the output timelines contain exact expected financial states and that the alerts are triggered in the correct months.
*   **Simulation Engine Seam (Unit Tests)**: Kotlin unit tests focusing on the mathematical calculations (e.g. `TaxCalculatorTest` verifying Sparerpauschbetrag resets and Vorabpauschale calculation, and `BondLadderTest` verifying coupon reinvestment cases).
*   **Frontend UI Seam (React Hook/Component Tests)**: Tested using `Vitest` and `React Testing Library`. We will test:
    *   The proportional allocation slider hooks (ensuring that moving the cash slider adjusts bonds/equity to sum to 100%).
    *   Input fields formatting 7-digit numbers with commas (e.g. `1,500,000`).
    *   Triggering recalculated schedules when clicking the "Apply DCA step-down" recommendation alert.

### 2. What Makes a Good Test
*   Tests should verify outcomes (e.g., given inputs $X$, net worth after 12 months must be exactly $Y$; tax paid must be exactly $Z$) rather than checking the internal loop variable counters.
*   We will run parameterized test scenarios in JUnit to check tax calculations at boundaries (e.g., total gains under €1,000 vs. over €1,000 to verify the Sparerpauschbetrag).

---

## Out of Scope

*   **Retirement / De-accumulation Drawdown**: We will not model the decumulation phase, pension incomes, inflation adjustments to expenses in retirement, or FIFO capital gains tax tracking for equity sales in retirement. The simulation terminates at the Retirement Age.
*   **Real-time Stock Market Feeds**: Asset yields are modeled as constant annual interest rates compounded monthly. Market volatility, historical sequences, or Monte Carlo simulations are out of scope.
*   **Brokerage/Transaction Fees**: Exchange commissions, transaction spreads, and custody fees are not modeled.
*   **Multi-Currency Support**: All inputs and outputs are in Euros (€).

## Further Notes

*   **Premium UI Design**: The frontend dashboard should follow modern CSS variables, displaying clean card components, glassmorphism containers, smooth hover states, and clear charts that make the complex mathematics look simple and visually gorgeous.
*   **DCA Schedule Adjustments**: In the UI, the DCA Schedule should be displayed as a list of segments that the user can append to, edit, or delete, enabling complex multi-year planning.
