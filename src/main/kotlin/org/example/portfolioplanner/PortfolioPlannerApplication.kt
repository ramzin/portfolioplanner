package org.example.portfolioplanner

import org.example.portfolioplanner.config.SimulationDefaultsProperties
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.boot.runApplication

@SpringBootApplication
@EnableConfigurationProperties(SimulationDefaultsProperties::class)
class PortfolioPlannerApplication

fun main(args: Array<String>) {
    runApplication<PortfolioPlannerApplication>(*args)
}

