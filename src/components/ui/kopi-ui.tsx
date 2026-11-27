import React from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-[24px] font-extrabold tracking-[-0.4px] text-[var(--ink)] leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[14px] text-[var(--mut)] mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex-1" />
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  sub,
  valueClassName = "",
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  sub?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div
      className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px]"
      style={{ boxShadow: "var(--sh)" }}
    >
      <div className="flex items-center justify-between gap-2 text-[var(--mut)] font-medium text-[14px]">
        <span>{label}</span>
        {icon && (
          <span className="w-9 h-9 rounded-[11px] bg-[var(--mint)] text-[var(--brand)] grid place-items-center shrink-0">
            {icon}
          </span>
        )}
      </div>
      <div
        className={`text-[28px] font-extrabold tracking-[-0.6px] mt-2.5 mb-1 text-[var(--ink)] ${valueClassName}`}
      >
        {value}
      </div>
      {sub && <div className="text-[12.5px] text-[var(--mut)]">{sub}</div>}
    </div>
  );
}

export type PillVariant = "success" | "warn" | "danger" | "neutral";

export function StatusPill({
  children,
  variant = "success",
}: {
  children: React.ReactNode;
  variant?: PillVariant;
}) {
  const styles: Record<PillVariant, string> = {
    success: "bg-[var(--mint)] text-[var(--brand)]",
    warn: "bg-[var(--warnbg)] text-[var(--warn)]",
    danger: "bg-[var(--badbg)] text-[var(--bad)]",
    neutral: "bg-[var(--bg)] text-[var(--mut)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-[3px] rounded-full whitespace-nowrap ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center text-[var(--mut)] py-8 px-3">
      <div className="w-[52px] h-[52px] rounded-[16px] bg-[var(--mint)] text-[var(--brand)] grid place-items-center mx-auto mb-3">
        {icon}
      </div>
      <b className="block text-[var(--ink)] mb-1 font-bold">{title}</b>
      {description && <div className="text-[13px] text-[var(--mut)]">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DataTable({
  columns,
  children,
  empty,
  isEmpty,
}: {
  columns: string[];
  children: React.ReactNode;
  empty?: React.ReactNode;
  isEmpty?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[620px]">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`text-left text-[12.5px] font-semibold text-[var(--mut)] px-3.5 py-2.5 bg-[var(--bg)] ${
                  idx === 0 ? "rounded-l-[10px]" : ""
                } ${idx === columns.length - 1 ? "rounded-r-[10px]" : ""}`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {isEmpty ? (
            <tr>
              <td colSpan={columns.length} className="py-6">
                {empty}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function FormField({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 font-semibold text-[13px] text-[var(--ink)] ${className}`}>
      <span>{label}</span>
      {hint && <small className="text-[var(--mut)] font-normal text-[12px] -mt-1">{hint}</small>}
      {children}
    </label>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="inline-flex bg-[var(--bg)] rounded-[12px] p-[3px]"
      style={{ boxShadow: "var(--sh)" }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-4 py-[7px] rounded-[9px] text-[13px] font-semibold transition-colors cursor-pointer ${
              active
                ? "bg-[var(--btn)] text-white"
                : "text-[var(--mut)] hover:text-[var(--ink)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`text-[12px] font-semibold px-3 py-1 rounded-full transition-colors cursor-pointer ${
              active
                ? "bg-[var(--btn)] text-white"
                : "bg-[var(--bg)] text-[var(--mut)] hover:text-[var(--ink)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

