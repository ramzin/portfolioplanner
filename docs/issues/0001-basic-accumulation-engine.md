---
title: "Slice 1: Basic Accumulation Engine & Dashboard (Tracer Bullet)"
type: "AFK"
labels: ["ready-for-agent"]
blocked_by: []
---

## What to build

Build the initial multi-project workspace (Spring Boot + Kotlin for the backend, React + TypeScript + Vite for the frontend) and implement the basic monthly compounding loop. This is a tracer bullet vertical slice. It must allow entering basic numbers, simulating accumulation without taxes or bond ladders, and rendering the results in a React UI using a basic chart.

## Acceptance criteria

- [ ] Gradle workspace is initialized with backend (Spring Boot) and frontend (Vite/React/TS) sub-projects.
- [ ] Backend API accepts initial parameters: age, retirement age, initial net worth, monthly salary, expenses, and yields (Cash, Bonds, Equity).
- [ ] Backend simulation runs a monthly loop compounding asset classes by their nominal monthly rates (Yield / 12) and adding the monthly surplus (Salary - Expenses) to Cash.
- [ ] High-precision math (`BigDecimal` with scale 8) is used throughout the backend engine, returning values rounded to 2 decimal places to the frontend.
- [ ] React UI includes sliders for age, retirement age, initial net worth, monthly salary, expenses, and allocation percentages (Cash %, Bond %, Equity %).
- [ ] Allocation percentages sum-to-100% check is enforced in the React UI (adjusting sliders proportionally).
- [ ] Stacked area chart (Recharts) renders the absolute asset balances over time.
- [ ] Tests cover: backend simulation math correctness, REST controller API endpoints, and frontend proportional allocation slider hook.

## Blocked by

None - can start immediately.
