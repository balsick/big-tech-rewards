import { useId, useState, type ReactNode } from "react";
import { parseNum, toField, type Lang } from "../lib/format.ts";
import { Chevron } from "./Icone.tsx";

// I mattoncini. Poche cose, e una regola: un campo che accetta un numero
// accetta anche un conto ("1200+300"), perche' e' cosi' che la gente arriva al
// numero che vuole provare.

export function Card({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section className={`card ${className}`} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      {children}
    </section>
  );
}

/**
 * Un campo numerico con memoria di cosa ci hai scritto.
 *
 * Tiene il testo, non il numero: cosi' si puo' scrivere "1.2" senza che il
 * campo si riscriva sotto le dita a ogni tasto, e un conto a meta' ("1200+")
 * non e' un errore, e' solo un conto non finito.
 */
export function NumField({
  label,
  value,
  onChange,
  hint,
  suffix,
  lang,
  dec = 2,
  id: forced,
  disabled,
  info,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: ReactNode;
  suffix?: string;
  lang: Lang;
  dec?: number;
  id?: string;
  disabled?: boolean;
  /** la spiegazione lunga, dietro al bottoncino accanto all'etichetta */
  info?: ReactNode;
}) {
  const auto = useId();
  const id = forced ?? auto;
  const [testo, setTesto] = useState<string | null>(null);
  const mostrato = testo ?? toField(value, lang, dec);
  const valido = testo === null || parseNum(testo) !== null;

  return (
    <div className="campo">
      <label className="lab" htmlFor={id}>
        {label}
        {suffix ? <span style={{ color: "var(--muted)", fontWeight: 500 }}> {suffix}</span> : null}
        {info}
      </label>
      <input
        id={id}
        className="inp cifra"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        aria-invalid={valido ? undefined : true}
        value={mostrato}
        onChange={(e) => {
          setTesto(e.target.value);
          const n = parseNum(e.target.value);
          if (n !== null) onChange(n);
        }}
        onBlur={() => setTesto(null)}
      />
      {hint ? <p className="hint">{hint}</p> : <span />}
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="campo">
      <label className="lab" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="inp cifra" type="date" value={value} onChange={(e) => onChange(e.target.value)} />
      {hint ? <p className="hint">{hint}</p> : <span />}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          title={o.title}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="campo">
      <label className="lab" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="inp" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <p className="hint">{hint}</p> : <span />}
    </div>
  );
}

export function Check({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <div className="check">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <label htmlFor={id}>{label}</label>
      </div>
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

/** Una riga di una lista di voci: nome a sinistra, cifra a destra. */
export function Line({
  name,
  hint,
  value,
  tone,
  strong,
  sum,
}: {
  name: string;
  hint?: string;
  value: string;
  tone?: "neg" | "pos";
  strong?: boolean;
  sum?: boolean;
}) {
  return (
    <li className={sum ? "sum" : undefined}>
      <span>
        <span style={strong ? { fontWeight: 650 } : undefined}>{name}</span>
        {hint ? <span className="hint" style={{ display: "block" }}>{hint}</span> : null}
      </span>
      <span className={tone}>{value}</span>
    </li>
  );
}

export function Disclosure({
  label,
  children,
  open: forced,
}: {
  label: string;
  children: ReactNode;
  open?: boolean;
}) {
  const [open, setOpen] = useState(forced ?? false);
  return (
    <div>
      <button className="btn link" type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Chevron aperto={open} />
        {label}
      </button>
      {open ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  );
}
