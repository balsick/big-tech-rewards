import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMUNALE_TORINO,
  IRPEF_2026,
  REGIME_DEFAULT,
  REGIONALE_PIEMONTE,
  addizionale,
  contributi,
  dalLordoAlNetto,
  detrazioneLavoro,
  irpefLorda,
  marginale,
  ulterioreDetrazione,
  INPS_2026,
} from "../src/lib/tax.ts";
import { minimoGarantito, simulaEspp, PIANO_ESPP, accantonamentoAtteso } from "../src/lib/espp.ts";
import { prospetto, tranche, piuMesi, unitaDelGrant, type Grant } from "../src/lib/rsu.ts";
import { toField, parseNum } from "../src/lib/format.ts";

const vicino = (a: number, b: number, eps = 0.01) =>
  assert.ok(Math.abs(a - b) < eps, `${a} != ${b} (tolleranza ${eps})`);

test("IRPEF si applica per scaglioni, non per fascia", () => {
  vicino(irpefLorda(28000), 6440);
  vicino(irpefLorda(50000), 6440 + 22000 * 0.33); // 13.700
  vicino(irpefLorda(60000), 13700 + 10000 * 0.43); // 18.000
  // il bug che il foglio aveva: su 30.000 l'imposta non puo' superare il reddito
  assert.ok(irpefLorda(30000) < 30000);
  vicino(irpefLorda(30000), 6440 + 2000 * 0.33);
});

test("addizionale comunale di Torino: 466 euro su 50.000, come in busta", () => {
  vicino(addizionale(50000, COMUNALE_TORINO), 466);
  vicino(addizionale(28000, COMUNALE_TORINO), 224);
  // marginale 1,2% oltre i 50.000
  vicino(addizionale(51000, COMUNALE_TORINO) - addizionale(50000, COMUNALE_TORINO), 12);
});

test("la soglia di esenzione comunale non e' una franchigia", () => {
  assert.equal(addizionale(11790, COMUNALE_TORINO), 0);
  // un euro sopra la soglia si paga su TUTTO il reddito, non sull'eccedenza
  vicino(addizionale(11791, COMUNALE_TORINO), 11791 * 0.008);
});

test("addizionale regionale Piemonte 2026-2027", () => {
  vicino(addizionale(15000, REGIONALE_PIEMONTE), 243);
  vicino(addizionale(50000, REGIONALE_PIEMONTE), 243 + 13000 * 0.0268 + 22000 * 0.0331); // 1.319,60
  vicino(addizionale(60000, REGIONALE_PIEMONTE) - addizionale(50000, REGIONALE_PIEMONTE), 333);
});

test("detrazione da lavoro dipendente, art. 13 TUIR", () => {
  vicino(detrazioneLavoro(15000), 1955);
  vicino(detrazioneLavoro(28000), 1910);
  vicino(detrazioneLavoro(39000), 955);
  vicino(detrazioneLavoro(50000), 0);
  vicino(detrazioneLavoro(80000), 0);
  vicino(ulterioreDetrazione(30000), 1000);
  vicino(ulterioreDetrazione(36000), 500);
  vicino(ulterioreDetrazione(45000), 0);
});

test("contributi INPS: 1% sopra la prima fascia, stop al massimale", () => {
  const p = INPS_2026;
  vicino(contributi(50000, p), 50000 * 0.097566);
  vicino(contributi(60000, p), 60000 * 0.097566 + (60000 - 56224) * 0.01);
  // oltre il massimale non si versa piu' nulla: il contributo si ferma
  assert.equal(contributi(200000, p), contributi(122295, p));
});

test("dalla RAL al netto: 60.000 a Torino", () => {
  const n = dalLordoAlNetto({ ral: 60000 });
  vicino(n.inps, 5891.72, 0.5);
  vicino(n.imponibileIrpef, 54108.28, 0.5);
  vicino(n.detrazioni, 0);
  vicino(n.netto, 36670, 5);
  assert.ok(n.tasso > 0.6 && n.tasso < 0.62);
});

test("l'aliquota marginale non e' lo scaglione", () => {
  // a 60.000 il margine e' 43% IRPEF + addizionali + 1% INPS, sopra il 50%
  const m = marginale({ ral: 60000 }, 1000);
  assert.ok(m.aliquota > 0.5 && m.aliquota < 0.56, `marginale 60k = ${m.aliquota}`);
  // fra 28k e 50k la detrazione che si spegne aggiunge ~8,7 punti al 33%
  const basso = marginale({ ral: 35000 }, 1000);
  assert.ok(basso.aliquota > 0.45, `marginale 35k = ${basso.aliquota}`);
  // e sotto i 28k il margine e' sensibilmente piu' basso
  const minimo = marginale({ ral: 22000 }, 1000);
  assert.ok(minimo.aliquota < basso.aliquota);
});

test("il regime di default e' quello documentato", () => {
  assert.deepEqual(REGIME_DEFAULT.scaglioni, IRPEF_2026);
  assert.equal(REGIME_DEFAULT.mensilita, 14);
});

test("ESPP: il minimo garantito e' sconto/(1-sconto), non lo sconto", () => {
  vicino(minimoGarantito(15), 0.17647, 1e-4);
  vicino(minimoGarantito(10), 0.11111, 1e-4);
});

test("ESPP a titolo fermo: lo sconto resta, e vale 17,65% lordo", () => {
  const e = simulaEspp({
    ral: 60000,
    accantonato: 4500,
    prezzoInizio: 170,
    prezzoFine: 170,
    cambio: 1.16,
    piano: { ...PIANO_ESPP, frazioni: true },
  });
  vicino(e.prezzoAcquisto, 170 * 0.85);
  vicino(e.beneficio / e.speso, 0.17647, 1e-3);
  assert.ok(e.guadagno > 0);
});

test("ESPP col lookback: il titolo scende e ci si guadagna comunque", () => {
  const giu = simulaEspp({
    ral: 60000, accantonato: 4500, prezzoInizio: 200, prezzoFine: 150, cambio: 1.16,
    piano: { ...PIANO_ESPP, frazioni: true },
  });
  // paga l'85% del MINORE dei due
  vicino(giu.prezzoAcquisto, 150 * 0.85);
  assert.ok(giu.guadagno > 0, "con il lookback il guadagno resta positivo");
  // senza lookback, sullo stesso scenario, il prezzo sarebbe lo stesso perche'
  // il minore e' la fine: la differenza si vede quando il titolo sale
  const su = simulaEspp({
    ral: 60000, accantonato: 4500, prezzoInizio: 150, prezzoFine: 200, cambio: 1.16,
    piano: { ...PIANO_ESPP, frazioni: true },
  });
  const suSenza = simulaEspp({
    ral: 60000, accantonato: 4500, prezzoInizio: 150, prezzoFine: 200, cambio: 1.16,
    piano: { ...PIANO_ESPP, frazioni: true, lookback: false },
  });
  assert.ok(su.guadagno > suSenza.guadagno, "il lookback vale qualcosa quando il titolo sale");
});

test("ESPP: gli euro si moltiplicano per diventare dollari", () => {
  const e = simulaEspp({
    ral: 60000, accantonato: 1000, prezzoInizio: 100, prezzoFine: 100, cambio: 1.2,
    piano: { ...PIANO_ESPP, frazioni: false },
  });
  vicino(e.accantonatoUsd, 1200);
  // 1200 $ / 85 $ = 14 azioni intere
  assert.equal(e.azioni, 14);
  vicino(e.speso, (14 * 85) / 1.2);
  vicino(e.restoInBusta, 1000 - (14 * 85) / 1.2);
});

test("ESPP: l'accantonamento atteso segue la percentuale", () => {
  vicino(accantonamentoAtteso(60000, 15, 6), 4500);
  vicino(accantonamentoAtteso(60000, 1, 6), 300);
});

test("RSU: le tranche trimestrali cadono sul calendario del piano", () => {
  const g: Grant = {
    id: "a", etichetta: "G", data: "2026-02-20", valoreUsd: 40000, prezzoGrant: 100,
    cadenza: "trimestrale", anni: 3, dateFisse: true,
  };
  const ts = tranche(g);
  assert.equal(ts.length, 12);
  vicino(ts.reduce((s, t) => s + t.unita, 0), 400);
  // ogni data e' uno dei giorni del piano
  for (const t of ts) assert.ok(["02-20", "05-20", "08-20", "11-20"].includes(t.data.slice(5)), t.data);
  assert.equal(ts[0].data, "2026-05-20");
  assert.equal(ts[11].data, "2029-02-20");
});

test("RSU: senza date fisse le tranche cadono a tre mesi dal grant", () => {
  const ts = tranche({
    id: "a", etichetta: "G", data: "2026-01-31", valoreUsd: 10000, prezzoGrant: 100,
    cadenza: "trimestrale", anni: 1, dateFisse: false,
  });
  assert.equal(ts[0].data, "2026-04-30"); // il giorno si schiaccia sul mese corto
  assert.equal(ts.length, 4);
});

test("RSU: 30-30-40 e' un elenco, non una percentuale arrotondata", () => {
  const ts = tranche({
    id: "a", etichetta: "G", data: "2026-02-20", valoreUsd: 47900, prezzoGrant: 100,
    cadenza: "30-30-40", anni: 3, dateFisse: false,
  });
  assert.equal(ts.length, 3);
  vicino(ts[0].unita, 143.7);
  vicino(ts.reduce((s, t) => s + t.unita, 0), 479);
});

test("RSU: l'aliquota si calcola sul totale dell'anno, non sulla tranche", () => {
  const uno: Grant = {
    id: "a", etichetta: "A", data: "2026-02-20", valoreUsd: 40000, prezzoGrant: 100,
    cadenza: "trimestrale", anni: 3, dateFisse: true,
  };
  const due: Grant = { ...uno, id: "b", etichetta: "B" };
  const base = { prezzo: 100, cambio: 1.16, oggi: "2026-09-17", orizzonte: 3 };

  // Due grant identici valgono il doppio di lordo, e questo e' aritmetica.
  const solo = prospetto({ ...base, ral: 20000, grants: [uno] });
  const doppio = prospetto({ ...base, ral: 20000, grants: [uno, due] });
  vicino(doppio.lordoTotale, solo.lordoTotale * 2, 1);

  // Il netto no: il secondo grant sconfina nello scaglione dopo, e l'aliquota
  // dell'anno sale. E' la ragione per cui il conto si fa sul totale dell'anno e
  // non tranche per tranche.
  assert.ok(doppio.nettoTotale < solo.nettoTotale * 2, "il netto non raddoppia");
  const a27 = (p: typeof solo) => p.anni.find((a) => a.anno === 2027)!;
  assert.ok(a27(doppio).aliquota > a27(solo).aliquota);

  // Sopra i 50.000 gli scaglioni sono finiti e il margine e' piatto: lo stesso
  // conto torna lineare, e va bene cosi' — non e' un bug, e' la curva vera.
  const altoSolo = prospetto({ ...base, ral: 60000, grants: [uno] });
  const altoDoppio = prospetto({ ...base, ral: 60000, grants: [uno, due] });
  vicino(altoDoppio.nettoTotale, altoSolo.nettoTotale * 2, 1);

  // l'orizzonte ha 36 caselle mensili, buchi compresi
  assert.equal(solo.mesi.length, 36);
});

test("la curva marginale ha una gobba, e il picco non e' dove sembra", () => {
  // Il pezzo controintuitivo di tutto il sistema, e il motivo per cui questo
  // strumento calcola il marginale per differenza invece di leggere una
  // tabella: le detrazioni si spengono linearmente, e mentre si spengono ogni
  // euro in piu' ne porta via un pezzo. Il risultato e' che il margine reale
  // di chi sta a 36.000 SUPERA quello di chi sta a 70.000, dove l'aliquota
  // nominale e' il 43% invece del 33%.
  const gobba = marginale({ ral: 36000 }, 1000).aliquota;
  const oltre = marginale({ ral: 70000 }, 1000).aliquota;
  const sotto = marginale({ ral: 25000 }, 1000).aliquota;
  assert.ok(gobba > oltre, `gobba ${gobba} deve superare ${oltre}`);
  assert.ok(gobba > sotto, `gobba ${gobba} deve superare ${sotto}`);
  // Il punto peggiore e' intorno ai 36.000, dove si spengono INSIEME la
  // detrazione dell'art. 13 (8,7 punti) e i 1.000 euro del cuneo (12,5 punti):
  // il margine reale arriva al 62%, venti punti sopra l'aliquota nominale.
  assert.ok(gobba > 0.6, `il margine reale a 36.000 supera il 60%: ${gobba}`);
});

test("oltre il massimale INPS l'aliquota marginale SCENDE", () => {
  // Contro ogni intuizione: sopra i 122.295 i contributi si fermano, quindi
  // l'euro dopo costa meno di quello prima. Se un giorno il conto non lo
  // rispettasse piu', il massimale sarebbe stato dimenticato da qualche parte.
  const sotto = marginale({ ral: 100000 }, 1000);
  const sopra = marginale({ ral: 200000 }, 1000);
  assert.ok(sopra.aliquota < sotto.aliquota, `${sopra.aliquota} !< ${sotto.aliquota}`);
});

test("piuMesi schiaccia il giorno sul mese corto", () => {
  assert.equal(piuMesi("2026-01-31", 1), "2026-02-28");
  assert.equal(piuMesi("2026-01-31", 12), "2027-01-31");
  assert.equal(piuMesi("2026-11-20", 3), "2027-02-20");
});

test("toField non mangia gli zeri degli interi", () => {
  assert.equal(toField(60000, "it", 0), "60000");
  assert.equal(toField(60000, "it", 2), "60000");
  assert.equal(toField(4500, "it", 2), "4500");
  assert.equal(toField(1.5, "it", 2), "1,5");
  assert.equal(toField(1.5, "en", 2), "1.5");
  assert.equal(toField(1.16342, "it", 4), "1,1634");
  assert.equal(toField(0, "it", 0), "0");
  assert.equal(toField(100.25, "en", 2), "100.25");
});

test("parseNum accetta conti, virgole e punti", () => {
  assert.equal(parseNum("1200+300"), 1500);
  assert.equal(parseNum("1,5"), 1.5);
  assert.equal(parseNum("1.5"), 1.5);
  assert.equal(parseNum("24/3"), 8);
  assert.equal(parseNum("2*3+1"), 7); // per e diviso prima di piu' e meno
  assert.equal(parseNum("1200+"), null); // conto non finito, non un errore
  assert.equal(parseNum(""), null);
  assert.equal(parseNum("ciao"), null);
  assert.equal(parseNum("1/0"), null);
});

test("RSU: i dollari diventano unita' col prezzo del giorno del grant", () => {
  const base = {
    id: "a", etichetta: "G", data: "2026-02-20", valoreUsd: 20000,
    cadenza: "30-30-40" as const, anni: 3, dateFisse: false,
  };
  // 20.000 $ assegnati quando l'azione stava a 142,88 fanno ~140 unita'
  vicino(unitaDelGrant({ ...base, prezzoGrant: 142.88 }), 139.9776, 1e-3);
  // lo stesso importo assegnato a un prezzo doppio fa meta' delle unita': e' la
  // ragione per cui un grant vecchio oggi vale piu' di uno nuovo dello stesso
  // valore, e per cui il prezzo del grant sta nel grant e non nei parametri
  vicino(unitaDelGrant({ ...base, prezzoGrant: 285.76 }), 69.9888, 1e-3);
  // senza prezzo non si divide per zero: zero unita', e il campo lo dice
  assert.equal(unitaDelGrant({ ...base, prezzoGrant: 0 }), 0);

  // le tranche sommano sempre le unita' del grant, qualunque sia il prezzo
  const ts = tranche({ ...base, prezzoGrant: 142.88 });
  vicino(ts.reduce((s, t) => s + t.unita, 0), 139.9776, 1e-3);
});
