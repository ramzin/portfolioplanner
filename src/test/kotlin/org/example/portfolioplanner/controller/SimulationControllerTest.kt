package org.example.portfolioplanner.controller

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post

@SpringBootTest
@AutoConfigureMockMvc
class SimulationControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Test
    fun `test simulate endpoint returns expected JSON payload`() {
        val requestJson = """
            {
              "currentAge": 35,
              "retirementAge": 36,
              "initialNetWorth": 100000.00,
              "monthlySalary": 5000.00,
              "monthlyExpenses": 3000.00,
              "allocation": {
                "equityPercentage": 50.0,
                "bondPercentage": 30.0,
                "cashPercentage": 20.0,
                "equityYieldPercent": 0.0,
                "bondYieldPercent": 0.0,
                "cashYieldPercent": 0.0
              }
            }
        """.trimIndent()

        mockMvc.post("/api/simulate") {
            contentType = MediaType.APPLICATION_JSON
            content = requestJson
        }.andExpect {
            status { isOk() }
            content { contentType(MediaType.APPLICATION_JSON) }
            jsonPath("$.monthsToTarget") { value(-1) }
            jsonPath("$.timeline[0].month") { value(0) }
            jsonPath("$.timeline[0].netWorth") { value(100000.00) }
            jsonPath("$.timeline[0].equityEvents") { exists() }
            jsonPath("$.timeline[0].events") { exists() }
            jsonPath("$.timeline[12].month") { value(12) }
            jsonPath("$.timeline[12].netWorth") { value(124000.00) }
            jsonPath("$.timeline[12].equityRatioPercent") { value(40.32) }
        }
    }
}
