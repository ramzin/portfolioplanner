import { describe, it, expect } from 'vitest';
import { generateMarkdownReport, type ReportGeneratorInput } from '../utils/reportGenerator';

const baseMockInput: ReportGeneratorInput = {
  currentAge: 30,
  retirementAge: 35,
  initialNetWorth: 1000000,
  monthlySalary: 5000,
  monthlyExpenses: 3000,
  allocation: { equity: 50, bond: 30, cash: 20 },
  equityYield: 6.0,
  bondYield: 2.0,
  cashYield: 1.5,
  bondQuarterlyWithdrawal: 5000,
  dcaMonthlyAmount: 2000,
  targetEquityRatio: 80,
  emergencyFund: 10000,
  minimumBondAmount: 20000,
  bondIncomeStrategy: 'ACCUMULATE_CASH',
  cashAllocationStrategy: 'ACCUMULATE_CASH',
  abgeltungsteuer: 26.375,
  sparerpauschbetrag: 1000,
  basiszins: 2.29,
  dcaSchedule: [],
  bondWithdrawalSchedule: [],
  timeline: [
    {
      month: 0,
      date: '2026-06-01',
      age: 30,
      equityBalance: 500000,
      bondBalance: 300000,
      cashBalance: 200000,
      netWorth: 1000000,
      equityRatioPercent: 50,
      taxPaidThisYear: 0,
      events: ['Simulation initialized.'],
      equityEvents: [{ amount: 500000, type: 'Initial allocation' }],
      bondEvents: [{ amount: 300000, type: 'Initial allocation' }],
      cashEvents: [{ amount: 200000, type: 'Initial allocation' }],
    },
    {
      month: 1,
      date: '2026-07-01',
      age: 30.0833,
      equityBalance: 502000,
      bondBalance: 300000,
      cashBalance: 201000,
      netWorth: 1003000,
      equityRatioPercent: 50.05,
      taxPaidThisYear: 100,
      events: ['Normal growth month.'],
    },
    {
      month: 6,
      date: '2026-12-01',
      age: 30.5,
      equityBalance: 512000,
      bondBalance: 300000,
      cashBalance: 206000,
      netWorth: 1018000,
      equityRatioPercent: 50.29,
      taxPaidThisYear: 600,
      events: ['Year-end tax simulation reset.'],
    },
  ],
  alerts: [
    {
      month: 1,
      type: 'EMERGENCY_FUND_LIMIT',
      message: 'Cash reached Emergency Fund limit.',
    },
  ],
  monthsToTarget: 24,
  millionMarks: [
    { age: 30, value: '€1M', netWorth: 1000000 },
  ],
  exportFormatOption: 'FULL',
};

describe('reportGenerator', () => {
  it('should return empty string when timeline is empty', () => {
    const report = generateMarkdownReport({
      ...baseMockInput,
      timeline: [],
    });
    expect(report).toBe('');
  });

  it('should generate full report with correct executive summary', () => {
    const report = generateMarkdownReport(baseMockInput);
    expect(report).toContain('# Portfolio Planning Strategy & Simulation Report');
    expect(report).toContain('Age 30 to 35');
    expect(report).toContain('€1,000,000.00');
    expect(report).toContain('€1,018,000.00');
    expect(report).toContain('Total Tax Paid:** €600.00'); // Sum of month 0 (0) and month 1 (100) and month 6 (500 diff)
    expect(report).toContain('Target Equity Ratio (80%):** June 2028 (Month 24, Age 32.0)');
  });

  it('should filter logs for MILESTONES only mode', () => {
    const report = generateMarkdownReport({
      ...baseMockInput,
      exportFormatOption: 'MILESTONES',
    });
    // Month 0 (initial) should be included
    expect(report).toContain('Month 0');
    // Month 1 (has alert) should be included
    expect(report).toContain('Month 1');
    // Month 6 is not initial, not final, has no alert, not million mark month (which was at age 30, i.e., month 0), and has no warning key events.
    expect(report).not.toContain('Month 6 - Dec 2026');
  });

  it('should include year end summaries in YEARLY mode', () => {
    const report = generateMarkdownReport({
      ...baseMockInput,
      exportFormatOption: 'YEARLY',
    });
    // Month 0 is milestone (initial) - included
    expect(report).toContain('Month 0');
    // Month 1 is milestone (alert) - included
    expect(report).toContain('Month 1');
    // Month 6 is December, so it should be included as a Year-End Summary
    expect(report).toContain('Year-End Summary: 2026');
  });
});
