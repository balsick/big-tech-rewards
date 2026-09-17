export const it = {
  app: {
    title: "Big Tech Rewards",
    tagline: "RSU ed ESPP, al netto delle tasse italiane",
    intro:
      "Quanto ti arriva davvero dei compensi in azioni, e quanto se ne prende il fisco. Ogni conto avviene nel tuo browser.",
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
      "Questa pagina non raccoglie e non trasmette nulla, e non ha un server a cui potrebbe mandare qualcosa. Niente analytics, cookie o tracker: i conti si fanno nel tuo browser e i numeri che scrivi non lasciano il dispositivo. Salva soltanto se glielo chiedi tu con l’apposito tasto, e solo nella memoria di questo browser. L’unica richiesta di rete è al file delle quotazioni servito da questo stesso sito.",
    unofficialTitle: "Strumento assolutamente non ufficiale",
    unofficial:
      "Non è uno strumento ufficiale di nessuna azienda, né di un piano azionario, né di un broker, né di un’amministrazione fiscale. Non è associato, approvato o sponsorizzato da nessuno di essi, e non sostituisce i documenti del tuo piano, la tua busta paga o un consulente.",
    liabilityTitle: "Nessuna garanzia, nessuna responsabilità",
    liability:
      "Aliquote, formule e quotazioni possono essere sbagliate, incomplete o superate: le norme cambiano, i piani cambiano, i prezzi cambiano. Gli autori declinano ogni responsabilità sulla correttezza delle informazioni fornite e su qualsiasi decisione presa in base ad esse. Non è consulenza finanziaria, fiscale o di investimento. Verifica sempre i numeri con la tua busta paga, i documenti del piano e un professionista.",
    source: "Codice sorgente e licenza MIT su GitHub",
    taxYear: "Parametri fiscali",
  },
  common: {
    ral: "RAL",
    ralWhy:
      "RSU ed ESPP non sono guadagni di borsa: sono reddito da lavoro che si somma al tuo stipendio. Quindi non conta un’aliquota media, conta lo scaglione in cui quel reddito in più va a cadere — e per saperlo bisogna sapere da dove parti.",
    ralWhy2:
      "Serve solo a questo, e non lascia il dispositivo: non viene inviata da nessuna parte, e viene salvata soltanto se lo chiedi tu col tasto in fondo a questa colonna.",
    whatIsThis: "Che cos’è",
    price: "Prezzo azione",
    priceStart: "Prezzo d’inizio",
    priceEnd: "Prezzo all’acquisto",
    fx: "Cambio EUR/USD",
    fxHint: "dollari per un euro",
    manual: "scritto a mano",
    reset: "Ripristina",
    fromQuote: "ultima chiusura",
    fromHistory: "chiusura del",
    fromLive: "riferimento BCE",
    quoteMissing: "Le quotazioni non arrivano: scrivi i numeri a mano, il conto si fa lo stesso.",
    liveFx: "Aggiorna il cambio",
    perShare: "per azione",
    shares: "azioni",
    gross: "lordo",
    net: "netto",
    year: "anno",
    total: "totale",
    months: "mesi",
    advanced: "Impostazioni avanzate",
  },
  espp: {
    title: "ESPP",
    subtitle: "Il piano di acquisto azioni a sconto",
    howTitle: "Come funziona, in due righe",
    how1Title: "Lo sconto è sul prezzo più basso",
    how1:
      "Paghi l’85% del minore fra il prezzo a inizio periodo e quello del giorno dell’acquisto. Per questo il piano rende anche quando il titolo scende.",
    how2Title: "Lo sconto è stipendio, non borsa",
    how2:
      "Ti finisce in busta come imponibile e le tasse te le trattengono lì, nel mese dell’acquisto. Sul conto quei soldi non ci passano mai.",
    guaranteed: (r: string) => `Con il titolo fermo resta comunque ${r} lordo.`,
    windowStart: "Inizio periodo",
    windowEnd: "Giorno dell’acquisto",
    contribution: "Quanto accantoni",
    contributionHint: "percentuale della retribuzione trattenuta in busta ogni mese",
    saved: "Accantonato nel periodo",
    savedHint: (pct: string, mesi: number) =>
      `${pct} della RAL per ${mesi} mesi, mensilità aggiuntive incluse`,
    savedManual: "scritto a mano: la percentuale non lo governa più",
    atMinimum: "Prova al minimo",
    atMinimumHint:
      "Mette il prezzo dell’acquisto uguale a quello d’inizio: il titolo non si muove e resta solo lo sconto. È il pavimento del piano — quello che prendi se il mercato non fa niente.",
    atMinimumOn: "titolo fermo: resta solo lo sconto",
    youGain: "Ci guadagni",
    gainLine: (roi: string, esborso: string, azioni: string, valore: string, mesi: number) =>
      `Il ${roi} dei ${esborso} che ti costa, in ${mesi} mesi: ${azioni} azioni che ne valgono ${valore}.`,
    costBreak: (azioni: string, tasse: string) => `${azioni} di azioni più ${tasse} di tasse sullo sconto.`,
    annualised: (r: string) =>
      `Su base annua fa circa ${r}: i soldi restano immobilizzati in media metà del periodo, non tutto.`,
    payslipTitle: "Sul cedolino dell’acquisto trattengono",
    payslipLine: (sconto: string, aliquota: string) =>
      `Lo sconto vale ${sconto} ed è imponibile: te lo tassano in busta al ${aliquota}, la tua aliquota marginale.`,
    payslipRest: (resto: string, delta: string, verso: string) =>
      `Tornano indietro ${resto} che non hanno comprato un’azione intera, quindi il netto di quel mese è ${delta} ${verso} del solito.`,
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
    ralEquivTitle: "Vale come un aumento di RAL da",
    ralEquivLine: (quota: number, guadagno: string, mese: string) =>
      `È il ${quota}% della tua RAL, e arriva da ${guadagno} netti sul periodo — ${mese} al mese.`,
    fellTitle: "Il titolo è sceso, e ci guadagni comunque",
    fell: (a: string, b: string) =>
      `È andato da ${a} a ${b}, e paghi lo sconto sul minore dei due: lo sconto si applica al valore basso, e le azioni valgono quel valore.`,
    planTitle: "Il piano",
    discount: "Sconto",
    lookbackOn: "Sconto sul prezzo più basso",
    periodMonths: "Durata del periodo",
    cap: "Tetto, in % della RAL",
    capUsd: "Tetto per periodo",
    capUsdHint:
      "Il limite fiscale americano: 25.000 $ l’anno di valore alla concessione, che con il 15% di sconto si comprano con 21.250 $ di contributi — 10.625 per finestra semestrale.",
    capHit: (oltre: string, tetto: string) =>
      `Il piano si ferma a ${tetto} per periodo: ${oltre} accantonati oltre il tetto non comprano azioni e tornano in busta.`,
    fractional: "Compra frazioni di azione",
    missing: "Manca un numero: senza accantonato, prezzi e cambio non c’è un acquisto da raccontare.",
  },
  rsu: {
    title: "RSU",
    subtitle: "Unità assegnate che diventano azioni un pezzo per volta",
    intro:
      "Le unità sono il fatto: quante te ne hanno date e quando diventano tue. Il valore è una lente — quanto varrebbero a un certo prezzo — e serve a capire l’ordine di grandezza, perché domani è un altro prezzo.",
    whyProspect:
      "Con un’assegnazione nuova ogni anno e vestizioni trimestrali, in un anno qualsiasi vestono pezzi di tre o quattro grant diversi. Il fisco somma tutto quello che vesta nello stesso anno, quindi è il totale dell’anno a decidere l’aliquota — non la singola tranche. Guardarli uno per volta è il modo sbagliato.",
    grants: "Assegnazioni",
    addGrant: "Aggiungi assegnazione",
    removeGrant: "Rimuovi",
    grantLabel: "Nome",
    grantDate: "Data del grant",
    grantValue: "Valore del grant",
    grantValueWhy:
      "In dollari, come te lo comunicano: le unità sono il risultato, e le fissa il prezzo del giorno dell’assegnazione. È anche il modo di vedere una cosa che in azioni non si nota — due grant dello stesso importo assegnati in anni diversi oggi valgono cifre molto diverse.",
    grantValueHint: (unita: string, prezzo: string, data: string) =>
      `${unita} unità, al prezzo di ${prezzo} del ${data}`,
    grantValueHintManual: (unita: string, prezzo: string) =>
      `${unita} unità, al prezzo di ${prezzo} che hai scritto`,
    grantValueNoPrice: "manca il prezzo del giorno del grant: scrivilo qui sotto",
    grantPrice: "Prezzo al grant",
    grantPriceFuture:
      "Il grant è nel futuro: una chiusura di quel giorno non esiste ancora. Parte dall’ultima nota — riscrivila per provare un altro scenario.",
    grantSchedule: "Vestizione",
    grantYears: "Durata",
    anni: (n: number) => (n === 1 ? "1 anno" : `${n} anni`),
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
    chartTitle: "Quando arrivano",
    chartHint:
      "Un trimestre per barra, i colori sono le assegnazioni. I trimestri vuoti sono informazione: sono i mesi in cui non arriva niente.",
    noVesting: "Nessuna vestizione nell’orizzonte scelto.",
    horizonTitle: (n: number) => (n === 1 ? "Nel prossimo anno ti arrivano" : `Nei prossimi ${n} anni ti arrivano`),
    totalLine: (unita: string, lordo: string) => `${unita} unità, ${lordo} lordi.`,
    salaryCompare: (pct: number, da: string, a: string) =>
      `Come avere una RAL più alta del ${pct}%: da ${da} a ${a} netti l’anno.`,
    yearUnits: "unità",
    yearGross: "Lordo",
    yearRate: "Aliquota",
    yearShares: "Azioni che ti arrivano",
    yearSharesHint: "le altre se le prende la trattenuta",
    yearRalEquiv: "RAL equivalente",
    yearRalEquivHint: "stipendio + RSU dell’anno",
    tableTitle: "Le vestizioni, una per una",
    tableDate: "Data",
    tableGrant: "Assegnazione",
    tableTranche: "Tranche",
    tableUnits: "Unità",
    tableValue: "Lordo",
    tableNet: "Netto",
    fractionNote:
      "Le unità restano frazionarie: l’arrotondamento ad azioni intere avviene al vesting, su quello che resta dopo la trattenuta, e la frazione che avanza viene pagata in contanti.",
    priceNote:
      "Il prezzo è lo stesso per tutte le vestizioni future: nessuno sa quello di fra due anni, e usarne uno inventato darebbe una precisione che non esiste.",
  },
  salva: {
    title: "Salvare su questo browser",
    button: "Salva su questo browser",
    buttonDirty: "Salva le modifiche",
    upToDate: "Salvato",
    forget: "Dimentica tutto",
    savedOn: (quando: string) => `Ultimo salvataggio: ${quando}.`,
    where:
      "Finisce nel localStorage di questo browser, su questo dispositivo. Non è un account e non è un file: nessuno dei tuoi altri dispositivi lo vedrà, e cancellando i dati del sito sparisce. «Dimentica tutto» lo rimuove subito.",
    nothingLeaves:
      "Niente di quello che scrivi lascia il dispositivo, né quando salvi né quando non salvi: questa pagina non ha un server a cui mandarlo. Salvare cambia solo per quanto tempo i numeri restano qui.",
    unavailable:
      "Questo browser non permette di salvare — succede in navigazione privata o con i dati dei siti bloccati. I numeri restano validi finché la pagina è aperta.",
  },
  tax: {
    title: "Tasse e addizionali",
    intro:
      "Le addizionali sono l’unica parte di questo conto che nessuna costante nazionale può indovinare: cambiano per regione e per comune, e su una RAL da 50.000 valgono quasi 1.800 euro l’anno. Qui sono precompilate con quelle in uso a Torino, in Piemonte.",
    marginalTitle: "Aliquota marginale",
    marginalLine: (aliquota: string) =>
      `Di ogni euro lordo in più il fisco si prende il ${aliquota}: è l’aliquota con cui vengono tassate RSU ed ESPP, non quella media.`,
    marginalWhy:
      "Sul margine si accavallano quattro cose: lo scaglione IRPEF, la detrazione da lavoro dipendente che si spegne fra 28.000 e 50.000, l’1% INPS sopra la prima fascia e gli scaglioni delle addizionali. Sommarle a mano è il conto che nessuno fa giusto — qui è calcolata per differenza.",
    irpef: "Scaglioni IRPEF",
    irpefHint:
      "Progressivi per scaglioni: chi supera i 28.000 non paga il 33% su tutto, lo paga sulla parte fra 28.000 e 50.000.",
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
