import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { TrendingUp, Award, DollarSign, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { usePercentageAllocation } from './hooks/usePercentageAllocation';
import './App.css';

interface TimelinePoint {
  month: number;
  date: string;
  age: number;
  cashBalance: number;
  bondBalance: number;
  equityBalance: number;
  netWorth: number;
  equityRatioPercent: number;
  taxPaidThisYear: number;
}

interface DcaScheduleSegment {
  startMonth: number;
  dcaAmount: number;
}

interface SimulationAlert {
  month: number;
  type: 'CASH_DEPLETION' | 'BOND_LIQUIDATION';
  message: string;
}

interface ApiResponse {
  monthsToTarget: number;
  timeline: TimelinePoint[];
  alerts: SimulationAlert[];
}

const cleanAndFormat = (valStr: string) => {
  // Strip all non-digit and non-dot characters
  let cleaned = valStr.replace(/[^0-9.]/g, '');
  
  // Only allow a single decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Format the integer part with commas
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex !== -1) {
    const integerPart = cleaned.slice(0, dotIndex);
    const decimalPart = cleaned.slice(dotIndex + 1);
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return formattedInteger + '.' + decimalPart;
  } else {
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
};

const FormattedNumberInput = ({
  value,
  onChange,
  min = 0,
  max = 100000000,
}: {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}) => {
  const [localStr, setLocalStr] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);

  // Sync with value prop when NOT focused
  useEffect(() => {
    if (!focused) {
      setLocalStr(Intl.NumberFormat('en-US', { maximumFractionDigits: 10 }).format(value));
    }
  }, [value, focused]);

  useLayoutEffect(() => {
    if (focused && inputRef.current && cursorRef.current !== null) {
      inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
      cursorRef.current = null;
    }
  }, [localStr, focused]);

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(localStr.replace(/,/g, ''));
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
      setLocalStr(Intl.NumberFormat('en-US', { maximumFractionDigits: 10 }).format(clamped));
    } else {
      setLocalStr(Intl.NumberFormat('en-US', { maximumFractionDigits: 10 }).format(value));
    }
  };

  const handleFocus = () => {
    setFocused(true);
    setLocalStr(Intl.NumberFormat('en-US', { maximumFractionDigits: 10 }).format(value));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const val = target.value;
    const selStart = target.selectionStart || 0;

    // Count non-comma characters before selection
    const nonCommasBefore = val.slice(0, selStart).replace(/,/g, '').length;

    // Format new value
    const formatted = cleanAndFormat(val);

    // Find new cursor position
    let newCursorPos = 0;
    let nonCommaCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (nonCommaCount === nonCommasBefore) {
        newCursorPos = i;
        break;
      }
      if (formatted[i] !== ',') {
        nonCommaCount++;
      }
    }
    if (nonCommaCount < nonCommasBefore) {
      newCursorPos = formatted.length;
    }

    cursorRef.current = newCursorPos;
    setLocalStr(formatted);

    // Call onChange with parsed value, but clamp only on blur to allow typing incomplete/temporary states
    const parsed = parseFloat(formatted.replace(/,/g, ''));
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      className="number-input"
      value={localStr}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TimelinePoint;
    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });

    return (
      <div className="custom-tooltip">
        <p className="tooltip-title">{formattedDate} (Month {data.month})</p>
        <p className="tooltip-row age">Age: {data.age.toFixed(1)}</p>
        <p className="tooltip-row equity">
          <span>Equity:</span>
          <strong>{Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(data.equityBalance)}</strong>
        </p>
        <p className="tooltip-row bond">
          <span>Bonds:</span>
          <strong>{Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(data.bondBalance)}</strong>
        </p>
        <p className="tooltip-row cash">
          <span>Cash:</span>
          <strong>{Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(data.cashBalance)}</strong>
        </p>
        <p className="tooltip-row total">
          <span>Net Worth:</span>
          <strong>{Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(data.netWorth)}</strong>
        </p>
        <p className="tooltip-row ratio" style={{ color: 'var(--accent-primary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
          <span>Equity Ratio:</span>
          <strong>{data.equityRatioPercent.toFixed(2)}%</strong>
        </p>
      </div>
    );
  }
  return null;
};

export default function App() {
  // Input fields state
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(60);
  const [initialNetWorth, setInitialNetWorth] = useState(1500000);
  const [monthlySalary, setMonthlySalary] = useState(8500);
  const [monthlyExpenses, setMonthlyExpenses] = useState(3500);

  // Yield rates (percentages p.a.)
  const [equityYield, setEquityYield] = useState(7.0);
  const [bondYield, setBondYield] = useState(4.0);
  const [cashYield, setCashYield] = useState(2.5);
  const [bondQuarterlyWithdrawal, setBondQuarterlyWithdrawal] = useState(10000);

  // DCA & Transition settings
  const [dcaMonthlyAmount, setDcaMonthlyAmount] = useState(5000);
  const [targetEquityRatio, setTargetEquityRatio] = useState(70);
  const [postTargetStrategy, setPostTargetStrategy] = useState<'HOLD_CASH' | 'ALL_EQUITY' | 'PROPORTIONAL_REBALANCE'>('HOLD_CASH');

  // German tax settings
  const [abgeltungsteuer, setAbgeltungsteuer] = useState(26.375);
  const [sparerpauschbetrag, setSparerpauschbetrag] = useState(1000);
  const [basiszins, setBasiszins] = useState(2.29);

  // Hook for asset allocations (summing to 100%)
  const { allocation, setAllocationPercent } = usePercentageAllocation({
    equity: 30,
    bond: 50,
    cash: 20,
  });

  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [monthsToTarget, setMonthsToTarget] = useState<number>(-1);
  const [dcaSchedule, setDcaSchedule] = useState<DcaScheduleSegment[]>([]);
  const [alerts, setAlerts] = useState<SimulationAlert[]>([]);
  const [newSegMonth, setNewSegMonth] = useState(12);
  const [newSegAmount, setNewSegAmount] = useState(2000);
  const [backendStatus, setBackendStatus] = useState<'CONNECTED' | 'OFFLINE'>('OFFLINE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Perform Simulation
  useEffect(() => {
    const requestPayload = {
      currentAge,
      retirementAge,
      initialNetWorth,
      monthlySalary,
      monthlyExpenses,
      allocation: {
        equityPercentage: allocation.equity,
        bondPercentage: allocation.bond,
        cashPercentage: allocation.cash,
        equityYieldPercent: equityYield,
        bondYieldPercent: bondYield,
        cashYieldPercent: cashYield,
      },
      abgeltungsteuerPercent: abgeltungsteuer,
      sparerpauschbetrag: sparerpauschbetrag,
      basiszinsPercent: basiszins,
      bondQuarterlyWithdrawal: bondQuarterlyWithdrawal,
      dcaMonthlyAmount: dcaMonthlyAmount,
      targetEquityRatioPercent: targetEquityRatio,
      dcaSchedule: dcaSchedule.length > 0 ? dcaSchedule : undefined,
      postTargetStrategy: postTargetStrategy,
    };

    let active = true;

    async function runSim() {
      try {
        setErrorMsg(null);
        const res = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Simulation failed on the server.');
        }

        const data: ApiResponse = await res.json();
        if (active) {
          setTimeline(data.timeline);
          setMonthsToTarget(data.monthsToTarget);
          setAlerts(data.alerts || []);
          setBackendStatus('CONNECTED');
        }
      } catch (err: any) {
        console.warn('API error, executing client-side fallback simulation:', err.message);
        if (active) {
          setBackendStatus('OFFLINE');
          runLocalSimulation();
        }
      }
    }

    // Local JS Simulation Fallback
    function runLocalSimulation() {
      const totalMonths = (retirementAge - currentAge) * 12;
      const localTimeline: TimelinePoint[] = [];

      const eqPct = allocation.equity / 100;
      const bondPct = allocation.bond / 100;
      const cashPct = allocation.cash / 100;

      const eqMonthlyYield = equityYield / 100 / 12;
      const cashMonthlyYield = cashYield / 100 / 12;

      let equity = initialNetWorth * eqPct;
      let bond = initialNetWorth * bondPct;
      let cash = initialNetWorth * cashPct;

      let remainingAllowance = sparerpauschbetrag;
      let taxPaidThisYear = 0;

      let equityStartOfYear = equity;
      let monthsHeldThisYear = 1;
      let yearlyDcaInvested = 0;

      const initialNetWorthVal = equity + bond + cash;
      const initialRatioVal = initialNetWorthVal === 0 ? 0 : (equity / initialNetWorthVal) * 100;
      let targetReached = initialRatioVal >= targetEquityRatio;
      let monthsToTargetVal = targetReached ? 0 : -1;

      const localAlerts: SimulationAlert[] = [];
      let cashDepletionAlerted = false;
      let bondLiquidationAlerted = false;

      const start = new Date(2026, 5, 1); // June 1, 2026

      for (let m = 0; m <= totalMonths; m++) {
        const currentDate = new Date(start);
        currentDate.setMonth(start.getMonth() + m);
        const dateStr = currentDate.toISOString().split('T')[0];

        // Calendar year reset check on Jan 1st
        if (m > 0 && currentDate.getMonth() === 0) {
          // Calculate Vorabpauschale
          const basiszinsRate = basiszins / 100;
          const basisertrag = equityStartOfYear * 0.70 * basiszinsRate;
          const scaledBasisertrag = basisertrag * monthsHeldThisYear / 12;
          const actualGain = Math.max(0, equity - equityStartOfYear - yearlyDcaInvested);
          const vorabpauschale = Math.min(scaledBasisertrag, actualGain);
          const taxableVorabpauschale = vorabpauschale * 0.70;

          // Allowance reset for the new year
          remainingAllowance = sparerpauschbetrag;
          taxPaidThisYear = 0;

          const taxableExcess = Math.max(0, taxableVorabpauschale - remainingAllowance);
          const consumedAllowance = Math.min(taxableVorabpauschale, remainingAllowance);
          remainingAllowance -= consumedAllowance;

          const vorabTax = taxableExcess * (abgeltungsteuer / 100);
          taxPaidThisYear += vorabTax;
          cash -= vorabTax;

          // Reset year trackers
          equityStartOfYear = equity;
          monthsHeldThisYear = 0;
          yearlyDcaInvested = 0;
        }

        const age = currentAge + m / 12;
        const netWorth = equity + bond + cash;
        const ratio = netWorth === 0 ? 0 : (equity / netWorth) * 100;

        localTimeline.push({
          month: m,
          date: dateStr,
          age,
          equityBalance: equity,
          bondBalance: bond,
          cashBalance: cash,
          netWorth,
          equityRatioPercent: ratio,
          taxPaidThisYear,
        });

        monthsHeldThisYear++;

        // Calculate next month's states
        if (m < totalMonths) {
          const nextM = m + 1;
          const eqGrowth = equity * eqMonthlyYield;
          const cashGrowth = cash * cashMonthlyYield;

          // Tax calculations
          const taxRate = abgeltungsteuer / 100;
          let cashTax = 0;
          if (cashGrowth > 0) {
            const taxable = Math.max(0, cashGrowth - remainingAllowance);
            const consumed = Math.min(cashGrowth, remainingAllowance);
            remainingAllowance -= consumed;
            cashTax = taxable * taxRate;
          }

          taxPaidThisYear += cashTax;

          // Bond Quarterly Maturity & Coupon (every 3 months)
          let bondQuarterlyCashInflow = 0;
          if (nextM > 0 && nextM % 3 === 0) {
            const bondYieldRate = bondYield / 100;
            const quarterlyYield = bondYieldRate / 4;
            const coupon = bond * quarterlyYield;

            // Tax on coupon (100% taxable, no partial exemption)
            let couponTax = 0;
            if (coupon > 0) {
              const taxable = Math.max(0, coupon - remainingAllowance);
              const consumed = Math.min(coupon, remainingAllowance);
              remainingAllowance -= consumed;
              couponTax = taxable * taxRate;
            }
            taxPaidThisYear += couponTax;

            const matured = bond / 3;
            const w = targetReached ? 0 : bondQuarterlyWithdrawal;

            if (w < coupon) {
              // Case A: Withdrawal goal is smaller than coupon
              const excessCoupon = coupon - w;
              bond += excessCoupon;
              bondQuarterlyCashInflow = w - couponTax;
            } else {
              // Case B: Withdrawal goal is >= coupon
              const remainder = w - coupon;
              const withdrawalFromMatured = Math.min(remainder, matured);
              bond -= withdrawalFromMatured;
              bondQuarterlyCashInflow = coupon + withdrawalFromMatured - couponTax;
            }
          }

          const savings = monthlySalary - monthlyExpenses;

          if (targetReached) {
            // Cash compounds interest and bond coupon yields compound, savings allocated based on strategy
            cash += cashGrowth - cashTax + bondQuarterlyCashInflow;
            if (postTargetStrategy === 'HOLD_CASH') {
              cash += savings;
            } else if (postTargetStrategy === 'ALL_EQUITY') {
              equity += savings;
              yearlyDcaInvested += savings;
            } else if (postTargetStrategy === 'PROPORTIONAL_REBALANCE') {
              const eqShare = savings * (targetEquityRatio / 100);
              const cashShare = savings - eqShare;
              cash += cashShare;
              equity += eqShare;
              yearlyDcaInvested += eqShare;
            }
          } else {
            // Pre-target: savings go to cash
            cash += cashGrowth - cashTax + bondQuarterlyCashInflow + savings;
          }

          equity += eqGrowth;

          // Monthly DCA Transfer & hierarchy (Cash -> Bonds -> Equity)
          let dca = dcaMonthlyAmount;
          if (dcaSchedule.length > 0) {
            const activeSegment = dcaSchedule
              .filter((s) => s.startMonth <= nextM)
              .reduce((max, s) => (max.startMonth === -1 || s.startMonth > max.startMonth ? s : max), { startMonth: -1, dcaAmount: dcaMonthlyAmount });
            if (activeSegment.startMonth >= 0) {
              dca = activeSegment.dcaAmount;
            }
          }

          let actualDca = 0;
          if (dca > 0) {
            if (cash >= dca) {
              cash -= dca;
              equity += dca;
              actualDca = dca;
            } else {
              const cashDrawn = cash;
              cash = 0;
              const remainingNeeded = dca - cashDrawn;

              if (!cashDepletionAlerted) {
                localAlerts.push({
                  month: nextM,
                  type: 'CASH_DEPLETION',
                  message: `Cash depleted at Month ${nextM}`,
                });
                cashDepletionAlerted = true;
              }

              const bondLiquidated = Math.min(remainingNeeded, bond);
              if (bondLiquidated > 0) {
                if (!bondLiquidationAlerted) {
                  localAlerts.push({
                    month: nextM,
                    type: 'BOND_LIQUIDATION',
                    message: `Bond liquidation started at Month ${nextM}`,
                  });
                  bondLiquidationAlerted = true;
                }
              }

              bond -= bondLiquidated;
              equity += cashDrawn + bondLiquidated;
              actualDca = cashDrawn + bondLiquidated;
            }
          }
          yearlyDcaInvested += actualDca;

          // Check target ratio
          const nextNetWorth = equity + bond + cash;
          const nextRatio = nextNetWorth === 0 ? 0 : (equity / nextNetWorth) * 100;
          if (!targetReached && nextRatio >= targetEquityRatio) {
            targetReached = true;
            monthsToTargetVal = nextM;
          }
        }
      }

      setTimeline(localTimeline);
      setMonthsToTarget(monthsToTargetVal);
      setAlerts(localAlerts);
    }

    runSim();

    return () => {
      active = false;
    };
  }, [
    currentAge,
    retirementAge,
    initialNetWorth,
    monthlySalary,
    monthlyExpenses,
    allocation,
    equityYield,
    bondYield,
    cashYield,
    abgeltungsteuer,
    sparerpauschbetrag,
    basiszins,
    bondQuarterlyWithdrawal,
    dcaMonthlyAmount,
    targetEquityRatio,
    dcaSchedule,
    postTargetStrategy,
  ]);

  const finalPoint = timeline[timeline.length - 1];
  const finalNetWorth = finalPoint ? finalPoint.netWorth : 0;
  const finalEquityRatio = finalPoint ? finalPoint.equityRatioPercent : 0;

  const addScheduleSegment = (month: number, amount: number) => {
    if (month < 1) return;
    if (dcaSchedule.some((s) => s.startMonth === month)) {
      return;
    }
    const newSchedule = [...dcaSchedule, { startMonth: month, dcaAmount: amount }].sort((a, b) => a.startMonth - b.startMonth);
    setDcaSchedule(newSchedule);
  };

  const removeScheduleSegment = (month: number) => {
    setDcaSchedule(dcaSchedule.filter((s) => s.startMonth !== month));
  };

  let targetStatusText = "Not Reached";
  let targetSubtext = "Equity ratio remains below target";
  if (monthsToTarget >= 0) {
    const targetDate = new Date(2026, 5, 1);
    targetDate.setMonth(targetDate.getMonth() + monthsToTarget);
    targetStatusText = targetDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    targetSubtext = `Reached at Month ${monthsToTarget} (Age ${(currentAge + monthsToTarget / 12).toFixed(1)})`;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="app-brand">Antigravity Suite</span>
            <h1 className="app-title">Wealth Accumulation & Asset Transition</h1>
          </div>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              background: backendStatus === 'CONNECTED' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: backendStatus === 'CONNECTED' ? '#34d399' : '#f87171',
              border: `1px solid ${backendStatus === 'CONNECTED' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}
          >
            {backendStatus === 'CONNECTED' ? 'Backend Engine Connected' : 'Offline Client Mode'}
          </div>
        </div>
      </header>

      {errorMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '14px' }}>
          {errorMsg}
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="dashboard-grid">
        {/* Left Inputs Sidebar */}
        <aside className="input-sidebar">
          {/* General Settings */}
          <div className="glass-panel input-card">
            <h2 className="card-title">
              <TrendingUp size={18} /> General Config
            </h2>
            <div className="input-group">
              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label">Current Age</span>
                  <FormattedNumberInput value={currentAge} onChange={setCurrentAge} min={18} max={99} />
                </div>
                <input
                  type="range"
                  min="18"
                  max="99"
                  value={currentAge}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setCurrentAge(val);
                    if (val >= retirementAge) setRetirementAge(val + 1);
                  }}
                />
              </div>

              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label">Retirement Age (Simulation End)</span>
                  <FormattedNumberInput value={retirementAge} onChange={setRetirementAge} min={currentAge + 1} max={100} />
                </div>
                <input
                  type="range"
                  min={currentAge + 1}
                  max="100"
                  value={retirementAge}
                  onChange={(e) => setRetirementAge(parseInt(e.target.value))}
                />
              </div>

              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label">Initial Net Worth (€)</span>
                  <FormattedNumberInput value={initialNetWorth} onChange={setInitialNetWorth} min={1000} max={100000000} />
                </div>
              </div>

              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label">Monthly Salary (€)</span>
                  <FormattedNumberInput value={monthlySalary} onChange={setMonthlySalary} min={0} max={1000000} />
                </div>
              </div>

              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label">Monthly Expenses (€)</span>
                  <FormattedNumberInput value={monthlyExpenses} onChange={setMonthlyExpenses} min={0} max={monthlySalary} />
                </div>
              </div>
            </div>
          </div>

          {/* Allocation Settings */}
          <div className="glass-panel input-card">
            <h2 className="card-title">
              <Award size={18} /> Asset Allocations (Total 100%)
            </h2>
            <div className="input-group">
              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label" style={{ color: 'var(--equity-color)' }}>Equity (%)</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{allocation.equity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={allocation.equity}
                  onChange={(e) => setAllocationPercent('equity', parseInt(e.target.value))}
                />
              </div>

              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label" style={{ color: 'var(--bond-color)' }}>Bonds (%)</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{allocation.bond}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={allocation.bond}
                  onChange={(e) => setAllocationPercent('bond', parseInt(e.target.value))}
                />
              </div>

              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label" style={{ color: 'var(--cash-color)' }}>Cash (%)</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{allocation.cash}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={allocation.cash}
                  onChange={(e) => setAllocationPercent('cash', parseInt(e.target.value))}
                />
              </div>

              <div className="allocation-indicators">
                <div className="alloc-badge equity">
                  <span>Equity</span>
                  <span className="alloc-badge-value">{allocation.equity}%</span>
                </div>
                <div className="alloc-badge bond">
                  <span>Bonds</span>
                  <span className="alloc-badge-value">{allocation.bond}%</span>
                </div>
                <div className="alloc-badge cash">
                  <span>Cash</span>
                  <span className="alloc-badge-value">{allocation.cash}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* DCA Transition Settings */}
          <div className="glass-panel input-card">
            <h2 className="card-title">
              <TrendingUp size={18} /> DCA Transition & Schedule
            </h2>
            <div className="input-group">
              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label">Initial DCA Amount (€)</span>
                  <FormattedNumberInput value={dcaMonthlyAmount} onChange={setDcaMonthlyAmount} min={0} max={1000000} />
                </div>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="500"
                  value={dcaMonthlyAmount}
                  onChange={(e) => setDcaMonthlyAmount(parseInt(e.target.value))}
                />
              </div>

              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label">Target Equity Ratio (%)</span>
                  <FormattedNumberInput value={targetEquityRatio} onChange={setTargetEquityRatio} min={0} max={100} />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={targetEquityRatio}
                  onChange={(e) => setTargetEquityRatio(parseInt(e.target.value))}
                />
              </div>

              <div className="input-field-wrapper" style={{ marginTop: '8px' }}>
                <div className="input-label-row">
                  <span className="input-label">Post-Target Strategy</span>
                </div>
                <select
                  value={postTargetStrategy}
                  onChange={(e) => setPostTargetStrategy(e.target.value as any)}
                  className="post-target-select"
                >
                  <option value="HOLD_CASH">Hold Cash (100% Cash)</option>
                  <option value="ALL_EQUITY">All Equity (100% Equity)</option>
                  <option value="PROPORTIONAL_REBALANCE">Proportional Rebalance (Target ratio split)</option>
                </select>
              </div>

              {/* DCA Schedule Editor */}
              <div className="dca-schedule-editor" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '12px' }}>
                <span className="input-label" style={{ display: 'block', marginBottom: '8px' }}>DCA Transition Schedule</span>
                
                {/* Segments List */}
                <div className="schedule-segments-list">
                  <div className="schedule-segment-item">
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Month 0 (Initial)</span>
                    <strong style={{ fontSize: '12px' }}>{Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(dcaMonthlyAmount)}</strong>
                  </div>
                  {dcaSchedule.map((seg) => (
                    <div key={seg.startMonth} className="schedule-segment-item" style={{ borderLeft: '2px solid var(--accent-primary)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Month {seg.startMonth}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '12px' }}>{Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(seg.dcaAmount)}</strong>
                        <button onClick={() => removeScheduleSegment(seg.startMonth)} className="delete-btn">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Segment Form */}
                <div className="add-segment-form">
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Start Month</span>
                    <input
                      type="number"
                      min="1"
                      value={newSegMonth}
                      onChange={(e) => setNewSegMonth(parseInt(e.target.value) || 1)}
                      className="add-segment-input"
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>DCA Amount (€)</span>
                    <input
                      type="number"
                      min="0"
                      value={newSegAmount}
                      onChange={(e) => setNewSegAmount(parseInt(e.target.value) || 0)}
                      className="add-segment-input"
                    />
                  </div>
                  <button
                    onClick={() => addScheduleSegment(newSegMonth, newSegAmount)}
                    className="add-segment-btn"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Yield Rates Settings */}
          <div className="glass-panel input-card">
            <h2 className="card-title">
              <DollarSign size={18} /> Asset Yields (% p.a.)
            </h2>
            <div className="input-group">
              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label">Equity Yield</span>
                  <FormattedNumberInput value={equityYield} onChange={setEquityYield} min={0} max={30} />
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.1"
                  value={equityYield}
                  onChange={(e) => setEquityYield(parseFloat(e.target.value))}
                />
              </div>

              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label">Bond Yield</span>
                  <FormattedNumberInput value={bondYield} onChange={setBondYield} min={0} max={15} />
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.1"
                  value={bondYield}
                  onChange={(e) => setBondYield(parseFloat(e.target.value))}
                />
              </div>

              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label">Cash Yield</span>
                  <FormattedNumberInput value={cashYield} onChange={setCashYield} min={0} max={10} />
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={cashYield}
                  onChange={(e) => setCashYield(parseFloat(e.target.value))}
                />
              </div>

              <div className="input-field-wrapper" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <div className="input-label-row">
                  <span className="input-label">Bond Quarterly Withdrawal (€)</span>
                  <FormattedNumberInput value={bondQuarterlyWithdrawal} onChange={setBondQuarterlyWithdrawal} min={0} max={1000000} />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100000"
                  step="1000"
                  value={bondQuarterlyWithdrawal}
                  onChange={(e) => setBondQuarterlyWithdrawal(parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* German Tax Settings */}
          <div className="glass-panel input-card">
            <h2 className="card-title">
              <TrendingUp size={18} /> German Tax Settings
            </h2>
            <div className="input-group">
              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label">Abgeltungsteuer (%)</span>
                  <FormattedNumberInput value={abgeltungsteuer} onChange={setAbgeltungsteuer} min={0} max={50} />
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="0.005"
                  value={abgeltungsteuer}
                  onChange={(e) => setAbgeltungsteuer(parseFloat(e.target.value))}
                />
              </div>

              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label">Sparerpauschbetrag (€)</span>
                  <FormattedNumberInput value={sparerpauschbetrag} onChange={setSparerpauschbetrag} min={0} max={100000} />
                </div>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={sparerpauschbetrag}
                  onChange={(e) => setSparerpauschbetrag(parseInt(e.target.value))}
                />
              </div>

              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label">Basiszins (% p.a.)</span>
                  <FormattedNumberInput value={basiszins} onChange={setBasiszins} min={0} max={15} />
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.01"
                  value={basiszins}
                  onChange={(e) => setBasiszins(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Right Visualizations Sidebar */}
        <main className="visualization-area">
          {/* Top Metric Cards */}
          <div className="metrics-row">
            <div className="glass-panel metric-card accent">
              <span className="metric-label">Projected Net Worth</span>
              <span className="metric-value">
                {Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(finalNetWorth)}
              </span>
              <span className="metric-subtext">at age {retirementAge} ({retirementAge - currentAge} years)</span>
            </div>

            <div className="glass-panel metric-card">
              <span className="metric-label">Monthly Active Savings</span>
              <span className="metric-value">
                {Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(monthlySalary - monthlyExpenses)}
              </span>
              <span className="metric-subtext">Salary: {Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(monthlySalary)}</span>
            </div>

            <div className="glass-panel metric-card">
              <span className="metric-label">Final Equity Ratio</span>
              <span className="metric-value">{finalEquityRatio.toFixed(1)}%</span>
              <span className="metric-subtext">Target Ratio: {targetEquityRatio}%</span>
            </div>

            <div className="glass-panel metric-card" style={{ borderLeft: monthsToTarget >= 0 ? '4px solid var(--accent-primary)' : 'none' }}>
              <span className="metric-label">Target Equity Ratio Reached</span>
              <span className="metric-value" style={{ fontSize: monthsToTarget >= 0 ? '20px' : '24px', whiteSpace: 'nowrap' }}>
                {targetStatusText}
              </span>
              <span className="metric-subtext">{targetSubtext}</span>
            </div>
          </div>

          {/* Alerts Warning Cards */}
          {alerts.length > 0 && (
            <div className="alerts-warning-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {alerts.map((alert, idx) => {
                if (alert.type === 'CASH_DEPLETION') {
                  const targetDate = new Date(2026, 5, 1);
                  targetDate.setMonth(targetDate.getMonth() + alert.month);
                  const recommendedDca = Math.max(0, monthlySalary - monthlyExpenses);

                  return (
                    <div
                      key={idx}
                      className="glass-panel alert-warning-card cash-depleted"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 600 }}>
                          <AlertTriangle size={18} />
                          <span>DCA Step-down Warning: Cash Depletion</span>
                        </div>
                        <p style={{ fontSize: '14px', margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Savings cash reserves are projected to be depleted by <strong>{targetDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</strong> (Month {alert.month}, Age {(currentAge + alert.month / 12).toFixed(1)}). Subsequent DCA transfers will begin liquidating your Bond principal.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Recommended step-down DCA starting Month {alert.month}: <strong>{Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(recommendedDca)}</strong> (surplus salary)
                          </span>
                          <button
                            className="apply-rec-btn"
                            onClick={() => addScheduleSegment(alert.month, recommendedDca)}
                          >
                            Apply recommendation
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                if (alert.type === 'BOND_LIQUIDATION') {
                  return (
                    <div
                      key={idx}
                      className="glass-panel alert-warning-card bond-liquidated"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                        <AlertTriangle size={18} style={{ color: '#fb923c', flexShrink: 0 }} />
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          <strong>Bond Liquidation Event:</strong> Bond principal liquidation begins at Month {alert.month} to support the DCA transition.
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Area Chart Card */}
          <div className="glass-panel chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Net Worth Evolution (Absolute Balances)</h3>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color equity"></span>
                  <span>Equity</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color bond"></span>
                  <span>Bonds</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color cash"></span>
                  <span>Cash</span>
                </div>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis
                    dataKey="age"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(age) => `Age ${Math.floor(age)}`}
                    style={{ fontSize: '11px', fill: 'var(--text-muted)' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `€${(val / 1000).toFixed(0)}k`}
                    style={{ fontSize: '11px', fill: 'var(--text-muted)' }}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {alerts.map((alert, idx) => (
                    <ReferenceLine
                      key={idx}
                      x={currentAge + alert.month / 12}
                      stroke={alert.type === 'CASH_DEPLETION' ? '#ef4444' : '#fb923c'}
                      strokeDasharray="4 4"
                      label={{
                        value: alert.type === 'CASH_DEPLETION' ? 'Cash Depleted' : 'Bonds Liquidated',
                        fill: alert.type === 'CASH_DEPLETION' ? '#f87171' : '#fb923c',
                        fontSize: 10,
                        position: 'top'
                      }}
                    />
                  ))}
                  <Area
                    type="monotone"
                    dataKey="cashBalance"
                    stackId="1"
                    stroke="var(--cash-color)"
                    fill="var(--cash-color)"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="bondBalance"
                    stackId="1"
                    stroke="var(--bond-color)"
                    fill="var(--bond-color)"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="equityBalance"
                    stackId="1"
                    stroke="var(--equity-color)"
                    fill="var(--equity-color)"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
