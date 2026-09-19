export const it = {
  app: {
    title: "Big Tech Rewards",
    tagline: "RSU ed ESPP, al netto delle tasse italiane",
    intro:
      "Quanto ti arriva davvero dei compensi in azioni, e quanto se ne prende il fisco. Ogni conto avviene nel tuo browser.",
  },
  nav: { espp: "ESPP", rsu: "RSU", total: "Total reward", calendar: "Calendario" },
  header: {
    repo: "Codice su GitHub",
    theme: "Tema",
    lang: "Lingua",
    themeLight: "Chiaro",
    themeDark: "Scuro",
    themeAuto: "Sistema",
  },
  total: {
    title: "Total reward",
    intro:
      "Tutto quello che questo posto ti paga in un anno, messo insieme: la RAL, il bonus in denaro, le azioni che vestono e lo sconto dell’ESPP. Le voci arrivano dalle altre due schede — quello che scrivi lì si vede qui.",
    bonus: "Bonus in denaro",
    bonusHint: (amount: string) => `${amount} all’anno, sulla RAL attuale`,
    bonusWhy:
      "La percentuale di bonus è sul contratto e cambia con il ruolo e con l’anno: qui è un campo da sovrascrivere, non un valore che lo strumento dà per buono. Il bonus in denaro è reddito da lavoro come lo stipendio, quindi entra nello stesso calcolo e non in uno separato.",
    answerGross: "Lordo in tre anni",
    answerNet: "Netto in tre anni",
    colYear: "Anno",
    colSalary: "RAL",
    colBonus: "Bonus",
    colRsu: "RSU che vestono",
    colEspp: "Sconto ESPP",
    colGross: "Lordo",
    colNet: "Netto",
    colRate: "Aliquota media",
    totalRow: "In tutto",
    esppNote:
      "Dell’ESPP entra qui soltanto lo sconto, che è reddito da lavoro tassato in busta: due finestre l’anno, ai parametri della scheda ESPP. Il guadagno di mercato oltre lo sconto non è stipendio — è una posizione in azioni, e il suo valore lo decide la borsa.",
    rsuNote:
      "Le RSU contano nell’anno in cui vestono, non in quello in cui sono assegnate: un’assegnazione di tre anni fa paga oggi, e quella di quest’anno pagherà nei prossimi tre.",
    rateNote:
      "L’aliquota media è il totale delle tasse diviso il lordo dell’anno, non l’aliquota marginale: la marginale si applica all’ultimo euro, questa a tutti.",
    variableShare: (p: string) => `${p} del totale è variabile`,
    variableHint:
      "Bonus, RSU e sconto ESPP insieme, sul lordo. È la parte che dipende da performance, da quando vestono le azioni e dalla borsa.",
  },
  calendar: {
    title: "Calendario",
    intro:
      "Che busta paga ti aspetta, mese per mese. Due conti separati: quello in banca, dove il netto cambia, e quello del broker, dove ogni tanto arrivano azioni. Stanno sulla stessa riga perch\u00e9 succedono lo stesso mese.",
    lightest: "Mese pi\u00f9 leggero in banca",
    lightestHint: (delta: string, normal: string) => `${delta} sotto un mese normale da ${normal}`,
    shares: "Azioni sul conto titoli",
    sharesHint: (rsu: string, espp: string) => `${rsu} dalle RSU, ${espp} comprate`,
    colMonth: "Mese",
    colWhat: "Cosa succede",
    colBank: "In banca",
    colShares: "Sul conto titoli",
    ordinary: "busta paga normale",
    contribution: (amount: string) => `accantoni per l\u2019ESPP ${amount}`,
    contributionShort: (amount: string) => `accantoni ${amount}`,
    esppTax: (amount: string) => `tassa sullo sconto ${amount}`,
    esppRestart: (amount: string) => `riparte la finestra ${amount}`,
    settlement: (amount: string) => `conguaglio RSU ${amount}`,
    settlementBack: (amount: string) => `rimborso RSU ${amount}`,
    extraPay: "mensilit\u00e0 aggiuntiva",
    vested: (units: string, withheld: string) => `vestono ${units} RSU, ${withheld} trattenute per le tasse`,
    bought: (shares: string) => `compri ${shares} azioni`,
    arriving: (shares: string) => `+${shares} azioni`,
    legendContribution: "accantoni: soldi tuoi che aspettano l\u2019acquisto",
    legendTax: "tasse: sconto ESPP e conguaglio RSU",
    legendExtra: "mensilit\u00e0 aggiuntiva",
    legendShares: "azioni sul conto titoli: non passano dalla busta paga",
    timing:
      "Il conguaglio RSU arriva sul cedolino del mese dopo la vestizione: al vesting trattengono azioni a un\u2019aliquota forfettaria e la differenza con la tua aliquota vera si chiude in busta il mese successivo. La tassa sullo sconto ESPP invece esce sul cedolino dello stesso mese dell\u2019acquisto.",
    assumptions:
      "Il netto per mensilit\u00e0 \u00e8 il netto annuo diviso per le mensilit\u00e0 del contratto, quindi sull\u2019anno i conti tornano ma una tredicesima non \u00e8 esattamente uguale a un mese qualsiasi. Si assume che tu resti iscritto all\u2019ESPP: per questo il mese dell\u2019acquisto porta anche la prima trattenuta della finestra nuova. Le addizionali non sono in nessuna riga: si liquidano l\u2019anno successivo.",
    noEspp: "Non sei nel piano ESPP, quindi nel calendario ci sono solo le RSU.",
    empty: "Non c\u2019\u00e8 niente da mettere in calendario: servono una RAL e almeno un\u2019assegnazione o una percentuale ESPP.",
    horizon: "Quanti mesi",
    monthCount: (n: number) => `${n} mesi`,
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
    salary: "RAL",
    salaryWhy:
      "RSU ed ESPP non sono guadagni di borsa: sono reddito da lavoro che si somma al tuo stipendio. Quindi non conta un’aliquota media, conta lo scaglione in cui quel reddito in più va a cadere — e per saperlo bisogna sapere da dove parti.",
    salaryWhy2:
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
    windowPick: "Quale finestra",
    enrolled: "Da quando sei nel piano",
    enrolledHint: (price: string, date: string) => `prezzo di riferimento ${price}, chiusura del ${date}`,
    enrolledFirst: "prima volta in questa finestra",
    enrolledWhy:
      "Il lookback non guarda all’inizio del periodo in cui ti trovi ora, ma al giorno in cui sei entrato nel piano. Chi era già dentro dal 1º aprile si porta dietro il prezzo di aprile anche per la finestra che parte a ottobre, e lo perde solo se l’acquisto chiude più in basso. Chi entra a ottobre per la prima volta parte dal prezzo di ottobre. Due colleghi che comprano lo stesso giorno, con la stessa percentuale, possono ritrovarsi con un numero di azioni molto diverso: è questa la ragione.",
    enrolledSameAsWindow: "Sei entrato con questa finestra, quindi il riferimento è il prezzo di inizio periodo.",
    enrolledCarried: (date: string) =>
      `Ti porti dietro il prezzo del ${date}: vale finché il giorno dell’acquisto non chiude più in basso.`,
    windowOpen: "in corso",
    windowClosed: "conclusa",
    windowLabel: (from: string, to: string) => `${from} – ${to}`,
    windowOnlyOne: "È l’unica finestra aperta in questo momento: un periodo va da un acquisto al successivo, quindi le date non si scelgono.",
    windowClosedHint:
      "La finestra appena conclusa è quella con i prezzi veri: l’acquisto è avvenuto e la trattenuta arriva sul cedolino di questo mese. Quella appena aperta può essere solo una proiezione.",
    windowOpenHint: "Finestra in corso: il prezzo d’acquisto è una proiezione, non una chiusura vera.",
    windowEnd: "Giorno dell’acquisto",
    contribution: "Quanto accantoni",
    contributionHint: "percentuale della retribuzione trattenuta in busta ogni mese",
    saved: "Accantonato nel periodo",
    savedHint: (pct: string, months: number) =>
      `${pct} della RAL per ${months} mesi, mensilità aggiuntive incluse`,
    savedManual: "scritto a mano: la percentuale non lo governa più",
    flatStock: "Prova al minimo",
    flatStockHint:
      "Mette il prezzo dell’acquisto uguale a quello d’inizio: il titolo non si muove e resta solo lo sconto. È il pavimento del piano — quello che prendi se il mercato non fa niente.",
    flatStockOn: "titolo fermo: resta solo lo sconto",
    youGain: "Ci guadagni",
    gainRoi: (roi: string, outlay: string) => `${roi} di quello che ti costa: ${outlay}`,
    answerCost: "Quanto ti costa",
    answerShares: "Azioni che compri",
    answerValue: "Quanto valgono",
    answerValueHint: (price: string) => `al prezzo di ${price}`,
    gainLine: (roi: string, outlay: string, shares: string, value: string, months: number) =>
      `Il ${roi} dei ${outlay} che ti costa, in ${months} mesi: ${shares} azioni che ne valgono ${value}.`,
    costBreak: (shares: string, tax: string) => `${shares} di azioni più ${tax} di tasse sullo sconto.`,
    annualised: (r: string) =>
      `Su base annua fa circa ${r}: i soldi restano immobilizzati in media metà del periodo, non tutto.`,
    payslipTitle: "Sul cedolino dell’acquisto trattengono",
    payslipLine: (discount: string, rate: string) =>
      `Lo sconto vale ${discount} ed è imponibile: su quel cedolino te ne trattengono il ${rate}, fra IRPEF e contributi.`,
    payslipSurtax: (amount: string, total: string, rate: string) =>
      `Le addizionali regionale e comunale — altri ${amount} — non escono quel mese: si calcolano sul reddito dell’anno e si liquidano dopo, in acconto e saldo. In tutto lo sconto ti costa ${total}, il ${rate} della tua aliquota marginale piena.`,
    payslipRest: (refund: string, delta: string, direction: string) =>
      `Tornano indietro ${refund} che non hanno comprato un’azione intera, quindi il netto di quel mese è ${delta} ${direction} del solito.`,
    lower: "più basso",
    higher: "più alto",
    stepsTitle: "Come ci si arriva",
    steps: {
      reference: "Prezzo di riferimento",
      referenceHint: (lookback: boolean): string =>
        lookback ? "il minore fra inizio e acquisto" : "il prezzo del giorno dell’acquisto",
      buy: "Prezzo che paghi",
      buyHint: (discount: string, on: string) => `${discount} di sconto su ${on}`,
      savedUsd: "Accantonato, in dollari",
      bought: "Azioni comprate",
      boughtHint: "solo intere: il resto torna in busta",
      cost: "Quello che ti costano",
      rest: "Resto, che torna in busta",
      value: "Quanto valgono",
      tax: "Tasse sullo sconto",
      out: "Quello che ci metti davvero",
    },
    salaryEquivTitle: "Vale come un aumento di RAL da",
    salaryEquivLine: (share: number, gain: string, perMonth: string) =>
      `È il ${share}% della tua RAL, e arriva da ${gain} netti sul periodo — ${perMonth} al mese.`,
    fellTitle: "Il titolo è sceso, e ci guadagni comunque",
    fell: (to: string, b: string) =>
      `È andato da ${to} a ${b}, e paghi lo sconto sul minore dei due: lo sconto si applica al valore basso, e le azioni valgono quel valore.`,
    planTitle: "Il piano",
    discount: "Sconto",
    lookbackOn: "Sconto sul prezzo più basso",
    periodMonths: "Durata del periodo",
    cap: "Tetto, in % della RAL",
    capUsd: "Tetto per periodo",
    capUsdHint:
      "Il limite fiscale americano: 25.000 $ l’anno di valore alla concessione, che con il 15% di sconto si comprano con 21.250 $ di contributi — 10.625 per finestra semestrale.",
    capHit: (above: string, cap: string) =>
      `Il piano si ferma a ${cap} per periodo: ${above} accantonati oltre il tetto non comprano azioni e tornano in busta.`,
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
    grantValueHint: (units: string, price: string, date: string) =>
      `${units} unità, al fair market value di ${price} · media delle 20 sedute prima del ${date}`,
    grantValueHintRolling: (units: string, price: string) =>
      `${units} unità, al fair market value stimato di ${price} · la data è futura, quindi è la media delle ultime 20 sedute note`,
    fmvWhy:
      "Un grant non si prezza con la chiusura del giorno, ma con il fair market value: la media delle chiusure delle 20 sedute precedenti al giorno dell’assegnazione, quel giorno escluso. Non è un dettaglio: il 20 febbraio 2026 la chiusura era 142,88 $ e il fair market value 146,32 $, cioè il 2,4% di unità in meno. Per una data futura quel numero non può esistere ancora, quindi si usa la media delle ultime 20 sedute note e il campo resta sovrascrivibile.",
    grantValueHintManual: (units: string, price: string) =>
      `${units} unità, al prezzo di ${price} che hai scritto`,
    grantValueNoPrice: "manca il prezzo del giorno del grant: scrivilo qui sotto",
    grantPrice: "Prezzo al grant",
    grantPriceFuture:
      "Il grant è nel futuro: una chiusura di quel giorno non esiste ancora. Parte dall’ultima nota — riscrivila per provare un altro scenario.",
    grantSchedule: "Vestizione",
    grantYears: "Durata",
    yearCount: (n: number) => (n === 1 ? "1 anno" : `${n} anni`),
    years: "anni",
    fixedDates: "Date fisse del piano",
    fixedDatesHint: (date: string) =>
      `Le vestizioni trimestrali si allineano al calendario del piano (${date}) invece di cadere a tre mesi esatti dal grant.`,
    schedule: {
      annual: "Annuale",
      annualHint: "una all’anno, tutte uguali",
      "30-30-40": "30-30-40",
      "30-30-40Hint": "tre vestizioni annuali, l’ultima più grossa",
      quarterly: "Trimestrale",
      quarterlyHint: "una ogni tre mesi",
      monthly: "Mensile",
      monthlyHint: "una al mese",
    },
    horizon: "Orizzonte",
    chartTitle: "Quando arrivano",
    chartHint:
      "Un trimestre per barra, i colori sono le assegnazioni. I trimestri vuoti sono informazione: sono i mesi in cui non arriva niente.",
    noVesting: "Nessuna vestizione nell’orizzonte scelto.",
    horizonSpan: (year: number) => `Da qui a fine ${year}`,
    totalLine: (units: string, lordo: string) => `${units} unità, ${lordo} lordi.`,
    salaryCompare: (pct: number, from: string, to: string) =>
      `Come avere una RAL più alta del ${pct}%: da ${from} a ${to} netti l’anno.`,
    yearUnits: "unità",
    yearGross: "Lordo",
    performance: "Performance",
    performanceHint: "il bonus in azioni si muove con la valutazione",
    performanceWhy:
      "La cifra in dollari dell’assegnazione annuale è un obiettivo, non un importo fisso: quanto viene assegnato davvero si muove con la performance personale e con quella aziendale, tipicamente fra il 75% e il 150% del target. Il 100% è il target, non una previsione. Si applica solo alle assegnazioni annuali: il welcome grant è concordato all’assunzione e non dipende da una valutazione che non c’è ancora stata.",
    performanceOn: "sulle assegnazioni annuali",
    netWithholding:
      "Non viene venduto niente. Il piano è passato dal «sell to cover» al «net share withholding»: l’azienda semplicemente non ti consegna le azioni che servono a coprire la ritenuta, e versa lei le tasse. Nessuna operazione di borsa, niente da dichiarare come vendita, e — la parte che conta — il prezzo dopo il giorno di vestizione non cambia quante azioni ti trattengono, perché il conteggio è fissato sul fair market value di quel giorno.",
    withholdingFlat: (rate: string) =>
      `La ritenuta è calcolata a un’aliquota fissa del ${rate} — la stessa usata per il bonus in denaro — e non alla tua aliquota personale. Le azioni trattenute si arrotondano per eccesso.`,
    payslipOwed: (rate: string, amount: string) =>
      `La tua aliquota su queste vestizioni è ${rate}, più alta della ritenuta: la differenza — ${amount} — viene trattenuta in denaro da un cedolino successivo.`,
    payslipRefund: (rate: string, amount: string) =>
      `La tua aliquota su queste vestizioni è ${rate}, più bassa della ritenuta: l’eccedenza — ${amount} — ti viene restituita su un cedolino successivo.`,
    payslipEven: "La tua aliquota coincide con quella di ritenuta, quindi non c’è niente da conguagliare.",
    payslipColumn: "Conguaglio in busta",
    dividendTitle: "Dividend equivalents",
    dividendLine: (units: string, value: string) =>
      `Ogni volta che viene pagato un dividendo, le RSU non ancora vestite vengono accreditate di unità in più per un valore pari al dividendo. Nell’orizzonte sono ${units} unità aggiuntive, ${value}: non te le promette nessuna lettera di assegnazione, e si sommano.`,
    dividendAssumption: (amount: string) =>
      `I dividendi futuri sono proiettati all’ultimo importo noto (${amount} per azione, trimestrale) al prezzo di oggi. Quelli già pagati sono quelli veri.`,
    answerDividend: "Di cui dai dividendi",
    payslipTitle: "La ritenuta è a forfait, il conto si chiude in busta",
    answerPayslip: "Poi dal cedolino",
    answerPayslipHint: "in denaro, quello che le azioni non coprono",
    yearRate: "Aliquota",
    yearShares: "Azioni che ti arrivano",
    yearSharesHint: "quelle che restano dopo la ritenuta",
    yearSold: "Trattenute per le tasse",
    sellToCover:
      "La trattenuta sul vesting non la paghi in contanti e non viene venduto niente: l’azienda trattiene una parte delle azioni nel momento in cui vestono e versa lei le tasse. È il «net share withholding». Nessuno ti chiede soldi — ti arrivano meno azioni, ed è la cosa che sorprende di più al primo vesting.",
    chartGross: "Le cifre e le unità sono lorde, prima della ritenuta.",
    quarterEmpty: "Non arriva niente",
    yearPartial: "contato da oggi: quello che è già vestito non c’è",
    yearSalaryEquiv: "RAL equivalente",
    yearSalaryEquivHint: "stipendio + RSU dell’anno",
    tableTitle: "Le vestizioni, una per una",
    quarterlyTable: "Per trimestre",
    trancheTable: "Per vestizione",
    answerShares: "Azioni che ti arrivano",
    answerValue: "Quanto valgono",
    answerValueHint: (price: string) => `al prezzo di ${price}`,
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
  save: {
    title: "Salvare su questo browser",
    button: "Salva su questo browser",
    buttonDirty: "Salva le modifiche",
    upToDate: "Salvato",
    forget: "Dimentica tutto",
    savedOn: (when: string) => `Ultimo salvataggio: ${when}.`,
    where:
      "Finisce nel localStorage di questo browser, su questo dispositivo. Non è un account e non è un file: nessuno dei tuoi altri dispositivi lo vedrà, e cancellando i dati del sito sparisce. «Dimentica tutto» lo rimuove subito.",
    nothingLeaves:
      "Niente di quello che scrivi lascia il dispositivo, né quando salvi né quando non salvi: questa pagina non ha un server a cui mandarlo. Salvare cambia solo per quanto tempo i numeri restano qui.",
    unavailable:
      "Questo browser non permette di salvare — succede in navigazione privata o con i dati dei siti bloccati. I numeri restano validi finché la pagina è aperta.",
  },
  guided: {
    open: "Guidami",
    title: "Modalità guidata",
    exit: "Esci dalla modalità guidata",
    exitShort: "Esci",
    reopen: "Si riapre da qui, sempre. La prima volta si apre da sola.",
    chooseTitle: "Che cosa vuoi capire?",
    chooseSub: "Due strumenti, due domande diverse. Te ne chiedo due o tre, il resto lo compilo io.",
    esppDesc:
      "Compri azioni della tua azienda a sconto, con una parte della busta paga. Ti dico quanto ci guadagni davvero e quanto ti trattengono il mese dell’acquisto.",
    rsuDesc:
      "Azioni che ti assegnano e diventano tue un pezzo per volta. Ti dico quante te ne arrivano davvero, dopo la ritenuta.",
    full: "Modalità completa",
    fullSub: "Tutti i campi, nessuna domanda",
    step: (n: number, tot: number, tool: string) => `Passo ${n} di ${tot} · ${tool}`,
    back: "Indietro",
    next: "Avanti",
    see: "Vedi il risultato",
    preview: "anteprima",
    redo: "Rifai",
    openTool: "Apri lo strumento",
    pctTitle: "Quanto accantoni?",
    pctSub: "È la fetta di busta paga che il piano ti trattiene ogni mese.",
    esppPrefilled: (from: string, to: string, cap: string) =>
      `Il resto lo so già: periodo ${from} → ${to}, sconto del 15% sul prezzo più basso, tetto di ${cap}, prezzi presi dal mercato. Li puoi cambiare tutti dopo.`,
    salaryTitle: "Quanto guadagni lordo all’anno?",
    salarySub: "L’ultima domanda.",
    whyTitle: "Perché serve",
    welcomeTitle: "Quanto vale il welcome grant?",
    welcomeSub: "In dollari, come te l’hanno comunicato.",
    welcomeField: "Valore del welcome grant",
    welcomePrefilled: (date: string) =>
      `Data dell’assegnazione già impostata al ${date}, con vestizione 30-30-40: tre tranche annuali, l’ultima più grossa.`,
    bonusTitle: "E il bonus annuale?",
    bonusSub: "Quello che ti assegnano a fine anno, se c’è.",
    bonusField: "Valore del bonus annuale",
    bonusPrefilled: (date: string) =>
      `Assegnato ogni anno il ${date}, con vestizione trimestrale su tre anni.`,
    esppHeadline: (pct: string, salary: string) => `Con il ${pct} su una RAL da ${salary}`,
    esppHeadlineSub: (contributed: string, shares: string, price: string) =>
      `Accantoni ${contributed} in sei mesi e compri ${shares} azioni a ${price} l’una.`,
    rsuHeadline: (year: number, shares: string) => `Da qui a fine ${year} ti arrivano ${shares} azioni`,
    rsuQuarter: "Trimestre",
    rsuQuarterVest: "Vestizione",
    rsuRateIsYearly:
      "L’aliquota è quella dell’anno, non del trimestre: il fisco somma tutto quello che vesta nello stesso anno civile, quindi i trimestri di uno stesso anno la condividono. È anche ciò che fa il broker — trattiene a ogni vestizione e l’anno fa i conti.",
    rsuHeadlineSub: (units: string, gross: string) =>
      `${units} unità maturano, ${gross} lordi. Il resto se lo prende la trattenuta, venduto il giorno stesso.`,
    rsuPrefilled: (welcome: string, bonus: string) =>
      `Le date le ho messe io: welcome al ${welcome}, bonus ogni ${bonus}. Nello strumento completo si aggiungono altre assegnazioni e si cambia la cadenza.`,
    total: "In tutto",
    missing: "Manca un numero: senza le quotazioni non c’è un risultato da mostrare. Apri lo strumento e scrivi i prezzi a mano.",
  },
  tax: {
    title: "Tasse e addizionali",
    intro:
      "Le addizionali sono l’unica parte di questo conto che nessuna costante nazionale può indovinare: cambiano per regione e per comune, e su una RAL da 50.000 valgono quasi 1.800 euro l’anno. Qui sono precompilate con quelle in uso a Torino, in Piemonte.",
    marginalTitle: "Aliquota marginale",
    marginalLine: (rate: string) =>
      `Di ogni euro lordo in più il fisco si prende il ${rate}: è l’aliquota con cui vengono tassate RSU ed ESPP, non quella media.`,
    marginalWhy:
      "Sul margine si accavallano quattro cose: lo scaglione IRPEF, la detrazione da lavoro dipendente che si spegne fra 28.000 e 50.000, l’1% INPS sopra la prima fascia e gli scaglioni delle addizionali. Sommarle a mano è il conto che nessuno fa giusto — qui è calcolata per differenza.",
    incomeTax: "Scaglioni IRPEF",
    incomeTaxHint:
      "Progressivi per scaglioni: chi supera i 28.000 non paga il 33% su tutto, lo paga sulla parte fra 28.000 e 50.000.",
    upTo: "fino a",
    over: "oltre",
    rate: "Aliquota",
    socialSecurity: "Contributi INPS",
    ssRate: "Aliquota base",
    ssMinor: "Contributi minori",
    ssMinorHint:
      "0,26667 FIS + 0,30 CIGS + 0,05 ente bilaterale. Guarda la tua busta paga: l\u2019ente bilaterale dipende dal contratto e a volte dalla provincia.",
    ssFirstBand: "Prima fascia pensionabile",
    ssFirstBandHint: "oltre questa quota si aggiunge l’aliquota dell’1%",
    ssCeiling: "Massimale annuo",
    ssCeilingHint: "oltre questo non si versano più contributi (iscritti dopo il 1995)",
    applyCeiling: "Applica il massimale",
    regional: "Surtax regionale",
    municipal: "Surtax comunale",
    exemption: "Soglia di esenzione",
    exemptionHint:
      "È una soglia, non una franchigia: se il reddito la supera, l’addizionale si paga su tutto il reddito, non sull’eccedenza.",
    months: "Mensilità",
    monthsHint: "quante buste paga fa un anno, tredicesima e quattordicesima comprese",
    presets: "Preimpostazioni",
    presetTurin: "Torino — Piemonte",
    presetFlat: "Aliquota unica",
  },
};

export type Dict = typeof it;
