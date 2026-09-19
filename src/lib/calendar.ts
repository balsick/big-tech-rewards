import { grossToNet, type TaxRegime } from "./tax.ts";
import { expectedContribution, simulateEspp, type EsppPlan } from "./espp.ts";
import type { Projection } from "./rsu.ts";

// What each month actually looks like.
//
// The two tools answer "how much over six months" and "how much over three
// years". Neither answers the question people are really asking, which is what
// the payslip at the end of this month will say — and that one cannot be
// derived from an annual figure, because equity does not arrive evenly. Six
// months of deductions, one month where the purchase is taxed, a vest that
// changes nothing on the payslip and a settlement a month later that does.
//
// Two ledgers, kept apart on purpose. Money moves in the bank account; shares
// arrive in the brokerage account. Adding them into one number would say that
// the month you buy is a bad month, when it is the month you were paid the
// most — just not in euro.

/** A second payslip lands in these months, depending on how many the year has. */
export const extraPayMonths = (payPeriods: number): number[] =>
  payPeriods >= 14 ? [6, 12] : payPeriods >= 13 ? [12] : [];

export interface CalendarMonth {
  /** "2026-10" */
  ym: string;
  year: number;
  /** 1..12 */
  month: number;
  /** 1, or 2 in the months that carry an extra monthly payment */
  payslips: number;
  /** one ordinary payslip, before anything equity does to it */
  baseNet: number;
  /** set aside for the ESPP this month: your own money, not a tax */
  esppContribution: number;
  /** tax on the discount, withheld in the month of the purchase itself */
  esppTax: number;
  /** the change that did not buy a whole share, handed back the same month */
  esppRefund: number;
  /**
   * The RSU settlement, **signed**: positive is deducted, negative is refunded.
   * It lands the month AFTER the vest, never the month of it.
   */
  rsuSettlement: number;
  /** what reaches the bank account */
  net: number;
  /** shares released by a vest this month, after the withheld ones */
  rsuShares: number;
  /** units that vested, and the ones kept back for tax */
  vestUnits: number;
  vestWithheld: number;
  /** shares bought by an ESPP purchase this month */
  esppShares: number;
  /** what the month's shares are worth, in the currency they are quoted in */
  sharesUsd: number;
  sharesEur: number;
}

export interface CalendarInput {
  salary: number;
  /** today, ISO — the calendar starts with this month */
  today: string;
  /** how many months to lay out */
  months: number;
  /** null when not in the plan */
  espp: {
    pct: number;
    plan: EsppPlan;
    /** the reference price the lookback uses: the close on the day you joined */
    priceAtStart: number;
  } | null;
  /** the RSU projection, already worked out by `project()` */
  projection: Projection;
  /** USD per share, and dollars per euro */
  price: number;
  fxRate: number;
  regime?: TaxRegime;
}

const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

/** The month a date falls in, as "YYYY-MM". */
const monthOf = (iso: string) => iso.slice(0, 7);

/** The month after this one, wrapping the year. */
const nextMonth = (key: string) => {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  return m === 12 ? ym(y + 1, 1) : ym(y, m + 1);
};

export interface Calendar {
  months: CalendarMonth[];
  /** an ordinary payslip, the figure every other month is read against */
  ordinaryNet: number;
  totalRsuShares: number;
  totalEsppShares: number;
  totalSharesUsd: number;
  totalSharesEur: number;
  /** the lightest month in the bank, which is the one people want warning about */
  lightest: CalendarMonth | null;
}

export function buildCalendar(i: CalendarInput): Calendar {
  const regimeNet = grossToNet({ salary: i.salary }, i.regime);
  const periods = Math.max(1, regimeNet.payPeriods);
  const baseNet = regimeNet.net / periods;
  const extras = extraPayMonths(periods);
  const perUnitEur = i.fxRate > 0 ? i.price / i.fxRate : 0;

  const start = monthOf(i.today);
  const keys: string[] = [];
  for (let k = 0, key = start; k < Math.max(1, i.months); k++, key = nextMonth(key)) keys.push(key);
  const inRange = new Set(keys);

  const blank = (key: string): CalendarMonth => ({
    ym: key,
    year: Number(key.slice(0, 4)),
    month: Number(key.slice(5, 7)),
    payslips: extras.includes(Number(key.slice(5, 7))) ? 2 : 1,
    baseNet,
    esppContribution: 0,
    esppTax: 0,
    esppRefund: 0,
    rsuSettlement: 0,
    net: 0,
    rsuShares: 0,
    vestUnits: 0,
    vestWithheld: 0,
    esppShares: 0,
    sharesUsd: 0,
    sharesEur: 0,
  });

  const months = new Map(keys.map((k) => [k, blank(k)]));

  // ---------------------------------------------------------------- the ESPP
  //
  // Enrolment is assumed to continue: one window closes on a purchase day and
  // the next opens the same day, so the month of a purchase carries both the
  // tax on what you just bought and the first deduction of the period that has
  // just started. That is the month people are not expecting, and it is not an
  // edge case — it is every April and every October for anyone who stays in.
  if (i.espp && i.espp.pct > 0 && i.price > 0 && i.fxRate > 0) {
    const plan = i.espp.plan;
    const contributed = expectedContribution(i.salary, i.espp.pct, plan.months);
    const result = simulateEspp(
      {
        salary: i.salary,
        contributed,
        priceAtStart: i.espp.priceAtStart,
        priceAtPurchase: i.price,
        fxRate: i.fxRate,
        plan,
      },
      i.regime
    );

    // Every purchase day the plan has, across the years the calendar covers.
    const firstYear = Number(keys[0].slice(0, 4));
    const lastYear = Number(keys[keys.length - 1].slice(0, 4));
    for (let y = firstYear - 1; y <= lastYear + 1; y++) {
      for (const md of plan.purchaseDays) {
        const purchase = `${y}-${md}`;
        const key = monthOf(purchase);
        const m = months.get(key);
        if (m) {
          m.esppTax += result.withheldOnPayslip;
          m.esppRefund += result.refunded;
          m.esppShares += result.shares;
        }
        // The deductions of the period that ENDS on this purchase day: the
        // `plan.months` months before it, the purchase month excluded.
        //
        // The percentage is taken from every PAYSLIP, not spread evenly over
        // the months — so a month carrying a thirteenth pays it twice. On
        // 60,000 at 7% that is 300 in an ordinary month and 600 in December,
        // where dividing the window's total by six gave a flat 350 that
        // matches no payslip anyone receives.
        //
        // The window's total is unchanged, and not by luck: the percentage is
        // of the annual salary either way, and a six-month window happens to
        // contain exactly one of the two extra payments.
        const window: string[] = [];
        let back = key;
        for (let k = 0; k < plan.months; k++) {
          back = previousMonth(back);
          window.unshift(back);
        }
        // Counted over the WHOLE window, including months the calendar does
        // not show: otherwise the visible ones would each carry more than the
        // payslip does.
        const payslipsInWindow = window.reduce(
          (sum, w) => sum + (extras.includes(Number(w.slice(5, 7))) ? 2 : 1),
          0
        );
        const perPayslip = payslipsInWindow > 0 ? contributed / payslipsInWindow : 0;
        for (const w of window) {
          const d = months.get(w);
          if (d) d.esppContribution += perPayslip * d.payslips;
        }
      }
    }
  }

  // ----------------------------------------------------------------- the RSUs
  //
  // A vest moves shares and nothing else: the payslip of that month is an
  // ordinary one. What moves the payslip is the settlement, and it lands the
  // month AFTER — the withholding at vesting is a flat rate and the difference
  // with your own is worked out afterwards.
  for (const q of i.projection.quarters) {
    if (q.units <= 0 || !q.vestOn) continue;
    const vestKey = monthOf(q.vestOn);
    const arrived = months.get(vestKey);
    if (arrived) {
      arrived.rsuShares += q.netShares;
      arrived.vestUnits += q.units;
      arrived.vestWithheld += q.sharesWithheld;
    }
    const settle = months.get(nextMonth(vestKey));
    if (settle) settle.rsuSettlement += q.payslipAdjustmentEur;
    // A settlement whose month falls outside the window is simply not shown;
    // it is not silently folded into the last month, which would invent a
    // deduction on a payslip that does not carry it.
    void inRange;
  }

  // ------------------------------------------------------------------ totals
  const out = keys.map((k) => {
    const m = months.get(k)!;
    m.net =
      m.baseNet * m.payslips - m.esppContribution - m.esppTax + m.esppRefund - m.rsuSettlement;
    const shares = m.rsuShares + m.esppShares;
    m.sharesUsd = shares * i.price;
    m.sharesEur = shares * perUnitEur;
    return m;
  });

  const withShares = out.filter((m) => m.rsuShares + m.esppShares > 0);
  return {
    months: out,
    ordinaryNet: baseNet,
    totalRsuShares: out.reduce((s, m) => s + m.rsuShares, 0),
    totalEsppShares: out.reduce((s, m) => s + m.esppShares, 0),
    totalSharesUsd: withShares.reduce((s, m) => s + m.sharesUsd, 0),
    totalSharesEur: withShares.reduce((s, m) => s + m.sharesEur, 0),
    lightest: out.length ? out.reduce((a, b) => (b.net < a.net ? b : a)) : null,
  };
}

function previousMonth(key: string): string {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  return m === 1 ? ym(y - 1, 12) : ym(y, m - 1);
}
