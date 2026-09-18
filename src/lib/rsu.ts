import { grossToNet, marginalRate, type TaxRegime } from "./tax.ts";

// RSUs: granted units that turn into shares a slice at a time.
//
// Two things, and they are different. **The units are the fact**: how many were
// granted and when they become yours, and they do not change because the market
// had a bad day. **The value is a lens**: what they would be worth at a given
// price, useful for the order of magnitude and useless for anything else,
// because that money is not yours and tomorrow is another price.
//
// What this tool adds is the **projection**. With a new grant every year and
// quarterly vesting, in any given year slices of three or four different grants
// vest, and the total landing in that year sets the rate for all of it. One
// grant at a time is the wrong way to look at it: hence a list of grants and a
// three-year horizon.

export type VestingSchedule = "annual" | "30-30-40" | "quarterly" | "monthly";

export interface Grant {
  id: string;
  label: string;
  /** grant date, ISO */
  date: string;
  /**
   * The value granted, in dollars.
   *
   * This is how a grant is communicated — "we are giving you $20,000 in RSUs" —
   * and not in units: the units are the *result*, and the share price on the
   * grant date sets them. Asking for units would mean doing by hand the
   * division the plan has already done.
   */
  valueUsd: number;
  /**
   * The share price on the grant date, which turns dollars into units.
   *
   * It belongs to the grant and not to the global parameters because it is a
   * property of *that* grant: two awards from different years are worth the
   * same in dollars and a completely different number of shares, which is
   * exactly why an old grant is worth more today than a new one.
   */
  priceAtGrant: number;
  schedule: VestingSchedule;
  /** total length of the plan, in years */
  years: number;
  /** whether vesting snaps to the plan calendar instead of the grant date */
  usePlanDates: boolean;
  /**
   * Whether this award is scaled by the performance rating.
   *
   * An annual bonus grant is: the dollar figure in the letter is the target,
   * and what is actually awarded moves with personal and company performance. A
   * welcome grant is not — it is agreed when you are hired and does not depend
   * on a review that has not happened. Stored per grant rather than inferred
   * from the label or the row order, both of which the user can change.
   */
  performanceLinked?: boolean;
}

/**
 * A fresh id for a grant.
 *
 * It has to be collision-proof, not merely unique-so-far. A counter starting at
 * zero on every page load is neither: restore five saved grants with ids g1..g5
 * and the very next "add" hands out g1 again. Two rows then share an id, the
 * patch-by-id updates both, and editing one grant silently edits another — with
 * React reusing one of them for two keys on top. Nothing throws; the numbers
 * just stop meaning what the form says.
 */
export const newGrantId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `g${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Hand every entry an id of its own.
 *
 * Applied to whatever comes back from storage, so a save written by the broken
 * version heals itself on the next load instead of staying quietly corrupt.
 * Ids are internal and nothing outside the list refers to them — the colours
 * come from the position — so replacing them costs nothing.
 */
export function withUniqueIds<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.map((item) => {
    if (item.id && !seen.has(item.id)) {
      seen.add(item.id);
      return item;
    }
    const id = newGrantId();
    seen.add(id);
    return { ...item, id };
  });
}

/** The units that grant produced: dollars awarded / price on the day. */
/**
 * The units a grant is worth: the dollar value over the fair market value,
 * **rounded up** to a whole share.
 *
 * Up, not to the nearest: the plan document is explicit about it, and it is the
 * difference between a figure that matches the broker's statement and one that
 * is plausibly close. $20,000 at a $146.32 fair market value is 136.69, and
 * what is granted is 137.
 */
export const grantUnits = (g: Grant): number =>
  g.priceAtGrant > 0 ? Math.ceil(g.valueUsd / g.priceAtGrant) : 0;

/** The days the plan vests on, as MM-DD. */
export const VESTING_CALENDAR = ["02-20", "05-20", "08-20", "11-20"];

/**
 * The rate the withholding at vesting is computed at.
 *
 * Not your tax rate: the plan withholds at a flat **supplemental** rate, the
 * same one used for a cash bonus, and your real liability is settled later on a
 * payslip. In Italy the marginal rate on a vest sits above this, so the usual
 * case is a further deduction — but the settlement runs both ways, and a rate
 * below this one means a refund.
 *
 * The mechanism is what makes the share count surprising: MORE shares reach
 * your account than your tax rate would suggest, because the withholding is
 * computed at this rate and not at yours.
 */
export const WITHHOLDING_RATE = 0.4633;

/**
 * The day clamps to a short month: a grant made on 31 January vests on 28
 * February, not on 3 March.
 */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = m - 1 + months;
  const year = y + Math.floor(total / 12);
  const month = (total % 12) + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/** The first plan-calendar date falling on or after `iso`. */
function nextPlanDate(iso: string, calendar: string[]): string {
  const year = Number(iso.slice(0, 4));
  const days = [...calendar].sort();
  for (const y of [year, year + 1]) {
    for (const md of days) {
      const date = `${y}-${md}`;
      if (date >= iso) return date;
    }
  }
  return iso;
}

export interface Tranche {
  grant: string;
  label: string;
  date: string;
  units: number;
  index: number;
  total: number;
  /**
   * The part of `units` that came from dividend equivalents rather than from
   * the grant itself. Kept separately so the total can be reported: it is
   * units nobody was promised, and it is not small over three years.
   */
  fromDividends: number;
}

/**
 * The tranches of a grant.
 *
 * The slices stay fractional — 30% of 479 is 143.7, not 144 — because that is
 * how the plan is written: rounding to whole shares happens at vesting, on what
 * is left after withholding, and the leftover fraction is paid in cash.
 * Rounding here would mean rounding twice, the second time on the wrong number.
 */
export function tranches(g: Grant, calendar = VESTING_CALENDAR): Tranche[] {
  const years = Math.max(1, Math.round(g.years));
  const totalUnits = grantUnits(g);
  const slices: number[] =
    g.schedule === "30-30-40"
      ? [0.3, 0.3, 0.4]
      : g.schedule === "annual"
        ? Array.from({ length: years }, () => 1 / years)
        : g.schedule === "quarterly"
          ? Array.from({ length: years * 4 }, () => 1 / (years * 4))
          : Array.from({ length: years * 12 }, () => 1 / (years * 12));
  const step = g.schedule === "quarterly" ? 3 : g.schedule === "monthly" ? 1 : 12;

  // Whole shares per vest, from the **running total**.
  //
  // What has to be a whole number is the amount vested *so far*, so each vest
  // is the difference between two floored cumulative totals. That is not the
  // same as rounding each slice on its own, and the difference is visible: 479
  // units over 30-30-40 comes out 143 / 144 / 192, where rounding each slice
  // by largest remainder gives 144 / 144 / 191. The first is what the plan
  // actually awards — checked against a real grant of $70,000.
  //
  // It also explains the thing people notice on quarterly plans: 461 over
  // twelve quarters lands as a mixture of 38s and 39s, never a tidy 38.4167.
  const cumulative: number[] = [];
  let running = 0;
  for (const q of slices) {
    running += q;
    cumulative.push(running);
  }
  const vested = cumulative.map((f, i) =>
    // The last one takes the exact total, so nothing is lost to the floor.
    i === slices.length - 1 ? Math.round(totalUnits) : Math.floor(totalUnits * f)
  );
  const perVest = vested.map((v, i) => v - (i ? vested[i - 1] : 0));

  let given = 0;
  return slices.map((_, i) => {
    const u = perVest[i];
    given += u;
    const natural = addMonths(g.date, step * (i + 1));
    // Fixed dates apply to the schedules they fit: snapping an annual vest to a
    // quarterly calendar would move it by months.
    const date =
      g.usePlanDates && (g.schedule === "quarterly" || g.schedule === "monthly")
        ? nextPlanDate(natural, calendar)
        : natural;
    return { grant: g.id, label: g.label, date, units: u, index: i + 1, total: slices.length, fromDividends: 0 };
  });
}

export interface RsuYear {
  year: number;
  units: number;
  grossEur: number;
  taxRate: number;
  netEur: number;
  /**
   * Shares that actually reach your account.
   *
   * The withholding on a vest is not paid in cash: the company **keeps back
   * part of the shares** the moment they vest and remits the tax itself. Nobody
   * asks you for money; fewer shares arrive. It is the single most surprising
   * thing about a first vest, so both halves are reported — what is kept and
   * what is left.
   */
  netShares: number;
  /**
   * Shares kept back to cover the withholding, rounded **up** to a whole share.
   *
   * Nothing is sold. The plan moved from sell to cover to **net share
   * withholding**: the company simply does not hand over these shares and
   * remits the tax itself. No market transaction, nothing to report as a sale,
   * and — the part that matters — the price after the vesting day cannot change
   * this number, because it is fixed on the vest-date fair market value.
   */
  sharesWithheld: number;
  /**
   * The flat rate the withholding was computed at — `WITHHOLDING_RATE`, the
   * supplemental rate, the same for everyone regardless of their own bracket.
   */
  withholdingRate: number;
  /**
   * The settlement on a later payslip: `grossEur * (taxRate - withholdingRate)`.
   *
   * **Signed.** Positive is a further deduction, which is the usual Italian
   * case; negative is a refund, which is what happens when your own rate is
   * below the supplemental one. Reporting only the positive half would have
   * been a tool that tells you when you lose and goes quiet when you win.
   */
  payslipAdjustmentEur: number;
  /**
   * Whether this year is only counted from today.
   *
   * Every year in the horizon is a whole one except the current, which is
   * already half spent — what vested before today vested, and no window can
   * bring it back. Reported so its card can say so instead of looking like a
   * thin year.
   */
  partial: boolean;
  tranches: Tranche[];
}

export interface ChartPeriod {
  /** start of the period, ISO */
  from: string;
  year: number;
  /** 1..4 */
  quarter: number;
  byGrant: { grant: string; units: number }[];
  units: number;
  grossEur: number;
  /**
   * The day the quarter's shares actually land, or null for an empty one.
   *
   * The quarter is the grouping, but the plan vests on a date — 20 February,
   * not "Q1" — and that date is what you put in a calendar. Computed here so
   * both the walkthrough and the full tool read the same one instead of each
   * deriving it from the tranche list.
   */
  vestOn: string | null;
  /**
   * The year's rate, carried onto the quarter.
   *
   * There is no such thing as a quarter's own rate: the taxman adds up
   * everything that vests in the same calendar year, so the rate is the year's
   * and every quarter inside it shares one. Repeated here so a quarterly row
   * can show what was withheld from it without having to look its year up.
   */
  taxRate: number;
  netEur: number;
  /** shares that reach the account this quarter — see `netShares` on RsuYear */
  netShares: number;
  /** kept back on the vesting day to cover the withholding */
  sharesWithheld: number;
  /** the flat rate withheld, and the signed settlement on a later payslip */
  withholdingRate: number;
  payslipAdjustmentEur: number;
}

export interface Projection {
  tranches: Tranche[];
  /** only the ones inside the horizon that have not vested yet */
  upcoming: Tranche[];
  years: RsuYear[];
  totalUnits: number;
  totalGross: number;
  totalNet: number;
  /**
   * Whole shares that reach the account over the whole horizon.
   *
   * The sum of the years, not a rounding of the total: each year withholds at
   * its own rate and rounds once, so re-deriving this from the totals would
   * disagree with the rows it sits under.
   */
  totalNetShares: number;
  /** what those shares are worth at the projection's price */
  netSharesEur: number;
  /** the same, in the currency the shares are actually quoted in */
  netSharesUsd: number;
  /**
   * The payslip settlements summed over the horizon, signed: what the flat
   * withholding got wrong in either direction, and the figure nobody expects.
   */
  totalPayslipAdjustmentEur: number;
  /** units credited as dividend equivalents inside the horizon */
  dividendUnits: number;
  /** euro per share, the rate every figure here was converted with */
  perUnitEur: number;
  /** quarter by quarter, for the chart */
  quarters: ChartPeriod[];
}

export interface RsuInput {
  grants: Grant[];
  /** USD per share */
  price: number;
  /** dollars per euro */
  fxRate: number;
  salary: number;
  /** the day the horizon starts from */
  today: string;
  /** how many years to look ahead */
  horizonYears: number;
  calendar?: string[];
  /**
   * The performance rating, as a multiplier: 1 is target, 0.75 and 1.5 the ends
   * of the band. Applied only to the grants that carry `performanceLinked`.
   */
  performance?: number;
  /**
   * The dividend payment history: date, dollars per share, and the close of
   * that day. Unvested RSUs are credited with dividend equivalents at every
   * payment, so this changes the unit count and not just the colour of a note.
   *
   * Payments past the last one given are projected forward at the same amount
   * and cadence, priced at `price` — an assumption, and the caller is expected
   * to say so on screen.
   */
  dividends?: { date: string; amount: number; close: number }[];
}

/**
 * The three-year projection.
 *
 * The rate is computed **per year**, not per tranche: the taxman adds up
 * everything vesting in the same year on top of that year's salary, so a
 * €10,000 tranche in a year where another €30,000 vests is taxed at the margin
 * of €40,000, not of its own. That is why the calculation cannot be done grant
 * by grant, and the reason this function exists.
 */
export function project(i: RsuInput, regime?: TaxRegime): Projection {
  const calendar = i.calendar ?? VESTING_CALENDAR;
  // The rating scales the dollar value of the awards that depend on it, before
  // anything else happens: units, tranches, tax and share counts all follow
  // from that figure, so scaling it here means nothing downstream has to know
  // the rating exists.
  const performance = i.performance ?? 1;
  const grants =
    performance === 1
      ? i.grants
      : i.grants.map((g) => (g.performanceLinked ? { ...g, valueUsd: g.valueUsd * performance } : g));
  // The horizon runs to the end of a calendar year; the dividend projection
  // below needs to know where to stop, so it is worked out first.
  const end = `${Number(i.today.slice(0, 4)) + Math.round(i.horizonYears) + 1}-01-01`;
  const all = grants.flatMap((g) => tranches(g, calendar)).sort((a, b) => a.date.localeCompare(b.date));

  // Dividend equivalents: the units nobody tells you about.
  //
  // Every time a dividend is paid, the **unvested** RSUs are credited with
  // extra units worth that dividend — (unvested x amount) / close on the day.
  // Over three years of quarterly vesting and quarterly dividends that is a few
  // percent more shares than the grant letter says, and it compounds, because
  // the credited units are themselves unvested and earn the next one.
  //
  // Only payments after a grant's own date touch it, and a credit is spread
  // across that grant's remaining tranches in proportion to their size, since
  // that is the pool it was credited to.
  const paid = [...(i.dividends ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  // Beyond the last known payment the series is projected: same amount, same
  // quarterly cadence, priced at today's share price. An assumption, and one
  // the caller is expected to put on screen rather than hide.
  if (paid.length && i.price > 0) {
    const last = paid[paid.length - 1];
    for (let d = addMonths(last.date, 3); d < end; d = addMonths(d, 3)) {
      paid.push({ date: d, amount: last.amount, close: i.price });
    }
  }
  for (const g of grants) {
    const mine = all.filter((t) => t.grant === g.id).sort((a, b) => a.date.localeCompare(b.date));
    // What the grant alone would deliver, kept so the dividend part can be
    // named afterwards rather than accumulated through the rounding.
    const granted = mine.map((t) => t.units);

    for (const pay of paid) {
      if (pay.date < g.date || pay.close <= 0) continue;
      const ahead = mine.filter((t) => t.date > pay.date);
      const unvested = ahead.reduce((sum, t) => sum + t.units, 0);
      if (unvested <= 0) continue;
      const credit = (unvested * pay.amount) / pay.close;
      for (const t of ahead) t.units += credit * (t.units / unvested);
    }

    // A vest is a whole number of shares, dividend equivalents included.
    //
    // The equivalents accrue as fractions — the plan's own example credits
    // 0.227 of a unit — but nothing vests 39.2534 shares. So the same rule as
    // the grant applies to the total: the amount vested *to date* is floored,
    // and each vest is the difference. A credit is assigned only to vests that
    // have not happened yet, so by the time a vest arrives its number is
    // final and this stays monotone.
    //
    // What is left at the end is under one share and is not delivered; plans
    // settle that residue in cash.
    let cumulative = 0;
    let delivered = 0;
    mine.forEach((t, k) => {
      cumulative += t.units;
      const upTo = Math.floor(cumulative + 1e-9);
      t.units = upTo - delivered;
      delivered = upTo;
      t.fromDividends = t.units - granted[k];
    });
  }
  // A year closes on 31 December, so the horizon does too: a window that
  // stopped in mid-September left the last card holding three quarters instead
  // of four, which reads as the plan tailing off when it is only the window
  // closing. Years you cannot compare are not worth putting side by side.
  const upcoming = all.filter((t) => t.date >= i.today && t.date < end);

  const perUnitEur = i.fxRate > 0 ? i.price / i.fxRate : 0;

  const years = [...new Set(upcoming.map((t) => Number(t.date.slice(0, 4))))]
    .sort()
    .map((year) => {
      const ofYear = upcoming.filter((t) => Number(t.date.slice(0, 4)) === year);
      const units = ofYear.reduce((s, t) => s + t.units, 0);
      const grossEur = units * perUnitEur;
      const m = grossEur > 0 ? marginalRate({ salary: i.salary }, grossEur, regime) : { kept: 1, rate: 0 };
      // The withholding is at the flat supplemental rate, not at yours. That is
      // what decides how many shares are kept back — and therefore how many
      // arrive — while your own rate only decides the settlement afterwards.
      // Flooring what arrives is the same arithmetic as rounding the withheld
      // shares UP, which is what the plan document specifies.
      const withholdingRate = WITHHOLDING_RATE;
      const netShares = Math.floor(units * (1 - withholdingRate));
      return {
        year,
        units,
        grossEur,
        taxRate: m.rate,
        netEur: grossEur * m.kept,
        netShares,
        sharesWithheld: units - netShares,
        withholdingRate,
        payslipAdjustmentEur: grossEur * (m.rate - withholdingRate),
        partial: i.today > `${year}-01-01`,
        tranches: ofYear,
      };
    });

  // The chart runs on **quarters**, not months.
  //
  // Thirty-six columns are five pixels wide on a phone, and nine out of ten are
  // empty: a quarterly plan produces at most twelve vests in three years. The
  // month adds nothing the quarter does not already say — the chart's
  // granularity should be the plan's, not the calendar's — and at a dozen
  // columns the bars are finally wide enough to carry their own value above
  // them. Empty periods stay in the list: they are the information, not noise.
  const quarters: ChartPeriod[] = [];
  // Start from the beginning of the calendar quarter today falls in, so the
  // columns line up with real quarters rather than a rolling window.
  const monthToday = Number(i.today.slice(5, 7));
  const start = `${i.today.slice(0, 4)}-${String(Math.floor((monthToday - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
  // The count comes from `end` and nothing else. It used to come from
  // `horizonYears * 12`, which was the same number until the horizon started
  // rounding up to the end of the year — after which the chart quietly stopped
  // a quarter short of the years the cards below it were showing.
  for (let k = 0; k < 200; k++) {
    const from = addMonths(start, k * 3);
    const to = addMonths(start, (k + 1) * 3);
    if (from >= end) break;
    const inside = upcoming.filter((t) => t.date >= from && t.date < to);
    const byGrant = grants
      .map((g) => ({
        grant: g.id,
        units: inside.filter((t) => t.grant === g.id).reduce((s, t) => s + t.units, 0),
      }))
      .filter((x) => x.units > 0);
    const units = inside.reduce((s, t) => s + t.units, 0);
    quarters.push({
      from,
      year: Number(from.slice(0, 4)),
      quarter: Math.floor(Number(from.slice(5, 7)) / 3) + 1,
      byGrant,
      units,
      grossEur: units * perUnitEur,
      vestOn: inside.length ? inside[0].date : null,
      // filled in below, once the year they belong to is known
      taxRate: 0,
      netEur: 0,
      netShares: 0,
      sharesWithheld: 0,
      withholdingRate: 0,
      payslipAdjustmentEur: 0,
    });
  }

  // The shares a single quarter leaves you with.
  //
  // The rate is the year's and cannot be anything else, but the shares arrive a
  // quarter at a time, and "how many land in February" is the question people
  // actually ask. So each quarter takes its year's rate — which is also what
  // the broker does: it withholds at every vest and the year reconciles.
  //
  // The integer count is split by **largest remainder** rather than by
  // rounding each quarter on its own. Rounding independently makes the parts
  // add up to one or two shares away from the year's figure, and a table whose
  // rows contradict the total printed under them is worse than no table: you
  // stop trusting both numbers. Largest remainder makes the parts sum to the
  // year exactly, and puts the spare share where the fraction was biggest.
  for (const y of years) {
    const mine = quarters.filter((q) => q.year === y.year && q.units > 0);
    if (!mine.length) continue;
    // The share count follows the WITHHELD rate, the euro net follows your own:
    // two different questions, and the flat rate only touches the first.
    const arriving = 1 - y.withholdingRate;
    const ideal = mine.map((q) => q.units * arriving);
    const floors = ideal.map((v) => Math.floor(v));
    const byFraction = ideal
      .map((v, k) => ({ k, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac);
    const spare = new Array(mine.length).fill(0);
    let left = y.netShares - floors.reduce((a, b) => a + b, 0);
    for (let j = 0; left > 0 && j < byFraction.length; j++, left--) spare[byFraction[j].k] = 1;
    mine.forEach((q, k) => {
      q.taxRate = y.taxRate;
      q.withholdingRate = y.withholdingRate;
      q.netEur = q.grossEur * (1 - y.taxRate);
      q.netShares = floors[k] + spare[k];
      q.sharesWithheld = q.units - q.netShares;
      q.payslipAdjustmentEur = q.grossEur * (y.taxRate - y.withholdingRate);
    });
  }

  const totalNetShares = years.reduce((s, y) => s + y.netShares, 0);

  return {
    tranches: all,
    upcoming,
    years,
    totalUnits: upcoming.reduce((s, t) => s + t.units, 0),
    totalGross: years.reduce((s, y) => s + y.grossEur, 0),
    totalNet: years.reduce((s, y) => s + y.netEur, 0),
    totalNetShares,
    netSharesEur: totalNetShares * perUnitEur,
    netSharesUsd: totalNetShares * i.price,
    totalPayslipAdjustmentEur: years.reduce((s2, y) => s2 + y.payslipAdjustmentEur, 0),
    dividendUnits: upcoming.reduce((s2, t) => s2 + t.fromDividends, 0),
    perUnitEur,
    quarters,
  };
}

/** Salary on its own, to show how much the RSUs change the year. */
export const salaryOnly = (salary: number, regime?: TaxRegime) => grossToNet({ salary }, regime);

/**
 * A grant as the form holds it: everything except the price, which is derived
 * from the date unless the user overrode it.
 *
 * It lives here rather than in the component because three views now read the
 * same grants — the RSU tool, the walkthrough and the total reward — and a type
 * owned by one of them would make the other two import from a sibling.
 */
export type GrantInput = Omit<Grant, "priceAtGrant"> & { typedPrice: number | null };

/**
 * What the RSU tool opens with: a welcome grant and three years of annual
 * bonuses.
 *
 * One grant is the wrong picture of this kind of package. A welcome grant
 * vesting 30-30-40 puts its weight at the end, an annual bonus vests in
 * quarterly slices, and a new bonus lands every year — so in any given year
 * pieces of three or four different awards vest at once, and it is their total
 * that sets the tax rate. Starting with three years of bonuses means the first
 * screen already shows that overlap instead of a single tidy grant that nobody
 * actually has.
 *
 * The bonuses carry `performanceLinked`: their dollar figure is a target that
 * moves with the review. The welcome grant does not — it was agreed at hire.
 */
export function initialGrants(
  today: string,
  welcomeUsd = 20000,
  bonusUsd = 10000,
  bonusYears = 3
): GrantInput[] {
  const year = Number(today.slice(0, 4));
  return [
    {
      id: newGrantId(),
      label: "Welcome grant",
      date: `${year}-02-20`,
      valueUsd: welcomeUsd,
      schedule: "30-30-40",
      years: 3,
      usePlanDates: false,
      performanceLinked: false,
      typedPrice: null,
    },
    ...Array.from({ length: bonusYears }, (_, k) => ({
      id: newGrantId(),
      label: `Bonus ${year + k}`,
      date: `${year + k}-11-20`,
      valueUsd: bonusUsd,
      schedule: "quarterly" as VestingSchedule,
      years: 3,
      usePlanDates: true,
      performanceLinked: true,
      typedPrice: null,
    })),
  ];
}

/** The performance band: the rating scales the bonus grants between these. */
export const PERFORMANCE_STEPS = [0.75, 1, 1.25, 1.5];
