import { useEffect, useRef, useState, ReactNode } from "react";
import { X, ArrowUp, ArrowDown, Dumbbell, Plus, Check } from "lucide-react";
export type Run = (
  action: () => Promise<unknown>,
  success?: string,
) => Promise<void>;
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = ref.current!;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    el.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = [
          ...el.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
          ),
        ].filter((n) => n.getClientRects().length);
        const first = nodes[0],
          last = nodes.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    el.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      el.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={"modal " + (wide ? "modal-wide" : "")}
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Empty({
  icon = <Dumbbell size={27} />,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-symbol">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Metric({
  label,
  value,
  unit,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="metric">
      <div className="metric-top">
        {label}
        {icon}
      </div>
      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>
    </div>
  );
}
export function NumberInput({
  value,
  onChange,
  label,
  integer = false,
  disabled = false,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
  integer?: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState(
    value === null ? "" : String(value).replace(".", ","),
  );
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current)
      setText(value === null ? "" : String(value).replace(".", ","));
  }, [value]);
  return (
    <input
      className="number-input"
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      aria-label={label}
      placeholder="—"
      autoComplete="off"
      value={text}
      disabled={disabled}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        setText((v) =>
          v && Number.isFinite(Number(v.replace(",", ".")))
            ? String(Number(v.replace(",", "."))).replace(".", ",")
            : "",
        );
      }}
      onChange={(e) => {
        const v = e.target.value;
        if (!(integer ? /^\d{0,6}$/ : /^\d{0,6}([,.]\d{0,3})?$/).test(v))
          return;
        setText(v);
        onChange(
          v === "" || v === "," || v === "."
            ? null
            : Number(v.replace(",", ".")),
        );
      }}
    />
  );
}
export function MoveButtons({
  index,
  length,
  onMove,
  label,
}: {
  index: number;
  length: number;
  onMove: (n: number) => void;
  label: string;
}) {
  return (
    <div className="move-buttons">
      <button
        type="button"
        className="icon-button small"
        disabled={index === 0}
        aria-label={`${label}: выше`}
        onClick={() => onMove(-1)}
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        className="icon-button small"
        disabled={index === length - 1}
        aria-label={`${label}: ниже`}
        onClick={() => onMove(1)}
      >
        <ArrowDown size={14} />
      </button>
    </div>
  );
}
export function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button className="add-button" onClick={onClick}>
      <Plus size={18} />
      {children}
    </button>
  );
}
export function Pill({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className={"pill " + (active ? "selected" : "")} onClick={onClick}>
      {active && <Check size={13} />} {children}
    </button>
  );
}

export function AutoText({
  value,
  onChange,
  multiline = false,
  maxLength,
  placeholder,
  className,
}: {
  value: string;
  onChange: (s: string) => void;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);
  const props = {
    value: text,
    maxLength,
    placeholder,
    className,
    onFocus: () => {
      focused.current = true;
    },
    onBlur: () => {
      focused.current = false;
    },
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      setText(e.target.value);
      onChange(e.target.value);
    },
  };
  return multiline ? <textarea {...props} /> : <input {...props} />;
}
