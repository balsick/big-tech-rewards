import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MUNICIPAL_TURIN,
  INCOME_TAX_2026,
  DEFAULT_REGIME,
  REGIONAL_PIEDMONT,
  surtax,
  socialSecurity,
  grossToNet,
  employmentCredit,
  grossIncomeTax,
  marginalRate,
  extraCredit,
  SOCIAL_SECURITY_2026,
  type TaxRegime,
} from "../src/lib/tax.ts";
import { dividends, history } from "../src/lib/prices.ts";
import { buildCalendar, extraPayMonths } from "../src/lib/calendar.ts";
import {
  guaranteedFloor,
  simulateEspp,
  ESPP_PLAN,
  expectedContribution,
  esppWindows,
  defaultWindow,
  enrolmentDates,
  CLOSED_WINDOW_GRACE_DAYS,
} from "../src/lib/espp.ts";
import {
  project,
  WITHHOLDING_RATE,
  PERFORMANCE_STEPS,
  initialOneOff,
  initialAnnual,
  annualValueFor,
  expandAnnual,
  VESTING_CALENDAR,
  tranches,
  addMonths,
  grantUnits,
  newGrantId,
  withUniqueIds,
  type Grant,
} from "../src/lib/rsu.ts";
import { toField, parseNum, eur0, num, usd } from "../src/lib/format.ts";

const near = (a: number, b: number, eps = 0.01) =>
  assert.ok(Math.abs(a - b) < eps, `${a} != ${b} (tolerance ${eps})`);

test("income tax applies bracket by bracket, not band by band", () => {
  near(grossIncomeTax(28000), 6440);
  near(grossIncomeTax(50000), 6440 + 22000 * 0.33); // 13.700
  near(grossIncomeTax(60000), 13700 + 10000 * 0.43); // 18.000
  // the bug the spreadsheet had: on 30,000 the tax cannot exceed the income
  assert.ok(grossIncomeTax(30000) < 30000);
  near(grossIncomeTax(30000), 6440 + 2000 * 0.33);
});

test("surtax comunale di Torino: 466 euro su 50.000, come in busta", () => {
  near(surtax(50000, MUNICIPAL_TURIN), 466);
  near(surtax(28000, MUNICIPAL_TURIN), 224);
  // 1.2% at the margin above 50,000
  near(surtax(51000, MUNICIPAL_TURIN) - surtax(50000, MUNICIPAL_TURIN), 12);
});

test("the municipal exemption is a threshold, not an allowance", () => {
  assert.equal(surtax(11790, MUNICIPAL_TURIN), 0);
  // one euro over the threshold is charged on the WHOLE income, not the excess
  near(surtax(11791, MUNICIPAL_TURIN), 11791 * 0.008);
});

test("surtax regionale Piemonte 2026-2027", () => {
  near(surtax(15000, REGIONAL_PIEDMONT), 243);
  near(surtax(50000, REGIONAL_PIEDMONT), 243 + 13000 * 0.0268 + 22000 * 0.0331); // 1.319,60
  near(surtax(60000, REGIONAL_PIEDMONT) - surtax(50000, REGIONAL_PIEDMONT), 333);
});

test("employment income tax credit, art. 13", () => {
  near(employmentCredit(15000), 1955);
  near(employmentCredit(28000), 1910);
  near(employmentCredit(39000), 955);
  near(employmentCredit(50000), 0);
  near(employmentCredit(80000), 0);
  near(extraCredit(30000), 1000);
  near(extraCredit(36000), 500);
  near(extraCredit(45000), 0);
});

test("socialSecurity INPS: 1% sopra la prima fascia, stop al massimale", () => {
  const p = SOCIAL_SECURITY_2026;
  // Derived from the parameters, not repeated as a literal: this test is about
  // the 1% band and the ceiling, and hard-coding the rate made it fail every
  // time a contribution line was corrected — which is the opposite of useful.
  const r = (p.rate + p.minorRates) / 100;
  near(socialSecurity(50000, p), 50000 * r);
  near(socialSecurity(60000, p), 60000 * r + (60000 - p.firstBandCap) * 0.01);
  // above the ceiling nothing more is due: contributions stop
  assert.equal(socialSecurity(200000, p), socialSecurity(122295, p));
});

test("gross to net: 60,000 in Turin", () => {
  // The anchor figures moved by about 30 euro of contributions when the
  // employee rate was corrected from 9.75667% to 9.80667% — the bilateral-body
  // line the payslip carries and this file did not. Everything else about the
  // calculation is unchanged, which is what these numbers are here to pin.
  const n = grossToNet({ salary: 60000 });
  near(n.socialSecurity, 5921.76, 0.5);
  near(n.taxableIncome, 54078.24, 0.5);
  near(n.credits, 0);
  near(n.net, 36654, 5);
  assert.ok(n.keptShare > 0.6 && n.keptShare < 0.62);
});

test("l'aliquota marginalRate non e' lo scaglione", () => {
  // at 60,000 the margin is 43% tax + surtaxes + 1% social security, above 50%
  const m = marginalRate({ salary: 60000 }, 1000);
  assert.ok(m.rate > 0.5 && m.rate < 0.56, `marginal at 60k = ${m.rate}`);
  // between 28k and 50k the fading credit adds ~8.7 points to the 33%
  const low = marginalRate({ salary: 35000 }, 1000);
  assert.ok(low.rate > 0.45, `marginal at 35k = ${low.rate}`);
  // and below 28k the margin is appreciably lower
  const lowest = marginalRate({ salary: 22000 }, 1000);
  assert.ok(lowest.rate < low.rate);
});

test("the default regime is the documented one", () => {
  assert.deepEqual(DEFAULT_REGIME.brackets, INCOME_TAX_2026);
  assert.equal(DEFAULT_REGIME.payPeriods, 14);
});

test("ESPP: the floor is discount/(1-discount), not the discount", () => {
  near(guaranteedFloor(15), 0.17647, 1e-4);
  near(guaranteedFloor(10), 0.11111, 1e-4);
});

test("ESPP with a flat stock: the discount remains, and is worth 17.65% gross", () => {
  const e = simulateEspp({
    salary: 60000,
    contributed: 4500,
    priceAtStart: 170,
    priceAtPurchase: 170,
    fxRate: 1.16,
    plan: { ...ESPP_PLAN, fractionalShares: true },
  });
  near(e.purchasePrice, 170 * 0.85);
  near(e.discountValue / e.spent, 0.17647, 1e-3);
  assert.ok(e.gain > 0);
});

test("ESPP with the lookback: the stock falls and you still gain", () => {
  const down = simulateEspp({
    salary: 60000, contributed: 4500, priceAtStart: 200, priceAtPurchase: 150, fxRate: 1.16,
    plan: { ...ESPP_PLAN, fractionalShares: true },
  });
  // pays 85% of the LOWER of the two
  near(down.purchasePrice, 150 * 0.85);
  assert.ok(down.gain > 0, "with the lookback the gain stays positive");
  // without the lookback the price would be the same here, because the lower one
  // is the end price: the difference shows when the stock rises
  const up = simulateEspp({
    salary: 60000, contributed: 4500, priceAtStart: 150, priceAtPurchase: 200, fxRate: 1.16,
    plan: { ...ESPP_PLAN, fractionalShares: true },
  });
  const upNoLookback = simulateEspp({
    salary: 60000, contributed: 4500, priceAtStart: 150, priceAtPurchase: 200, fxRate: 1.16,
    plan: { ...ESPP_PLAN, fractionalShares: true, lookback: false },
  });
  assert.ok(up.gain > upNoLookback.gain, "the lookback is worth something when the stock rises");
});

test("ESPP: euro are multiplied to become dollars", () => {
  const e = simulateEspp({
    salary: 60000, contributed: 1000, priceAtStart: 100, priceAtPurchase: 100, fxRate: 1.2,
    plan: { ...ESPP_PLAN, fractionalShares: false },
  });
  near(e.contributedUsd, 1200);
  // $1,200 / $85 = 14 whole shares
  assert.equal(e.shares, 14);
  near(e.spent, (14 * 85) / 1.2);
  near(e.refunded, 1000 - (14 * 85) / 1.2);
});

test("ESPP: the expected contribution follows the percentage", () => {
  near(expectedContribution(60000, 15, 6), 4500);
  near(expectedContribution(60000, 1, 6), 300);
});

test("RSU: quarterly tranches land on the plan calendar", () => {
  const g: Grant = {
    id: "a", label: "G", date: "2026-02-20", valueUsd: 40000, priceAtGrant: 100,
    schedule: "quarterly", years: 3, usePlanDates: true,
  };
  const ts = tranches(g);
  assert.equal(ts.length, 12);
  near(ts.reduce((s, t) => s + t.units, 0), 400);
  // every date is one of the plan's days
  for (const t of ts) assert.ok(["02-20", "05-20", "08-20", "11-20"].includes(t.date.slice(5)), t.date);
  assert.equal(ts[0].date, "2026-05-20");
  assert.equal(ts[11].date, "2029-02-20");
});

test("RSU: without fixed dates tranches fall three months from the grant", () => {
  const ts = tranches({
    id: "a", label: "G", date: "2026-01-31", valueUsd: 10000, priceAtGrant: 100,
    schedule: "quarterly", years: 1, usePlanDates: false,
  });
  assert.equal(ts[0].date, "2026-04-30"); // il giorno si schiaccia sul mese corto
  assert.equal(ts.length, 4);
});

test("RSU: the tranches are whole shares that add up to the grant", () => {
  // 479 units over 30-30-40 is 143.7 / 143.7 / 191.6 on paper, and whole shares
  // in practice: what vests is a share count, and a statement never says 143.7.
  // Largest remainder decides which tranche carries the spare share.
  // Checked against a real grant: $70,000 at a 146.32 fair market value is
  // 478.4, granted as 479, and the plan awards it 143 / 144 / 192. Rounding
  // each slice on its own would give 144 / 144 / 191 — the same total and the
  // wrong tranches. What has to be whole is the amount vested *so far*.
  const real = {
    id: "a", label: "G", date: "2026-02-20", valueUsd: 70000, priceAtGrant: 146.32,
    schedule: "30-30-40" as const, years: 3, usePlanDates: false,
  };
  assert.equal(grantUnits(real), 479);
  const ts = tranches(real);
  assert.equal(ts.length, 3);
  for (const t of ts) assert.equal(t.units, Math.floor(t.units), "a vest is whole shares");
  assert.equal(ts.reduce((s, t) => s + t.units, 0), 479, "and they add up to the grant");
  assert.deepEqual(ts.map((t) => t.units), [143, 144, 192]);
  // Which is the same as saying the running total is always whole.
  let vested = 0;
  for (const t of ts) {
    vested += t.units;
    assert.equal(vested, Math.floor(vested));
  }

  // The quarterly case is the one people see on a statement: twelve vests of a
  // total that does not divide by twelve, so some quarters differ by one share.
  const q = tranches({
    id: "b", label: "Q", date: "2026-02-20", valueUsd: 46100, priceAtGrant: 100,
    schedule: "quarterly", years: 3, usePlanDates: false,
  });
  assert.equal(q.length, 12);
  assert.equal(q.reduce((s, t) => s + t.units, 0), 461);
  const sizes = [...new Set(q.map((t) => t.units))].sort();
  assert.deepEqual(sizes, [38, 39], "461 over twelve quarters is 38s and 39s");
  // Not a tidy alternation, and that matters: it is whatever the running floor
  // produces, which is what people actually see quarter to quarter.
  assert.deepEqual(q.map((t) => t.units), [38, 38, 39, 38, 39, 38, 38, 39, 38, 39, 38, 39]);
});

test("RSU: the rate is computed on the year's total, not on the tranche", () => {
  const one: Grant = {
    id: "a", label: "A", date: "2026-02-20", valueUsd: 40000, priceAtGrant: 100,
    schedule: "quarterly", years: 3, usePlanDates: true,
  };
  const two: Grant = { ...one, id: "b", label: "B" };
  const base = { price: 100, fxRate: 1.16, today: "2026-09-17", horizonYears: 3 };

  // Two identical grants are worth twice the gross, and that is arithmetic.
  const once = project({ ...base, salary: 20000, grants: [one] });
  const twice = project({ ...base, salary: 20000, grants: [one, two] });
  near(twice.totalGross, once.totalGross * 2, 1);

  // The net is not: the second grant spills into the next bracket and the
  // year's rate goes up. That is why the calculation is done on the year's
  // total and not tranche by tranche.
  assert.ok(twice.totalNet < once.totalNet * 2, "the net must not double");
  const a27 = (p: typeof once) => p.years.find((a) => a.year === 2027)!;
  assert.ok(a27(twice).taxRate > a27(once).taxRate);

  // Above 50,000 the brackets are exhausted and the margin is flat: the same
  // calculation becomes linear again, and that is right — not a bug, the real
  // curve.
  const highOnce = project({ ...base, salary: 60000, grants: [one] });
  const highTwice = project({ ...base, salary: 60000, grants: [one, two] });
  near(highTwice.totalNet, highOnce.totalNet * 2, 1);

  // The horizon runs to the end of a calendar year, so from mid-September 2026
  // a three-year window reaches 31 December 2029: the rest of this year plus
  // three whole ones, fourteen quarters in all.
  assert.equal(once.quarters.length, 14);
  assert.equal(once.quarters[once.quarters.length - 1].from, "2029-10-01");
  // every tranche falls in exactly one quarter: the sum has to add up
  near(
    once.quarters.reduce((s, q) => s + q.units, 0),
    once.totalUnits,
    1e-6
  );
  // the quarters are consecutive and start from today's calendar quarter
  assert.equal(once.quarters[0].from, "2026-07-01");
  assert.equal(once.quarters[1].from, "2026-10-01");
  assert.deepEqual(
    once.quarters.slice(0, 4).map((q) => q.quarter),
    [3, 4, 1, 2]
  );
});

test("la curva marginalRate ha una hump, e il picco non e' dove sembra", () => {
  // The counter-intuitive part of the whole system, and the reason this tool
  // computes the marginal rate by difference rather than reading a table: the
  // credits phase out linearly, and while they do, every extra euro takes a
  // piece of them away. The result is that the real margin of someone on 36,000
  // EXCEEDS that of someone on 70,000, where the nominal rate is 43% not 33%.
  const hump = marginalRate({ salary: 36000 }, 1000).rate;
  const above = marginalRate({ salary: 70000 }, 1000).rate;
  const below = marginalRate({ salary: 25000 }, 1000).rate;
  assert.ok(hump > above, `hump ${hump} must exceed ${above}`);
  assert.ok(hump > below, `hump ${hump} must exceed ${below}`);
  // The worst point is around 36,000, where the art. 13 credit (8.7 points) and
  // the 1,000 euro payroll cut (12.5 points) phase out TOGETHER: the real margin
  // reaches 62%, twenty points above the nominal rate.
  assert.ok(hump > 0.6, `the real margin at 36,000 exceeds 60%: ${hump}`);
});

test("oltre il massimale INPS l'aliquota marginalRate SCENDE", () => {
  // Against all intuition: above 122,295 contributions stop, so the next euro
  // costs less than the one before. If one day the calculation stopped
  // respecting this, the ceiling would have been forgotten somewhere.
  const under = marginalRate({ salary: 100000 }, 1000);
  const over = marginalRate({ salary: 200000 }, 1000);
  assert.ok(over.rate < under.rate, `${over.rate} !< ${under.rate}`);
});

test("addMonths schiaccia il giorno sul mese corto", () => {
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2026-01-31", 12), "2027-01-31");
  assert.equal(addMonths("2026-11-20", 3), "2027-02-20");
});

test("toField does not eat the zeros of whole numbers", () => {
  assert.equal(toField(60000, "it", 0), "60000");
  assert.equal(toField(60000, "it", 2), "60000");
  assert.equal(toField(4500, "it", 2), "4500");
  assert.equal(toField(1.5, "it", 2), "1,5");
  assert.equal(toField(1.5, "en", 2), "1.5");
  assert.equal(toField(1.16342, "it", 4), "1,1634");
  assert.equal(toField(0, "it", 0), "0");
  assert.equal(toField(100.25, "en", 2), "100.25");
});

test("parseNum accepts sums, commas and dots", () => {
  assert.equal(parseNum("1200+300"), 1500);
  assert.equal(parseNum("1,5"), 1.5);
  assert.equal(parseNum("1.5"), 1.5);
  assert.equal(parseNum("24/3"), 8);
  assert.equal(parseNum("2*3+1"), 7); // per e diviso prima di piu' e meno
  assert.equal(parseNum("1200+"), null); // an unfinished sum, not an error
  assert.equal(parseNum(""), null);
  assert.equal(parseNum("ciao"), null);
  assert.equal(parseNum("1/0"), null);
});

test("RSU: dollars become units at the grant-day price", () => {
  const base = {
    id: "a", label: "G", date: "2026-02-20", valueUsd: 20000,
    schedule: "30-30-40" as const, years: 3, usePlanDates: false,
  };
  // $20,000 at 142.88 is 139.9776, and what is granted is 140: the plan rounds
  // UP to a whole share, so the result is never below the division.
  assert.equal(grantUnits({ ...base, priceAtGrant: 142.88 }), 140);
  // At the fair market value the same grant is smaller, which is the whole point
  // of pricing it right: 136.69 rounds up to 137, not to 140.
  assert.equal(grantUnits({ ...base, priceAtGrant: 146.32 }), 137);
  // Up, not to the nearest: a bare fraction still gains a share.
  assert.equal(grantUnits({ ...base, valueUsd: 1001, priceAtGrant: 100 }), 11);
  assert.equal(grantUnits({ ...base, valueUsd: 1000, priceAtGrant: 100 }), 10);
  // the same amount granted at twice the price makes half the units: this is why
  // an old grant is worth more today than a new one of the same value, and why
  // the grant price belongs to the grant and not to the global parameters
  assert.equal(grantUnits({ ...base, priceAtGrant: 285.76 }), 70);
  // with no price we do not divide by zero: zero units, and the field says so
  assert.equal(grantUnits({ ...base, priceAtGrant: 0 }), 0);

  // tranches always add up to the grant's units, whatever the price
  const ts = tranches({ ...base, priceAtGrant: 142.88 });
  assert.equal(ts.reduce((s, t) => s + t.units, 0), 140);
});

test("ESPP: the plan cap cuts before buying", () => {
  // $10,625 per window is not a round number picked at random: it is the tax
  // limit of $25,000 a year of market value, which at a 15% discount is bought
  // with $21,250 of contributions, i.e. $10,625 per half-year.
  const within = simulateEspp({
    salary: 60000, contributed: 4000, priceAtStart: 100, priceAtPurchase: 100, fxRate: 1.15,
    plan: { ...ESPP_PLAN, fractionalShares: true },
  });
  // 4,000 EUR make 4,600 USD: the cap does not bite and takes nothing
  near(within.contributedUsd, 4600);
  near(within.aboveCap, 0);

  const over2 = simulateEspp({
    salary: 200000, contributed: 15000, priceAtStart: 100, priceAtPurchase: 100, fxRate: 1.15,
    plan: { ...ESPP_PLAN, fractionalShares: true },
  });
  // 15,000 EUR make 17,250 USD, but only 10,625 enter the purchase
  near(over2.contributedBeforeCapUsd, 17250);
  near(over2.contributedUsd, 10625);
  // the rest comes back in euro, all of it: it neither vanishes nor buys shares
  near(over2.aboveCap, (17250 - 10625) / 1.15);
  near(over2.spent, 10625 / 0.85 / 1.15 * 0.85, 0.01);
  // With fractional shares the refund IS exactly the cap's cut: there is
  // nothing else left over. (Comparing them with `>=` fails on a floating point
  // error, which here is not a tolerance of convenience: they are the same
  // calculation done in two different orders.)
  near(over2.refunded, over2.aboveCap, 1e-9);
  near(over2.refunded, 15000 - over2.spent);

  // With whole shares the change that does not make a share is added on top,
  // so the refund is strictly larger than the cap's cut alone. That needs a
  // price that actually leaves change: at $100 the discount gives 85, and
  // 10,625 divided by 85 is exactly 125 shares — no change at all, and the case
  // would prove nothing.
  const whole = simulateEspp({
    salary: 200000, contributed: 15000, priceAtStart: 106, priceAtPurchase: 106, fxRate: 1.15,
    plan: { ...ESPP_PLAN, fractionalShares: false },
  });
  assert.equal(whole.shares, Math.floor(10625 / (106 * 0.85)));
  assert.ok(
    whole.refunded > whole.aboveCap,
    `${whole.refunded} must exceed ${whole.aboveCap}`
  );

  // a zero cap means no cap, for plans that do not have one
  const uncapped = simulateEspp({
    salary: 200000, contributed: 15000, priceAtStart: 100, priceAtPurchase: 100, fxRate: 1.15,
    plan: { ...ESPP_PLAN, fractionalShares: true, maxUsd: 0 },
  });
  near(uncapped.contributedUsd, 17250);
  near(uncapped.aboveCap, 0);
});

test("RSU: net share withholding is flat, and the payslip settles the rest", () => {
  // The withholding on a vest is not paid in cash: the broker sells part of the
  // shares on the day. Whatever is sold plus whatever arrives has to be exactly
  // what vested — if those two ever stop adding up, shares are being invented
  // or lost somewhere.
  const grant: Grant = {
    id: "a", label: "A", date: "2026-02-20", valueUsd: 40000, priceAtGrant: 100,
    schedule: "quarterly", years: 3, usePlanDates: true,
  };
  const p = project({
    grants: [grant], price: 100, fxRate: 1.16, salary: 60000,
    today: "2026-09-17", horizonYears: 3,
  });

  for (const y of p.years) {
    near(y.netShares + y.sharesWithheld, y.units, 1e-9);
    assert.ok(y.sharesWithheld > 0, `${y.year}: something must be sold to cover the tax`);
    // The sale covers the tax only up to the ceiling. Above it the shares stop
    // being sold, so slightly FEWER than half the vest goes this way even at a
    // 52% marginal rate — and the difference turns up on a payslip instead.
    assert.equal(y.withholdingRate, Math.min(y.taxRate, WITHHOLDING_RATE), `${y.year}: covered rate`);
    // Sold is the covered rate of the vest, plus at most the one share the
    // rounding down of what arrives leaves over. A percentage tolerance is the
    // wrong shape here: on a small vest a single share is several points.
    const owed = y.units * y.withholdingRate;
    assert.ok(
      y.sharesWithheld >= owed - 1e-9 && y.sharesWithheld < owed + 1,
      `${y.year}: sold ${y.sharesWithheld} for an owed ${owed}`
    );
    assert.ok(y.sharesWithheld < y.netShares, `${y.year}: the sale stops at the ceiling`);
    assert.ok(y.payslipAdjustmentEur > 0, `${y.year}: at this rate the payslip has to make up the rest`);
  }

  // The withholding does NOT follow your own rate — that is the point of it
  // being the supplemental rate. On no salary at all exactly as many shares are
  // kept back, and what changes is the direction of the settlement: the flat
  // rate over-withheld, so the payslip gives it back.
  const free = project({
    grants: [grant], price: 100, fxRate: 1.16, salary: 0,
    today: "2026-09-17", horizonYears: 3,
  });
  assert.equal(free.years[0].sharesWithheld, p.years[0].sharesWithheld, "the rate withheld is the same rate");
  assert.equal(free.years[0].withholdingRate, WITHHOLDING_RATE);
  assert.ok(free.years[0].taxRate < WITHHOLDING_RATE, "on no salary the real rate is below the flat one");
  assert.ok(free.years[0].payslipAdjustmentEur < 0, "so the settlement is a refund, not a deduction");
  assert.ok(p.years[0].payslipAdjustmentEur > 0, "and at 60k it is a further deduction");
  // Which is exactly why the total has to be signed rather than a magnitude.
  assert.ok(free.totalPayslipAdjustmentEur < 0 && p.totalPayslipAdjustmentEur > 0);
});

test("RSU: grant ids never collide, so editing one grant edits only that one", () => {
  // The bug this guards against: a counter starting at zero on every page load.
  // Restore two saved grants with ids g1 and g2, add a third, and the third is
  // handed g1 again — after which patch-by-id updates two rows at once and
  // changing one grant's date silently changes another's. Nothing throws.
  const ids = new Set(Array.from({ length: 500 }, () => newGrantId()));
  assert.equal(ids.size, 500, "500 fresh ids must be 500 distinct ids");

  // A save written by the broken version heals on load instead of staying
  // quietly corrupt.
  const restored = withUniqueIds([
    { id: "g1", label: "A" },
    { id: "g2", label: "B" },
    { id: "g1", label: "C" },
    { id: "g2", label: "D" },
    { id: "g3", label: "E" },
  ]);
  assert.equal(new Set(restored.map((g) => g.id)).size, 5);
  // The ones that were already unique keep their id: only the clashes move.
  assert.deepEqual(
    restored.map((g) => g.label),
    ["A", "B", "C", "D", "E"]
  );
  assert.equal(restored[0].id, "g1");
  assert.equal(restored[1].id, "g2");
  assert.notEqual(restored[2].id, "g1");
  assert.notEqual(restored[3].id, "g2");
  assert.equal(restored[4].id, "g3");
});

test("RSU: the horizon ends on 31 December, and only today's year is partial", () => {
  // A year closes on 31 December. A window that stopped on today's date N years
  // out left the last card holding three quarters instead of four, which reads
  // as the plan tailing off when it is only the window closing — and made two
  // year cards that could not be compared sit side by side.
  const p = project({
    grants: [
      {
        id: "a", label: "A", date: "2026-02-20", valueUsd: 40000, priceAtGrant: 100,
        schedule: "quarterly", years: 3, usePlanDates: true,
      },
    ],
    price: 100, fxRate: 1.16, salary: 60000, today: "2026-09-17", horizonYears: 3,
  });

  const flags = Object.fromEntries(p.years.map((y) => [y.year, y.partial]));
  // Only the current year is counted from part-way through: what vested before
  // today vested, and no window brings it back. Every later year is whole —
  // 2029 included, which is where the old window cut.
  assert.equal(flags[2026], true);
  assert.equal(flags[2027], false);
  assert.equal(flags[2028], false);
  assert.equal(flags[2029], false);

  // And the one that is counted from today really does hold less.
  const whole = p.years.find((y) => y.year === 2027)!;
  const fromToday = p.years.find((y) => y.year === 2026)!;
  assert.ok(fromToday.units < whole.units, "the year counted from today holds fewer vests");
});

test("four-digit figures group like the rest", () => {
  // `Intl`'s default grouping is "auto", which for several locales means no
  // thousands separator until five digits. Left alone it put "70.000 €" and
  // "1215 €" side by side in the same card — one grouped, one not, which reads
  // as a broken number rather than a rule of the locale.
  assert.ok(eur0(1215, "it").includes("1.215"), eur0(1215, "it"));
  assert.ok(eur0(70000, "it").includes("70.000"), eur0(70000, "it"));
  assert.ok(eur0(1215, "en").includes("1,215"), eur0(1215, "en"));
  assert.ok(num(1215, "it", 0).includes("1.215"), num(1215, "it", 0));
  assert.ok(usd(1215, "it", 0).includes("1.215"), usd(1215, "it", 0));
  // and nothing changes below a thousand
  assert.ok(!eur0(999, "it").includes("."), eur0(999, "it"));
});

test("RSU: the quarterly rows add up to the year they belong to", () => {
  // The guided view lists quarters, the tax is worked out per year, and the
  // shares that reach you are whole. Rounding each quarter on its own makes the
  // column add up to a share or two away from the year's figure — and a table
  // whose rows contradict the total printed under them costs you both numbers.
  // Largest remainder is what keeps the parts equal to the whole.
  const grants: Grant[] = [
    { id: "w", label: "Welcome", date: "2026-02-20", valueUsd: 20000, priceAtGrant: 142.88,
      schedule: "30-30-40", years: 3, usePlanDates: true },
    { id: "b", label: "Bonus", date: "2026-11-20", valueUsd: 10000, priceAtGrant: 188.71,
      schedule: "quarterly", years: 3, usePlanDates: true },
  ];
  // Several salaries, because the rate is what drives the fractions: the Italian
  // marginal curve is not monotonic, so one salary is not a sample.
  for (const salary of [0, 28000, 36000, 50000, 70000, 140000]) {
    const p = project({ grants, price: 188.71, fxRate: 1.148, salary, today: "2026-09-18", horizonYears: 3 });
    for (const y of p.years) {
      const mine = p.quarters.filter((q) => q.year === y.year && q.units > 0);
      assert.ok(mine.length > 0, `${y.year}: a year with vests must have quarters with vests`);
      const net = mine.reduce((s, q) => s + q.netShares, 0);
      assert.equal(net, y.netShares, `salary ${salary}, ${y.year}: quarters sum to the year`);
      // Whole shares, never negative, never more than vested.
      for (const q of mine) {
        assert.equal(q.netShares, Math.floor(q.netShares), "a share is not divisible");
        assert.ok(q.netShares >= 0 && q.netShares <= q.units, "a quarter cannot hand out more than it vests");
        near(q.netShares + q.sharesWithheld, q.units, 1e-9);
        assert.equal(q.taxRate, y.taxRate, "a quarter carries its year's rate");
      }
      // And the units themselves partition the year, or the split is of the
      // wrong denominator to begin with.
      near(mine.reduce((s, q) => s + q.units, 0), y.units, 1e-9);
      near(mine.reduce((s, q) => s + q.grossEur, 0), y.grossEur, 1e-6);
    }
    // Empty quarters stay empty rather than inheriting anything.
    for (const q of p.quarters.filter((x) => x.units === 0))
      assert.equal(q.netShares + q.sharesWithheld + q.netEur + q.taxRate, 0, "an empty quarter stays empty");
  }
});

test("ESPP: the windows on offer, and which one the tool opens on", () => {
  // A period runs from one purchase day to the next, so the dates are not
  // something to type. What needs pinning down is *when* each window appears
  // and disappears, because both edges are off-by-one-day traps.
  const w = (today: string) =>
    esppWindows(today, ESPP_PLAN).map((x) => `${x.start}->${x.purchase}${x.closed ? " closed" : ""}`);

  // Mid-period: one window, the one running. The window before it closed six
  // months ago and is long past being the question.
  assert.deepEqual(w("2026-09-18"), ["2026-04-01->2026-10-01"]);

  // On purchase day the period starting that morning has accumulated nothing,
  // so it is not offered yet — and the one purchasing today is not yet closed,
  // because that day's close does not exist until the day is over.
  assert.deepEqual(w("2026-10-01"), ["2026-04-01->2026-10-01"]);

  // The day after, both: the one that just closed and the one just begun.
  assert.deepEqual(w("2026-10-02"), [
    "2026-04-01->2026-10-01 closed",
    "2026-10-01->2027-04-01",
  ]);

  // The closed one drops off once it is past the grace period.
  const afterGrace = "2026-11-05"; // 35 days after the purchase
  assert.ok(35 > CLOSED_WINDOW_GRACE_DAYS, "the fixture has to be outside the grace period");
  assert.deepEqual(w(afterGrace), ["2026-10-01->2027-04-01"]);

  // The default: the window that just closed while it is still on offer,
  // because the purchase happened and the withholding is on that payslip.
  assert.equal(defaultWindow("2026-10-02", ESPP_PLAN).purchase, "2026-10-01");
  assert.equal(defaultWindow("2026-10-02", ESPP_PLAN).closed, true);
  // And otherwise the one running.
  assert.equal(defaultWindow("2026-09-18", ESPP_PLAN).purchase, "2026-10-01");
  assert.equal(defaultWindow("2026-09-18", ESPP_PLAN).closed, false);
  assert.equal(defaultWindow(afterGrace, ESPP_PLAN).purchase, "2027-04-01");

  // Every window is exactly the plan's length, and no window is ever offered
  // before it has begun.
  for (const today of ["2026-01-05", "2026-04-01", "2026-04-02", "2026-09-18", "2026-10-01", "2027-03-31"]) {
    const all = esppWindows(today, ESPP_PLAN);
    assert.ok(all.length >= 1, `${today}: there is always a window running`);
    for (const x of all) {
      assert.ok(x.start < today, `${today}: ${x.start} has not begun`);
      const [sy, sm] = x.start.split("-").map(Number);
      const [py, pm] = x.purchase.split("-").map(Number);
      assert.equal((py - sy) * 12 + (pm - sm), ESPP_PLAN.months, `${today}: ${x.start}->${x.purchase}`);
    }
    // Exactly one window is running at any moment.
    assert.equal(all.filter((x) => !x.closed).length, 1, `${today}: one and only one open window`);
  }
});

test("RSU: the share totals are the sum of the years, not a re-rounding", () => {
  // The headline count and the table have to be the same number. Deriving the
  // total from the euro figures would round once more, on a different
  // denominator, and disagree with the rows underneath it by a share.
  const grants: Grant[] = [
    { id: "w", label: "Welcome", date: "2026-02-20", valueUsd: 20000, priceAtGrant: 142.88,
      schedule: "30-30-40", years: 3, usePlanDates: true },
    { id: "b", label: "Bonus", date: "2026-11-20", valueUsd: 10000, priceAtGrant: 188.71,
      schedule: "quarterly", years: 3, usePlanDates: true },
  ];
  for (const salary of [0, 36000, 50000, 140000]) {
    const p = project({ grants, price: 188.71, fxRate: 1.148, salary, today: "2026-09-18", horizonYears: 3 });
    assert.equal(p.totalNetShares, p.years.reduce((s, y) => s + y.netShares, 0));
    assert.equal(p.totalNetShares, p.quarters.reduce((s, q) => s + q.netShares, 0));
    near(p.netSharesEur, p.totalNetShares * p.perUnitEur, 1e-9);
    // The same holding in the currency the shares are quoted in, and the two
    // have to be each other at the projection's rate — they sit side by side.
    near(p.netSharesUsd, p.totalNetShares * 188.71, 1e-9);
    near(p.netSharesEur * 1.148, p.netSharesUsd, 1e-9);
    // The shares you keep are worth more than the euro net, and that is not a
    // bug: the sale stopped at the ceiling, so part of the tax is still owed
    // and comes off a payslip. Net plus that deduction is the ceiling the
    // shares cannot exceed.
    assert.ok(
      p.netSharesEur <= p.totalNet + p.totalPayslipAdjustmentEur + 1e-6,
      `salary ${salary}: ${p.netSharesEur} > ${p.totalNet} + ${p.totalPayslipAdjustmentEur}`
    );
    // Every quarter that vests knows the day it lands on.
    for (const q of p.quarters) assert.equal(q.vestOn !== null, q.units > 0);
  }
});

test("RSU: the fair market value is the 20-session mean, not the close", () => {
  // The number the plan prices a grant at. Verified against the real series for
  // 20 February 2026: the close was 142.88 and the fair market value 146.32 —
  // a 2.4% difference in how many units a grant buys, which is not a rounding.
  const row = history.find((p) => p.date === "2026-02-20");
  assert.ok(row, "the grant date has to be in the stored history");
  assert.equal(row!.close, 142.88);
  assert.ok(row!.fmv, "the stored row carries a fair market value");
  assert.equal(Number(row!.fmv!.toFixed(2)), 146.32);
  assert.ok(row!.fmv! > row!.close, "on this date the 20-session mean is above the close");

  // Every stored row that has one is a plausible price, and the two are never
  // the same number by accident.
  let differing = 0;
  for (const p of history) {
    if (!p.fmv) continue;
    assert.ok(p.fmv > 0 && p.fmv < p.close * 2, `${p.date}: ${p.fmv} against a close of ${p.close}`);
    if (Math.abs(p.fmv - p.close) > 0.01) differing++;
  }
  assert.ok(differing > history.length * 0.9, "the mean of 20 sessions is hardly ever the close of the day");

  // And a grant priced at the fair market value buys fewer units than one
  // priced at the close, on this date: the whole point of getting it right.
  const g = (price: number): Grant => ({
    id: "a", label: "A", date: "2026-02-20", valueUsd: 20000, priceAtGrant: price,
    schedule: "30-30-40", years: 3, usePlanDates: false,
  });
  assert.ok(grantUnits(g(row!.fmv!)) < grantUnits(g(row!.close)));
});

test("RSU: the performance rating scales the annual awards and nothing else", () => {
  const grants: Grant[] = [
    { id: "w", label: "Welcome", date: "2026-02-20", valueUsd: 20000, priceAtGrant: 146.32,
      schedule: "30-30-40", years: 3, usePlanDates: false, performanceLinked: false },
    { id: "b", label: "Bonus", date: "2026-11-20", valueUsd: 10000, priceAtGrant: 188.71,
      schedule: "quarterly", years: 3, usePlanDates: true, performanceLinked: true },
  ];
  const base = { grants, price: 188.71, fxRate: 1.148, salary: 50000, today: "2026-09-18", horizonYears: 3 };
  const target = project(base);
  const low = project({ ...base, performance: 0.75 });
  const high = project({ ...base, performance: 1.5 });

  // 100% is the target and has to change nothing at all.
  assert.equal(project({ ...base, performance: 1 }).totalUnits, target.totalUnits);
  assert.ok(low.totalUnits < target.totalUnits, "a low rating awards fewer units");
  assert.ok(high.totalUnits > target.totalUnits, "a high rating awards more");

  // The welcome grant is untouched: only the bonus moves. Its units are the
  // same in all three runs, so the difference between runs is entirely bonus.
  const unitsOf = (p: typeof target, grant: string) =>
    p.upcoming.filter((t) => t.grant === grant).reduce((s, t) => s + t.units, 0);
  near(unitsOf(low, "w"), unitsOf(target, "w"), 1e-9);
  near(unitsOf(high, "w"), unitsOf(target, "w"), 1e-9);
  // Not exact, and the reason is the plan's, not the computer's: `tranches`
  // rounds every slice to four decimals, so twelve scaled slices are not the
  // same number as scaling the sum of twelve rounded ones. The drift is bounded
  // by half a unit of the last decimal per tranche, which is where this
  // tolerance comes from — a 1e-9 epsilon here would be asserting that the
  // rounding does not happen.
  // Close to the multiple, not equal to it, and the reason is the plan's rather
  // than the computer's: the grant is rounded UP to a whole share before it is
  // split, so scaling the dollars and scaling the resulting shares are two
  // different roundings — plus whatever the dividend equivalents added.
  near(unitsOf(high, "b"), unitsOf(target, "b") * 1.5, 2);
  near(unitsOf(low, "b"), unitsOf(target, "b") * 0.75, 2);

  // And the band is the one the UI offers.
  assert.deepEqual(PERFORMANCE_STEPS, [0.75, 1, 1.25, 1.5]);
});

test("RSU: the tool opens on a welcome grant, which no rule describes", () => {
  const g = initialOneOff("2026-09-18");
  assert.equal(g.length, 1, "one-off awards are rows; the annual one is a rule");
  assert.equal(g[0].label, "Welcome grant");
  assert.equal(g[0].date, "2026-02-20");
  assert.equal(g[0].performanceLinked, false, "a welcome grant does not depend on a review");
});

test("RSU: the annual rule writes itself out, one award a year", () => {
  const plan = initialAnnual("2026-09-18");
  const g = expandAnnual(plan, 2029);
  assert.equal(g.length, 4, "2026 through 2029, inclusive");
  for (const [k, year] of [[0, 2026], [1, 2027], [2, 2028], [3, 2029]] as const) {
    assert.equal(g[k].label, `Bonus ${year}`);
    assert.equal(g[k].date, `${year}-11-20`, "the name and the date come from the same year");
    assert.equal(g[k].valueUsd, 10000, "the same figure every year, until a step says otherwise");
    assert.equal(g[k].performanceLinked, true);
  }
  // Stable, and distinct: the chart colours a grant by its position and React
  // keys a row by its id, so ids that move repaint and lose focus.
  assert.deepEqual(g.map((x) => x.id), ["annual-2026", "annual-2027", "annual-2028", "annual-2029"]);
  assert.equal(new Set(g.map((x) => x.id)).size, g.length);
  // Switched off, the rule stands for nothing at all.
  assert.deepEqual(expandAnnual({ ...plan, enabled: false }, 2029), []);
});

test("RSU: a step changes the annual award from its year on, and stays", () => {
  const plan = {
    ...initialAnnual("2026-09-18"),
    steps: [
      { fromYear: 2028, valueUsd: 16000 },
      // Out of order on purpose: the rule sorts them, so the file can be
      // written in whatever order the raises were remembered in.
      { fromYear: 2027, valueUsd: 12000 },
    ],
  };
  assert.equal(annualValueFor(plan, 2026), 10000, "before any step, the base");
  assert.equal(annualValueFor(plan, 2027), 12000);
  assert.equal(annualValueFor(plan, 2028), 16000);
  assert.equal(annualValueFor(plan, 2031), 16000, "a raise stays until the next one");
  assert.deepEqual(
    expandAnnual(plan, 2029).map((g) => g.valueUsd),
    [10000, 12000, 16000, 16000]
  );
});

test("RSU: the rule reaches back, so years still vesting are one number", () => {
  // Someone four years in has four awards still vesting. Typing them one by
  // one was the work the rule removes: here it is `fromYear`.
  const plan = { ...initialAnnual("2026-09-18"), fromYear: 2023 };
  const g = expandAnnual(plan, 2026);
  assert.deepEqual(g.map((x) => x.date.slice(0, 4)), ["2023", "2024", "2025", "2026"]);
});

test("RSU: dividend equivalents credit extra units on what has not vested", () => {
  // The plan credits unvested RSUs with extra units every time a dividend is
  // paid: (unvested x amount) / close on the day. Nobody's award letter
  // mentions them and over three years they are not a rounding.
  const grant: Grant = {
    id: "a", label: "A", date: "2026-02-20", valueUsd: 20000, priceAtGrant: 146.32,
    schedule: "quarterly", years: 3, usePlanDates: true,
  };
  const base = {
    grants: [grant], price: 188.71, fxRate: 1.148, salary: 50000,
    today: "2026-09-18", horizonYears: 3,
  };
  const without = project(base);
  const withDivs = project({ ...base, dividends });

  assert.equal(without.dividendUnits, 0, "no series, no credit");
  assert.ok(withDivs.dividendUnits > 0, "with the series, units appear");
  assert.ok(
    withDivs.totalUnits > without.totalUnits,
    `${withDivs.totalUnits} should exceed ${without.totalUnits}`
  );
  near(withDivs.totalUnits - without.totalUnits, withDivs.dividendUnits, 1e-6);

  // Plausible size: a ~2% yield over an average hold of well under three years
  // is single-digit percent, not a rounding and not a doubling.
  const share = withDivs.dividendUnits / without.totalUnits;
  assert.ok(share > 0.005 && share < 0.12, `dividend equivalents are ${(share * 100).toFixed(2)}% of the grant`);

  // They are credited only to what is still unvested, so a grant whose vests
  // are all behind us earns nothing more.
  const done = project({
    ...base, dividends,
    grants: [{ ...grant, date: "2016-02-20" }],
    today: "2026-09-18",
  });
  assert.equal(done.dividendUnits, 0, "nothing unvested, nothing credited");

  // A payment made before the grant existed cannot credit it. Comparing two
  // series that differ ONLY by such a payment is what isolates that: asserting
  // zero on a single old payment would not, because the series is projected
  // forward quarterly and those projected payments do land after the grant.
  const after = project({ ...base, dividends: [{ date: "2026-06-04", amount: 0.92, close: 242.57 }] });
  const alsoBefore = project({
    ...base,
    dividends: [
      { date: "2020-01-02", amount: 10, close: 100 },
      { date: "2026-06-04", amount: 0.92, close: 242.57 },
    ],
  });
  near(alsoBefore.dividendUnits, after.dividendUnits, 1e-9);
});

test("RSU: the stored dividend history is usable and quarterly", () => {
  assert.ok(dividends.length > 20, "there is a history to work from");
  for (const d of dividends) {
    assert.ok(d.amount > 0 && d.amount < 20, `${d.date}: ${d.amount} a share`);
    assert.ok(d.close > 0, `${d.date}: the close of the day is needed to price the units`);
    assert.match(d.date, /^\d{4}-\d{2}-\d{2}$/);
  }
  // Sorted, and spaced like a quarterly payer: never two in the same month.
  for (let i = 1; i < dividends.length; i++) {
    assert.ok(dividends[i].date > dividends[i - 1].date, "sorted");
    const gap = (Date.parse(dividends[i].date) - Date.parse(dividends[i - 1].date)) / 86400000;
    assert.ok(gap > 45 && gap < 190, `${dividends[i - 1].date} -> ${dividends[i].date} is ${gap} days`);
  }
});

test("RSU: a vest is whole shares even once dividend equivalents are in", () => {
  // The equivalents accrue as fractions — the plan's example credits 0.227 of
  // a unit — but nothing vests 39.2534 shares. The invariant is the one that
  // explained 143/144/192 in the first place: the amount vested TO DATE is a
  // whole number, so each vest is the difference and the fraction carries.
  const grant: Grant = {
    id: "w", label: "W", date: "2026-02-20", valueUsd: 70000, priceAtGrant: 146.32,
    schedule: "quarterly", years: 3, usePlanDates: true,
  };
  const p = project({
    grants: [grant], price: 188.71, fxRate: 1.147974, salary: 60000,
    today: "2026-09-18", horizonYears: 3, dividends,
  });

  for (const t of p.tranches) {
    assert.equal(t.units, Math.floor(t.units), `${t.date}: ${t.units} is not a whole share`);
    assert.ok(t.units > 0);
  }
  for (const y of p.years) assert.equal(y.units, Math.floor(y.units), `${y.year}: ${y.units}`);
  for (const q of p.quarters) assert.equal(q.units, Math.floor(q.units), `${q.from}: ${q.units}`);

  // Monotone and never below the grant: a credit can only add.
  const grantOnly = tranches(grant);
  p.tranches.forEach((t, k) => {
    assert.ok(t.units >= grantOnly[k].units, `${t.date}: ${t.units} fell below the granted ${grantOnly[k].units}`);
  });
  const delivered = p.tranches.reduce((s, t) => s + t.units, 0);
  assert.ok(delivered > 479, "dividend equivalents add shares");
  // The residue left undelivered is under one share, by construction.
  const withCredits = 479 + p.tranches.reduce((s, t) => s + t.fromDividends, 0);
  assert.ok(delivered <= withCredits + 1e-9);

  // The early vests are untouched: a credit paid in March cannot make the May
  // vest fractional, it moves into a later one.
  assert.equal(p.tranches[0].units, grantOnly[0].units);
});

test("ESPP: the lookback reaches back to enrolment, not to the window start", () => {
  // Two people buying on the same day at the same percentage, differing only in
  // when they joined. This is the input the tool had no way to express, and it
  // is worth more than the contribution rate.
  const plan = ESPP_PLAN;
  const win = { start: "2026-10-01", purchase: "2027-04-01" };
  assert.deepEqual(enrolmentDates(win.start, plan, 3), ["2025-10-01", "2026-04-01", "2026-10-01"]);

  const common = { salary: 50000, contributed: 3000, priceAtPurchase: 200, fxRate: 1.15, plan };
  // Joined in April, when the share was at 120: that price is carried over.
  const veteran = simulateEspp({ ...common, priceAtStart: 120 });
  // Joined in October, when it was at 180.
  const newcomer = simulateEspp({ ...common, priceAtStart: 180 });

  assert.equal(veteran.referencePrice, 120, "the lookback takes the lower of enrolment and purchase");
  assert.equal(newcomer.referencePrice, 180);
  assert.ok(veteran.shares > newcomer.shares, "the older reference buys more shares");
  assert.ok(veteran.gain > newcomer.gain);

  // And the carried price is lost when the purchase day closes lower: then both
  // land on the same reference, which is the purchase price itself.
  const fallen = { ...common, priceAtPurchase: 90 };
  assert.equal(simulateEspp({ ...fallen, priceAtStart: 120 }).referencePrice, 90);
  assert.equal(simulateEspp({ ...fallen, priceAtStart: 180 }).referencePrice, 90);
  assert.equal(
    simulateEspp({ ...fallen, priceAtStart: 120 }).shares,
    simulateEspp({ ...fallen, priceAtStart: 180 }).shares,
    "a fall wipes out the advantage of having joined earlier"
  );

  // The enrolment list always ends on the window's own start — the first-timer
  // case — and steps back by whole periods.
  const dates = enrolmentDates("2026-04-01", plan, 4);
  assert.equal(dates[dates.length - 1], "2026-04-01");
  assert.deepEqual(dates, ["2024-10-01", "2025-04-01", "2025-10-01", "2026-04-01"]);
});

test("the marginal rate separates what the payslip loses from what comes later", () => {
  // Regional and municipal surtaxes are part of the cost and not part of that
  // month's payslip: they are worked out on the year's income and settled the
  // following year. Printing the two as one number overstated the month by
  // about four points, on a card whose title is literally "on that payslip".
  const m = marginalRate({ salary: 34914 }, 1683);
  near(m.surtaxRate + m.payrollRate, m.rate, 1e-12);
  assert.ok(m.surtaxRate > 0.03 && m.surtaxRate < 0.05, `surtaxes are ${(m.surtaxRate * 100).toFixed(2)}%`);
  assert.ok(m.payrollRate < m.rate, "the payslip loses less than the full rate");

  // And the split reaches the ESPP result, where the two figures have to add up
  // to the tax on the discount.
  const r = simulateEspp({
    salary: 34914, contributed: 2334, priceAtStart: 127.28, priceAtPurchase: 188.71,
    fxRate: 1.147974, plan: ESPP_PLAN,
  });
  near(r.withheldOnPayslip + r.surtaxLater, r.taxWithheld, 1e-9);
  assert.ok(r.withheldOnPayslip > 0 && r.surtaxLater > 0);
  // The month's net effect follows the payslip figure, not the total.
  near(r.payslipEffect, r.refunded - r.withheldOnPayslip, 1e-9);

  // With no surtaxes in the regime the two collapse into one, which is the
  // check that nothing is being double-counted.
  const flat: TaxRegime = {
    ...DEFAULT_REGIME,
    regional: { brackets: [{ upTo: null, rate: 0 }], exemption: 0 },
    municipal: { brackets: [{ upTo: null, rate: 0 }], exemption: 0 },
  };
  const m2 = marginalRate({ salary: 34914 }, 1683, flat);
  assert.equal(m2.surtaxRate, 0);
  near(m2.payrollRate, m2.rate, 1e-12);
});

test("calendario: la tassa ESPP cade nel mese dell'acquisto, il conguaglio RSU il mese dopo", () => {
  // The two timings, confirmed against real payslips: an October purchase is
  // taxed on the October payslip; a November vest settles in December. Getting
  // either wrong would put a deduction on a payslip that does not carry it.
  const grant: Grant = {
    id: "w", label: "W", date: "2026-02-20", valueUsd: 70000, priceAtGrant: 146.32,
    schedule: "quarterly", years: 3, usePlanDates: true,
  };
  const projection = project({
    grants: [grant], price: 188.71, fxRate: 1.147974, salary: 50000,
    today: "2026-09-19", horizonYears: 3, calendar: VESTING_CALENDAR,
  });
  const cal = buildCalendar({
    salary: 50000, today: "2026-09-19", months: 14,
    espp: { pct: 15, plan: ESPP_PLAN, priceAtStart: 127.28 },
    projection, price: 188.71, fxRate: 1.147974,
  });
  const at = (key: string) => cal.months.find((m) => m.ym === key)!;

  // October: the purchase is on the 1st, so the tax is on THAT payslip.
  assert.ok(at("2026-10").esppTax > 0, "the October purchase is taxed in October");
  assert.ok(at("2026-10").esppShares > 0, "and the shares arrive in October");
  assert.equal(at("2026-09").esppTax, 0, "not the month before");
  assert.equal(at("2026-11").esppTax, 0, "and not the month after");

  // November vest, December settlement — never the same month.
  const vest = at("2026-11");
  assert.ok(vest.rsuShares > 0, "the November vest releases shares in November");
  assert.equal(vest.rsuSettlement, 0, "and moves that month's payslip by nothing");
  assert.ok(at("2026-12").rsuSettlement > 0, "the settlement is on the December payslip");

  // Staying enrolled means the purchase month also carries the first deduction
  // of the window that opens the same day.
  assert.ok(at("2026-10").esppContribution > 0, "the new window starts deducting at once");
  // And the six months before a purchase each carry one.
  for (const k of ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"])
    assert.ok(at(k) === undefined || at(k).esppContribution > 0, `${k} is inside a window`);
});

test("calendario: i due conti restano separati, e i conti del mese tornano", () => {
  const grant: Grant = {
    id: "w", label: "W", date: "2026-02-20", valueUsd: 70000, priceAtGrant: 146.32,
    schedule: "quarterly", years: 3, usePlanDates: true,
  };
  const projection = project({
    grants: [grant], price: 188.71, fxRate: 1.147974, salary: 50000,
    today: "2026-09-19", horizonYears: 3, calendar: VESTING_CALENDAR,
  });
  const cal = buildCalendar({
    salary: 50000, today: "2026-09-19", months: 12,
    espp: { pct: 15, plan: ESPP_PLAN, priceAtStart: 127.28 },
    projection, price: 188.71, fxRate: 1.147974,
  });

  assert.equal(cal.months.length, 12);
  assert.equal(cal.months[0].ym, "2026-09", "the calendar starts with this month");

  for (const m of cal.months) {
    // Every month's net is its own arithmetic, with nothing left over.
    near(
      m.net,
      m.baseNet * m.payslips - m.esppContribution - m.esppTax + m.esppRefund - m.rsuSettlement,
      1e-9
    );
    // Shares never touch the payslip: a month can have both, and the two
    // figures are independent.
    near(m.sharesUsd, (m.rsuShares + m.esppShares) * 188.71, 1e-9);
    assert.ok(m.rsuShares === Math.floor(m.rsuShares), "shares are whole");
  }

  // The extra monthly payments land where the contract says: June and December
  // on fourteen payslips.
  assert.deepEqual(extraPayMonths(14), [6, 12]);
  assert.deepEqual(extraPayMonths(13), [12]);
  assert.deepEqual(extraPayMonths(12), []);
  assert.equal(cal.months.find((m) => m.ym === "2026-12")!.payslips, 2);
  assert.equal(cal.months.find((m) => m.ym === "2026-11")!.payslips, 1);

  // The lightest month is the one with the purchase in it, which is the whole
  // reason this view exists.
  assert.ok(cal.lightest);
  assert.ok(cal.lightest!.net < cal.ordinaryNet, "the lightest month is below an ordinary one");
  assert.ok(cal.lightest!.esppTax > 0, "and it is a purchase month");

  // No ESPP: the calendar still works and shows the RSUs alone.
  const noEspp = buildCalendar({
    salary: 50000, today: "2026-09-19", months: 12, espp: null,
    projection, price: 188.71, fxRate: 1.147974,
  });
  assert.equal(noEspp.totalEsppShares, 0);
  assert.ok(noEspp.totalRsuShares > 0);
  for (const m of noEspp.months) assert.equal(m.esppContribution + m.esppTax, 0);
});

test("calendario: l'ESPP trattiene da ogni CEDOLINO, non un dodicesimo al mese", () => {
  // The percentage comes off every payslip, so a month carrying a thirteenth
  // pays it twice. Dividing the window's total by six gave a flat figure that
  // matches no payslip anyone actually receives: on 60,000 at 7% it showed 350
  // everywhere, where the payslip says 300 — and 600 in December.
  const projection = project({
    grants: [], price: 188.71, fxRate: 1.148, salary: 60000,
    today: "2026-09-19", horizonYears: 3, calendar: VESTING_CALENDAR,
  });
  const cal = buildCalendar({
    salary: 60000, today: "2026-09-19", months: 12,
    espp: { pct: 7, plan: ESPP_PLAN, priceAtStart: 127.28 },
    projection, price: 188.71, fxRate: 1.148,
  });
  const at = (k: string) => cal.months.find((m) => m.ym === k)!;

  const perPayslip = (60000 / 14) * 0.07;
  near(perPayslip, 300, 1e-9);
  near(at("2026-11").esppContribution, perPayslip, 1e-9);
  near(at("2026-12").esppContribution, perPayslip * 2, 1e-9, "December carries two payslips");
  near(at("2027-06").esppContribution, perPayslip * 2, 1e-9, "and so does June");
  assert.equal(at("2026-12").payslips, 2);

  // The window's total is untouched by the fix — the percentage is of the
  // annual salary either way, and a six-month window holds exactly one of the
  // two extra payments. It has to keep matching what the ESPP tab shows.
  const window = ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03"];
  near(
    window.reduce((s, k) => s + at(k).esppContribution, 0),
    expectedContribution(60000, 7, ESPP_PLAN.months),
    1e-9
  );

  // And no month is ever charged the flat sixth that was wrong.
  for (const m of cal.months)
    assert.ok(
      Math.abs(m.esppContribution - expectedContribution(60000, 7, ESPP_PLAN.months) / 6) > 1e-6,
      `${m.ym} is still using a flat sixth`
    );
});
