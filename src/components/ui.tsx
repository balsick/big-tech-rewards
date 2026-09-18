import { useId, useState, type ReactNode } from "react";
import { parseNum, toField, type Lang } from "../lib/format.ts";
import { Chevron } from "./Icons.tsx";

// The building blocks. Few of them, and one rule: any field that takes a number
// also takes a sum ("1200+300"), because that is how people arrive at the
// number they want to try.

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

/**
 * A numeric field that remembers what you typed into it.
 *
 * It holds the text, not the number: that way "1.2" can be typed without the
 * field rewriting itself under your fingers on every keystroke, and a half
 * finished sum ("1200+") is not an error, just a sum that is not finished.
 */
export function NumField({
  label,
  value,
  onChange,
  hint,
  suffix,
  lang,
  dec = 2,
  id: forcedId,
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
  /** the long explanation, behind the little button next to the label */
  info?: ReactNode;
}) {
  const autoId = useId();
  const id = forcedId ?? autoId;
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? toField(value, lang, dec);
  const valid = text === null || parseNum(text) !== null;

  return (
    <div className="field">
      <label className="lab" htmlFor={id}>
        {label}
        {suffix ? <span style={{ color: "var(--muted)", fontWeight: 500 }}> {suffix}</span> : null}
        {info}
      </label>
      <input
        id={id}
        className="inp tnum"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        aria-invalid={valid ? undefined : true}
        value={shown}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseNum(e.target.value);
          if (n !== null) onChange(n);
        }}
        onBlur={() => setText(null)}
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
    <div className="field">
      <label className="lab" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="inp tnum" type="date" value={value} onChange={(e) => onChange(e.target.value)} />
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
        <button key={o.id} type="button" title={o.title} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
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
    <div className="field">
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

/** A row in a list of entries: name on the left, figure on the right. */
/**
 * The one or two figures the whole panel exists to produce.
 *
 * Put side by side and at the same size, because they are one answer in two
 * units — a count of shares and what that count is worth — and ranking one
 * above the other would be an opinion about which question you came with. The
 * `key` on each value is what makes it redraw when it changes: the only motion
 * on the page, spent where something actually moved.
 */
export function Answer({ items }: { items: { name: string; value: string; hint?: string }[] }) {
  return (
    <div className="answer-pair">
      {items.map((it) => (
        <div className="answer-one" key={it.name}>
          <span className="answer-name">{it.name}</span>
          <span className="answer-value answer" key={it.value}>
            {it.value}
          </span>
          {it.hint ? <span className="answer-hint">{it.hint}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function Line({
  name,
  hint,
  value,
  tone,
  sum,
}: {
  name: string;
  hint?: string;
  value: string;
  tone?: "neg" | "pos";
  sum?: boolean;
}) {
  return (
    <li className={sum ? "sum" : undefined}>
      <span>
        {name}
        {hint ? (
          <span className="hint" style={{ display: "block" }}>
            {hint}
          </span>
        ) : null}
      </span>
      <span className={tone}>{value}</span>
    </li>
  );
}

export function Disclosure({
  label,
  children,
  open: forcedOpen,
}: {
  label: string;
  children: ReactNode;
  open?: boolean;
}) {
  const [open, setOpen] = useState(forcedOpen ?? false);
  return (
    <div>
      <button className="btn link" type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Chevron open={open} />
        {label}
      </button>
      {open ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  );
}
