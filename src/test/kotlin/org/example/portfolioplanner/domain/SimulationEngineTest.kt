package org.example.portfolioplanner.domain

import java.math.BigDecimal
import kotlin.test.Test
import kotlin.test.assertEquals

class SimulationEngineTest {

    private val engine: SimulationEngine = DefaultSimulationEngine()

    @Test
    fun `test zero-yield growth is purely savings surplus accumulated in cash`() {
        val allocation = Allocation(
            equityPercentage = BigDecimal("50.0"),
            bondPercentage = BigDecimal("30.0"),
            cashPercentage = BigDecimal("20.0"),
            equityYieldPercent = BigDecimal("0.0"),
            bondYieldPercent = BigDecimal("0.0"),
            cashYieldPercent = BigDecimal("0.0")
        )

        val request = SimulationRequest(
            currentAge = 35,
            retirementAge = 36, // 1 year = 12 months
            initialNetWorth = BigDecimal("100000.00"),
            monthlySalary = BigDecimal("5000.00"),
            monthlyExpenses = BigDecimal("3000.00"),
            allocation = allocation,
            bondQuarterlyWithdrawal = BigDecimal.ZERO
        )

        val response = engine.simulate(request)

        // Verifying timeline size: Month 0 to Month 12 is 13 data points
        assertEquals(13, response.timeline.size)

        // Month 0 check (initial state)
        val month0 = response.timeline[0]
        assertEquals(0, month0.month)
        assertEquals(35.0, month0.age)
        assertEquals(BigDecimal("50000.00"), month0.equityBalance.setScale(2))
        assertEquals(BigDecimal("30000.00"), month0.bondBalance.setScale(2))
        assertEquals(BigDecimal("20000.00"), month0.cashBalance.setScale(2))
        assertEquals(BigDecimal("100000.00"), month0.netWorth.setScale(2))
        assertEquals(BigDecimal("50.00"), month0.equityRatioPercent.setScale(2))

        // Month 12 check (final state after 1 year of €2,000 savings/month)
        val month12 = response.timeline[12]
        assertEquals(12, month12.month)
        assertEquals(36.0, month12.age)
        assertEquals(BigDecimal("50000.00"), month12.equityBalance.setScale(2))
        assertEquals(BigDecimal("30000.00"), month12.bondBalance.setScale(2))
        assertEquals(BigDecimal("44000.00"), month12.cashBalance.setScale(2)) // 20k + 12 * 2k
        assertEquals(BigDecimal("124000.00"), month12.netWorth.setScale(2))
        // Equity ratio = 50k / 124k = 40.32%
        assertEquals(BigDecimal("40.32"), month12.equityRatioPercent.setScale(2))
    }

    @Test
    fun `test interest compounding with zero monthly savings`() {
        val allocation = Allocation(
            equityPercentage = BigDecimal("50.0"),
            bondPercentage = BigDecimal("30.0"),
            cashPercentage = BigDecimal("20.0"),
            equityYieldPercent = BigDecimal("6.0"), // 6% p.a. -> 0.5% monthly
            bondYieldPercent = BigDecimal("4.0"),   // 4% p.a. -> 0.33333333% monthly
            cashYieldPercent = BigDecimal("3.0")    // 3% p.a. -> 0.25% monthly
        )

        val request = SimulationRequest(
            currentAge = 35,
            retirementAge = 36, // 1 year = 12 months
            initialNetWorth = BigDecimal("100000.00"),
            monthlySalary = BigDecimal("0.00"),
            monthlyExpenses = BigDecimal("0.00"),
            allocation = allocation,
            bondQuarterlyWithdrawal = BigDecimal.ZERO
        )

        val response = engine.simulate(request)

        assertEquals(13, response.timeline.size)

        // Month 0 check
        val m0 = response.timeline[0]
        assertEquals(BigDecimal("50000.00"), m0.equityBalance)
        assertEquals(BigDecimal("30000.00"), m0.bondBalance)
        assertEquals(BigDecimal("20000.00"), m0.cashBalance)
        assertEquals(BigDecimal("100000.00"), m0.netWorth)

        // Month 1 check:
        // Equity = 50,000 * 1.005 = 50,250.00
        // Cash = 20,000 * 1.0025 = 20,050.00
        // Bonds = 30,000 (no quarterly compound yet)
        // Net Worth = 100,300.00
        val m1 = response.timeline[1]
        assertEquals(BigDecimal("50250.00"), m1.equityBalance)
        assertEquals(BigDecimal("30000.00"), m1.bondBalance)
        assertEquals(BigDecimal("20050.00"), m1.cashBalance)
        assertEquals(BigDecimal("100300.00"), m1.netWorth)

        // Month 12 check:
        val m12 = response.timeline[12]
        assertEquals(BigDecimal("53083.89"), m12.equityBalance)
        assertEquals(BigDecimal("31218.12"), m12.bondBalance)
        assertEquals(BigDecimal("20542.69"), m12.cashBalance)
        assertEquals(BigDecimal("104844.70"), m12.netWorth)
        // Equity Ratio = 53083.89 / 104844.70 = 50.63%
        assertEquals(BigDecimal("50.63"), m12.equityRatioPercent)
    }

    @Test
    fun `test initial allocation validation fails if percentages do not sum to 100`() {
        val allocation = Allocation(
            equityPercentage = BigDecimal("50.0"),
            bondPercentage = BigDecimal("30.0"),
            cashPercentage = BigDecimal("10.0"), // total is 90%
            equityYieldPercent = BigDecimal("0.0"),
            bondYieldPercent = BigDecimal("0.0"),
            cashYieldPercent = BigDecimal("0.0")
        )

        val request = SimulationRequest(
            currentAge = 35,
            retirementAge = 36,
            initialNetWorth = BigDecimal("100000.00"),
            monthlySalary = BigDecimal("5000.00"),
            monthlyExpenses = BigDecimal("3000.00"),
            allocation = allocation
        )

        val exception = org.junit.jupiter.api.assertThrows<IllegalArgumentException> {
            engine.simulate(request)
        }

        assertEquals("Initial allocation percentages must sum to exactly 100%. Found: 90.0%", exception.message)
    }

    @Test
    fun `test German tax integration with monthly cash interest and annual allowance reset`() {
        val allocation = Allocation(
            equityPercentage = BigDecimal("0.0"),
            bondPercentage = BigDecimal("0.0"),
            cashPercentage = BigDecimal("100.0"),
            equityYieldPercent = BigDecimal("0.0"),
            bondYieldPercent = BigDecimal("0.0"),
            cashYieldPercent = BigDecimal("12.0") // 12% p.a. -> 1% monthly
        )

        val request = SimulationRequest(
            currentAge = 35,
            retirementAge = 36, // 12 months, starts Jun 1, 2026 -> ends Jun 1, 2027
            initialNetWorth = BigDecimal("100000.00"),
            monthlySalary = BigDecimal("0.00"),
            monthlyExpenses = BigDecimal("0.00"),
            allocation = allocation,
            abgeltungsteuerPercent = BigDecimal("25.00"), // 25% flat tax
            sparerpauschbetrag = BigDecimal("1000.00")     // €1,000 allowance
        )

        val response = engine.simulate(request)

        // Month 0: Initial
        val m0 = response.timeline[0]
        assertEquals(BigDecimal("100000.00"), m0.cashBalance)
        assertEquals(BigDecimal("0.00"), m0.taxPaidThisYear)

        // Month 1 (July 1, 2026):
        // Interest: 1,000.00. Allowance consumed: 1,000.00 (remaining: 0.00). Tax: 0.00.
        // Cash: 101,000.00. Tax paid this year: 0.00.
        val m1 = response.timeline[1]
        assertEquals(BigDecimal("101000.00"), m1.cashBalance)
        assertEquals(BigDecimal("0.00"), m1.taxPaidThisYear)

        // Month 2 (August 1, 2026):
        // Interest: 1,010.00. Allowance: 0.00. Taxable: 1,010.00. Tax: 252.50.
        // Cash: 101,000.00 + 1,010.00 - 252.50 = 101,757.50. Tax paid: 252.50.
        val m2 = response.timeline[2]
        assertEquals(BigDecimal("101757.50"), m2.cashBalance)
        assertEquals(BigDecimal("252.50"), m2.taxPaidThisYear)

        // Month 7 (January 1, 2027): Sparerpauschbetrag resets to 1,000!
        // Cash at start of January (Month 6): 104,844.74.
        // Interest: 1,048.45. Allowance consumed: 1,000.00. Taxable: 48.45.
        // Tax: 48.45 * 25% = 12.11.
        // Cash: 104,844.74 + 1,048.45 - 12.11 = 105,881.08.
        // Tax paid this year resets in January and equals 12.11 (since it is the new calendar year).
        val m7 = response.timeline[7]
        assertEquals(BigDecimal("105881.08"), m7.cashBalance)
        assertEquals(BigDecimal("12.11"), m7.taxPaidThisYear)
    }

    @Test
    fun `test German Vorabpauschale calculation and January deduction on accumulating Equity`() {
        val allocation = Allocation(
            equityPercentage = BigDecimal("100.0"),
            bondPercentage = BigDecimal("0.0"),
            cashPercentage = BigDecimal("0.0"),
            equityYieldPercent = BigDecimal("10.0"), // 10% p.a.
            bondYieldPercent = BigDecimal("0.0"),
            cashYieldPercent = BigDecimal("0.0")
        )

        val request = SimulationRequest(
            currentAge = 35,
            retirementAge = 37, // 2 years, starts Jun 1, 2026 -> ends Jun 1, 2028
            initialNetWorth = BigDecimal("100000.00"),
            monthlySalary = BigDecimal("0.00"),
            monthlyExpenses = BigDecimal("0.00"),
            allocation = allocation,
            abgeltungsteuerPercent = BigDecimal("25.00"), // 25% flat tax
            sparerpauschbetrag = BigDecimal("1000.00"),    // €1,000 allowance
            basiszinsPercent = BigDecimal("2.00")         // 2.00% Basiszins
        )

        val response = engine.simulate(request)

        // Month 7 (Jan 1, 2027) check:
        // First year (2026) is 7 months (June to December).
        // Initial value: 100,000. Month 7 equity: 105,981.21.
        // Basisertrag (scaled 7/12): 100,000 * 0.7 * 0.02 * 7/12 = 816.67.
        // Actual Gain: 5,981.21. Vorabpauschale: 816.67.
        // Taxable after 30% partial exemption: 816.67 * 0.7 = 571.67.
        // In January, Sparerpauschbetrag resets to 1000. Taxable Vorabpauschale consumes 571.67.
        // Remaining Sparerpauschbetrag for 2027: 428.33. Tax paid: 0.00.
        val m7 = response.timeline[7]
        assertEquals(BigDecimal("105981.21"), m7.equityBalance)
        assertEquals(BigDecimal("0.00"), m7.cashBalance)
        assertEquals(BigDecimal("0.00"), m7.taxPaidThisYear)

        // Month 19 (Jan 1, 2028) check:
        val m19 = response.timeline[19]
        assertEquals(BigDecimal("117071.25"), m19.equityBalance)
        assertEquals(BigDecimal("0.00"), m19.cashBalance)
        assertEquals(BigDecimal("7.51"), m19.taxPaidThisYear)
    }

    @Test
    fun `test bond quarterly reinvestment where withdrawal is greater than coupon`() {
        val allocation = Allocation(
            equityPercentage = BigDecimal("0.0"),
            bondPercentage = BigDecimal("100.0"),
            cashPercentage = BigDecimal("0.0"),
            equityYieldPercent = BigDecimal("0.0"),
            bondYieldPercent = BigDecimal("4.0"), // 4% p.a. -> 1% quarterly coupon
            cashYieldPercent = BigDecimal("0.0")
        )

        val request = SimulationRequest(
            currentAge = 35,
            retirementAge = 36, // 1 year, starts Jun 1, 2026 -> ends Jun 1, 2027
            initialNetWorth = BigDecimal("300000.00"),
            monthlySalary = BigDecimal("0.00"),
            monthlyExpenses = BigDecimal("0.00"),
            allocation = allocation,
            abgeltungsteuerPercent = BigDecimal("0.00"), // no tax for simplicity
            sparerpauschbetrag = BigDecimal("1000.00"),
            bondQuarterlyWithdrawal = BigDecimal("15000.00") // withdrawal >= coupon
        )

        val response = engine.simulate(request)

        // Month 0: Initial
        val m0 = response.timeline[0]
        assertEquals(BigDecimal("300000.00"), m0.bondBalance)
        assertEquals(BigDecimal("0.00"), m0.cashBalance)

        // Month 1 & 2: No quarterly maturity, balances remain initial (since yield is quarterly coupon)
        val m1 = response.timeline[1]
        assertEquals(BigDecimal("300000.00"), m1.bondBalance)
        assertEquals(BigDecimal("0.00"), m1.cashBalance)

        // Month 3 (September 1, 2026): First quarterly maturity/coupon
        // Coupon = 300,000 * 1% = 3,000. Matured: 100,000.
        // Withdrawal = 15,000. Since 15,000 >= 3,000:
        // Cash gets: Coupon (3,000) + WithdrawalRemainder (12,000) = 15,000.
        // Bonds reinvested: 100,000 - 12,000 = 88,000.
        // New Bonds = 300,000 - 100,000 + 88,000 = 288,000.
        val m3 = response.timeline[3]
        assertEquals(BigDecimal("288000.00"), m3.bondBalance)
        assertEquals(BigDecimal("15000.00"), m3.cashBalance)
        assertEquals(BigDecimal("303000.00"), m3.netWorth)

        // Month 6 (December 1, 2026): Second quarterly maturity/coupon
        // Coupon = 288,000 * 1% = 2,880. Matured: 96,000.
        // Withdrawal = 15,000. Since 15,000 >= 2,880:
        // Cash gets: Coupon (2,880) + WithdrawalRemainder (12,120) = 15,000.
        // Bonds reinvested: 96,000 - 12,120 = 83,880.
        // New Bonds = 288,000 - 96,000 + 83,880 = 275,880.
        // Cash cumulative = 15,000 (Month 3) + 15,000 (Month 6) = 30,000.
        val m6 = response.timeline[6]
        assertEquals(BigDecimal("275880.00"), m6.bondBalance)
        assertEquals(BigDecimal("30000.00"), m6.cashBalance)
        assertEquals(BigDecimal("305880.00"), m6.netWorth)
    }

    @Test
    fun `test bond quarterly reinvestment where withdrawal is less than coupon`() {
        val allocation = Allocation(
            equityPercentage = BigDecimal("0.0"),
            bondPercentage = BigDecimal("100.0"),
            cashPercentage = BigDecimal("0.0"),
            equityYieldPercent = BigDecimal("0.0"),
            bondYieldPercent = BigDecimal("4.0"), // 1% quarterly coupon
            cashYieldPercent = BigDecimal("0.0")
        )

        val request = SimulationRequest(
            currentAge = 35,
            retirementAge = 36,
            initialNetWorth = BigDecimal("300000.00"),
            monthlySalary = BigDecimal("0.00"),
            monthlyExpenses = BigDecimal("0.00"),
            allocation = allocation,
            abgeltungsteuerPercent = BigDecimal("0.00"),
            sparerpauschbetrag = BigDecimal("1000.00"),
            bondQuarterlyWithdrawal = BigDecimal("2000.00") // withdrawal < coupon
        )

        val response = engine.simulate(request)

        // Month 3:
        // Coupon = 3,000. Matured: 100,000.
        // Withdrawal = 2,000. Since 2,000 < 3,000:
        // Cash gets: 2,000.
        // Bonds gets excess coupon: 3,000 - 2,000 = 1,000.
        // Matured bonds are fully reinvested (100,000).
        // New Bonds = 300,000 + 1,000 = 301,000.
        val m3 = response.timeline[3]
        assertEquals(BigDecimal("301000.00"), m3.bondBalance)
        assertEquals(BigDecimal("2000.00"), m3.cashBalance)
        assertEquals(BigDecimal("303000.00"), m3.netWorth)
    }

    @Test
    fun `test monthly dca transition and cash depletion to bond liquidation`() {
        val allocation = Allocation(
            equityPercentage = BigDecimal("20.0"), // 20k
            bondPercentage = BigDecimal("40.0"),   // 40k
            cashPercentage = BigDecimal("40.0"),   // 40k
            equityYieldPercent = BigDecimal("0.0"),
            bondYieldPercent = BigDecimal("0.0"),
            cashYieldPercent = BigDecimal("0.0")
        )

        val request = SimulationRequest(
            currentAge = 35,
            retirementAge = 36, // 1 year
            initialNetWorth = BigDecimal("100000.00"),
            monthlySalary = BigDecimal("0.00"),
            monthlyExpenses = BigDecimal("0.00"),
            allocation = allocation,
            abgeltungsteuerPercent = BigDecimal("0.00"),
            bondQuarterlyWithdrawal = BigDecimal.ZERO,
            dcaMonthlyAmount = BigDecimal("15000.00"), // DCA is 15k/month
            targetEquityRatioPercent = BigDecimal("100.00") // high target so it is never reached during these drawdowns
        )

        val response = engine.simulate(request)

        // Month 0: Equity = 20k, Bond = 40k, Cash = 40k
        val m0 = response.timeline[0]
        assertEquals(BigDecimal("20000.00"), m0.equityBalance)
        assertEquals(BigDecimal("40000.00"), m0.bondBalance)
        assertEquals(BigDecimal("40000.00"), m0.cashBalance)

        // Month 1: Transfer 15k DCA.
        // Cash has 40k >= 15k. So Cash becomes 25k, Equity becomes 35k. Bond remains 40k.
        val m1 = response.timeline[1]
        assertEquals(BigDecimal("35000.00"), m1.equityBalance)
        assertEquals(BigDecimal("40000.00"), m1.bondBalance)
        assertEquals(BigDecimal("25000.00"), m1.cashBalance)

        // Month 2: Transfer 15k DCA.
        // Cash has 25k >= 15k. So Cash becomes 10k, Equity becomes 50k. Bond remains 40k.
        val m2 = response.timeline[2]
        assertEquals(BigDecimal("50000.00"), m2.equityBalance)
        assertEquals(BigDecimal("40000.00"), m2.bondBalance)
        assertEquals(BigDecimal("10000.00"), m2.cashBalance)

        // Month 3: Transfer 15k DCA.
        // Cash has 10k < 15k. Cash is depleted to 0. Remaining needed = 5k.
        // Bond has 40k >= 5k. So Bond is liquidated by 5k -> becomes 35k.
        // Equity becomes 50k + 15k = 65k.
        // Wait, Month 3 also has quarterly bond coupon maturity, but yield/withdrawal are 0, so no bond changes from that.
        val m3 = response.timeline[3]
        assertEquals(BigDecimal("65000.00"), m3.equityBalance)
        assertEquals(BigDecimal("35000.00"), m3.bondBalance)
        assertEquals(BigDecimal("0.00"), m3.cashBalance)

        // Month 4: Transfer 15k DCA.
        // Cash has 0. Remaining needed = 15k.
        // Bond has 35k >= 15k. Bond is liquidated by 15k -> becomes 20k.
        // Equity becomes 65k + 15k = 80k. Cash remains 0.
        val m4 = response.timeline[4]
        assertEquals(BigDecimal("80000.00"), m4.equityBalance)
        assertEquals(BigDecimal("20000.00"), m4.bondBalance)
        assertEquals(BigDecimal("0.00"), m4.cashBalance)
    }

    @Test
    fun `test target equity ratio achieves stopping bond withdrawals`() {
        val allocation = Allocation(
            equityPercentage = BigDecimal("40.0"), // 40k
            bondPercentage = BigDecimal("60.0"),   // 60k
            cashPercentage = BigDecimal("0.0"),    // 0
            equityYieldPercent = BigDecimal("0.0"),
            bondYieldPercent = BigDecimal("4.0"),  // 1% quarterly coupon
            cashYieldPercent = BigDecimal("0.0")
        )

        val request = SimulationRequest(
            currentAge = 35,
            retirementAge = 36, // 12 months
            initialNetWorth = BigDecimal("100000.00"),
            monthlySalary = BigDecimal("0.00"),
            monthlyExpenses = BigDecimal("0.00"),
            allocation = allocation,
            abgeltungsteuerPercent = BigDecimal("0.00"),
            bondQuarterlyWithdrawal = BigDecimal("5000.00"), // Withdrawal is 5k
            dcaMonthlyAmount = BigDecimal("10000.00"),      // DCA 10k/month
            targetEquityRatioPercent = BigDecimal("70.00")  // Target is 70%
        )

        val response = engine.simulate(request)

        // Let's trace Month-by-month:
        // Month 0: Eq = 40k, Bond = 60k, Cash = 0. Equity ratio = 40%
        // Month 1: DCA 10k. Cash has 0. Needed 10k from bonds. Bond = 50k, Eq = 50k, Cash = 0. Ratio = 50%
        // Month 2: DCA 10k. Cash has 0. Needed 10k from bonds. Bond = 40k, Eq = 60k, Cash = 0. Ratio = 60%
        // Month 3:
        //   - Coupon: 40k * 1% = 400. Matured: 40k / 3 = 13,333.33.
        //     Withdrawal goal: 5k. Since target equity ratio is NOT yet reached at start of Month 3 (it was 60% at end of Month 2):
        //     Withdrawal is active! w = 5,000. Since 5,000 >= 400:
        //     Cash gets: 400 + 4,600 = 5,000.
        //     Bond reinvested: 13,333.33 - 4,600 = 8,733.33.
        //     So Bond balance before DCA becomes: 40,000 - 4,600 = 35,400.
        //   - DCA: 10k. Cash has 5,000 (from bond withdrawal). Depleted to 0. Remaining needed: 5,000.
        //     Liquidated from bonds: 5,000. Bond becomes 35,400 - 5,000 = 30,400.
        //     Eq becomes 60k + 10k = 70k. Cash = 0.
        //     Net worth = 70k + 30,400 = 100,400.
        //     Ratio = 70k / 100,400 = 69.72%. (Not yet 70%)
        // Month 4: DCA 10k. Cash has 0. Needed 10k from bonds. Bond = 20,400. Eq = 80k. Ratio = 80% (>= 70%)
        //   Since ratio >= 70% at end of Month 4, monthsToTarget is set to 4, and future bond withdrawals drop to 0!
        // Month 6 (second quarterly coupon/maturity):
        //   Since target equity ratio was achieved in Month 4, withdrawals drop to 0! w = 0.
        //   Coupon should be 100% reinvested.
        
        assertEquals(4, response.monthsToTarget)

        val m4 = response.timeline[4]
        assertEquals(BigDecimal("80000.00"), m4.equityBalance)
        assertEquals(BigDecimal("20400.00"), m4.bondBalance)
        assertEquals(BigDecimal("0.00"), m4.cashBalance)

        // Month 5: Target is reached! DCA = 0.
        // Eq = 80k, Bond = 20,400.
        // Month 6:
        //   - Coupon: 20,400 * 1% = 204.00.
        //     Withdrawal is €0 because target reached.
        //     So Coupon 204.00 is fully reinvested in Bonds. Bond becomes 20,400 + 204 = 20,604.
        //   - DCA = 0.
        //     Eq remains 80k. Cash = 0.
        val m6 = response.timeline[6]
        assertEquals(BigDecimal("80000.00"), m6.equityBalance)
        assertEquals(BigDecimal("20604.00"), m6.bondBalance)
        assertEquals(BigDecimal("0.00"), m6.cashBalance)
    }

    @Test
    fun `test dca depletion alerts generated by backend`() {
        val allocation = Allocation(
            equityPercentage = BigDecimal("20.0"), // 20k
            bondPercentage = BigDecimal("40.0"),   // 40k
            cashPercentage = BigDecimal("40.0"),   // 40k
            equityYieldPercent = BigDecimal("0.0"),
            bondYieldPercent = BigDecimal("0.0"),
            cashYieldPercent = BigDecimal("0.0")
        )

        val request = SimulationRequest(
            currentAge = 35,
            retirementAge = 36,
            initialNetWorth = BigDecimal("100000.00"),
            monthlySalary = BigDecimal("0.00"),
            monthlyExpenses = BigDecimal("0.00"),
            allocation = allocation,
            abgeltungsteuerPercent = BigDecimal("0.00"),
            bondQuarterlyWithdrawal = BigDecimal.ZERO,
            dcaMonthlyAmount = BigDecimal("15000.00"), // 15k/month DCA
            targetEquityRatioPercent = BigDecimal("100.00")
        )

        val response = engine.simulate(request)

        val alerts = response.alerts
        assertEquals(2, alerts.size)
        
        val cashAlert = alerts.find { it.type == AlertType.CASH_DEPLETION }
        val bondAlert = alerts.find { it.type == AlertType.BOND_LIQUIDATION }

        assertEquals(3, cashAlert?.month)
        assertEquals(3, bondAlert?.month)
    }

    @Test
    fun `test multi segment dca schedule simulation`() {
        val allocation = Allocation(
            equityPercentage = BigDecimal("10.0"), // 10k
            bondPercentage = BigDecimal("0.0"),
            cashPercentage = BigDecimal("90.0"),   // 90k
            equityYieldPercent = BigDecimal("0.0"),
            bondYieldPercent = BigDecimal("0.0"),
            cashYieldPercent = BigDecimal("0.0")
        )

        val schedule = listOf(
            DcaScheduleSegment(0, BigDecimal("10000.00")),
            DcaScheduleSegment(3, BigDecimal("20000.00"))
        )

        val request = SimulationRequest(
            currentAge = 35,
            retirementAge = 36,
            initialNetWorth = BigDecimal("100000.00"),
            monthlySalary = BigDecimal("0.00"),
            monthlyExpenses = BigDecimal("0.00"),
            allocation = allocation,
            abgeltungsteuerPercent = BigDecimal("0.00"),
            bondQuarterlyWithdrawal = BigDecimal.ZERO,
            dcaMonthlyAmount = BigDecimal("5000.00"), // overridden by schedule
            targetEquityRatioPercent = BigDecimal("100.00"),
            dcaSchedule = schedule
        )

        val response = engine.simulate(request)

        val timeline = response.timeline
        
        val m1 = timeline[1]
        assertEquals(BigDecimal("20000.00"), m1.equityBalance)
        assertEquals(BigDecimal("80000.00"), m1.cashBalance)

        val m2 = timeline[2]
        assertEquals(BigDecimal("30000.00"), m2.equityBalance)
        assertEquals(BigDecimal("70000.00"), m2.cashBalance)

        val m3 = timeline[3]
        assertEquals(BigDecimal("50000.00"), m3.equityBalance)
        assertEquals(BigDecimal("50000.00"), m3.cashBalance)

        val m4 = timeline[4]
        assertEquals(BigDecimal("70000.00"), m4.equityBalance)
        assertEquals(BigDecimal("30000.00"), m4.cashBalance)
    }

    @Test
    fun `test post-target strategy ACCUMULATE_CASH`() {
        val allocation = Allocation(
            equityPercentage = BigDecimal("80.0"), // 80k
            bondPercentage = BigDecimal("0.0"),
            cashPercentage = BigDecimal("20.0"),   // 20k
            equityYieldPercent = BigDecimal("0.0"),
            bondYieldPercent = BigDecimal("0.0"),
            cashYieldPercent = BigDecimal("0.0")
        )

        val request = SimulationRequest(
            currentAge = 35,
            retirementAge = 36,
            initialNetWorth = BigDecimal("100000.00"),
            monthlySalary = BigDecimal("10000.00"),
            monthlyExpenses = BigDecimal("0.00"), // 10k monthly savings
            allocation = allocation,
            abgeltungsteuerPercent = BigDecimal("0.00"),
            bondQuarterlyWithdrawal = BigDecimal.ZERO,
            dcaMonthlyAmount = BigDecimal.ZERO,
            targetEquityRatioPercent = BigDecimal("80.00"),
            postTargetStrategy = PostTargetStrategy.ACCUMULATE_CASH
        )

        val response = engine.simulate(request)
        val m1 = response.timeline[1]
        // 100% of savings (10k) goes to Cash.
        // Eq = 80k, Cash = 30k
        assertEquals(BigDecimal("80000.00"), m1.equityBalance)
        assertEquals(BigDecimal("30000.00"), m1.cashBalance)
    }

    @Test
    fun `test post-target strategy EQUITY_RATIO_GUARD`() {
        val allocation = Allocation(
            equityPercentage = BigDecimal("80.0"), // 80k
            bondPercentage = BigDecimal("0.0"),
            cashPercentage = BigDecimal("20.0"),   // 20k
            equityYieldPercent = BigDecimal("0.0"),
            bondYieldPercent = BigDecimal("0.0"),
            cashYieldPercent = BigDecimal("0.0")
        )

        val request = SimulationRequest(
            currentAge = 35,
            retirementAge = 36,
            initialNetWorth = BigDecimal("100000.00"),
            monthlySalary = BigDecimal("10000.00"),
            monthlyExpenses = BigDecimal("0.00"),
            allocation = allocation,
            abgeltungsteuerPercent = BigDecimal("0.00"),
            bondQuarterlyWithdrawal = BigDecimal.ZERO,
            dcaMonthlyAmount = BigDecimal.ZERO,
            targetEquityRatioPercent = BigDecimal("80.00"),
            postTargetStrategy = PostTargetStrategy.EQUITY_RATIO_GUARD,
            emergencyFund = BigDecimal("20000.00") // keep cash at 20k, excess (10k savings) to bonds/equity
        )

        val response = engine.simulate(request)
        val m1 = response.timeline[1]
        // Since ratio is 80k / (80k + 30k) = 72.7% (which is < target 80%), excess cash (10k savings) is routed to equity.
        // Eq = 90k, Cash = 20k, Bond = 0
        assertEquals(BigDecimal("90000.00"), m1.equityBalance)
        assertEquals(BigDecimal("20000.00"), m1.cashBalance)
    }

    @Test
    fun `test explanation logs generation`() {
        val allocation = Allocation(
            equityPercentage = BigDecimal("40.0"),
            bondPercentage = BigDecimal("30.0"),
            cashPercentage = BigDecimal("30.0"),
            equityYieldPercent = BigDecimal("6.0"),
            bondYieldPercent = BigDecimal("4.0"),
            cashYieldPercent = BigDecimal("3.0")
        )

        val request = SimulationRequest(
            currentAge = 34,
            retirementAge = 35,
            initialNetWorth = BigDecimal("100000.00"),
            monthlySalary = BigDecimal("5000.00"),
            monthlyExpenses = BigDecimal("3000.00"),
            allocation = allocation,
            dcaMonthlyAmount = BigDecimal("5000.00"),
            targetEquityRatioPercent = BigDecimal("80.00"),
            postTargetStrategy = PostTargetStrategy.ACCUMULATE_CASH
        )

        val response = engine.simulate(request)
        val m0 = response.timeline[0]
        assertEquals(1, m0.equityEvents.size)
        assertEquals("Initial Equity Balance (40.0% of €100,000.00)", m0.equityEvents[0].type)
        assertEquals(1, m0.bondEvents.size)
        assertEquals("Initial Bond Balance (30.0% of €100,000.00)", m0.bondEvents[0].type)
        assertEquals(1, m0.cashEvents.size)
        assertEquals("Initial Cash Balance (30.0% of €100,000.00)", m0.cashEvents[0].type)
        assertEquals(1, m0.events.size)
        assertEquals("Simulation initialized at Age 34 with Net Worth of €100,000.00.", m0.events[0])

        val m1 = response.timeline[1]
        kotlin.test.assertTrue(m1.equityEvents.any { it.type.contains("yield", ignoreCase = true) || it.type.contains("DCA", ignoreCase = true) })
        kotlin.test.assertTrue(m1.cashEvents.any { it.type.contains("interest", ignoreCase = true) || it.type.contains("savings", ignoreCase = true) })
    }
}
