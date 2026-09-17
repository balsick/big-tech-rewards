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
export const grantUnits = (g: Grant): number =>
  g.priceAtGrant > 0 ? g.valueUsd / g.priceAtGrant : 0;

/** The days the plan vests on, as MM-DD. */
export const VESTING_CALENDAR = ["02-20", "05-20", "08-20", "11-20"];

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

  let given = 0;
  return slices.map((q, i) => {
    const u =
      i === slices.length - 1
        ? Math.round((totalUnits - given) * 1e4) / 1e4
        : Math.round(totalUnits * q * 1e4) / 1e4;
    given += u;
    const natural = addMonths(g.date, step * (i + 1));
    // Fixed dates apply to the schedules they fit: snapping an annual vest to a
    // quarterly calendar would move it by months.
    const date =
      g.usePlanDates && (g.schedule === "quarterly" || g.schedule === "monthly")
        ? nextPlanDate(natural, calendar)
        : natural;
    return { grant: g.id, label: g.label, date, units: u, index: i + 1, total: slices.length };
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
   * The withholding on a vest is not paid in cash: the broker **sells part of
   * the shares the moment they vest** and hands over the tax — "sell to cover".
   * Nobody asks you for money; fewer shares arrive. It is the single most
   * surprising thing about a first vest, so both halves are reported: what is
   * sold and what is left.
   */
  netShares: number;
  /** shares sold on the day to cover the withholding, plus the odd fraction */
  sharesSold: number;
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
}

export interface Projection {
  tranches: Tranche[];
  /** only the ones inside the horizon that have not vested yet */
  upcoming: Tranche[];
  years: RsuYear[];
  totalUnits: number;
  totalGross: number;
  totalNet: number;
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
  const all = i.grants.flatMap((g) => tranches(g, calendar)).sort((a, b) => a.date.localeCompare(b.date));
  const end = addMonths(i.today, Math.round(i.horizonYears * 12));
  const upcoming = all.filter((t) => t.date >= i.today && t.date < end);

  const perUnitEur = i.fxRate > 0 ? i.price / i.fxRate : 0;

  const years = [...new Set(upcoming.map((t) => Number(t.date.slice(0, 4))))]
    .sort()
    .map((year) => {
      const ofYear = upcoming.filter((t) => Number(t.date.slice(0, 4)) === year);
      const units = ofYear.reduce((s, t) => s + t.units, 0);
      const grossEur = units * perUnitEur;
      const m = grossEur > 0 ? marginalRate({ salary: i.salary }, grossEur, regime) : { kept: 1, rate: 0 };
      return {
        year,
        units,
        grossEur,
        taxRate: m.rate,
        netEur: grossEur * m.kept,
        netShares: Math.floor(units * m.kept),
        sharesSold: units - Math.floor(units * m.kept),
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
  const horizonMonths = Math.round(i.horizonYears * 12);
  // Start from the beginning of the calendar quarter today falls in, so the
  // columns line up with real quarters rather than a rolling window.
  const monthToday = Number(i.today.slice(5, 7));
  const start = `${i.today.slice(0, 4)}-${String(Math.floor((monthToday - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
  for (let k = 0; k < Math.ceil(horizonMonths / 3) + 1; k++) {
    const from = addMonths(start, k * 3);
    const to = addMonths(start, (k + 1) * 3);
    if (from >= end) break;
    const inside = upcoming.filter((t) => t.date >= from && t.date < to);
    const byGrant = i.grants
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
    });
  }

  return {
    tranches: all,
    upcoming,
    years,
    totalUnits: upcoming.reduce((s, t) => s + t.units, 0),
    totalGross: years.reduce((s, y) => s + y.grossEur, 0),
    totalNet: years.reduce((s, y) => s + y.netEur, 0),
    quarters,
  };
}

/** Salary on its own, to show how much the RSUs change the year. */
export const salaryOnly = (salary: number, regime?: TaxRegime) => grossToNet({ salary }, regime);
