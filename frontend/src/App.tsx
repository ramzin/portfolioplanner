import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { TrendingUp, Award, DollarSign, AlertTriangle, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { usePercentageAllocation } from './hooks/usePercentageAllocation';
import './App.css';

interface LedgerEvent {
  amount: number;
  type: string;
}

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
  equityEvents: LedgerEvent[];
  bondEvents: LedgerEvent[];
  cashEvents: LedgerEvent[];
  events: string[];
}

interface DcaScheduleSegment {
  startMonth: number;
  dcaAmount: number;
}

interface SimulationAlert {
  month: number;
  type: 'CASH_DEPLETION' | 'BOND_LIQUIDATION' | 'EMERGENCY_FUND_LIMIT' | 'MINIMUM_BOND_LIMIT';
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

export const FormattedNumberInput = ({
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
  const [localStr, setLocalStr] = useState(() => Intl.NumberFormat('en-US', { maximumFractionDigits: 10 }).format(value));
  const [prevValue, setPrevValue] = useState(value);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);

  if (value !== prevValue) {
    setPrevValue(value);
    if (!focused) {
      setLocalStr(Intl.NumberFormat('en-US', { maximumFractionDigits: 10 }).format(value));
    }
  }

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

    // Count valid characters (digits and the first decimal point) before selection
    let nonCommasBefore = 0;
    const prefix = val.slice(0, selStart);
    for (let i = 0; i < prefix.length; i++) {
      const char = prefix[i];
      if (char >= '0' && char <= '9') {
        nonCommasBefore++;
      } else if (char === '.') {
        // Only count the first dot in the entire input
        const firstDotIdx = val.indexOf('.');
        if (firstDotIdx !== -1 && i === firstDotIdx) {
          nonCommasBefore++;
        }
      }
    }

    // Format new value
    const formatted = cleanAndFormat(val);

    // Find new cursor position
    let newCursorPos = formatted.length;
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

    if (formatted === localStr) {
      if (inputRef.current) {
        inputRef.current.value = formatted;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
      cursorRef.current = null;
    } else {
      cursorRef.current = newCursorPos;
      setLocalStr(formatted);
    }

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

interface TooltipPayloadItem {
  payload: TimelinePoint;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
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
  const [currentAge, setCurrentAge] = useState(34);
  const [retirementAge, setRetirementAge] = useState(60);
  const [initialNetWorth, setInitialNetWorth] = useState(1500000);
  const [monthlySalary, setMonthlySalary] = useState(8500);
  const [monthlyExpenses, setMonthlyExpenses] = useState(3500);

  // Yield rates (percentages p.a.)
  const [equityYield, setEquityYield] = useState(7.0);
  const [bondYield, setBondYield] = useState(2.0);
  const [cashYield, setCashYield] = useState(2.5);
  const [bondQuarterlyWithdrawal, setBondQuarterlyWithdrawal] = useState(10000);

  // DCA & Transition settings
  const [dcaMonthlyAmount, setDcaMonthlyAmount] = useState(6000);
  const [targetEquityRatio, setTargetEquityRatio] = useState(80);
  const [postTargetStrategy, setPostTargetStrategy] = useState<'ACCUMULATE_CASH' | 'INVEST_EQUITY' | 'INVEST_BONDS'>('ACCUMULATE_CASH');
  const [emergencyFund, setEmergencyFund] = useState(50000);
  const [minimumBondAmount, setMinimumBondAmount] = useState(100000);

  // Bond withdrawal schedule
  const [bondWithdrawalSchedule, setBondWithdrawalSchedule] = useState<DcaScheduleSegment[]>([]);
  const [newBondSegMonth, setNewBondSegMonth] = useState(12);
  const [newBondSegAmount, setNewBondSegAmount] = useState(5000);

  // German tax settings
  const [abgeltungsteuer, setAbgeltungsteuer] = useState(26.375);
  const [sparerpauschbetrag, setSparerpauschbetrag] = useState(1000);
  const [basiszins, setBasiszins] = useState(2.29);

  // Hook for asset allocations (summing to 100%)
  const { allocation, setAllocationPercent, setAllocation } = usePercentageAllocation({
    equity: 39,
    bond: 40,
    cash: 21,
  });

  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [expandedMonths, setExpandedMonths] = useState<Record<number, boolean>>({});

  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [monthsToTarget, setMonthsToTarget] = useState<number>(-1);
  const [dcaSchedule, setDcaSchedule] = useState<DcaScheduleSegment[]>([]);
  const [alerts, setAlerts] = useState<SimulationAlert[]>([]);
  const [newSegMonth, setNewSegMonth] = useState(12);
  const [newSegAmount, setNewSegAmount] = useState(2000);
  const [backendStatus, setBackendStatus] = useState<'CONNECTED' | 'OFFLINE'>('OFFLINE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load configuration defaults from backend on mount
  useEffect(() => {
    async function loadDefaults() {
      try {
        const res = await fetch('/api/defaults');
        if (res.ok) {
          const data = await res.json();
          setCurrentAge(data.currentAge);
          setRetirementAge(data.retirementAge);
          setInitialNetWorth(data.initialNetWorth);
          setMonthlySalary(data.monthlySalary);
          setMonthlyExpenses(data.monthlyExpenses);
          setAllocation({
            equity: data.allocation.equityPercentage,
            bond: data.allocation.bondPercentage,
            cash: data.allocation.cashPercentage,
          });
          setEquityYield(data.allocation.equityYieldPercent);
          setBondYield(data.allocation.bondYieldPercent);
          setCashYield(data.allocation.cashYieldPercent);
          setAbgeltungsteuer(data.abgeltungsteuerPercent);
          setSparerpauschbetrag(data.sparerpauschbetrag);
          setBasiszins(data.basiszinsPercent);
          setBondQuarterlyWithdrawal(data.bondQuarterlyWithdrawal);
          setDcaMonthlyAmount(data.dcaMonthlyAmount);
          setTargetEquityRatio(data.targetEquityRatioPercent);
          setPostTargetStrategy(data.postTargetStrategy);
          if (data.minimumBondAmount !== undefined) setMinimumBondAmount(Number(data.minimumBondAmount));
          if (data.emergencyFund !== undefined) setEmergencyFund(Math.max(1000, Number(data.emergencyFund)));
          setBackendStatus('CONNECTED');
        }
      } catch (err) {
        console.warn('Could not load configuration defaults from backend, using hardcoded client defaults:', err);
      }
    }
    loadDefaults();
  }, [setAllocation]);

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
      minimumBondAmount: minimumBondAmount,
      bondWithdrawalSchedule: bondWithdrawalSchedule.length > 0 ? bondWithdrawalSchedule : undefined,
      emergencyFund: emergencyFund,
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
      } catch (err) {
        const error = err as Error;
        console.warn('API error, executing client-side fallback simulation:', error.message);
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
      let emergencyFundAlerted = false;
      let minimumBondAlerted = false;

      const start = new Date(2026, 5, 1); // June 1, 2026
      const formatMoney = (val: number) => {
        return '€' + Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
      };

      const m0NetWorth = equity + bond + cash;
      let nextEqEvents: LedgerEvent[] = [{amount: equity, type: `Initial Equity Balance (${allocation.equity}% of initial Net Worth)`}];
      let nextBondEvents: LedgerEvent[] = [{amount: bond, type: `Initial Bond Balance (${allocation.bond}% of initial Net Worth)`}];
      let nextCashEvents: LedgerEvent[] = [{amount: cash, type: `Initial Cash Balance (${allocation.cash}% of initial Net Worth)`}];
      let nextEvents: string[] = [`Simulation initialized at Age ${currentAge} with Net Worth of ${formatMoney(m0NetWorth)}.`];

      for (let m = 0; m <= totalMonths; m++) {
        const currentDate = new Date(start);
        currentDate.setMonth(start.getMonth() + m);
        const dateStr = currentDate.toISOString().split('T')[0];

        const eqEvents = nextEqEvents;
        const bondEvents = nextBondEvents;
        const cashEvents = nextCashEvents;
        const mEvents = nextEvents;

        localTimeline.push({
          month: m,
          date: dateStr,
          age: currentAge + m / 12,
          equityBalance: equity,
          bondBalance: bond,
          cashBalance: cash,
          netWorth: equity + bond + cash,
          equityRatioPercent: (equity + bond + cash) === 0 ? 0 : (equity / (equity + bond + cash)) * 100,
          taxPaidThisYear,
          equityEvents: eqEvents,
          bondEvents: bondEvents,
          cashEvents: cashEvents,
          events: mEvents,
        });

        monthsHeldThisYear++;

        // Calculate next month's states
        if (m < totalMonths) {
          const nextM = m + 1;
          const eqEvents: LedgerEvent[] = [];
          const bondEvents: LedgerEvent[] = [];
          const cashEvents: LedgerEvent[] = [];
          const tempEvents: string[] = [];

          // Calendar year reset check on Jan 1st
          const checkDate = new Date(start);
          checkDate.setMonth(start.getMonth() + nextM);
          if (checkDate.getMonth() === 0) {
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

            if (vorabTax > 0) {
              const cashDrawn = Math.min(vorabTax, cash);
              cash -= cashDrawn;
              if (cashDrawn > 0) {
                cashEvents.push({ amount: -cashDrawn, type: `Deducted Equity Vorabpauschale tax from Cash` });
              }

              const remainingTax = vorabTax - cashDrawn;
              if (remainingTax > 0) {
                const bondLiquidated = Math.min(remainingTax, bond);
                bond -= bondLiquidated;
                if (bondLiquidated > 0) {
                  bondEvents.push({ amount: -bondLiquidated, type: `Liquidated bond principal to pay Equity Vorabpauschale tax` });
                }

                const remainingAfterBond = remainingTax - bondLiquidated;
                if (remainingAfterBond > 0) {
                  const equityLiquidated = Math.min(remainingAfterBond, equity);
                  equity -= equityLiquidated;
                  if (equityLiquidated > 0) {
                    eqEvents.push({ amount: -equityLiquidated, type: `Liquidated Equity to pay remaining Equity Vorabpauschale tax` });
                  }
                }
              }
              tempEvents.push(`Year-End Tax Reset: Sparerpauschbetrag allowance of ${formatMoney(sparerpauschbetrag)} reset. Paid Vorabpauschale tax of ${formatMoney(vorabTax)}.`);
            } else {
              tempEvents.push(`Year-End Tax Reset: Sparerpauschbetrag allowance of ${formatMoney(sparerpauschbetrag)} reset. No Vorabpauschale tax was due.`);
            }

            // Reset year trackers
            equityStartOfYear = equity;
            monthsHeldThisYear = 0;
            yearlyDcaInvested = 0;
          }

          const eqGrowth = equity * eqMonthlyYield;
          const cashGrowth = cash * cashMonthlyYield;

          equity += eqGrowth;
          if (eqGrowth > 0) {
            eqEvents.push({amount: eqGrowth, type: `Earned compound yield (${equityYield}% p.a.)`});
          }

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

          if (cashGrowth > 0) {
            cashEvents.push({amount: cashGrowth, type: `Earned cash interest (${cashYield}% p.a.)`});
            if (cashTax > 0) {
              cashEvents.push({amount: -cashTax, type: `Paid Abgeltungsteuer on cash interest`});
            }
          }

          // Bond Quarterly Maturity & Coupon (every 3 months)
          let bondQuarterlyCashInflow = 0;
          if (nextM > 0 && nextM % 3 === 0) {
            const bondYieldRate = bondYield / 100;
            const quarterlyYield = bondYieldRate / 4;
            const coupon = bond * quarterlyYield;

            // Tax on coupon (100% taxable)
            let couponTax = 0;
            if (coupon > 0) {
              const taxable = Math.max(0, coupon - remainingAllowance);
              const consumed = Math.min(coupon, remainingAllowance);
              remainingAllowance -= consumed;
              couponTax = taxable * taxRate;
            }
            taxPaidThisYear += couponTax;

            // Schedule-aware requested withdrawal (zero post-target)
            let requestedWithdrawal = targetReached ? 0 : bondQuarterlyWithdrawal;
            if (!targetReached && bondWithdrawalSchedule.length > 0) {
              const active = bondWithdrawalSchedule
                .filter((s) => s.startMonth <= nextM)
                .reduce((max, s) => (max.startMonth === -1 || s.startMonth > max.startMonth ? s : max), { startMonth: -1, dcaAmount: bondQuarterlyWithdrawal });
              if (active.startMonth >= 0) requestedWithdrawal = active.dcaAmount;
            }

            // Add coupon to bond (pre-target) or cash (post-target)
            const isBondsAccumulation = targetReached && postTargetStrategy === 'INVEST_BONDS';
            if (isBondsAccumulation) {
              // Reinvested directly in bonds: coupon is never sent to cash, but gets reinvested in the bonds
              bond += coupon;
              if (coupon > 0) {
                bondEvents.push({ amount: coupon, type: `Earned quarterly bond coupon (reinvested)` });
              }
            } else {
              // Coupon is added and was subtracted in the bonds section:
              if (coupon > 0) {
                bondEvents.push({ amount: coupon, type: `Earned quarterly bond coupon` });
                bondEvents.push({ amount: -coupon, type: `Coupon payout to Cash` });
              }
              // In the cash section the user can see that the coupon was added:
              cash += coupon;
              if (coupon > 0) {
                cashEvents.push({ amount: coupon, type: `Received quarterly bond coupon` });
              }
            }

            // Coupon tax is always paid from the cash pile
            if (couponTax > 0) {
              cash -= couponTax;
              cashEvents.push({ amount: -couponTax, type: `Paid Abgeltungsteuer on bond coupon` });
            }

            // Determine requested principal withdrawal from bonds:
            // Since the coupon is paid to Cash, we only need to withdraw principal if the requested withdrawal exceeds the coupon.
            const principalWithdrawalNeeded = Math.max(0, requestedWithdrawal - coupon);

            // Apply minimum bond floor
            const availableForWithdrawal = Math.max(0, bond - minimumBondAmount);
            const w = Math.min(principalWithdrawalNeeded, availableForWithdrawal);

            if (principalWithdrawalNeeded > 0 && w < principalWithdrawalNeeded && !minimumBondAlerted) {
              localAlerts.push({ month: nextM, type: 'MINIMUM_BOND_LIMIT', message: `Minimum bond floor reached at Month ${nextM}` });
              minimumBondAlerted = true;
              tempEvents.push(`⚠ Minimum Bond Floor: Requested quarterly principal withdrawal of ${formatMoney(principalWithdrawalNeeded)} restricted to ${formatMoney(w)} to maintain the minimum bond balance of ${formatMoney(minimumBondAmount)}.`);
            }

            if (w > 0) {
              bond -= w;
              bondQuarterlyCashInflow = w;
              bondEvents.push({ amount: -w, type: `Quarterly bond withdrawal` });
              cashEvents.push({ amount: w, type: `Received bond quarterly withdrawal` });
            }
          }

          const savings = monthlySalary - monthlyExpenses;

          // Cash compounds interest + bond coupon + savings — all accumulate in cash first
          cash += cashGrowth - cashTax + bondQuarterlyCashInflow + savings;
          if (savings > 0) {
            cashEvents.push({amount: savings, type: `Received monthly savings`});
          }

          // Monthly DCA Transfer — continues both pre- and post-target; hierarchy: Cash -> Equity
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
            const availableCash = Math.max(0, cash - emergencyFund);
            if (targetReached) {
              // Post-target: DCA transition based on strategy, no bond liquidation
              if (postTargetStrategy === 'INVEST_EQUITY' || postTargetStrategy === 'INVEST_BONDS') {
                const destination = postTargetStrategy;
                if (availableCash >= dca) {
                  cash -= dca;
                  actualDca = dca;
                  cashEvents.push({ amount: -dca, type: `Deducted programmatic DCA transition` });

                  if (destination === 'INVEST_EQUITY') {
                    equity += dca;
                    eqEvents.push({ amount: dca, type: `Received programmatic DCA transition to Equity` });
                    yearlyDcaInvested += dca;
                  } else {
                    bond += dca;
                    bondEvents.push({ amount: dca, type: `Received programmatic DCA transition to Bonds` });
                  }
                } else {
                  const cashDrawn = availableCash;
                  cash -= cashDrawn;
                  actualDca = cashDrawn;

                  if (cashDrawn > 0) {
                    cashEvents.push({ amount: -cashDrawn, type: `Deducted Cash surplus above emergency fund for DCA` });
                    if (destination === 'INVEST_EQUITY') {
                      equity += cashDrawn;
                      eqEvents.push({ amount: cashDrawn, type: `Received partial DCA transition to Equity` });
                      yearlyDcaInvested += cashDrawn;
                    } else {
                      bond += cashDrawn;
                      bondEvents.push({ amount: cashDrawn, type: `Received partial DCA transition to Bonds` });
                    }
                  }

                  if (!emergencyFundAlerted) {
                    localAlerts.push({
                      month: nextM,
                      type: 'EMERGENCY_FUND_LIMIT',
                      message: `Cash reached Emergency Fund limit at Month ${nextM} — DCA paused`,
                    });
                    emergencyFundAlerted = true;
                  }
                  if (cashDrawn === 0) {
                    tempEvents.push(`⚠ Emergency Fund Limit Reached: Cash is at or below the emergency fund floor of ${formatMoney(emergencyFund)}. DCA transfer of ${formatMoney(dca)} was skipped to protect your emergency reserve.`);
                  } else {
                    tempEvents.push(`⚠ Emergency Fund Limit: Only ${formatMoney(availableCash)} available above emergency fund floor (${formatMoney(emergencyFund)}). Partial DCA of ${formatMoney(availableCash)} invested instead of requested ${formatMoney(dca)}.`);
                  }
                }
              }
            } else {
              // Pre-target: DCA from Cash, fallback to bond liquidation (always to equity)
              if (availableCash >= dca) {
                cash -= dca;
                equity += dca;
                actualDca = dca;
                yearlyDcaInvested += dca;

                cashEvents.push({amount: -dca, type: `Deducted programmatic DCA transition to Equity`});
                eqEvents.push({amount: dca, type: `Received programmatic DCA transition`});
              } else {
                const cashDrawn = availableCash;
                cash -= cashDrawn;
                if (cashDrawn > 0) {
                  cashEvents.push({amount: -cashDrawn, type: `Deducted Cash surplus above emergency fund for DCA`});
                }

                const remainingNeeded = dca - cashDrawn;

                if (!cashDepletionAlerted) {
                  localAlerts.push({
                    month: nextM,
                    type: 'CASH_DEPLETION',
                    message: `Cash depleted at Month ${nextM}`,
                  });
                  cashDepletionAlerted = true;
                }
                tempEvents.push(`DCA Step-down Event: Cash reserves depleted. DCA transfer of ${formatMoney(dca)} funded via bond liquidations.`);

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
                  bondEvents.push({amount: -bondLiquidated, type: `Liquidated principal to support DCA transition`});
                }

                bond -= bondLiquidated;
                equity += cashDrawn + bondLiquidated;
                actualDca = cashDrawn + bondLiquidated;
                yearlyDcaInvested += actualDca;

                if (actualDca > 0) {
                  eqEvents.push({amount: actualDca, type: `Received DCA transition (Cash: ${formatMoney(cashDrawn)}, Bonds: ${formatMoney(bondLiquidated)})`});
                }

                if (actualDca < dca) {
                  if (emergencyFund > 0) {
                    if (actualDca === 0) {
                      if (!emergencyFundAlerted) {
                        localAlerts.push({
                          month: nextM,
                          type: 'EMERGENCY_FUND_LIMIT',
                          message: `Cash reached Emergency Fund limit at Month ${nextM} — DCA paused`,
                        });
                        emergencyFundAlerted = true;
                      }
                      tempEvents.push(`⚠ Emergency Fund Limit Reached: Cash is at or below the emergency fund floor of ${formatMoney(emergencyFund)}. DCA transfer of ${formatMoney(dca)} was skipped to protect your emergency reserve.`);
                    } else {
                      if (!emergencyFundAlerted) {
                        localAlerts.push({
                          month: nextM,
                          type: 'EMERGENCY_FUND_LIMIT',
                          message: `Cash approaching Emergency Fund limit at Month ${nextM} — DCA is partially constrained`,
                        });
                        emergencyFundAlerted = true;
                      }
                      tempEvents.push(`⚠ Emergency Fund Limit: Only ${formatMoney(availableCash)} available above emergency fund floor (${formatMoney(emergencyFund)}). Partial DCA of ${formatMoney(availableCash)} invested instead of requested ${formatMoney(dca)}.`);
                    }
                  }
                }
              }
            }
          }

          // Check target ratio
          const nextNetWorth = equity + bond + cash;
          const nextRatio = nextNetWorth === 0 ? 0 : (equity / nextNetWorth) * 100;
          if (!targetReached && nextRatio >= targetEquityRatio) {
            targetReached = true;
            monthsToTargetVal = nextM;
            tempEvents.push(`Target Equity Ratio Reached: Equity ratio is ${nextRatio.toFixed(2)}% (Target: ${targetEquityRatio}%). Programmatic bond withdrawals stopped.`);
          }

          nextEqEvents = eqEvents;
          nextBondEvents = bondEvents;
          nextCashEvents = cashEvents;
          nextEvents = tempEvents;
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
    minimumBondAmount,
    bondWithdrawalSchedule,
    emergencyFund,
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

  const addBondScheduleSegment = (month: number, amount: number) => {
    if (month < 1) return;
    if (bondWithdrawalSchedule.some((s) => s.startMonth === month)) return;
    const newSchedule = [...bondWithdrawalSchedule, { startMonth: month, dcaAmount: amount }].sort((a, b) => a.startMonth - b.startMonth);
    setBondWithdrawalSchedule(newSchedule);
  };

  const removeBondScheduleSegment = (month: number) => {
    setBondWithdrawalSchedule(bondWithdrawalSchedule.filter((s) => s.startMonth !== month));
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

              <div className="input-field-wrapper">
                <div className="input-label-row">
                  <span className="input-label">Emergency Fund (Cash floor) (€)</span>
                  <FormattedNumberInput value={emergencyFund} onChange={(v) => setEmergencyFund(Math.max(1000, v))} min={1000} max={1000000} />
                </div>
                <input
                  type="range"
                  min="1000"
                  max="100000"
                  step="1000"
                  value={emergencyFund}
                  onChange={(e) => setEmergencyFund(Math.max(1000, parseInt(e.target.value)))}
                />
              </div>

              <div className="input-field-wrapper" style={{ marginTop: '8px' }}>
                <div className="input-label-row">
                  <span className="input-label">Post-Target Strategy</span>
                </div>
                <select
                  id="post-target-strategy-select"
                  value={postTargetStrategy}
                  onChange={(e) => setPostTargetStrategy(e.target.value as typeof postTargetStrategy)}
                  className="post-target-select"
                >
                  <option value="ACCUMULATE_CASH">Accumulate Cash (savings build up in cash)</option>
                  <option value="INVEST_EQUITY">Invest Equity (invest excess cash in equity)</option>
                  <option value="INVEST_BONDS">Invest Bonds (invest excess cash in bonds)</option>
                </select>
                {postTargetStrategy === 'INVEST_EQUITY' && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
                    Excess cash above the emergency fund floor is automatically invested in <strong>equity</strong>.
                  </p>
                )}
                {postTargetStrategy === 'INVEST_BONDS' && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
                    Excess cash above the emergency fund floor is automatically invested in <strong>bonds</strong>.
                  </p>
                )}
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

              {/* Minimum Bond Amount */}
              <div className="input-field-wrapper" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <div className="input-label-row">
                  <span className="input-label">Minimum Bond Amount (floor) (€)</span>
                  <FormattedNumberInput value={minimumBondAmount} onChange={setMinimumBondAmount} min={0} max={10000000} />
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000000"
                  step="5000"
                  value={minimumBondAmount}
                  onChange={(e) => setMinimumBondAmount(parseInt(e.target.value))}
                />
                {minimumBondAmount > 0 && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
                    Quarterly withdrawals will be capped to keep bonds above {Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(minimumBondAmount)}.
                  </p>
                )}
              </div>

              {/* Bond Withdrawal Schedule Editor */}
              <div className="dca-schedule-editor" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '4px' }}>
                <span className="input-label" style={{ display: 'block', marginBottom: '8px' }}>Bond Quarterly Withdrawal Schedule</span>

                <div className="schedule-segments-list">
                  <div className="schedule-segment-item">
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Quarter 0 (Initial)</span>
                    <strong style={{ fontSize: '12px' }}>{Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(bondQuarterlyWithdrawal)} / qtr</strong>
                  </div>
                  {bondWithdrawalSchedule.map((seg) => (
                    <div key={seg.startMonth} className="schedule-segment-item" style={{ borderLeft: '2px solid var(--bond-color)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>From Month {seg.startMonth}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '12px' }}>{Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(seg.dcaAmount)} / qtr</strong>
                        <button onClick={() => removeBondScheduleSegment(seg.startMonth)} className="delete-btn">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="add-segment-form">
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Start Month</span>
                    <input
                      type="number"
                      min="1"
                      value={newBondSegMonth}
                      onChange={(e) => setNewBondSegMonth(parseInt(e.target.value) || 1)}
                      className="add-segment-input"
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Withdrawal / Quarter (€)</span>
                    <input
                      type="number"
                      min="0"
                      value={newBondSegAmount}
                      onChange={(e) => setNewBondSegAmount(parseInt(e.target.value) || 0)}
                      className="add-segment-input"
                    />
                  </div>
                  <button
                    onClick={() => addBondScheduleSegment(newBondSegMonth, newBondSegAmount)}
                    className="add-segment-btn"
                  >
                    <Plus size={14} />
                  </button>
                </div>
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
                if (alert.type === 'EMERGENCY_FUND_LIMIT') {
                  const alertDate = new Date(2026, 5, 1);
                  alertDate.setMonth(alertDate.getMonth() + alert.month);
                  return (
                    <div
                      key={idx}
                      className="glass-panel alert-warning-card"
                      style={{ borderLeft: '4px solid #a855f7' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontWeight: 600 }}>
                          <AlertTriangle size={18} />
                          <span>⚠ Emergency Fund Limit Reached</span>
                        </div>
                        <p style={{ fontSize: '14px', margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          At <strong>{alertDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</strong> (Month {alert.month}, Age {(currentAge + alert.month / 12).toFixed(1)}), your cash balance has reached the emergency fund floor of <strong>{Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(emergencyFund)}</strong>. DCA investments will be limited to only the cash surplus above this floor — your emergency reserve will never be touched.
                        </p>
                      </div>
                    </div>
                  );
                }
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
                if (alert.type === 'MINIMUM_BOND_LIMIT') {
                  const alertDate = new Date(2026, 5, 1);
                  alertDate.setMonth(alertDate.getMonth() + alert.month);
                  return (
                    <div
                      key={idx}
                      className="glass-panel alert-warning-card"
                      style={{ borderLeft: '4px solid #f59e0b' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 600 }}>
                          <AlertTriangle size={18} />
                          <span>⚠ Minimum Bond Floor Reached</span>
                        </div>
                        <p style={{ fontSize: '14px', margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          At <strong>{alertDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</strong> (Month {alert.month}, Age {(currentAge + alert.month / 12).toFixed(1)}), quarterly bond withdrawals have been restricted because your bond balance has reached the minimum bond floor of <strong>{Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(minimumBondAmount)}</strong>. Only the coupon yield above this floor can be withdrawn going forward.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Consider adding a Bond Withdrawal Schedule entry at Month {alert.month} to reduce your withdrawal amount.
                          </span>
                          <button
                            className="apply-rec-btn"
                            style={{ borderColor: 'rgba(245,158,11,0.3)', color: '#fbbf24' }}
                            onClick={() => addBondScheduleSegment(alert.month, 0)}
                          >
                            Set to €0 from Month {alert.month}
                          </button>
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
                      stroke={
                        alert.type === 'CASH_DEPLETION' ? '#ef4444'
                        : alert.type === 'EMERGENCY_FUND_LIMIT' ? '#a855f7'
                        : alert.type === 'MINIMUM_BOND_LIMIT' ? '#f59e0b'
                        : '#fb923c'
                      }
                      strokeDasharray="4 4"
                      label={{
                        value: alert.type === 'CASH_DEPLETION' ? 'Cash Depleted'
                          : alert.type === 'EMERGENCY_FUND_LIMIT' ? 'Emergency Fund Limit'
                          : alert.type === 'MINIMUM_BOND_LIMIT' ? 'Bond Floor Reached'
                          : 'Bonds Liquidated',
                        fill: alert.type === 'CASH_DEPLETION' ? '#f87171'
                          : alert.type === 'EMERGENCY_FUND_LIMIT' ? '#c084fc'
                          : alert.type === 'MINIMUM_BOND_LIMIT' ? '#fbbf24'
                          : '#fb923c',
                        fontSize: 10,
                        position: 'top'
                      }}
                    />
                  ))}
                  {monthsToTarget >= 0 && (
                    <ReferenceLine
                      x={currentAge + monthsToTarget / 12}
                      stroke="var(--accent-primary)"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Target Equity Ratio Reached',
                        fill: 'var(--accent-primary)',
                        fontSize: 10,
                        position: 'insideTopLeft'
                      }}
                    />
                  )}
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

          {/* Calculation Explanation Log */}
          <div className="glass-panel log-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="log-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h3 className="chart-title" style={{ margin: 0 }}>Calculation & Transition Trace Log</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    const next: Record<number, boolean> = {};
                    timeline.forEach(pt => {
                      next[pt.month] = true;
                    });
                    setExpandedMonths(next);
                  }}
                  className="apply-rec-btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  Expand All
                </button>
                <button
                  onClick={() => setExpandedMonths({})}
                  className="apply-rec-btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  Collapse All
                </button>
                <input
                  type="text"
                  placeholder="Filter logs (e.g. Month 12, tax, rebalance)..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="log-search-input"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    width: '260px',
                    transition: 'all 0.2s',
                  }}
                />
              </div>
            </div>

            <div className="log-scroll-container" style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {timeline.filter(pt => {
                if (!logSearchQuery) return true;
                const query = logSearchQuery.toLowerCase();
                const dateFormatted = new Date(pt.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                }).toLowerCase();
                const ageStr = `age ${pt.age.toFixed(2)}`.toLowerCase();
                const monthStr = `month ${pt.month}`.toLowerCase();
                return (
                  monthStr.includes(query) ||
                  dateFormatted.includes(query) ||
                  ageStr.includes(query) ||
                  (pt.equityEvents && pt.equityEvents.some(e => e.type.toLowerCase().includes(query))) ||
                  (pt.bondEvents && pt.bondEvents.some(e => e.type.toLowerCase().includes(query))) ||
                  (pt.cashEvents && pt.cashEvents.some(e => e.type.toLowerCase().includes(query))) ||
                  (pt.events && pt.events.some(e => e.toLowerCase().includes(query)))
                );
              }).length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0', fontSize: '14px' }}>
                  No simulation records match your filter query.
                </div>
              ) : (
                timeline.filter(pt => {
                  if (!logSearchQuery) return true;
                  const query = logSearchQuery.toLowerCase();
                  const dateFormatted = new Date(pt.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                  }).toLowerCase();
                  const ageStr = `age ${pt.age.toFixed(2)}`.toLowerCase();
                  const monthStr = `month ${pt.month}`.toLowerCase();
                  return (
                    monthStr.includes(query) ||
                    dateFormatted.includes(query) ||
                    ageStr.includes(query) ||
                    (pt.equityEvents && pt.equityEvents.some(e => e.type.toLowerCase().includes(query))) ||
                    (pt.bondEvents && pt.bondEvents.some(e => e.type.toLowerCase().includes(query))) ||
                    (pt.cashEvents && pt.cashEvents.some(e => e.type.toLowerCase().includes(query))) ||
                    (pt.events && pt.events.some(e => e.toLowerCase().includes(query)))
                  );
                }).map((pt) => {
                  const dateFormatted = new Date(pt.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                  });
                  const formatMoney = (val: number) => {
                    return '€' + Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
                  };
                  const isExpanded = !!expandedMonths[pt.month];
                  return (
                    <div
                      key={pt.month}
                      className="log-item-card"
                      onClick={() => setExpandedMonths(prev => ({ ...prev, [pt.month]: !prev[pt.month] }))}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.03)' : 'none', paddingBottom: isExpanded ? '8px' : '0', transition: 'padding 0.2s' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                          Month {pt.month} ({dateFormatted})
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <span>Age: <strong style={{ color: 'var(--text-primary)' }}>{pt.age.toFixed(2)}</strong></span>
                          <span>Net Worth: <strong style={{ color: 'var(--text-primary)' }}>{formatMoney(pt.netWorth)}</strong></span>
                          <span>Equity Ratio: <strong style={{ color: 'var(--accent-primary)' }}>{pt.equityRatioPercent.toFixed(1)}%</strong></span>
                          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '12px' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{
                              background: 'rgba(139, 92, 246, 0.03)',
                              borderLeft: '3px solid var(--equity-color)',
                              padding: '12px 16px',
                              borderRadius: '0 8px 8px 0',
                              marginBottom: '12px'
                            }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#c084fc', display: 'block', marginBottom: '8px' }}>
                                Equity: {formatMoney(pt.equityBalance)}
                              </span>
                              {pt.equityEvents && pt.equityEvents.length > 0 ? (
                                <table style={{ width: '100%', fontSize: '13px', color: 'var(--text-secondary)', borderCollapse: 'collapse' }}>
                                  <tbody>
                                    {pt.equityEvents.map((evt, idx) => (
                                      <tr key={idx} style={{ borderBottom: idx !== pt.equityEvents.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                                        <td style={{ padding: '6px 0', width: '80%', verticalAlign: 'top' }}>{evt.type}</td>
                                        <td style={{ padding: '6px 0', width: '20%', textAlign: 'right', verticalAlign: 'top', color: evt.amount >= 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>
                                          {evt.amount >= 0 ? '+' : ''}{formatMoney(evt.amount)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Balance unchanged.</div>
                              )}
                            </div>

                            <div style={{
                              background: 'rgba(59, 130, 246, 0.03)',
                              borderLeft: '3px solid var(--bond-color)',
                              padding: '12px 16px',
                              borderRadius: '0 8px 8px 0',
                              marginBottom: '12px'
                            }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#60a5fa', display: 'block', marginBottom: '8px' }}>
                                Bonds: {formatMoney(pt.bondBalance)}
                              </span>
                              {pt.bondEvents && pt.bondEvents.length > 0 ? (
                                <table style={{ width: '100%', fontSize: '13px', color: 'var(--text-secondary)', borderCollapse: 'collapse' }}>
                                  <tbody>
                                    {pt.bondEvents.map((evt, idx) => (
                                      <tr key={idx} style={{ borderBottom: idx !== pt.bondEvents.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                                        <td style={{ padding: '6px 0', width: '80%', verticalAlign: 'top' }}>{evt.type}</td>
                                        <td style={{ padding: '6px 0', width: '20%', textAlign: 'right', verticalAlign: 'top', color: evt.amount >= 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>
                                          {evt.amount >= 0 ? '+' : ''}{formatMoney(evt.amount)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Balance unchanged.</div>
                              )}
                            </div>

                            <div style={{
                              background: 'rgba(16, 185, 129, 0.03)',
                              borderLeft: '3px solid var(--cash-color)',
                              padding: '12px 16px',
                              borderRadius: '0 8px 8px 0'
                            }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#34d399', display: 'block', marginBottom: '8px' }}>
                                Cash: {formatMoney(pt.cashBalance)}
                              </span>
                              {pt.cashEvents && pt.cashEvents.length > 0 ? (
                                <table style={{ width: '100%', fontSize: '13px', color: 'var(--text-secondary)', borderCollapse: 'collapse' }}>
                                  <tbody>
                                    {pt.cashEvents.map((evt, idx) => (
                                      <tr key={idx} style={{ borderBottom: idx !== pt.cashEvents.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                                        <td style={{ padding: '6px 0', width: '80%', verticalAlign: 'top' }}>{evt.type}</td>
                                        <td style={{ padding: '6px 0', width: '20%', textAlign: 'right', verticalAlign: 'top', color: evt.amount >= 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>
                                          {evt.amount >= 0 ? '+' : ''}{formatMoney(evt.amount)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Balance unchanged.</div>
                              )}
                            </div>
                          </div>

                          {pt.events && pt.events.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }} onClick={(e) => e.stopPropagation()}>
                              {pt.events.map((evt, idx) => (
                                <div key={idx} style={{
                                  background: 'rgba(251, 146, 60, 0.04)',
                                  border: '1px solid rgba(251, 146, 60, 0.1)',
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  color: '#fdba74',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}>
                                  <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '9px', background: 'rgba(251, 146, 60, 0.15)', padding: '2px 6px', borderRadius: '4px', color: '#fb923c' }}>
                                    Event
                                  </span>
                                  <span>{evt}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
