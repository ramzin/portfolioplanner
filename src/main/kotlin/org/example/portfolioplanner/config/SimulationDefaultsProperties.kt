package org.example.portfolioplanner.config

import org.example.portfolioplanner.domain.PostTargetStrategy
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.bind.ConstructorBinding
import java.math.BigDecimal

@ConfigurationProperties(prefix = "simulation.defaults")
data class SimulationDefaultsProperties @ConstructorBinding constructor(
    val currentAge: Int,
    val retirementAge: Int,
    val initialNetWorth: BigDecimal,
    val monthlySalary: BigDecimal,
    val monthlyExpenses: BigDecimal,
    val allocation: AllocationDefaults,
    val abgeltungsteuerPercent: BigDecimal,
    val sparerpauschbetrag: BigDecimal,
    val basiszinsPercent: BigDecimal,
    val bondQuarterlyWithdrawal: BigDecimal,
    val dcaMonthlyAmount: BigDecimal,
    val targetEquityRatioPercent: BigDecimal,
    val postTargetStrategy: PostTargetStrategy,
    val minimumBondAmount: BigDecimal,
    val emergencyFund: BigDecimal
)

data class AllocationDefaults(
    val equityPercentage: BigDecimal,
    val bondPercentage: BigDecimal,
    val cashPercentage: BigDecimal,
    val equityYieldPercent: BigDecimal,
    val bondYieldPercent: BigDecimal,
    val cashYieldPercent: BigDecimal
)
