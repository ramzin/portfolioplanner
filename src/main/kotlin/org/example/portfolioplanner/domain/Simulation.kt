package org.example.portfolioplanner.domain

import java.math.BigDecimal
import java.time.LocalDate

data class Allocation(
    val equityPercentage: BigDecimal,
    val bondPercentage: BigDecimal,
    val cashPercentage: BigDecimal,
    val equityYieldPercent: BigDecimal,
    val bondYieldPercent: BigDecimal,
    val cashYieldPercent: BigDecimal
)

data class DcaScheduleSegment(
    val startMonth: Int,
    val dcaAmount: BigDecimal
)

enum class AlertType {
    CASH_DEPLETION,
    BOND_LIQUIDATION
}

enum class PostTargetStrategy {
    PROPORTIONAL_REBALANCE,
    HOLD_CASH,
    ALL_EQUITY
}

data class SimulationAlert(
    val month: Int,
    val type: AlertType,
    val message: String
)

data class SimulationRequest(
    val currentAge: Int,
    val retirementAge: Int,
    val initialNetWorth: BigDecimal,
    val monthlySalary: BigDecimal,
    val monthlyExpenses: BigDecimal,
    val allocation: Allocation,
    val abgeltungsteuerPercent: BigDecimal = BigDecimal("26.375"),
    val sparerpauschbetrag: BigDecimal = BigDecimal("1000.00"),
    val basiszinsPercent: BigDecimal = BigDecimal("2.29"),
    val bondQuarterlyWithdrawal: BigDecimal = BigDecimal("10000.00"),
    val dcaMonthlyAmount: BigDecimal = BigDecimal("0.00"),
    val targetEquityRatioPercent: BigDecimal = BigDecimal("100.00"),
    val dcaSchedule: List<DcaScheduleSegment>? = null,
    val postTargetStrategy: PostTargetStrategy = PostTargetStrategy.HOLD_CASH
)

data class TimelinePoint(
    val month: Int,
    val date: LocalDate,
    val age: Double,
    val cashBalance: BigDecimal,
    val bondBalance: BigDecimal,
    val equityBalance: BigDecimal,
    val netWorth: BigDecimal,
    val equityRatioPercent: BigDecimal,
    val taxPaidThisYear: BigDecimal = BigDecimal.ZERO
)

data class SimulationResponse(
    val monthsToTarget: Int,
    val timeline: List<TimelinePoint>,
    val alerts: List<SimulationAlert> = emptyList()
)

interface SimulationEngine {
    fun simulate(request: SimulationRequest): SimulationResponse
}
