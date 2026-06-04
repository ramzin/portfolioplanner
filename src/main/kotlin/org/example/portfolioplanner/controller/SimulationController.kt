package org.example.portfolioplanner.controller

import org.example.portfolioplanner.domain.SimulationEngine
import org.example.portfolioplanner.domain.SimulationRequest
import org.example.portfolioplanner.domain.SimulationResponse
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class SimulationController(
    private val engine: SimulationEngine
) {

    @PostMapping("/simulate")
    fun simulate(@RequestBody request: SimulationRequest): SimulationResponse {
        return engine.simulate(request)
    }
}
