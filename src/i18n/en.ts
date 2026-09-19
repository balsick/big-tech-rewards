import type { Dict } from "./it.ts";

export const en: Dict = {
  app: {
    title: "Big Tech Rewards",
    tagline: "RSU and ESPP, after Italian tax",
    intro:
      "How much of your equity compensation actually reaches you, and how much the taxman takes. Every calculation runs in your browser.",
  },
  nav: { espp: "ESPP", rsu: "RSU", total: "Total reward", calendar: "Calendar" },
  header: {
    repo: "Code on GitHub",
    theme: "Theme",
    themeNext: (current: string, next: string) => `Theme: ${current}. Tap for ${next}.`,
    langNext: (next: string) => `Switch to ${next}`,
    lang: "Language",
    themeLight: "Light",
    themeDark: "Dark",
    themeAuto: "System",
  },
  total: {
    title: "Total reward",
    intro:
      "Everything this job pays you in a year, in one place: salary, cash bonus, the shares that vest and the ESPP discount. The figures come from the other two tabs — what you type there shows up here.",
    bonus: "Cash bonus",
    bonusHint: (amount: string) => `${amount} a year, on the current salary`,
    bonusWhy:
      "The bonus percentage is in your contract and moves with role and year: here it is a field to overwrite, not a figure the tool takes on faith. A cash bonus is employment income like salary, so it goes into the same calculation rather than a separate one.",
    answerGross: "Gross over three years",
    answerNet: "Net over three years",
    colYear: "Year",
    colSalary: "Salary",
    colBonus: "Bonus",
    colRsu: "RSUs vesting",
    colEspp: "ESPP discount",
    colGross: "Gross",
    colNet: "Net",
    colRate: "Average rate",
    totalRow: "In total",
    esppNote:
      "Only the ESPP discount belongs here: it is employment income and it is taxed on the payslip — two windows a year, at the ESPP tab’s parameters. The market gain beyond the discount is not pay; it is a position in shares, and the market decides what it is worth.",
    rsuNote:
      "RSUs count in the year they vest, not the year they are granted: an award from three years ago pays today, and this year’s will pay over the next three.",
    rateNote:
      "The average rate is total tax over the year’s gross, not the marginal rate: the marginal one applies to the last euro, this one to all of them.",
    variableShare: (p: string) => `${p} of the total is variable`,
    variableHint:
      "Bonus, RSUs and the ESPP discount together, on the gross. It is the part that depends on performance, on when shares vest, and on the market.",
  },
  calendar: {
    title: "Calendar",
    intro:
      "What each payslip will look like, month by month. Two separate accounts: the bank one, where the net moves, and the brokerage one, where shares turn up now and then. They share a row because they happen in the same month.",
    lightest: "Lightest month in the bank",
    lightestHint: (delta: string, normal: string) => `${delta} below an ordinary ${normal} month`,
    shares: "Shares in the brokerage account",
    sharesHint: (rsu: string, espp: string) => `${rsu} from RSUs, ${espp} bought`,
    colMonth: "Month",
    colWhat: "What happens",
    colBank: "In the bank",
    colShares: "In the brokerage account",
    ordinary: "ordinary payslip",
    contribution: (amount: string) => `set aside for the ESPP ${amount}`,
    contributionShort: (amount: string) => `set aside ${amount}`,
    esppTax: (amount: string) => `tax on the discount ${amount}`,
    esppRestart: (amount: string) => `the window restarts ${amount}`,
    settlement: (amount: string) => `RSU settlement ${amount}`,
    settlementBack: (amount: string) => `RSU refund ${amount}`,
    extraPay: "extra monthly payment",
    vested: (units: string, withheld: string) => `${units} RSUs vest, ${withheld} kept back for tax`,
    bought: (shares: string) => `you buy ${shares} shares`,
    arriving: (shares: string) => `+${shares} shares`,
    legendContribution: "set aside: your own money, waiting for the purchase",
    legendTax: "tax: the ESPP discount and the RSU settlement",
    legendExtra: "extra monthly payment",
    legendShares: "shares in the brokerage account: they never touch the payslip",
    timing:
      "The RSU settlement lands on the payslip of the month AFTER the vest: at vesting shares are kept back at a flat rate, and the difference with your own rate is settled the following month. The tax on the ESPP discount comes out of the payslip of the purchase month itself.",
    assumptions:
      "The net per payslip is the annual net over the number of payslips in the contract, so the year adds up while a thirteenth month is not exactly an ordinary one. It assumes you stay enrolled in the ESPP, which is why the month of a purchase also carries the first deduction of the new window. Surtaxes are in none of these rows: they are settled the following year.",
    noEspp: "You are not in the ESPP, so the calendar shows the RSUs alone.",
    empty: "There is nothing to lay out: this needs a salary and either a grant or an ESPP percentage.",
    horizon: "How many months",
    monthCount: (n: number) => `${n} months`,
  },
  footer: {
    privacyTitle: "No data collection whatsoever",
    privacy:
      "This page collects nothing and transmits nothing, and it has no server it could send anything to. No analytics, cookies or trackers: the maths happens in your browser and the numbers you type never leave your device. It stores something only if you ask it to, with the explicit button, and only in this browser’s memory. The only network request is to the quote file served by this same site.",
    unofficialTitle: "Absolutely unofficial tool",
    unofficial:
      "This is not an official tool of any company, stock plan, broker or tax authority. It is not affiliated with, endorsed by or sponsored by any of them, and it does not replace your plan documents, your payslip or a professional adviser.",
    liabilityTitle: "No warranty, no liability",
    liability:
      "Rates, formulas and quotes may be wrong, incomplete or out of date: rules change, plans change, prices change. The authors disclaim all responsibility for the correctness of the information provided and for any decision taken on the basis of it. This is not financial, tax or investment advice. Always check the numbers against your payslip, your plan documents and a professional.",
    source: "Source code and MIT licence on GitHub",
    taxYear: "Tax parameters",
  },
  common: {
    salary: "Gross annual salary",
    salaryWhy:
      "RSUs and ESPP are not stock market gains: they are employment income stacked on top of your salary. So an average tax rate tells you nothing — what matters is the bracket that extra income lands in, and to know that you need to know where you start from.",
    salaryWhy2:
      "That is all it is used for, and it never leaves your device: it is not sent anywhere, and it is only stored if you ask for it with the button at the foot of this column.",
    whatIsThis: "What is this",
    price: "Share price",
    priceStart: "Price at start",
    priceEnd: "Price at purchase",
    fx: "EUR/USD rate",
    fxHint: "dollars per euro",
    manual: "typed in by hand",
    reset: "Reset",
    fromQuote: "latest close",
    fromHistory: "close of",
    fromLive: "ECB reference",
    quoteMissing: "Quotes are unavailable: type the numbers in, the calculation still works.",
    liveFx: "Refresh the rate",
    perShare: "per share",
    shares: "shares",
    gross: "gross",
    net: "net",
    year: "year",
    total: "total",
    months: "months",
    advanced: "Advanced settings",
  },
  espp: {
    title: "ESPP",
    subtitle: "The discounted share purchase plan",
    howTitle: "How it works, in two lines",
    how1Title: "The discount applies to the lower price",
    how1:
      "You pay 85% of the lower of the price at the start of the period and the price on purchase day. That is why the plan pays off even when the stock falls.",
    how2Title: "The discount is salary, not the stock market",
    how2:
      "It lands on your payslip as taxable pay and the tax is withheld right there, in the month of the purchase. That money never passes through your account.",
    guaranteed: (r: string) => `With a flat stock you still keep ${r} gross.`,
    windowStart: "Start of period",
    windowPick: "Which window",
    enrolled: "In the plan since",
    enrolledHint: (price: string, date: string) => `reference price ${price}, close of ${date}`,
    enrolledFirst: "first time in this window",
    enrolledWhy:
      "The lookback does not reach back to the start of the period you are in now, but to the day you joined the plan. Someone already in from 1 April carries April’s price into the window that starts in October, and only loses it if the purchase day closes lower. Someone joining in October for the first time starts from October’s price. Two colleagues buying on the same day at the same percentage can end up with very different numbers of shares, and this is why.",
    enrolledSameAsWindow: "You joined with this window, so the reference is the price at the start of the period.",
    enrolledCarried: (date: string) =>
      `You carry the price of ${date}: it holds unless the purchase day closes lower.`,
    windowOpen: "running",
    windowClosed: "closed",
    windowLabel: (from: string, to: string) => `${from} – ${to}`,
    windowOnlyOne: "It is the only window open right now: a period runs from one purchase to the next, so the dates are not something you pick.",
    windowClosedHint:
      "The window that just closed is the one with real prices: the purchase happened and the withholding lands on this month’s payslip. The one that just opened can only be a projection.",
    windowOpenHint: "Window still running: the purchase price is a projection, not a real close.",
    windowEnd: "Purchase day",
    contribution: "How much you set aside",
    contributionHint: "share of your pay withheld from each payslip",
    saved: "Set aside over the period",
    savedHint: (pct: string, months: number) =>
      `${pct} of gross salary for ${months} months, extra months included`,
    savedManual: "typed in by hand: the percentage no longer drives it",
    flatStock: "Try the floor",
    flatStockHint:
      "Sets the purchase-day price equal to the starting price: the stock does not move and only the discount is left. It is the plan’s floor — what you get if the market does nothing.",
    flatStockOn: "flat stock: only the discount is left",
    youGain: "You gain",
    gainRoi: (roi: string, outlay: string) => `${roi} of what it costs you: ${outlay}`,
    answerCost: "What it costs you",
    answerShares: "Shares you buy",
    answerValue: "What they are worth",
    answerValueHint: (price: string) => `at ${price} a share`,
    gainLine: (roi: string, outlay: string, shares: string, value: string, months: number) =>
      `${roi} of the ${outlay} it costs you, over ${months} months: ${shares} shares worth ${value}.`,
    costBreak: (shares: string, tax: string) => `${shares} of shares plus ${tax} of tax on the discount.`,
    annualised: (r: string) =>
      `Annualised that is roughly ${r}: your money is tied up for about half the period, not all of it.`,
    payslipTitle: "Withheld on the purchase-month payslip",
    payslipLine: (discount: string, rate: string) =>
      `The discount is worth ${discount} and it is taxable pay: that payslip loses ${rate} of it, between income tax and social security.`,
    payslipSurtax: (amount: string, total: string, rate: string) =>
      `The regional and municipal surtaxes — another ${amount} — do not come out that month: they are worked out on the year’s income and settled later, in instalments. All in, the discount costs you ${total}, which is ${rate} at your full marginal rate.`,
    payslipRest: (refund: string, delta: string, direction: string) =>
      `${refund} that did not buy a whole share comes back to you, so your take-home that month is ${delta} ${direction} than usual.`,
    lower: "lower",
    higher: "higher",
    stepsTitle: "How you get there",
    steps: {
      reference: "Reference price",
      referenceHint: (lookback: boolean): string =>
        lookback ? "the lower of start and purchase" : "the price on purchase day",
      buy: "Price you pay",
      buyHint: (discount: string, on: string) => `${discount} off ${on}`,
      savedUsd: "Set aside, in dollars",
      bought: "Shares bought",
      boughtHint: "whole shares only: the rest goes back on your payslip",
      cost: "What they cost you",
      rest: "Remainder, back on your payslip",
      value: "What they are worth",
      tax: "Tax on the discount",
      out: "What you actually put in",
    },
    salaryEquivTitle: "Worth the same as a pay rise of",
    salaryEquivLine: (share: number, gain: string, perMonth: string) =>
      `That is ${share}% of your salary, and it comes from ${gain} net over the period — ${perMonth} a month.`,
    fellTitle: "The stock fell, and you still gain",
    fell: (to: string, b: string) =>
      `It went from ${to} to ${b}, and you pay the discount on the lower of the two: the discount applies to the low value, and the shares are worth that value.`,
    planTitle: "The plan",
    discount: "Discount",
    lookbackOn: "Discount on the lower price",
    periodMonths: "Length of the period",
    cap: "Cap, % of salary",
    capUsd: "Cap per period",
    capUsdHint:
      "The US tax limit: $25,000 a year of value at grant, which with the 15% discount is bought with $21,250 of contributions — $10,625 per six-month window.",
    capHit: (above: string, cap: string) =>
      `The plan stops at ${cap} per period: ${above} set aside above the cap buys no shares and comes back on your payslip.`,
    fractional: "Buys fractional shares",
    missing: "A number is missing: without the amount set aside, the prices and the rate there is no purchase to describe.",
  },
  rsu: {
    title: "RSU",
    subtitle: "Granted units that turn into shares a slice at a time",
    intro:
      "The units are the fact: how many you were given and when they become yours. The value is a lens — what they would be worth at a given price — and it is good for the order of magnitude, because tomorrow is another price.",
    whyProspect:
      "With a new grant every year and quarterly vesting, in any given year slices of three or four different grants vest. The taxman adds up everything that vests in the same year, so it is the year’s total that sets the rate — not the individual tranche. Looking at them one at a time is the wrong way round.",
    grants: "Grants",
    addGrant: "Add a grant",
    removeGrant: "Remove",
    grantLabel: "Name",
    grantDate: "Grant date",
    grantValue: "Grant value",
    grantValueWhy:
      "In dollars, the way they tell you: the units are the result, and they are set by the share price on the grant date. It also shows something you cannot see in share counts — two grants of the same amount made in different years are worth very different sums today.",
    grantValueHint: (units: string, price: string, date: string) =>
      `${units} units, at a ${price} fair market value · mean of the 20 sessions before ${date}`,
    grantValueHintRolling: (units: string, price: string) =>
      `${units} units, at an estimated ${price} fair market value · the date is in the future, so this is the mean of the last 20 known sessions`,
    fmvWhy:
      "A grant is not priced at the close of the day but at the fair market value: the mean of the closes of the 20 trading sessions before the grant day, that day excluded. It is not a detail — on 20 February 2026 the close was $142.88 and the fair market value $146.32, which is 2.4% fewer units. For a date in the future that figure cannot exist yet, so the mean of the last 20 known sessions stands in and the field stays overwritable.",
    grantValueHintManual: (units: string, price: string) =>
      `${units} units, at the ${price} you typed`,
    grantValueNoPrice: "the grant-date price is missing: type it below",
    grantPrice: "Price at grant",
    grantPriceFuture:
      "The grant is in the future: there is no closing price for that day yet. It starts from the last one on file — overwrite it to try another scenario.",
    grantSchedule: "Vesting",
    grantYears: "Length",
    yearCount: (n: number) => (n === 1 ? "1 year" : `${n} years`),
    years: "years",
    fixedDates: "Plan’s fixed dates",
    fixedDatesHint: (date: string) =>
      `Quarterly vesting snaps to the plan’s calendar (${date}) instead of falling exactly three months from the grant.`,
    schedule: {
      annual: "Annual",
      annualHint: "one a year, all equal",
      "30-30-40": "30-30-40",
      "30-30-40Hint": "three annual vests, the last one bigger",
      quarterly: "Quarterly",
      quarterlyHint: "one every three months",
      monthly: "Monthly",
      monthlyHint: "one a month",
    },
    horizon: "Horizon",
    chartTitle: "When they arrive",
    chartHint:
      "One quarter per bar, the colours are the grants. Empty quarters are information: they are the months when nothing arrives.",
    noVesting: "Nothing vests within the chosen horizon.",
    horizonSpan: (year: number) => `From now to the end of ${year}`,
    totalLine: (units: string, lordo: string) => `${units} units, ${lordo} gross.`,
    salaryCompare: (pct: number, from: string, to: string) =>
      `Like a salary ${pct}% higher: from ${from} to ${to} net a year.`,
    yearUnits: "units",
    yearGross: "Gross",
    performance: "Performance",
    performanceHint: "the stock bonus moves with your rating",
    performanceWhy:
      "The dollar figure on an annual award is a target, not a fixed amount: what is actually granted moves with personal and company performance, typically between 75% and 150% of target. 100% is the target, not a forecast. It applies to the annual awards only: a welcome grant is agreed when you are hired and does not depend on a review that has not happened yet.",
    performanceOn: "on the annual awards",
    netWithholding:
      "Nothing is sold. The plan moved from sell to cover to net share withholding: the company simply does not hand over the shares needed to cover the withholding, and remits the tax itself. No market transaction, nothing to report as a sale, and — the part that matters — the price after the vesting day does not change how many shares are kept back, because the count is fixed on that day’s fair market value.",
    withholdingFlat: (rate: string) =>
      `The withholding is computed at a flat ${rate} — the same rate used for a cash bonus — and not at your own rate. Shares kept back are rounded up.`,
    payslipOwed: (rate: string, amount: string) =>
      `Your rate on these vests is ${rate}, above the withholding: the difference — ${amount} — is deducted in cash from a later payslip.`,
    payslipRefund: (rate: string, amount: string) =>
      `Your rate on these vests is ${rate}, below the withholding: the excess — ${amount} — comes back to you on a later payslip.`,
    payslipEven: "Your rate matches the withholding rate, so there is nothing to settle.",
    payslipColumn: "Payslip settlement",
    dividendTitle: "Dividend equivalents",
    dividendLine: (units: string, value: string) =>
      `Every time a dividend is paid, unvested RSUs are credited with extra units worth that dividend. Over the horizon that is ${units} additional units, ${value}: no award letter promises them, and they add up.`,
    dividendAssumption: (amount: string) =>
      `Future dividends are projected at the last known amount (${amount} a share, quarterly) at today’s price. The ones already paid are the real ones.`,
    answerDividend: "Of which from dividends",
    payslipTitle: "The withholding is flat, the payslip settles it",
    answerPayslip: "Then off the payslip",
    answerPayslipHint: "in cash, what the shares could not cover",
    yearRate: "Rate",
    yearShares: "Shares that reach you",
    yearSharesHint: "what is left after the withholding",
    yearSold: "Withheld for tax",
    sellToCover:
      "The withholding on a vest is not paid in cash, and nothing is sold: the company keeps back part of the shares the moment they vest and remits the tax itself. That is \u201cnet share withholding\u201d. Nobody asks you for money — fewer shares arrive, and it is the single most surprising thing about a first vest.",
    chartGross: "Figures and units are gross, before the withholding.",
    quarterEmpty: "Nothing arrives",
    yearPartial: "counted from today: what already vested is not here",
    yearSalaryEquiv: "Equivalent salary",
    yearSalaryEquivHint: "salary + that year’s RSUs",
    tableTitle: "Every vest, one by one",
    quarterlyTable: "By quarter",
    trancheTable: "By vest",
    answerShares: "Shares that reach you",
    answerValue: "What they are worth",
    answerValueHint: (price: string) => `at ${price} a share`,
    tableDate: "Date",
    tableGrant: "Grant",
    tableTranche: "Tranche",
    tableUnits: "Units",
    tableValue: "Gross",
    tableNet: "Net",
    fractionNote:
      "Units stay fractional: rounding to whole shares happens at vesting, on what is left after withholding, and the leftover fraction is paid in cash.",
    priceNote:
      "The same price is used for every future vest: nobody knows the price two years out, and inventing one would give a precision that does not exist.",
  },
  save: {
    title: "Saving in this browser",
    button: "Save in this browser",
    buttonDirty: "Save changes",
    upToDate: "Saved",
    forget: "Forget everything",
    savedOn: (when: string) => `Last saved: ${when}.`,
    where:
      "It goes into this browser’s localStorage, on this device. It is not an account and not a file: none of your other devices will see it, and clearing the site data removes it. “Forget everything” removes it right away.",
    nothingLeaves:
      "Nothing you type leaves the device, whether you save or not: this page has no server to send it to. Saving only changes how long the numbers stay here.",
    unavailable:
      "This browser will not let the page save — that happens in private browsing or with site data blocked. Your numbers hold for as long as the page stays open.",
  },
  guided: {
    open: "Guide me",
    title: "Guided mode",
    exit: "Leave guided mode",
    exitShort: "Leave",
    reopen: "It reopens from here, always. The first time it opens on its own.",
    chooseTitle: "What do you want to work out?",
    chooseSub: "Two tools, two different questions. I ask you two or three, the rest I fill in.",
    esppDesc:
      "You buy your company's shares at a discount with part of your pay. I tell you what you really gain and what they withhold in the month of the purchase.",
    rsuDesc:
      "Shares granted to you that become yours a slice at a time. I tell you how many actually reach you, after the withholding.",
    full: "Full mode",
    fullSub: "Every field, no questions",
    step: (n: number, tot: number, tool: string) => `Step ${n} of ${tot} · ${tool}`,
    back: "Back",
    next: "Next",
    see: "See the result",
    preview: "preview",
    redo: "Start over",
    openTool: "Open the tool",
    pctTitle: "How much do you set aside?",
    pctSub: "It is the slice of pay the plan withholds every month.",
    esppPrefilled: (from: string, to: string, cap: string) =>
      `The rest I already know: period ${from} → ${to}, 15% off the lower price, a ${cap} cap, prices from the market. You can change every one of them later.`,
    salaryTitle: "What do you earn gross a year?",
    salarySub: "The last question.",
    whyTitle: "Why it is needed",
    welcomeTitle: "What is the welcome grant worth?",
    welcomeSub: "In dollars, the way they told you.",
    welcomeField: "Welcome grant value",
    welcomePrefilled: (date: string) =>
      `Grant date already set to ${date}, vesting 30-30-40: three annual tranches, the last one bigger.`,
    bonusTitle: "And the annual bonus?",
    bonusSub: "The one granted at year end, if there is one.",
    bonusField: "Annual bonus value",
    bonusPrefilled: (date: string) =>
      `Granted every year on ${date}, vesting quarterly over three years.`,
    esppHeadline: (pct: string, salary: string) => `At ${pct} on a ${salary} salary`,
    esppHeadlineSub: (contributed: string, shares: string, price: string) =>
      `You set aside ${contributed} over six months and buy ${shares} shares at ${price} each.`,
    rsuHeadline: (year: number, shares: string) => `From now to the end of ${year} you get ${shares} shares`,
    rsuQuarter: "Quarter",
    rsuQuarterVest: "Vests",
    rsuRateIsYearly:
      "The rate is the year’s, not the quarter’s: the taxman adds up everything that vests in the same calendar year, so the quarters inside one share a rate. It is also what the broker does — it withholds at every vest and the year reconciles.",
    rsuHeadlineSub: (units: string, gross: string) =>
      `${units} units vest, ${gross} gross. The rest goes to withholding, sold on the day.`,
    rsuPrefilled: (welcome: string, bonus: string) =>
      `I set the dates: welcome on ${welcome}, bonus every ${bonus}. In the full tool you can add more grants and change the schedule.`,
    total: "In total",
    missing: "A number is missing: without the quotes there is no result to show. Open the tool and type the prices in.",
  },
  tax: {
    title: "Tax & local surtaxes",
    intro:
      "Local surtaxes are the one part of this calculation no national constant can guess: they vary by region and by municipality, and on a 50,000 salary they come to nearly 1,800 euro a year. They are prefilled with the rates in force in Turin, Piedmont.",
    marginalTitle: "Marginal rate",
    marginalLine: (rate: string) =>
      `The taxman takes ${rate} of every extra gross euro: that is the rate RSUs and ESPP are taxed at, not the average one.`,
    marginalWhy:
      "Four things pile up at the margin: the income tax bracket, the employment tax credit phasing out between 28,000 and 50,000, the extra 1% of social security above the first band, and the surtax brackets. Adding them up by hand is the calculation nobody gets right — here it is computed by difference.",
    incomeTax: "Income tax brackets",
    incomeTaxHint:
      "Progressive by bracket: someone above 28,000 does not pay 33% on everything, they pay it on the slice between 28,000 and 50,000.",
    upTo: "up to",
    over: "above",
    rate: "Rate",
    socialSecurity: "Social security contributions",
    ssRate: "Base rate",
    ssMinor: "Minor contributions",
    ssMinorHint:
      "0.26667 FIS + 0.30 CIGS + 0.05 bilateral body. Check your own payslip: the bilateral body depends on the national agreement and sometimes on the province.",
    ssFirstBand: "First pensionable band",
    ssFirstBandHint: "above this amount an extra 1% applies",
    ssCeiling: "Annual ceiling",
    ssCeilingHint: "above this no further contributions are due (enrolled after 1995)",
    applyCeiling: "Apply the ceiling",
    regional: "Regional surtax",
    municipal: "Municipal surtax",
    exemption: "Exemption threshold",
    exemptionHint:
      "It is a threshold, not an allowance: if income exceeds it, the surtax is due on the whole income, not on the excess.",
    months: "Pay periods",
    monthsHint: "how many payslips make a year, extra months included",
    presets: "Presets",
    presetTurin: "Turin — Piedmont",
    presetFlat: "Single rate",
  },
};
