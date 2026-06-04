package org.example.portfolioplanner.domain

import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate

@Service
class DefaultSimulationEngine : SimulationEngine {

    override fun simulate(request: SimulationRequest): SimulationResponse {
        val totalMonths = (request.retirementAge - request.currentAge) * 12
        val timeline = ArrayList<TimelinePoint>(totalMonths + 1)

        val alloc = request.allocation
        val totalAllocation = alloc.equityPercentage.add(alloc.bondPercentage).add(alloc.cashPercentage)
        require(totalAllocation.compareTo(BigDecimal("100")) == 0) {
            "Initial allocation percentages must sum to exactly 100%. Found: ${totalAllocation.toPlainString()}%"
        }

        val hundred = BigDecimal("100")
        val twelve = BigDecimal("12")
        val four = BigDecimal("4")
        val three = BigDecimal("3")

        // Initial percentage rates
        val eqPct = alloc.equityPercentage.divide(hundred, 8, RoundingMode.HALF_UP)
        val bondPct = alloc.bondPercentage.divide(hundred, 8, RoundingMode.HALF_UP)
        val cashPct = alloc.cashPercentage.divide(hundred, 8, RoundingMode.HALF_UP)

        // Monthly yield rates (Yield / 100 / 12)
        val eqMonthlyYield = alloc.equityYieldPercent.divide(hundred, 8, RoundingMode.HALF_UP).divide(twelve, 8, RoundingMode.HALF_UP)
        val cashMonthlyYield = alloc.cashYieldPercent.divide(hundred, 8, RoundingMode.HALF_UP).divide(twelve, 8, RoundingMode.HALF_UP)

        // Initial balances
        var equity = request.initialNetWorth.multiply(eqPct)
        var bond = request.initialNetWorth.multiply(bondPct)
        var cash = request.initialNetWorth.multiply(cashPct)

        val startDate = LocalDate.of(2026, 6, 1)

        // Tax tracking
        val taxRate = request.abgeltungsteuerPercent.divide(hundred, 8, RoundingMode.HALF_UP)
        var remainingAllowance = request.sparerpauschbetrag
        var taxPaidThisYear = BigDecimal.ZERO

        // Vorabpauschale tracking
        var equityStartOfYear = equity
        var monthsHeldThisYear = 1
        var yearlyDcaInvested = BigDecimal.ZERO

        // Target Equity Ratio tracking
        val initialNetWorth = equity.add(bond).add(cash)
        val initialRatio = if (initialNetWorth.compareTo(BigDecimal.ZERO) == 0) {
            BigDecimal.ZERO
        } else {
            equity.multiply(hundred).divide(initialNetWorth, 8, RoundingMode.HALF_UP)
        }
        var targetReached = initialRatio.compareTo(request.targetEquityRatioPercent) >= 0
        var monthsToTarget = if (targetReached) 0 else -1

        // Alert tracking
        val alerts = ArrayList<SimulationAlert>()
        var cashDepletionAlerted = false
        var bondLiquidationAlerted = false

        val formatUS = java.util.Locale.US
        fun formatMoney(amount: BigDecimal): String = "€" + String.format(formatUS, "%,.2f", amount.setScale(2, RoundingMode.HALF_UP))

        // Month 0
        val m0NetWorth = equity.add(bond).add(cash)
        val m0EqEvents = listOf(LedgerEvent(equity, "Initial Equity Balance (${alloc.equityPercentage}% of ${formatMoney(m0NetWorth)})"))
        val m0BondEvents = listOf(LedgerEvent(bond, "Initial Bond Balance (${alloc.bondPercentage}% of ${formatMoney(m0NetWorth)})"))
        val m0CashEvents = listOf(LedgerEvent(cash, "Initial Cash Balance (${alloc.cashPercentage}% of ${formatMoney(m0NetWorth)})"))
        val m0Events = listOf("Simulation initialized at Age ${request.currentAge} with Net Worth of ${formatMoney(m0NetWorth)}.")

        timeline.add(createTimelinePoint(0, startDate, request.currentAge.toDouble(), equity, bond, cash, taxPaidThisYear, m0EqEvents, m0BondEvents, m0CashEvents, m0Events))

        var currentDate = startDate

        // Monthly loop
        for (m in 1..totalMonths) {
            val date = startDate.plusMonths(m.toLong())
            val age = request.currentAge + (m / 12.0)

            val eqEvents = ArrayList<LedgerEvent>()
            val bondEvents = ArrayList<LedgerEvent>()
            val cashEvents = ArrayList<LedgerEvent>()
            val mEvents = ArrayList<String>()

            // Calendar year reset and Vorabpauschale calculation in January
            if (date.year > currentDate.year) {
                // Calculate Vorabpauschale for the previous year
                val basiszins = request.basiszinsPercent.divide(hundred, 8, RoundingMode.HALF_UP)
                val basisertrag = equityStartOfYear.multiply(BigDecimal("0.70")).multiply(basiszins)
                val scaledBasisertrag = basisertrag.multiply(BigDecimal(monthsHeldThisYear)).divide(twelve, 8, RoundingMode.HALF_UP)
                val actualGain = (equity.subtract(equityStartOfYear).subtract(yearlyDcaInvested)).max(BigDecimal.ZERO)
                val vorabpauschale = scaledBasisertrag.min(actualGain)
                val taxableVorabpauschale = vorabpauschale.multiply(BigDecimal("0.70")).setScale(8, RoundingMode.HALF_UP)

                // Allowance reset for the new year first
                remainingAllowance = request.sparerpauschbetrag
                taxPaidThisYear = BigDecimal.ZERO

                val taxableExcess = (taxableVorabpauschale.subtract(remainingAllowance)).max(BigDecimal.ZERO)
                val consumedAllowance = taxableVorabpauschale.min(remainingAllowance)
                remainingAllowance = remainingAllowance.subtract(consumedAllowance)

                val vorabTax = taxableExcess.multiply(taxRate).setScale(8, RoundingMode.HALF_UP)
                taxPaidThisYear = taxPaidThisYear.add(vorabTax)
                cash = cash.subtract(vorabTax)

                if (vorabTax.compareTo(BigDecimal.ZERO) > 0) {
                    cashEvents.add(LedgerEvent(vorabTax.negate(), "Deducted Equity Vorabpauschale tax"))
                    mEvents.add("Year-End Tax Reset: Sparerpauschbetrag allowance of ${formatMoney(request.sparerpauschbetrag)} reset. Paid Vorabpauschale tax of ${formatMoney(vorabTax)} from Cash.")
                } else {
                    mEvents.add("Year-End Tax Reset: Sparerpauschbetrag allowance of ${formatMoney(request.sparerpauschbetrag)} reset. No Vorabpauschale tax was due.")
                }

                // Reset tracking for the new year
                equityStartOfYear = equity
                monthsHeldThisYear = 0
                yearlyDcaInvested = BigDecimal.ZERO
            }
            monthsHeldThisYear++
            currentDate = date

            // Compound yields
            val eqGrowth = equity.multiply(eqMonthlyYield)
            val cashGrowth = cash.multiply(cashMonthlyYield)

            equity = equity.add(eqGrowth)
            if (eqGrowth.compareTo(BigDecimal.ZERO) > 0) {
                eqEvents.add(LedgerEvent(eqGrowth, "Earned compound yield (${alloc.equityYieldPercent}% p.a.)"))
            }

            // Tax on cash interest
            val cashTax = if (cashGrowth.compareTo(BigDecimal.ZERO) > 0) {
                val taxable = (cashGrowth.subtract(remainingAllowance)).max(BigDecimal.ZERO)
                val consumed = cashGrowth.min(remainingAllowance)
                remainingAllowance = remainingAllowance.subtract(consumed)
                taxable.multiply(taxRate).setScale(8, RoundingMode.HALF_UP)
            } else {
                BigDecimal.ZERO
            }
            taxPaidThisYear = taxPaidThisYear.add(cashTax)

            if (cashGrowth.compareTo(BigDecimal.ZERO) > 0) {
                cashEvents.add(LedgerEvent(cashGrowth, "Earned cash interest (${alloc.cashYieldPercent}% p.a.)"))
                if (cashTax.compareTo(BigDecimal.ZERO) > 0) {
                    cashEvents.add(LedgerEvent(cashTax.negate(), "Paid Abgeltungsteuer on cash interest"))
                }
            }

            // Bond Quarterly Maturity & Coupon (every 3 months)
            var bondQuarterlyCashInflow = BigDecimal.ZERO
            if (m > 0 && m % 3 == 0) {
                val bondYield = alloc.bondYieldPercent.divide(hundred, 8, RoundingMode.HALF_UP)
                val quarterlyYield = bondYield.divide(four, 8, RoundingMode.HALF_UP)
                val coupon = bond.multiply(quarterlyYield)

                // Tax on coupon (100% taxable, no partial exemption)
                val couponTax = if (coupon.compareTo(BigDecimal.ZERO) > 0) {
                    val taxable = (coupon.subtract(remainingAllowance)).max(BigDecimal.ZERO)
                    val consumed = coupon.min(remainingAllowance)
                    remainingAllowance = remainingAllowance.subtract(consumed)
                    taxable.multiply(taxRate).setScale(8, RoundingMode.HALF_UP)
                } else {
                    BigDecimal.ZERO
                }
                taxPaidThisYear = taxPaidThisYear.add(couponTax)

                val matured = bond.divide(three, 8, RoundingMode.HALF_UP)
                val w = if (targetReached) BigDecimal.ZERO else request.bondQuarterlyWithdrawal

                if (w.compareTo(coupon) < 0) {
                    // Case A: Withdrawal goal is smaller than the coupon payment
                    val excessCoupon = coupon.subtract(w)
                    bond = bond.add(excessCoupon) // Reinvest excess coupon
                    bondQuarterlyCashInflow = w.subtract(couponTax) // Cash gets withdrawal minus tax

                    bondEvents.add(LedgerEvent(excessCoupon, "Reinvested excess quarterly coupon"))
                    cashEvents.add(LedgerEvent(bondQuarterlyCashInflow, "Received bond coupon withdrawal"))
                } else {
                    // Case B: Withdrawal goal is greater than or equal to the coupon payment
                    val remainder = w.subtract(coupon)
                    val withdrawalFromMatured = remainder.min(matured)
                    bond = bond.subtract(withdrawalFromMatured) // Withdrawal reduces bond balance
                    bondQuarterlyCashInflow = coupon.add(withdrawalFromMatured).subtract(couponTax)

                    bondEvents.add(LedgerEvent(withdrawalFromMatured.negate(), "Liquidated principal for quarterly withdrawal"))
                    cashEvents.add(LedgerEvent(bondQuarterlyCashInflow, "Received bond coupon and matured principal"))
                }
            }

            val savings = request.monthlySalary.subtract(request.monthlyExpenses)

            if (targetReached) {
                // Cash compounding + yield additions without savings
                cash = cash.add(cashGrowth).subtract(cashTax).add(bondQuarterlyCashInflow)
                
                // Savings split based on strategy
                when (request.postTargetStrategy) {
                    PostTargetStrategy.HOLD_CASH -> {
                        cash = cash.add(savings)
                        cashEvents.add(LedgerEvent(savings, "Received monthly savings (Post-Target Strategy: Hold Cash)"))
                    }
                    PostTargetStrategy.ALL_EQUITY -> {
                        equity = equity.add(savings)
                        yearlyDcaInvested = yearlyDcaInvested.add(savings)
                        eqEvents.add(LedgerEvent(savings, "Received monthly savings (Post-Target Strategy: All Equity)"))
                    }
                    PostTargetStrategy.PROPORTIONAL_REBALANCE -> {
                        val targetRatio = request.targetEquityRatioPercent.divide(hundred, 8, RoundingMode.HALF_UP)
                        val eqShare = savings.multiply(targetRatio)
                        val cashShare = savings.subtract(eqShare)
                        cash = cash.add(cashShare)
                        equity = equity.add(eqShare)
                        yearlyDcaInvested = yearlyDcaInvested.add(eqShare)

                        eqEvents.add(LedgerEvent(eqShare, "Received monthly savings (Post-Target Strategy: Proportional Rebalance)"))
                        cashEvents.add(LedgerEvent(cashShare, "Received monthly savings (Post-Target Strategy: Proportional Rebalance)"))
                    }
                }
            } else {
                // Pre-target: Savings go to cash
                cash = cash.add(cashGrowth).subtract(cashTax).add(bondQuarterlyCashInflow).add(savings)
                cashEvents.add(LedgerEvent(savings, "Received monthly savings"))
            }

            // Monthly DCA Transfer & hierarchy (Cash -> Bonds -> Equity)
            val dcaSchedule = request.dcaSchedule
            val dca = if (dcaSchedule != null && dcaSchedule.isNotEmpty()) {
                val activeSegment = dcaSchedule.filter { it.startMonth <= m }.maxByOrNull { it.startMonth }
                activeSegment?.dcaAmount ?: request.dcaMonthlyAmount
            } else {
                request.dcaMonthlyAmount
            }

            var actualDca = BigDecimal.ZERO
            if (dca.compareTo(BigDecimal.ZERO) > 0) {
                if (cash.compareTo(dca) >= 0) {
                    cash = cash.subtract(dca)
                    equity = equity.add(dca)
                    actualDca = dca

                    cashEvents.add(LedgerEvent(dca.negate(), "Deducted programmatic DCA transition to Equity"))
                    eqEvents.add(LedgerEvent(dca, "Received programmatic DCA transition"))
                } else {
                    val cashDrawn = cash
                    cash = BigDecimal.ZERO
                    val remainingNeeded = dca.subtract(cashDrawn)

                    if (!cashDepletionAlerted) {
                        alerts.add(SimulationAlert(m, AlertType.CASH_DEPLETION, "Cash depleted at Month $m"))
                        cashDepletionAlerted = true
                    }
                    mEvents.add("DCA Step-down Event: Cash reserves depleted. DCA transfer of ${formatMoney(dca)} funded via bond liquidations.")

                    val bondLiquidated = remainingNeeded.min(bond)
                    if (bondLiquidated.compareTo(BigDecimal.ZERO) > 0) {
                        if (!bondLiquidationAlerted) {
                            alerts.add(SimulationAlert(m, AlertType.BOND_LIQUIDATION, "Bond liquidation started at Month $m"))
                            bondLiquidationAlerted = true
                        }
                        bondEvents.add(LedgerEvent(bondLiquidated.negate(), "Liquidated principal to support DCA transition"))
                    }

                    bond = bond.subtract(bondLiquidated)
                    equity = equity.add(cashDrawn).add(bondLiquidated)
                    actualDca = cashDrawn.add(bondLiquidated)

                    cashEvents.add(LedgerEvent(cashDrawn.negate(), "Cash depleted transferring remaining for DCA"))
                    eqEvents.add(LedgerEvent(actualDca, "Received DCA transition (Cash: ${formatMoney(cashDrawn)}, Bonds: ${formatMoney(bondLiquidated)})"))
                }
            }
            yearlyDcaInvested = yearlyDcaInvested.add(actualDca)

            // Check if Target Equity Ratio has been achieved
            val currentNetWorth = equity.add(bond).add(cash)
            val currentRatio = if (currentNetWorth.compareTo(BigDecimal.ZERO) == 0) {
                BigDecimal.ZERO
            } else {
                equity.multiply(hundred).divide(currentNetWorth, 8, RoundingMode.HALF_UP)
            }

            if (!targetReached && currentRatio.compareTo(request.targetEquityRatioPercent) >= 0) {
                targetReached = true
                monthsToTarget = m
                mEvents.add("Target Equity Ratio Reached: Equity ratio is ${currentRatio.setScale(2, RoundingMode.HALF_UP)}% (Target: ${request.targetEquityRatioPercent.setScale(2, RoundingMode.HALF_UP)}%). Programmatic bond withdrawals stopped.")
            }

            timeline.add(createTimelinePoint(m, date, age, equity, bond, cash, taxPaidThisYear, eqEvents, bondEvents, cashEvents, mEvents))
        }

        return SimulationResponse(
            monthsToTarget = monthsToTarget,
            timeline = timeline,
            alerts = alerts
        )
    }

    private fun createTimelinePoint(
        month: Int,
        date: LocalDate,
        age: Double,
        equity: BigDecimal,
        bond: BigDecimal,
        cash: BigDecimal,
        taxPaidThisYear: BigDecimal,
        equityEvents: List<LedgerEvent> = emptyList(),
        bondEvents: List<LedgerEvent> = emptyList(),
        cashEvents: List<LedgerEvent> = emptyList(),
        events: List<String> = emptyList()
    ): TimelinePoint {
        val netWorth = equity.add(bond).add(cash)
        val equityRatio = if (netWorth.compareTo(BigDecimal.ZERO) == 0) {
            BigDecimal.ZERO
        } else {
            equity.multiply(BigDecimal("100")).divide(netWorth, 8, RoundingMode.HALF_UP)
        }

        return TimelinePoint(
            month = month,
            date = date,
            age = age,
            equityBalance = equity.setScale(2, RoundingMode.HALF_UP),
            bondBalance = bond.setScale(2, RoundingMode.HALF_UP),
            cashBalance = cash.setScale(2, RoundingMode.HALF_UP),
            netWorth = netWorth.setScale(2, RoundingMode.HALF_UP),
            equityRatioPercent = equityRatio.setScale(2, RoundingMode.HALF_UP),
            taxPaidThisYear = taxPaidThisYear.setScale(2, RoundingMode.HALF_UP),
            equityEvents = equityEvents,
            bondEvents = bondEvents,
            cashEvents = cashEvents,
            events = events
        )
    }
}
