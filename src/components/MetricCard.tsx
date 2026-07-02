import { formatNumber } from "../lib/data";

interface MetricCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "saffron" | "green" | "ink";
}

export function MetricCard({ label, value, sub, accent = "ink" }: MetricCardProps) {
  const accentClass = {
    saffron: "text-saffron-600",
    green: "text-green-600",
    ink: "text-ink-950",
  }[accent];

  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-ink-500 mb-1">{label}</p>
      <p className={`text-3xl font-display font-bold ${accentClass}`}>
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {sub && <p className="text-xs text-ink-400 mt-1">{sub}</p>}
    </div>
  );
}

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold text-ink-900">{title}</h3>
        {description && (
          <p className="text-sm text-ink-500 mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-saffron-500" />
        <p className="text-sm text-ink-500">Loading dataset…</p>
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-red-600 font-medium">{message}</p>
    </div>
  );
}
