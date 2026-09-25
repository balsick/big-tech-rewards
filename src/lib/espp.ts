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
  /**
   * The days the exchange rate is fixed on, as MM-DD.
   *
   * Outside the United States the deduction leaves the payslip in local
   * currency and has to become dollars before it can buy anything. The plan
   * does not do that at the purchase: it does it on **one declared day**, two
   * weeks earlier — 15 March for the April purchase, 15 September for the
   * October one.
   *
   * So by the time the window closes the rate is already a fact, not a
   * forecast. Using the rate of the purchase day instead, which is what this
   * tool did, means answering with a number that is still moving when the
   * real one has stopped: on 15 September 2026 it was 1.153762, and eight
   * trading days later 1.140641 — one percent and change, which on a
   * six-month contribution is most of a share.
   */
  fxDays: string[];
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
  fxDays: ["03-15", "09-15"],
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
  /**
   * The same value in dollars.
   *
   * The shares are quoted in dollars and the euro figure is a conversion at a
   * rate that moves, so both belong on screen: one is what you hold, the other
   * is what it is worth here today.
   */
  marketValueUsd: number;
  /** the discount: taxable pay in the month of the purchase */
  discountValue: number;
  taxRate: number; // how much the taxman takes, at the margin of your salary
  taxWithheld: number;
  /**
   * The part of it that actually leaves the purchase-month payslip: income tax
   * and social security. The surtaxes are not in here.
   */
  withheldOnPayslip: number;
  /**
   * Regional and municipal surtaxes on the discount — due, but not that month.
   * They are settled the following year, so putting them in the payslip figure
   * overstated it by about four points.
   */
  surtaxLater: number;
  /** net effect on that payslip: the refund minus what is withheld there */
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

/**
 * The day the rate was fixed for a purchase: the last declared one before it.
 *
 * Declared and not derived, because that is what the plan document says. The
 * conversion day belongs to the window that ends at that purchase, so it is
 * the most recent one strictly earlier — 15 September for 1 October, and 15
 * March for 1 April. Strictly: a purchase falling exactly on a conversion day
 * would take the one before, which is the conservative reading and a case the
 * calendar does not produce.
 */
export function fxDayFor(purchase: string, plan: EsppPlan = ESPP_PLAN): string | null {
  const year = Number(purchase.slice(0, 4));
  const candidati = [year - 1, year]
    .flatMap((y) => plan.fxDays.map((md) => `${y}-${md}`))
    .filter((d) => d < purchase)
    .sort();
  return candidati.length ? candidati[candidati.length - 1] : null;
}

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
  const m =
    discountValue > 0
      ? marginalRate(base, discountValue, regime)
      : { kept: 0, rate: 0, surtaxRate: 0, payrollRate: 0 };
  const taxWithheld = discountValue * m.rate;
  const surtaxLater = discountValue * m.surtaxRate;
  const withheldOnPayslip = taxWithheld - surtaxLater;

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
    marketValueUsd: shares * i.priceAtPurchase,
    discountValue,
    taxRate: m.rate,
    taxWithheld,
    withheldOnPayslip,
    surtaxLater,
    payslipEffect: refunded - withheldOnPayslip,
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

/** One contribution period: where it starts, the day it buys, and whether that
 *  day is behind us. */
export interface EsppWindow {
  /** first day of the accumulation period, ISO */
  start: string;
  /** the day the shares are bought, ISO */
  purchase: string;
  /** the purchase day is behind us, so both prices are real closes */
  closed: boolean;
}

/**
 * How long a closed window stays the one the tool opens on.
 *
 * The day after a purchase, the window that just ended is the one you have
 * questions about: the shares were bought, the discount is taxable pay, and the
 * withholding lands on the payslip of that same month. The window that opened
 * the same morning has one price and five months of nothing — it can only be a
 * projection. So for a month, which is past the payslip that carries the
 * withholding, the tool keeps showing the purchase that happened.
 */
export const CLOSED_WINDOW_GRACE_DAYS = 30;

const shiftDays = (iso: string, days: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

const startOf = (purchase: string, months: number): string => {
  const [y, m, d] = purchase.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 - months, d)).toISOString().slice(0, 10);
};

/**
 * The windows worth offering, oldest first.
 *
 * There is nothing to choose about the dates. A period runs from one purchase
 * day to the next — 1 April to 1 October, 1 October to 1 April — and any other
 * pair of dates describes a plan that does not exist, which is what two free
 * date fields invited you to type. So the tool offers the windows themselves.
 *
 * A window appears once it has **begun**: on the morning of 1 October the
 * period starting that day has not accumulated anything yet, so it shows up the
 * day after. It stays until its purchase is more than `graceDays` behind us,
 * which is what keeps the concluded window available for as long as anyone is
 * still looking at it.
 */
export function esppWindows(
  today: string,
  plan: EsppPlan,
  graceDays: number = CLOSED_WINDOW_GRACE_DAYS
): EsppWindow[] {
  const year = Number(today.slice(0, 4));
  const oldest = shiftDays(today, -graceDays);
  const out: EsppWindow[] = [];
  for (const y of [year - 1, year, year + 1]) {
    for (const md of [...plan.purchaseDays].sort()) {
      const purchase = `${y}-${md}`;
      const start = startOf(purchase, plan.months);
      if (start >= today) continue; // not begun yet
      if (purchase < oldest) continue; // too long gone to still be the question
      out.push({ start, purchase, closed: purchase < today });
    }
  }
  return out.sort((a, b) => a.purchase.localeCompare(b.purchase));
}

/**
 * The days you could have joined the plan on, oldest first.
 *
 * The lookback does not reach back to the start of the purchase period you
 * happen to be in — it reaches back to the day you **enrolled**. Someone who
 * joined last April keeps April's price as the reference for the window that
 * starts in October, and only loses it if October-to-April closes lower.
 * Someone joining in October for the first time gets October's price, which is
 * a different plan for the same six months.
 *
 * That is the single input this tool had no way to express, and it is worth
 * more than any other: two colleagues buying on the same day at the same
 * percentage can end up with very different numbers of shares.
 */
export function enrolmentDates(windowStart: string, plan: EsppPlan, count = 5): string[] {
  const out: string[] = [windowStart];
  for (let k = 1; k < Math.max(1, count); k++) {
    const [y, m, d] = out[0].split("-").map(Number);
    out.unshift(new Date(Date.UTC(y, m - 1 - plan.months, d)).toISOString().slice(0, 10));
  }
  return out;
}

/**
 * The window the tool opens on: the one that just closed if it is still on
 * offer, otherwise the one running now.
 */
export function defaultWindow(
  today: string,
  plan: EsppPlan,
  graceDays: number = CLOSED_WINDOW_GRACE_DAYS
): EsppWindow {
  const all = esppWindows(today, plan, graceDays);
  const closed = all.filter((w) => w.closed);
  if (closed.length) return closed[closed.length - 1];
  if (all.length) return all[0];
  // Only reachable with a plan that has no purchase days at all.
  return { start: today, purchase: today, closed: false };
}
