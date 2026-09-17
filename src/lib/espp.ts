import { marginalRate, type GrossPay, type TaxRegime } from "./tax.ts";

// The ESPP, and the two things no mental arithmetic gets right.
//
// **The lookback.** The price you pay is not the discount on today's value, it
// is the discount on the *lower* of the value at the start of the period and
// the value on purchase day. That is why the plan pays off even when the stock
// falls, and why the guaranteed minimum is not the discount but
// discount/(1-discount): with 15% off, the floor is +17.65%, not +15%.
//
// **The discount is employment income, not a stock market gain.** It lands on
// your payslip as taxable pay and the tax is withheld right there, in the month
// of the purchase, without a single euro of that benefit ever passing through
// your account. People who do not expect it find a lighter payslip and no
// explanation.

export interface EsppPlan {
  /** discount off the reference price, in percent */
  discount: number;
  /** whether the price applies to the lower of start and purchase */
  lookback: boolean;
  /** length of the accumulation period, in months */
  months: number;
  /** plan contribution cap, as a percentage of pay */
  maxPct: number;
  /**
   * Cap in dollars per period, above which the deduction stops buying shares
   * and is refunded.
   *
   * Not a company rule but the US tax limit: $25,000 a year of market value at
   * the grant date. With the 15% discount, that $25,000 of value is bought with
   * $21,250 of contributions, i.e. $10,625 per six-month window — which is why
   * the number is that one and not another.
   *
   * It only bites above a certain salary: at 15% over six months you reach it
   * around €123,000 of gross pay. Below that it is invisible; above it, it is
   * very visible, because the part over the cap sits idle for months buying
   * nothing.
   */
  maxUsd: number;
  /** the days of the year a purchase falls on, as MM-DD */
  purchaseDays: string[];
  /** does the plan buy fractional shares? almost never */
  fractionalShares: boolean;
}

export const ESPP_PLAN: EsppPlan = {
  discount: 15,
  lookback: true,
  months: 6,
  maxPct: 15,
  maxUsd: 10625,
  purchaseDays: ["04-01", "10-01"],
  fractionalShares: false,
};

export interface EsppInput {
  /** used only for the marginal rate the discount is taxed at */
  salary: number;
  /** euro withheld from payslips over the period, up to purchase day */
  contributed: number;
  priceAtStart: number; // USD per share
  priceAtPurchase: number; // USD per share, on purchase day
  /** dollars per euro: euro are MULTIPLIED to become dollars */
  fxRate: number;
  plan: EsppPlan;
}

export interface EsppResult {
  referencePrice: number; // USD: the lower of the two, when the lookback applies
  purchasePrice: number; // USD
  /** what actually goes into the purchase, cap included */
  contributedUsd: number;
  /** what was set aside before the cap */
  contributedBeforeCapUsd: number;
  /** EUR refunded because they are above the plan cap */
  aboveCap: number;
  shares: number;
  spent: number; // EUR actually converted into shares
  refunded: number; // EUR that did not buy a whole share and comes back
  marketValue: number; // EUR at the market price on purchase day
  /** the discount: taxable pay in the month of the purchase */
  discountValue: number;
  taxRate: number; // how much the taxman takes, at the margin of your salary
  taxWithheld: number;
  /** net effect on that payslip: the refund minus the withholding */
  payslipEffect: number;
  outlay: number; // your own money: shares plus tax on the discount
  gain: number;
  roi: number;
  /** the same return on an annual basis, to compare it with anything else */
  annualisedRoi: number;
  perMonth: number;
  /** how much of a raise would give you the same net amount */
  salaryEquivalent: number;
  shareOfSalary: number;
}

/** The gross return the plan guarantees with a flat stock: d/(1-d). */
export const guaranteedFloor = (discount: number) =>
  discount >= 100 ? Infinity : discount / (100 - discount);

/** How much is set aside over a period, given pay and percentage. */
export function expectedContribution(salary: number, pct: number, months: number): number {
  return (Math.max(0, salary) * Math.max(0, pct) * Math.max(0, months)) / (100 * 12);
}

export function simulateEspp(i: EsppInput, regime?: TaxRegime): EsppResult {
  const { plan } = i;
  const months = plan.months > 0 ? plan.months : 6;
  const reference = plan.lookback ? Math.min(i.priceAtStart, i.priceAtPurchase) : i.priceAtPurchase;
  const purchasePrice = reference * (1 - plan.discount / 100);

  // The plan cap cuts before buying: the part above it does not become shares,
  // it comes back on the payslip along with the change that did not make a
  // whole share.
  const contributedBeforeCapUsd = i.contributed * i.fxRate;
  const cap = plan.maxUsd > 0 ? plan.maxUsd : Infinity;
  const contributedUsd = Math.min(contributedBeforeCapUsd, cap);
  const aboveCap = i.fxRate > 0 ? Math.max(0, contributedBeforeCapUsd - contributedUsd) / i.fxRate : 0;

  const raw = purchasePrice > 0 ? contributedUsd / purchasePrice : 0;
  const shares = plan.fractionalShares ? Math.round(raw * 1e4) / 1e4 : Math.floor(raw);

  const spent = i.fxRate > 0 ? (shares * purchasePrice) / i.fxRate : 0;
  const refunded = i.contributed - spent;
  const marketValue = i.fxRate > 0 ? (shares * i.priceAtPurchase) / i.fxRate : 0;
  const discountValue = Math.max(0, marketValue - spent);

  // The rate is not a constant: the discount stacks on the salary, and at the
  // margin the bracket, the fading credit and the surtaxes pile up. It is the
  // same question as "how much is left of a raise", so it is the same function.
  const base: GrossPay = { salary: i.salary };
  const m = discountValue > 0 ? marginalRate(base, discountValue, regime) : { kept: 0, rate: 0 };
  const taxWithheld = discountValue * m.rate;

  const outlay = spent + taxWithheld;
  const gain = marketValue - outlay;
  const roi = outlay > 0 ? gain / outlay : 0;
  const perMonth = gain / months;
  const salaryEquivalent = m.kept > 0 ? (perMonth * 12) / m.kept : 0;

  return {
    referencePrice: reference,
    purchasePrice,
    contributedUsd,
    contributedBeforeCapUsd,
    aboveCap,
    shares,
    spent,
    refunded,
    marketValue,
    discountValue,
    taxRate: m.rate,
    taxWithheld,
    payslipEffect: refunded - taxWithheld,
    outlay,
    gain,
    roi,
    // The money is not tied up for the whole period: the first deduction sits
    // there six months, the last one a day. Average lock-up is about half the
    // period, so the annualised figure comes from months/2, not months. That is
    // the number that makes an ESPP comparable to any other investment.
    annualisedRoi: months > 0 ? roi * (24 / months) : 0,
    perMonth,
    salaryEquivalent,
    shareOfSalary: i.salary > 0 ? salaryEquivalent / i.salary : 0,
  };
}

/**
 * The window in progress: the one closing on the first purchase still to come.
 * Purchase day counts as inside — that is the day it happens.
 */
export function currentWindow(today: string, plan: EsppPlan): { start: string; purchase: string } {
  const year = Number(today.slice(0, 4));
  const days = [...plan.purchaseDays].sort();
  for (const y of [year, year + 1]) {
    for (const md of days) {
      const purchase = `${y}-${md}`;
      if (purchase < today) continue;
      const [yy, mm, dd] = purchase.split("-").map(Number);
      const back = new Date(Date.UTC(yy, mm - 1 - plan.months, dd));
      return { start: back.toISOString().slice(0, 10), purchase };
    }
  }
  return { start: today, purchase: today };
}
