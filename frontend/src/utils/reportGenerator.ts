export interface ReportGeneratorInput {
  currentAge: number;
  retirementAge: number;
  initialNetWorth: number;
  monthlySalary: number;
  monthlyExpenses: number;
  allocation: {
    equity: number;
    bond: number;
    cash: number;
  };
  equityYield: number;
  bondYield: number;
  cashYield: number;
  bondQuarterlyWithdrawal: number;
  dcaMonthlyAmount: number;
  targetEquityRatio: number;
  emergencyFund: number;
  minimumBondAmount: number;
  bondIncomeStrategy: string;
  cashAllocationStrategy: string;
  abgeltungsteuer: number;
  sparerpauschbetrag: number;
  basiszins: number;
  dcaSchedule: Array<{ startMonth: number; dcaAmount: number }>;
  bondWithdrawalSchedule: Array<{ startMonth: number; dcaAmount: number }>;
  timeline: any[];
  alerts: any[];
  monthsToTarget: number;
  millionMarks: Array<{ age: number; value: string; netWorth: number }>;
  exportFormatOption: 'FULL' | 'MILESTONES' | 'YEARLY';
}

export function generateMarkdownReport(input: ReportGeneratorInput): string {
  const {
    currentAge,
    retirementAge,
    initialNetWorth,
    monthlySalary,
    monthlyExpenses,
    allocation,
    equityYield,
    bondYield,
    cashYield,
    bondQuarterlyWithdrawal,
    dcaMonthlyAmount,
    targetEquityRatio,
    emergencyFund,
    minimumBondAmount,
    bondIncomeStrategy,
    cashAllocationStrategy,
    abgeltungsteuer,
    sparerpauschbetrag,
    basiszins,
    dcaSchedule,
    bondWithdrawalSchedule,
    timeline,
    alerts,
    monthsToTarget,
    millionMarks,
    exportFormatOption,
  } = input;

  if (timeline.length === 0) return '';

  const formatMoney = (val: number) => {
    return '€' + Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const finalPoint = timeline[timeline.length - 1];
  const finalNetWorth = finalPoint ? finalPoint.netWorth : 0;

  // Calculate total tax paid over simulation
  let totalTaxPaid = 0;
  for (let i = 0; i < timeline.length; i++) {
    const pt = timeline[i];
    if (i === 0) {
      totalTaxPaid += pt.taxPaidThisYear;
    } else {
      const prevPt = timeline[i - 1];
      const isJan = new Date(pt.date).getMonth() === 0;
      if (isJan) {
        totalTaxPaid += pt.taxPaidThisYear;
      } else {
        totalTaxPaid += Math.max(0, pt.taxPaidThisYear - prevPt.taxPaidThisYear);
      }
    }
  }

  // Find first months of key events/alerts
  const firstBondFloorReachedMonth = alerts.find(a => a.type === 'MINIMUM_BOND_LIMIT')?.month ?? -1;
  const firstEmergencyFundLimitMonth = alerts.find(a => a.type === 'EMERGENCY_FUND_LIMIT')?.month ?? -1;
  const firstBondLimitReachedMonth = alerts.find(a => a.type === 'BOND_LIQUIDATION')?.month ?? -1;
  const firstTargetReachedMonth = monthsToTarget >= 0 ? monthsToTarget : -1;
  const millionMarkMonths = millionMarks.map(m => Math.round((m.age - currentAge) * 12));

  let markdown = '';
  markdown += `# Portfolio Planning Strategy & Simulation Report\n`;
  markdown += `Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;

  markdown += `## 1. Executive Summary\n`;
  markdown += `* **Simulation Period:** Age ${currentAge} to ${retirementAge} (${retirementAge - currentAge} years / ${timeline.length} months)\n`;
  markdown += `* **Initial Net Worth:** ${formatMoney(initialNetWorth)}\n`;
  markdown += `* **Final Net Worth:** ${formatMoney(finalNetWorth)}\n`;
  markdown += `* **Total Net Growth:** ${formatMoney(finalNetWorth - initialNetWorth)}\n`;
  markdown += `* **Total Tax Paid:** ${formatMoney(totalTaxPaid)}\n`;
  
  let targetText = "Not Reached";
  if (monthsToTarget >= 0) {
    const targetDate = new Date(2026, 5, 1);
    targetDate.setMonth(targetDate.getMonth() + monthsToTarget);
    targetText = `${targetDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })} (Month ${monthsToTarget}, Age ${(currentAge + monthsToTarget / 12).toFixed(1)})`;
  }
  markdown += `* **Target Equity Ratio (${targetEquityRatio}%):** ${targetText}\n\n`;

  markdown += `## 2. Input Configurations & Strategy Parameters\n`;
  markdown += `### Initial Portfolio & Savings\n`;
  markdown += `* **Initial Net Worth:** ${formatMoney(initialNetWorth)}\n`;
  markdown += `* **Initial Asset Allocation:**\n`;
  markdown += `  - Equity: ${allocation.equity}% (${formatMoney(initialNetWorth * allocation.equity / 100)})\n`;
  markdown += `  - Bonds: ${allocation.bond}% (${formatMoney(initialNetWorth * allocation.bond / 100)})\n`;
  markdown += `  - Cash: ${allocation.cash}% (${formatMoney(initialNetWorth * allocation.cash / 100)})\n`;
  markdown += `* **Monthly Income (Net Salary):** ${formatMoney(monthlySalary)}\n`;
  markdown += `* **Monthly Living Expenses:** ${formatMoney(monthlyExpenses)}\n`;
  markdown += `* **Net Monthly Savings Potential:** ${formatMoney(monthlySalary - monthlyExpenses)}\n\n`;

  markdown += `### Target Yields (Annual)\n`;
  markdown += `* **Equity Yield:** ${equityYield}% p.a.\n`;
  markdown += `* **Bond Yield (Coupons/Principal):** ${bondYield}% p.a.\n`;
  markdown += `* **Cash Yield (Interest):** ${cashYield}% p.a.\n\n`;

  markdown += `### DCA Transition & Post-Target Rules\n`;
  markdown += `* **Standard Monthly DCA Transition:** ${formatMoney(dcaMonthlyAmount)}/month\n`;
  markdown += `* **Target Equity Ratio:** ${targetEquityRatio}%\n`;
  markdown += `* **Emergency Fund Floor:** ${formatMoney(emergencyFund)}\n`;
  markdown += `* **Minimum Bond Balance Floor:** ${formatMoney(minimumBondAmount)}\n`;
  markdown += `* **Cash Allocation Strategy (Post-Target):** ${cashAllocationStrategy}\n`;
  markdown += `* **Bond Income Strategy (Post-Target):** ${bondIncomeStrategy}\n\n`;

  markdown += `### German Tax Parameters\n`;
  markdown += `* **Abgeltungsteuer (Flat Capital Gains Tax):** ${abgeltungsteuer}%\n`;
  markdown += `* **Sparerpauschbetrag (Tax-Free Allowance):** ${formatMoney(sparerpauschbetrag)}/year\n`;
  markdown += `* **Basiszins (Advance Tax Base Rate):** ${basiszins}%\n`;
  markdown += `* **Vorabpauschale Partial Exemption (Teilfreistellung):** 30% (automatically applied to Equity accumulating funds)\n\n`;

  markdown += `### Schedule Adjustments\n`;
  markdown += `* **Standard Bond Quarterly Withdrawal:** ${formatMoney(bondQuarterlyWithdrawal)}\n`;
  markdown += `* **DCA Schedule Adjustments:**\n`;
  if (dcaSchedule.length === 0) {
    markdown += `  - None (Used standard DCA of ${formatMoney(dcaMonthlyAmount)} throughout)\n`;
  } else {
    dcaSchedule.forEach(s => {
      markdown += `  - From Month ${s.startMonth}: DCA is adjusted to ${formatMoney(s.dcaAmount)}/month\n`;
    });
  }
  markdown += `* **Bond Withdrawal Schedule Adjustments:**\n`;
  if (bondWithdrawalSchedule.length === 0) {
    markdown += `  - None (Used standard quarterly withdrawal throughout)\n`;
  } else {
    bondWithdrawalSchedule.forEach(s => {
      markdown += `  - From Month ${s.startMonth}: Quarterly bond principal withdrawal is adjusted to ${formatMoney(s.dcaAmount)}\n`;
    });
  }
  markdown += `\n`;

  // Filter alerts to only show the first occurrence of each key limit/warning
  const filteredAlerts: any[] = [];
  let seenBondFloor = false;
  let seenEmergency = false;
  let seenBondLimit = false;

  alerts.forEach(a => {
    if (a.type === 'MINIMUM_BOND_LIMIT' && !seenBondFloor) {
      filteredAlerts.push(a);
      seenBondFloor = true;
    } else if (a.type === 'EMERGENCY_FUND_LIMIT' && !seenEmergency) {
      filteredAlerts.push(a);
      seenEmergency = true;
    } else if (a.type === 'BOND_LIQUIDATION' && !seenBondLimit) {
      filteredAlerts.push(a);
      seenBondLimit = true;
    }
  });

  markdown += `## 3. Simulation Warnings & Alerts\n`;
  if (filteredAlerts.length === 0) {
    markdown += `No critical events or limits (such as emergency fund drawdowns or minimum bond depletion) were breached during the simulation.\n\n`;
  } else {
    markdown += `The following regulatory or threshold events occurred during the simulation:\n`;
    filteredAlerts.forEach(a => {
      const pt = timeline.find(p => p.month === a.month);
      const ageStr = pt ? ` (Age ${pt.age.toFixed(1)})` : '';
      markdown += `* **Month ${a.month}${ageStr} [${a.type}]:** ${a.message}\n`;
    });
    markdown += `\n`;
  }

  markdown += `## 4. Milestone Marks\n`;
  if (millionMarks.length === 0) {
    markdown += `No €1M net worth milestones were reached in this simulation.\n\n`;
  } else {
    markdown += `Age at which net worth milestones were crossed:\n`;
    millionMarks.forEach(m => {
      markdown += `* **${m.value} Net Worth:** Reached at Age ${m.age.toFixed(1)} (${formatMoney(m.netWorth)})\n`;
    });
    markdown += `\n`;
  }

  markdown += `## 5. Simulation Trace Logs (Detail Level: ${
    exportFormatOption === 'FULL' ? 'Full Chronological' :
    exportFormatOption === 'MILESTONES' ? 'Milestones & Alerts Only' :
    'Yearly Summary + Event Months'
  })\n`;

  // Filter points based on format option
  const isMilestonePoint = (pt: any) => {
    if (pt.month === 0) return true;
    if (pt.month === timeline.length - 1) return true;
    if (pt.month === firstTargetReachedMonth) return true;
    if (pt.month === firstBondFloorReachedMonth) return true;
    if (pt.month === firstEmergencyFundLimitMonth) return true;
    if (pt.month === firstBondLimitReachedMonth) return true;
    if (millionMarkMonths.includes(pt.month)) return true;
    return false;
  };

  timeline.forEach(pt => {
    const isMilestone = isMilestonePoint(pt);
    const isDec = new Date(pt.date).getMonth() === 11;

    let shouldInclude = false;
    let isYearEndSummaryOnly = false;

    if (exportFormatOption === 'FULL') {
      shouldInclude = true;
    } else if (exportFormatOption === 'MILESTONES') {
      shouldInclude = isMilestone;
    } else if (exportFormatOption === 'YEARLY') {
      if (isMilestone) {
        shouldInclude = true;
      } else if (isDec) {
        shouldInclude = true;
        isYearEndSummaryOnly = true;
      }
    }

    if (!shouldInclude) return;

    const dateObj = new Date(pt.date);
    const dateFormatted = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

    if (isYearEndSummaryOnly) {
      markdown += `### 📅 Year-End Summary: ${dateObj.getFullYear()} (Month ${pt.month}, Age: ${pt.age.toFixed(1)})\n`;
    } else {
      const titlePrefix = isMilestone ? '⭐ Milestone: ' : '';
      markdown += `### ${titlePrefix}Month ${pt.month} - ${dateFormatted} (Age: ${pt.age.toFixed(2)})\n`;
    }

    markdown += `* **Net Worth:** ${formatMoney(pt.netWorth)} (Equity Ratio: ${pt.equityRatioPercent.toFixed(1)}%)\n`;
    markdown += `* **Asset Balances:**\n`;
    markdown += `  - Equity: ${formatMoney(pt.equityBalance)}\n`;
    markdown += `  - Bonds: ${formatMoney(pt.bondBalance)}\n`;
    markdown += `  - Cash: ${formatMoney(pt.cashBalance)}\n`;
    markdown += `* **Tax Paid (Year-to-Date):** ${formatMoney(pt.taxPaidThisYear)}\n`;

    if (!isYearEndSummaryOnly) {
      const customEvents: string[] = [];

      if (pt.month === firstTargetReachedMonth && firstTargetReachedMonth >= 0) {
        customEvents.push(`Target Equity Ratio Reached: Equity ratio reached target of ${targetEquityRatio}%`);
      }
      if (pt.month === firstBondFloorReachedMonth && firstBondFloorReachedMonth >= 0) {
        customEvents.push(`Minimum Bond Floor Reached: Bond balance reached minimum floor of ${formatMoney(minimumBondAmount)}`);
      }
      if (pt.month === firstEmergencyFundLimitMonth && firstEmergencyFundLimitMonth >= 0) {
        customEvents.push(`Emergency Fund Limit Reached: Cash balance reached emergency fund floor of ${formatMoney(emergencyFund)}`);
      }
      if (pt.month === firstBondLimitReachedMonth && firstBondLimitReachedMonth >= 0) {
        customEvents.push(`Bond Principal Liquidation Started: Cash reserves depleted; liquidating bond principal to fund DCA`);
      }

      const matchingMarks = millionMarks.filter(mark => Math.round((mark.age - currentAge) * 12) === pt.month);
      matchingMarks.forEach(mark => {
        customEvents.push(`⭐ Net Worth Milestone Reached: Crossed ${mark.value} (${formatMoney(mark.netWorth)})`);
      });

      if (customEvents.length > 0) {
        markdown += `* **Events:**\n`;
        customEvents.forEach((e: string) => {
          markdown += `  - ${e}\n`;
        });
      }
      
      // Output detailed ledgers if present
      const ledgerDetails: string[] = [];
      if (pt.equityEvents && pt.equityEvents.length > 0) {
        ledgerDetails.push(`  - **Equity Ledger:**\n` + pt.equityEvents.map((e: any) => `    * ${e.type}: ${formatMoney(e.amount)}`).join('\n'));
      }
      if (pt.bondEvents && pt.bondEvents.length > 0) {
        ledgerDetails.push(`  - **Bond Ledger:**\n` + pt.bondEvents.map((e: any) => `    * ${e.type}: ${formatMoney(e.amount)}`).join('\n'));
      }
      if (pt.cashEvents && pt.cashEvents.length > 0) {
        ledgerDetails.push(`  - **Cash Ledger:**\n` + pt.cashEvents.map((e: any) => `    * ${e.type}: ${formatMoney(e.amount)}`).join('\n'));
      }
      if (ledgerDetails.length > 0) {
        markdown += `* **Ledger Entries:**\n` + ledgerDetails.join('\n') + `\n`;
      }
    }
    markdown += `\n`;
  });

  return markdown;
}
