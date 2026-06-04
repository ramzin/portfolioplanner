package org.example.portfolioplanner.controller

import org.example.portfolioplanner.config.SimulationDefaultsProperties
import org.example.portfolioplanner.domain.SimulationEngine
import org.example.portfolioplanner.domain.SimulationRequest
import org.example.portfolioplanner.domain.SimulationResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class SimulationController(
    private val engine: SimulationEngine,
    private val defaults: SimulationDefaultsProperties
) {

    @PostMapping("/simulate")
    fun simulate(@RequestBody request: SimulationRequest): SimulationResponse {
        return engine.simulate(request)
    }

    @GetMapping("/defaults")
    fun getDefaults(): SimulationDefaultsProperties {
        return defaults
    }
}

