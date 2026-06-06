# Portfolio Planner Context

A single-context planning tool that simulates long-term wealth accumulation and transition from defensive assets into equity under German tax regulations.

## Language

### Asset Classes
**Equity**:
Global, broadly diversified, accumulating stock market index funds (e.g., ETFs) held within a local brokerage account.
_Avoid_: Stock, shares, fund

**Bonds**:
Short-term sovereign fixed-income assets organized as a rolling maturity ladder.
_Avoid_: Fixed income, treasury, gilts

**Cash**:
Liquid, interest-bearing capital parked in overnight deposit accounts or money market funds.
_Avoid_: Liquid assets, bank account, capital

### Transition and Saving
**DCA Transition**:
The programmatic monthly transfer of fixed-income assets (Bonds and Cash) into Equity to smooth entry volatility.
_Avoid_: Transitioning, asset migration

**Target Equity Ratio**:
The desired target percentage of Equity compared to the total portfolio balance (Bonds and Cash).
_Avoid_: Target allocation, target ratio

**Bond Income Strategy**:
The user-selected behavior for routing coupon yields and scheduled principal withdrawals from Bonds once the Target Equity Ratio has been reached.
_Avoid_: Reinvestment policy, bond post-target strategy

**Cash Allocation Strategy**:
The user-selected behavior for routing the cash pile (monthly savings, cash interest, and cash above the emergency fund) via DCA once the Target Equity Ratio has been reached.
_Avoid_: Savings post-target strategy, cash rule

**DCA Step-down Event**:
The simulation inflection point where liquid Cash is depleted, requiring bond liquidations to fund the scheduled DCA transfer.
_Avoid_: Cash depletion point, drawdown warning

### German Tax Regulations
**Abgeltungsteuer**:
The flat-rate German tax on capital gains and interest income (default 26.375% including Solidaritätszuschlag).
_Avoid_: Capital gains tax, flat tax

**Sparerpauschbetrag**:
The annual German tax-free allowance for investment yields (€1,000 for single taxpayers, €2,000 for married couples).
_Avoid_: Tax-free limit, allowance, exemption

**Teilfreistellung**:
The partial tax exemption of 30% applied to yields (distributions and Vorabpauschale) of equity funds.
_Avoid_: Partial exemption, tax relief

**Vorabpauschale**:
The annual German tax prepay calculated on accumulating funds based on start-of-year value, the Basiszins, and actual capital gains.
_Avoid_: Advance tax, lump sum tax
