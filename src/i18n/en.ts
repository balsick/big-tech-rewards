import type { Dict } from "./it.ts";

export const en: Dict = {
  app: {
    title: "Big Tech Rewards",
    tagline: "RSU and ESPP, after Italian tax",
    intro:
      "How much of your equity compensation actually reaches you, and how much the taxman takes. Every calculation runs in your browser.",
  },
  nav: { espp: "ESPP", rsu: "RSU" },
  header: {
    repo: "Code on GitHub",
    theme: "Theme",
    lang: "Language",
    themeLight: "Light",
    themeDark: "Dark",
    themeAuto: "System",
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
    ral: "Gross annual salary",
    ralWhy:
      "RSUs and ESPP are not stock market gains: they are employment income stacked on top of your salary. So an average tax rate tells you nothing — what matters is the bracket that extra income lands in, and to know that you need to know where you start from.",
    ralWhy2:
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
    windowEnd: "Purchase day",
    contribution: "How much you set aside",
    contributionHint: "share of your pay withheld from each payslip",
    saved: "Set aside over the period",
    savedHint: (pct: string, mesi: number) =>
      `${pct} of gross salary for ${mesi} months, extra months included`,
    savedManual: "typed in by hand: the percentage no longer drives it",
    atMinimum: "Try the floor",
    atMinimumHint:
      "Sets the purchase-day price equal to the starting price: the stock does not move and only the discount is left. It is the plan’s floor — what you get if the market does nothing.",
    atMinimumOn: "flat stock: only the discount is left",
    youGain: "You gain",
    gainLine: (roi: string, esborso: string, azioni: string, valore: string, mesi: number) =>
      `${roi} of the ${esborso} it costs you, over ${mesi} months: ${azioni} shares worth ${valore}.`,
    costBreak: (azioni: string, tasse: string) => `${azioni} of shares plus ${tasse} of tax on the discount.`,
    annualised: (r: string) =>
      `Annualised that is roughly ${r}: your money is tied up for about half the period, not all of it.`,
    payslipTitle: "Withheld on the purchase-month payslip",
    payslipLine: (sconto: string, aliquota: string) =>
      `The discount is worth ${sconto} and it is taxable pay: it is taxed on your payslip at ${aliquota}, your marginal rate.`,
    payslipRest: (resto: string, delta: string, verso: string) =>
      `${resto} that did not buy a whole share comes back to you, so your take-home that month is ${delta} ${verso} than usual.`,
    lower: "lower",
    higher: "higher",
    stepsTitle: "How you get there",
    steps: {
      reference: "Reference price",
      referenceHint: (lookback: boolean): string =>
        lookback ? "the lower of start and purchase" : "the price on purchase day",
      buy: "Price you pay",
      buyHint: (sconto: string, sul: string) => `${sconto} off ${sul}`,
      savedUsd: "Set aside, in dollars",
      bought: "Shares bought",
      boughtHint: "whole shares only: the rest goes back on your payslip",
      cost: "What they cost you",
      rest: "Remainder, back on your payslip",
      value: "What they are worth",
      tax: "Tax on the discount",
      out: "What you actually put in",
    },
    ralEquivTitle: "Worth the same as a pay rise of",
    ralEquivLine: (quota: number, guadagno: string, mese: string) =>
      `That is ${quota}% of your salary, and it comes from ${guadagno} net over the period — ${mese} a month.`,
    fellTitle: "The stock fell, and you still gain",
    fell: (a: string, b: string) =>
      `It went from ${a} to ${b}, and you pay the discount on the lower of the two: the discount applies to the low value, and the shares are worth that value.`,
    planTitle: "The plan",
    discount: "Discount",
    lookbackOn: "Discount on the lower price",
    periodMonths: "Length of the period",
    cap: "Cap, % of salary",
    capUsd: "Cap per period",
    capUsdHint:
      "The US tax limit: $25,000 a year of value at grant, which with the 15% discount is bought with $21,250 of contributions — $10,625 per six-month window.",
    capHit: (oltre: string, tetto: string) =>
      `The plan stops at ${tetto} per period: ${oltre} set aside above the cap buys no shares and comes back on your payslip.`,
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
    grantValueHint: (unita: string, prezzo: string, data: string) =>
      `${unita} units, at the ${prezzo} price of ${data}`,
    grantValueHintManual: (unita: string, prezzo: string) =>
      `${unita} units, at the ${prezzo} you typed`,
    grantValueNoPrice: "the grant-date price is missing: type it below",
    grantPrice: "Price at grant",
    grantPriceFuture:
      "The grant is in the future: there is no closing price for that day yet. It starts from the last one on file — overwrite it to try another scenario.",
    grantSchedule: "Vesting",
    grantYears: "Length",
    anni: (n: number) => (n === 1 ? "1 year" : `${n} years`),
    years: "years",
    fixedDates: "Plan’s fixed dates",
    fixedDatesHint: (date: string) =>
      `Quarterly vesting snaps to the plan’s calendar (${date}) instead of falling exactly three months from the grant.`,
    schedule: {
      annuale: "Annual",
      annualeHint: "one a year, all equal",
      "30-30-40": "30-30-40",
      "30-30-40Hint": "three annual vests, the last one bigger",
      trimestrale: "Quarterly",
      trimestraleHint: "one every three months",
      mensile: "Monthly",
      mensileHint: "one a month",
    },
    horizon: "Horizon",
    chartTitle: "When they arrive",
    chartHint:
      "One quarter per bar, the colours are the grants. Empty quarters are information: they are the months when nothing arrives.",
    noVesting: "Nothing vests within the chosen horizon.",
    horizonTitle: (n: number) => (n === 1 ? "Over the next year you get" : `Over the next ${n} years you get`),
    totalLine: (unita: string, lordo: string) => `${unita} units, ${lordo} gross.`,
    salaryCompare: (pct: number, da: string, a: string) =>
      `Like a salary ${pct}% higher: from ${da} to ${a} net a year.`,
    yearUnits: "units",
    yearGross: "Gross",
    yearRate: "Rate",
    yearShares: "Shares that reach you",
    yearSharesHint: "the rest go to withholding",
    yearRalEquiv: "Equivalent salary",
    yearRalEquivHint: "salary + that year’s RSUs",
    tableTitle: "Every vest, one by one",
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
  salva: {
    title: "Saving in this browser",
    button: "Save in this browser",
    buttonDirty: "Save changes",
    upToDate: "Saved",
    forget: "Forget everything",
    savedOn: (quando: string) => `Last saved: ${quando}.`,
    where:
      "It goes into this browser’s localStorage, on this device. It is not an account and not a file: none of your other devices will see it, and clearing the site data removes it. “Forget everything” removes it right away.",
    nothingLeaves:
      "Nothing you type leaves the device, whether you save or not: this page has no server to send it to. Saving only changes how long the numbers stay here.",
    unavailable:
      "This browser will not let the page save — that happens in private browsing or with site data blocked. Your numbers hold for as long as the page stays open.",
  },
  tax: {
    title: "Tax & local surtaxes",
    intro:
      "Local surtaxes are the one part of this calculation no national constant can guess: they vary by region and by municipality, and on a 50,000 salary they come to nearly 1,800 euro a year. They are prefilled with the rates in force in Turin, Piedmont.",
    marginalTitle: "Marginal rate",
    marginalLine: (aliquota: string) =>
      `The taxman takes ${aliquota} of every extra gross euro: that is the rate RSUs and ESPP are taxed at, not the average one.`,
    marginalWhy:
      "Four things pile up at the margin: the income tax bracket, the employment tax credit phasing out between 28,000 and 50,000, the extra 1% of social security above the first band, and the surtax brackets. Adding them up by hand is the calculation nobody gets right — here it is computed by difference.",
    irpef: "Income tax brackets",
    irpefHint:
      "Progressive by bracket: someone above 28,000 does not pay 33% on everything, they pay it on the slice between 28,000 and 50,000.",
    upTo: "up to",
    over: "above",
    rate: "Rate",
    inps: "Social security contributions",
    inpsRate: "Base rate",
    inpsMinor: "Minor contributions",
    inpsMinorHint: "short-time work and guarantee funds: they vary by sector and company size",
    inpsFirstBand: "First pensionable band",
    inpsFirstBandHint: "above this amount an extra 1% applies",
    inpsCeiling: "Annual ceiling",
    inpsCeilingHint: "above this no further contributions are due (enrolled after 1995)",
    applyCeiling: "Apply the ceiling",
    regional: "Regional surtax",
    municipal: "Municipal surtax",
    exemption: "Exemption threshold",
    exemptionHint:
      "It is a threshold, not an allowance: if income exceeds it, the surtax is due on the whole income, not on the excess.",
    months: "Pay periods",
    monthsHint: "how many payslips make a year, extra months included",
    presets: "Presets",
    presetTorino: "Turin — Piedmont",
    presetFlat: "Single rate",
  },
};
