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

enum class PostTargetStrategy {
    ACCUMULATE_CASH,
    INVEST_EQUITY,
    INVEST_BONDS
}

enum class AlertType {
    CASH_DEPLETION,
    BOND_LIQUIDATION,
    EMERGENCY_FUND_LIMIT,
    MINIMUM_BOND_LIMIT
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
    val bondIncomeStrategy: PostTargetStrategy = PostTargetStrategy.ACCUMULATE_CASH,
    val cashAllocationStrategy: PostTargetStrategy = PostTargetStrategy.ACCUMULATE_CASH,
    val minimumBondAmount: BigDecimal = BigDecimal.ZERO,
    val bondWithdrawalSchedule: List<DcaScheduleSegment>? = null,
    val emergencyFund: BigDecimal = BigDecimal.ZERO
)

data class LedgerEvent(
    val amount: BigDecimal,
    val type: String
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
    val taxPaidThisYear: BigDecimal = BigDecimal.ZERO,
    val equityEvents: List<LedgerEvent> = emptyList(),
    val bondEvents: List<LedgerEvent> = emptyList(),
    val cashEvents: List<LedgerEvent> = emptyList(),
    val events: List<String> = emptyList()
)

data class SimulationResponse(
    val monthsToTarget: Int,
    val timeline: List<TimelinePoint>,
    val alerts: List<SimulationAlert> = emptyList()
)

interface SimulationEngine {
    fun simulate(request: SimulationRequest): SimulationResponse
}
