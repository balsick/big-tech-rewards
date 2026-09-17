export const it = {
  app: {
    title: "Big Tech Rewards",
    tagline: "RSU ed ESPP, al netto delle tasse italiane",
    intro:
      "Due simulatori per i compensi in azioni: quante te ne arrivano davvero e quanto se ne prende il fisco. Tutto il conto avviene nel tuo browser — nessun dato esce da questa pagina.",
  },
  nav: { espp: "ESPP", rsu: "RSU" },
  header: {
    repo: "Codice su GitHub",
    theme: "Tema",
    lang: "Lingua",
    themeLight: "Chiaro",
    themeDark: "Scuro",
    themeAuto: "Sistema",
  },
  footer: {
    privacyTitle: "Nessuna raccolta di dati",
    privacy:
      "Questa pagina non raccoglie, non salva e non trasmette nulla. Non ci sono analytics, cookie, tracker o server: tutti i conti si fanno nel tuo browser e i numeri che scrivi non lasciano il dispositivo. L’unica richiesta di rete è al file delle quotazioni servito da questo stesso sito.",
    unofficialTitle: "Strumento assolutamente non ufficiale",
    unofficial:
      "Non è uno strumento ufficiale di nessuna azienda, né di un piano azionario, né di un broker, né di un’amministrazione fiscale. Non è associato, approvato o sponsorizzato da nessuno di essi, e non sostituisce i documenti del tuo piano, la tua busta paga o un consulente.",
    liabilityTitle: "Nessuna garanzia, nessuna responsabilità",
    liability:
      "Le aliquote, le formule e le quotazioni possono essere sbagliate, incomplete o superate: le norme fiscali cambiano, i piani cambiano, i prezzi cambiano. Gli autori declinano ogni responsabilità sulla correttezza delle informazioni fornite e su qualsiasi decisione presa in base ad esse. Non è consulenza finanziaria, fiscale o di investimento. Verifica sempre i numeri con la tua busta paga, i documenti del piano e un professionista.",
    source: "Codice sorgente e licenza MIT su GitHub",
    taxYear: "Parametri fiscali",
  },
  common: {
    ral: "RAL",
    ralWhy:
      "Perché serve: RSU ed ESPP non sono guadagni di borsa, sono reddito da lavoro che si somma al tuo stipendio. Quindi non conta un’aliquota media, conta lo scaglione in cui quel reddito in più va a cadere — e per saperlo bisogna sapere da dove parti. Serve solo a questo: resta nel browser, non viene salvata né inviata da nessuna parte.",
    price: "Prezzo azione",
    priceStart: "Prezzo a inizio periodo",
    priceEnd: "Prezzo il giorno dell’acquisto",
    fx: "Cambio EUR/USD",
    fxHint: "dollari per un euro",
    manual: "scritto a mano",
    reset: "ripristina",
    fromQuote: "ultima chiusura in archivio",
    fromHistory: "chiusura salvata nei sorgenti",
    fromLive: "riferimento BCE di oggi",
    quoteMissing:
      "Le quotazioni non sono disponibili: scrivi i numeri a mano, il conto si fa lo stesso.",
    liveFx: "aggiorna il cambio",
    perShare: "per azione",
    shares: "azioni",
    gross: "lordo",
    net: "netto",
    year: "anno",
    total: "totale",
    months: "mesi",
    advanced: "Impostazioni avanzate",
    show: "mostra",
    hide: "nascondi",
  },
  espp: {
    title: "ESPP",
    subtitle: "Il piano di acquisto azioni a sconto",
    lookbackTitle: "Le due cose che nessun conto a mente indovina",
    lookback:
      "Il prezzo che paghi non è lo sconto sul valore di oggi: è lo sconto sul minore fra il valore a inizio periodo e quello del giorno dell’acquisto. È il lookback, ed è la ragione per cui il piano conviene anche quando il titolo scende.",
    incomeWarning:
      "E lo sconto non è un guadagno di borsa: è reddito da lavoro. L’azienda te lo mette in busta come imponibile e ti trattiene le tasse lì, nel cedolino del mese dell’acquisto, senza che un euro di quel beneficio ti sia mai passato per il conto.",
    windowStart: "Inizio periodo",
    windowEnd: "Giorno dell’acquisto",
    contribution: "Quanto accantoni",
    contributionHint: "percentuale della retribuzione trattenuta in busta ogni mese",
    contributionFree: "oppure scrivila",
    saved: "Accantonato nel periodo",
    savedHint: (pct: string, mesi: number) => `${pct} della RAL per ${mesi} mesi`,
    savedManual: "scritto a mano: la percentuale non lo governa più",
    capWarning: (max: number) => `Il piano si ferma al ${max}%: oltre, la trattenuta non aumenta.`,
    atMinimum: "Al minimo",
    atMinimumHint:
      "Titolo fermo: mette il prezzo dell’acquisto uguale a quello d’inizio, così resta solo lo sconto. È il pavimento del piano — quello che prendi se il mercato non fa niente.",
    guaranteed: (r: string) => `Minimo garantito dal piano: ${r} lordo, a qualsiasi prezzo.`,
    youGain: "Ci guadagni",
    gainLine: (roi: string, esborso: string, azioni: string, valore: string, mesi: number) =>
      `Il ${roi} dei ${esborso} che ti costa, in ${mesi} mesi: ${azioni} azioni che ne valgono ${valore}.`,
    costBreak: (azioni: string, tasse: string) => `${azioni} di azioni e ${tasse} di tasse sullo sconto`,
    payslipTitle: "Trattenuto sul cedolino dell’acquisto",
    payslipLine: (sconto: string, aliquota: string) =>
      `Lo sconto vale ${sconto} ed è imponibile: te lo tassano in busta al ${aliquota}, che è la tua aliquota marginale — e quei soldi sul conto non ci sono mai passati.`,
    payslipRest: (resto: string, delta: string, verso: string) =>
      `Tornano indietro i ${resto} che non hanno comprato un’azione intera, quindi fra le due cose il netto di quel mese è ${delta} ${verso} del solito.`,
    lower: "più basso",
    higher: "più alto",
    stepsTitle: "Come ci si arriva",
    steps: {
      reference: "Prezzo di riferimento",
      referenceHint: (lookback: boolean): string =>
        lookback ? "il minore fra inizio e acquisto" : "il prezzo del giorno dell’acquisto",
      buy: "Prezzo che paghi",
      buyHint: (sconto: string, sul: string) => `${sconto} di sconto su ${sul}`,
      savedUsd: "Accantonato, in dollari",
      bought: "Azioni comprate",
      boughtHint: "solo intere: il resto torna in busta",
      cost: "Quello che ti costano",
      rest: "Resto, che torna in busta",
      value: "Quanto valgono",
      tax: "Tasse sullo sconto",
      out: "Quello che ci metti davvero",
    },
    ralEquivTitle: "Come un aumento di RAL da",
    ralEquivLine: (quota: number, guadagno: string, mese: string) =>
      `È il ${quota}% della tua RAL, e arriva da ${guadagno} netti sul periodo — ${mese} al mese.`,
    annualised: (r: string) =>
      `Su base annua fa circa ${r}: i soldi restano immobilizzati in media metà del periodo, non tutto.`,
    fellTitle: "Il titolo è sceso, e ci guadagni comunque",
    fell: (a: string, b: string) =>
      `È andato da ${a} a ${b}, e il prezzo che paghi è lo sconto sul minore dei due: lo sconto si applica al valore basso, e le azioni valgono quel valore. È la parte del regolamento che nessuno racconta.`,
    planTitle: "Il piano",
    discount: "Sconto",
    lookbackOn: "Lookback sul prezzo d’inizio",
    periodMonths: "Durata del periodo",
    cap: "Tetto contributivo",
    fractional: "Compra frazioni di azione",
    missing: "Manca un numero: senza accantonato, prezzi e cambio non c’è un acquisto da raccontare.",
  },
  rsu: {
    title: "RSU",
    subtitle: "Unità assegnate che diventano azioni un pezzo per volta",
    intro:
      "Le unità sono il fatto: quante te ne hanno date e quando diventano tue. Il valore è una lente — quanto varrebbero a un certo prezzo — e serve solo a capire l’ordine di grandezza, perché domani è un altro prezzo.",
    whyProspect:
      "Perché tre anni e non un grant: con un’assegnazione nuova ogni anno e vestizioni trimestrali, in un anno qualsiasi vestono pezzi di tre o quattro grant diversi. Il fisco somma tutto quello che vesta nello stesso anno, quindi è il totale dell’anno a decidere l’aliquota — non la singola tranche. Guardarli uno per volta è il modo sbagliato.",
    grants: "Assegnazioni",
    addGrant: "Aggiungi un’assegnazione",
    removeGrant: "Rimuovi",
    grantLabel: "Nome",
    grantDate: "Data del grant",
    grantValue: "Valore del grant",
    grantValueWhy:
      "In dollari, come te lo comunicano: le unità sono il risultato, e le fissa il prezzo del giorno dell’assegnazione.",
    grantValueHint: (unita: string, prezzo: string, data: string) =>
      `${unita} unità, al prezzo di ${prezzo} del ${data}`,
    grantValueNoPrice: "manca il prezzo del giorno del grant: scrivilo qui sotto",
    grantSchedule: "Vestizione",
    grantYears: "Durata",
    years: "anni",
    fixedDates: "Date fisse del piano",
    fixedDatesHint: (date: string) =>
      `Le vestizioni trimestrali si allineano al calendario del piano (${date}) invece di cadere a tre mesi esatti dal grant.`,
    schedule: {
      annuale: "Annuale",
      annualeHint: "una all’anno, tutte uguali",
      "30-30-40": "30-30-40",
      "30-30-40Hint": "tre vestizioni annuali, l’ultima più grossa",
      trimestrale: "Trimestrale",
      trimestraleHint: "una ogni tre mesi",
      mensile: "Mensile",
      mensileHint: "una al mese",
    },
    horizon: "Orizzonte",
    chartTitle: "I prossimi tre anni",
    chartHint:
      "Ogni barra è un mese; i colori sono le diverse assegnazioni. I buchi sono informazione: sono i mesi in cui non arriva niente.",
    noVesting: "Nessuna vestizione nell’orizzonte scelto.",
    yearTitle: (a: number) => `${a}`,
    yearUnits: "unità",
    yearGross: "Lordo",
    yearRate: "Aliquota su quel lordo",
    yearNet: "Netto",
    yearShares: "Azioni che ti arrivano",
    yearSharesHint: "le altre se le prende la trattenuta",
    totalTitle: "In tutto l’orizzonte",
    totalLine: (unita: string, lordo: string, netto: string) =>
      `${unita} unità per ${lordo} lordi, ${netto} netti.`,
    salaryCompare: (pct: number) =>
      `Come avere una RAL più alta del ${pct}%, spalmata sull’orizzonte.`,
    tableTitle: "Le vestizioni, una per una",
    tableDate: "Data",
    tableGrant: "Assegnazione",
    tableTranche: "Tranche",
    tableUnits: "Unità",
    tableValue: "Lordo stimato",
    tableNet: "Netto stimato",
    fractionNote:
      "Le unità restano frazionarie: l’arrotondamento ad azioni intere avviene al vesting, su quello che resta dopo la trattenuta, e la frazione che avanza viene pagata in contanti.",
    priceNote:
      "Il prezzo è lo stesso per tutte le vestizioni future: nessuno sa quello di fra due anni, e usarne uno inventato darebbe una precisione che non esiste.",
  },
  tax: {
    title: "Tasse e addizionali",
    intro:
      "Le addizionali sono l’unica parte di questo conto che nessuna costante nazionale può indovinare: cambiano per regione e per comune, e su una RAL da 50.000 valgono quasi 1.800 euro l’anno. Qui sono precompilate con quelle in uso a Torino, in Piemonte, e si possono riscrivere tutte.",
    marginalTitle: "Aliquota marginale",
    marginalLine: (aliquota: string) =>
      `Con questi parametri, di ogni euro lordo in più il fisco si prende il ${aliquota}: è l’aliquota con cui vengono tassate RSU ed ESPP, non quella media.`,
    marginalWhy:
      "Sul margine si accavallano quattro cose: lo scaglione IRPEF, la detrazione da lavoro dipendente che si spegne fra 28.000 e 50.000, l’1% INPS sopra la prima fascia e gli scaglioni delle addizionali. Sommarle a mano è il conto che nessuno fa giusto — qui è calcolata per differenza.",
    irpef: "Scaglioni IRPEF",
    irpefHint:
      "Progressivi per scaglioni: chi supera i 28.000 non paga il 33% su tutto, lo paga sulla parte che sta fra 28.000 e 50.000.",
    upTo: "fino a",
    over: "oltre",
    rate: "Aliquota",
    inps: "Contributi INPS",
    inpsRate: "Aliquota base",
    inpsMinor: "Contributi minori",
    inpsMinorHint: "CIGS, fondo di garanzia: cambiano per settore e dimensione aziendale",
    inpsFirstBand: "Prima fascia pensionabile",
    inpsFirstBandHint: "oltre questa quota si aggiunge l’aliquota dell’1%",
    inpsCeiling: "Massimale annuo",
    inpsCeilingHint: "oltre questo non si versano più contributi (iscritti dopo il 1995)",
    applyCeiling: "Applica il massimale",
    regional: "Addizionale regionale",
    municipal: "Addizionale comunale",
    exemption: "Soglia di esenzione",
    exemptionHint:
      "È una soglia, non una franchigia: se il reddito la supera, l’addizionale si paga su tutto il reddito, non sull’eccedenza.",
    months: "Mensilità",
    monthsHint: "quante buste paga fa un anno, tredicesima e quattordicesima comprese",
    presets: "Preimpostazioni",
    presetTorino: "Torino — Piemonte",
    presetFlat: "Aliquota unica",
  },
};

export type Dict = typeof it;
