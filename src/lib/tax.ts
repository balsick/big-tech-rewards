// Italian payroll taxation, for one purpose only: **how much is left of one
// more euro**.
//
// RSUs and ESPP are not stock market gains. At vesting and at purchase they are
// employment income stacked on top of your salary, so the average rate on your
// payslip tells you nothing — what counts is the bracket that extra income
// lands in. That is why this file exists, and why both tools ask for a salary.
//
// Every parameter lives here, in one place. The ones that change from town to
// town are editable from the UI: local surtaxes are the only part of this
// calculation that no national constant can guess.

export const TAX_YEAR = 2026;

// --------------------------------------------------------- social security

/**
 * Employee-side social security (INPS).
 *
 * `rate` is the 9.19% of the employee pension fund; `minorRates` collects the
 * smaller contributions most payslips always add (short-time work funds, wage
 * guarantee funds), which vary by sector and company size — hence a field and
 * not a constant.
 *
 * Above the first pensionable band an extra 1% applies, and above the annual
 * ceiling contributions stop altogether. The ceiling applies to anyone enrolled
 * after 1995, which is everybody likely to be using this.
 */
export interface SocialSecurityParams {
  /** base employee rate, in percent */
  rate: number;
  /** additional minor contributions, in percent */
  minorRates: number;
  /** above this amount the extra 1% kicks in */
  firstBandCap: number;
  /** above this amount nothing more is due */
  ceiling: number;
  applyCeiling: boolean;
}

export const SOCIAL_SECURITY_2026: SocialSecurityParams = {
  rate: 9.19,
  minorRates: 0.5666,
  firstBandCap: 56224,
  ceiling: 122295,
  applyCeiling: true,
};

export function socialSecurity(gross: number, p: SocialSecurityParams): number {
  const base = p.applyCeiling ? Math.min(Math.max(0, gross), p.ceiling) : Math.max(0, gross);
  const ordinary = ((p.rate + p.minorRates) / 100) * base;
  const extra = base > p.firstBandCap ? 0.01 * (base - p.firstBandCap) : 0;
  return ordinary + extra;
}

// ----------------------------------------------------------------- income tax

export interface Bracket {
  /** upper bound of the bracket; `null` means "and above". */
  upTo: number | null;
  /** rate in percent */
  rate: number;
}

/**
 * The 2026 brackets: the budget law cut the second one from 35% to 33%.
 *
 * They are progressive **by bracket**, not by band: someone over 28,000 does
 * not pay 33% on everything, they pay it on the slice between 28,000 and
 * 50,000.
 */
export const INCOME_TAX_2026: Bracket[] = [
  { upTo: 28000, rate: 23 },
  { upTo: 50000, rate: 33 },
  { upTo: null, rate: 43 },
];

/** Tax on any set of brackets, genuinely applied bracket by bracket. */
export function applyBrackets(amount: number, brackets: Bracket[]): number {
  let left = Math.max(0, amount);
  let previous = 0;
  let tax = 0;
  for (const b of brackets) {
    const cap = b.upTo ?? Infinity;
    const slice = Math.min(left, cap - previous);
    if (slice <= 0) break;
    tax += (slice * b.rate) / 100;
    left -= slice;
    previous = cap;
  }
  return tax;
}

export const grossIncomeTax = (amount: number, brackets = INCOME_TAX_2026) =>
  applyBrackets(amount, brackets);

// ------------------------------------------------------------------- credits

/**
 * Employment income tax credit (art. 13 §1 of the Italian income tax code).
 *
 * This is not a detail. It is why someone on 30,000 does not pay the average
 * 23%, and above all it is why **the real marginal rate does not match the
 * bracket**. Between 28,000 and 50,000 the credit phases out linearly, and
 * every extra euro takes 1,910/22,000 = 8.7 cents of it away on top of the 33%.
 * In that stretch the true margin approaches 50%, and no bracket table says so.
 */
export function employmentCredit(totalIncome: number): number {
  const i = Math.max(0, totalIncome);
  if (i <= 15000) return 1955;
  if (i <= 28000) return 1910 + (1190 * (28000 - i)) / 13000;
  if (i <= 50000) return (1910 * (50000 - i)) / 22000;
  return 0;
}

/**
 * The now-permanent payroll tax cut: below 20,000 a sum added to net pay (not a
 * credit, it does not reduce tax), and between 20,000 and 40,000 an extra
 * credit that fades out after 32,000.
 */
export function extraCredit(totalIncome: number): number {
  const i = Math.max(0, totalIncome);
  if (i <= 20000) return 0;
  if (i <= 32000) return 1000;
  if (i <= 40000) return (1000 * (40000 - i)) / 8000;
  return 0;
}

export function lowIncomeSupplement(employmentIncome: number): number {
  const i = Math.max(0, employmentIncome);
  if (i <= 0 || i > 20000) return 0;
  const pct = i <= 8500 ? 7.1 : i <= 15000 ? 5.3 : 4.8;
  return (i * pct) / 100;
}

/**
 * Above 200,000 of total income the benefit of the 33% rate is neutralised by
 * cutting credits by 440 euro. It affects very few people, but those it does
 * affect notice, and they are right to wonder.
 */
const CLAWBACK_ABOVE_200K = 440;
const CLAWBACK_THRESHOLD = 200000;

// ------------------------------------------------------------ local surtaxes

/**
 * Regional and municipal surtaxes: the only part of this calculation with no
 * national answer. They are about 1,800 euro a year on a 50,000 salary and
 * nearly double from one region to the next, so they are editable bracket by
 * bracket rather than hard-coded.
 *
 * `exemption` is a **threshold, not an allowance**: if income exceeds it, the
 * surtax is due on the **whole** income, not on the excess. That is how
 * municipalities write it, and getting it wrong changes the result by hundreds
 * of euro for exactly the people who earn least.
 */
export interface Surtax {
  brackets: Bracket[];
  exemption: number;
}

/** Piedmont, tax years 2026-2027 (1.23% base rate plus surcharges). */
export const REGIONAL_PIEDMONT: Surtax = {
  brackets: [
    { upTo: 15000, rate: 1.62 },
    { upTo: 28000, rate: 2.68 },
    { upTo: 50000, rate: 3.31 },
    { upTo: null, rate: 3.33 },
  ],
  exemption: 0,
};

/** Turin: city council resolution 195/2022, confirmed for 2026. */
export const MUNICIPAL_TURIN: Surtax = {
  brackets: [
    { upTo: 28000, rate: 0.8 },
    { upTo: 50000, rate: 1.1 },
    { upTo: null, rate: 1.2 },
  ],
  exemption: 11790,
};

export function surtax(amount: number, s: Surtax): number {
  if (amount <= s.exemption) return 0;
  return applyBrackets(amount, s.brackets);
}

// ------------------------------------------------------------ gross to net

export interface TaxRegime {
  brackets: Bracket[];
  socialSecurity: SocialSecurityParams;
  regional: Surtax;
  municipal: Surtax;
  /** how many payslips make a year, extra months included */
  payPeriods: number;
}

export const DEFAULT_REGIME: TaxRegime = {
  brackets: INCOME_TAX_2026,
  socialSecurity: SOCIAL_SECURITY_2026,
  regional: REGIONAL_PIEDMONT,
  municipal: MUNICIPAL_TURIN,
  payPeriods: 14,
};

export interface GrossPay {
  salary: number;
  bonus?: number;
  /** RSUs at vesting and ESPP: employment income like everything else. */
  equity?: number;
  other?: number;
}

export interface NetPay {
  gross: number;
  socialSecurity: number;
  taxableIncome: number;
  grossTax: number;
  credits: number;
  incomeTax: number;
  regionalSurtax: number;
  municipalSurtax: number;
  supplement: number;
  net: number;
  /** how much of every gross euro is left, on average */
  keptShare: number;
  perPayPeriod: number;
  payPeriods: number;
}

export function grossToNet(pay: GrossPay, r: TaxRegime = DEFAULT_REGIME): NetPay {
  const gross = Math.max(0, pay.salary + (pay.bonus ?? 0) + (pay.equity ?? 0) + (pay.other ?? 0));
  const contributions = socialSecurity(gross, r.socialSecurity);
  const taxable = gross - contributions;

  const grossTax = grossIncomeTax(taxable, r.brackets);
  let credits = employmentCredit(taxable) + extraCredit(taxable);
  if (taxable > CLAWBACK_THRESHOLD) credits = Math.max(0, credits - CLAWBACK_ABOVE_200K);
  // Credits reduce tax, they do not turn it negative: what is left over is lost
  // headroom, not a refund.
  const incomeTax = Math.max(0, grossTax - credits);

  const regional = surtax(taxable, r.regional);
  const municipal = surtax(taxable, r.municipal);
  // The low-income supplement does not reduce tax: it is added to net pay.
  const supplement = lowIncomeSupplement(taxable);

  const net = taxable - incomeTax - regional - municipal + supplement;
  return {
    gross,
    socialSecurity: contributions,
    taxableIncome: taxable,
    grossTax,
    credits: Math.min(credits, grossTax),
    incomeTax,
    regionalSurtax: regional,
    municipalSurtax: municipal,
    supplement,
    net,
    keptShare: gross > 0 ? net / gross : 0,
    perPayPeriod: net / r.payPeriods,
    payPeriods: r.payPeriods,
  };
}

/**
 * How much of one more gross euro actually survives.
 *
 * Computed by difference rather than with a formula, because four things pile
 * up at the margin: the income tax bracket, the employment credit phasing out,
 * the extra 1% of social security above the first band, and the surtax
 * brackets. Adding those up by hand is precisely the calculation nobody gets
 * right.
 */
export function marginalRate(
  base: GrossPay,
  extra: number,
  r: TaxRegime = DEFAULT_REGIME
): { net: number; kept: number; rate: number } {
  if (extra === 0) return { net: 0, kept: 0, rate: 0 };
  const before = grossToNet(base, r).net;
  const after = grossToNet({ ...base, equity: (base.equity ?? 0) + extra }, r).net;
  const net = after - before;
  const kept = net / extra;
  return { net, kept, rate: 1 - kept };
}
