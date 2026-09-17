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
} from "../src/lib/tax.ts";
import { guaranteedFloor, simulateEspp, ESPP_PLAN, expectedContribution } from "../src/lib/espp.ts";
import { project, tranches, addMonths, grantUnits, type Grant } from "../src/lib/rsu.ts";
import { toField, parseNum } from "../src/lib/format.ts";

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
  near(socialSecurity(50000, p), 50000 * 0.097566);
  near(socialSecurity(60000, p), 60000 * 0.097566 + (60000 - 56224) * 0.01);
  // above the ceiling nothing more is due: contributions stop
  assert.equal(socialSecurity(200000, p), socialSecurity(122295, p));
});

test("gross to net: 60,000 in Turin", () => {
  const n = grossToNet({ salary: 60000 });
  near(n.socialSecurity, 5891.72, 0.5);
  near(n.taxableIncome, 54108.28, 0.5);
  near(n.credits, 0);
  near(n.net, 36670, 5);
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

test("RSU: 30-30-40 is a list, not a rounded percentage", () => {
  const ts = tranches({
    id: "a", label: "G", date: "2026-02-20", valueUsd: 47900, priceAtGrant: 100,
    schedule: "30-30-40", years: 3, usePlanDates: false,
  });
  assert.equal(ts.length, 3);
  near(ts[0].units, 143.7);
  near(ts.reduce((s, t) => s + t.units, 0), 479);
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

  // The horizon is split into **calendar** quarters, gaps included: three
  // years from mid-September span thirteen of them, not twelve, because the
  // first and the last are cut in half. Aligning the columns to real quarters
  // is worth the extra column: a rolling window would give bars matching no
  // quarter of any plan.
  assert.equal(once.quarters.length, 13);
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
  // $20,000 granted when the share was at 142.88 makes ~140 units
  near(grantUnits({ ...base, priceAtGrant: 142.88 }), 139.9776, 1e-3);
  // the same amount granted at twice the price makes half the units: this is why
  // an old grant is worth more today than a new one of the same value, and why
  // the grant price belongs to the grant and not to the global parameters
  near(grantUnits({ ...base, priceAtGrant: 285.76 }), 69.9888, 1e-3);
  // with no price we do not divide by zero: zero units, and the field says so
  assert.equal(grantUnits({ ...base, priceAtGrant: 0 }), 0);

  // tranches always add up to the grant's units, whatever the price
  const ts = tranches({ ...base, priceAtGrant: 142.88 });
  near(ts.reduce((s, t) => s + t.units, 0), 139.9776, 1e-3);
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

test("RSU: sell to cover splits the vest in two, and the halves add up", () => {
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
    near(y.netShares + y.sharesSold, y.units, 1e-9);
    assert.ok(y.sharesSold > 0, `${y.year}: something must be sold to cover the tax`);
    // At a marginal rate above 50% more than half the vest goes to the taxman,
    // which is the number that surprises people at their first vest.
    assert.ok(y.sharesSold > y.netShares, `${y.year}: over half the vest is withheld`);
  }

  // No tax, nothing sold: the split follows the rate and is not a fixed cut.
  const free = project({
    grants: [grant], price: 100, fxRate: 1.16, salary: 0,
    today: "2026-09-17", horizonYears: 3,
  });
  assert.ok(free.years[0].sharesSold < p.years[0].sharesSold);
});
