import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { loadDataset, formatNumber, statusColor } from "../lib/data";
import type { Dataset } from "../lib/types";
import { MetricCard, ChartCard, LoadingState, ErrorState } from "../components/MetricCard";

export default function Geography() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<number | null>(null);

  useEffect(() => {
    loadDataset()
      .then((d) => {
        setData(d);
        if (d.metrics.stateStats.length) {
          setSelectedState(d.metrics.stateStats[0].id);
        }
      })
      .catch(() => setError("Could not load dataset."));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;

  const { stateStats, breakdowns } = data.metrics;

  const jurisdictionLevels = Object.entries(breakdowns.jurisdictionsByLevel)
    .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
    .sort((a, b) => b.value - a.value);

  const state = stateStats.find((s) => s.id === selectedState);
  const statePositions = selectedState
    ? data.positions.filter((p) => {
        const j = data.jurisdictions.find((j) => j.id === p.jurisdiction_id);
        if (!j) return false;
        if (j.id === selectedState) return true;
        const parent = data.jurisdictions.find((x) => x.id === j.parent_id);
        return parent?.id === selectedState || j.parent_id === selectedState;
      })
    : [];

  const dmCoverage = stateStats.map((s) => ({
    name: s.name.length > 12 ? s.name.slice(0, 10) + "…" : s.name,
    pct: s.dms_total > 0 ? Math.round((s.dms_filled / s.dms_total) * 100) : 0,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-950">
          Geographic Breakdown
        </h1>
        <p className="text-ink-600 mt-2">
          India's administrative hierarchy from Union to ward level — {data.metrics.counts.states}{" "}
          states/UTs covering {data.metrics.counts.districts} districts.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="States & UTs" value={data.metrics.counts.states} />
        <MetricCard label="Districts" value={data.metrics.counts.districts} accent="green" />
        <MetricCard label="Municipal Bodies" value={data.metrics.counts.municipal} />
        <MetricCard
          label="Total Jurisdictions"
          value={data.metrics.counts.jurisdictions}
          accent="saffron"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Jurisdictions by Level">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={jurisdictionLevels}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-30}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => formatNumber(v)} />
              <Bar dataKey="value" fill="#138808" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="DM Coverage by State (%)" description="District Magistrates / Collectors named">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dmCoverage.slice(0, 15)}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="pct" fill="#f58220" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-4 lg:col-span-1 max-h-[500px] overflow-y-auto">
          <h3 className="font-semibold text-ink-900 mb-3">Select State/UT</h3>
          <div className="space-y-1">
            {stateStats.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedState(s.id)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${
                  selectedState === s.id
                    ? "bg-ink-950 text-white"
                    : "hover:bg-ink-100 text-ink-700"
                }`}
              >
                <span className="font-medium">{s.name}</span>
                <span className="block text-xs opacity-70">
                  {s.districts} districts · {s.dms_filled}/{s.dms_total} DMs
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {state && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl font-semibold">{state.name}</h3>
                <span className={`badge ${statusColor(state.data_status)}`}>
                  {state.data_status}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-ink-950">{state.districts}</p>
                  <p className="text-xs text-ink-500">Districts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink-950">{state.positions}</p>
                  <p className="text-xs text-ink-500">Positions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{state.dms_filled}</p>
                  <p className="text-xs text-ink-500">DMs Named</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-saffron-600">{state.dms_total}</p>
                  <p className="text-xs text-ink-500">DM Positions</p>
                </div>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-ink-100 bg-ink-50">
              <h4 className="font-medium text-ink-800">
                Positions in {state?.name ?? "…"} ({statePositions.length})
              </h4>
            </div>
            <div className="max-h-[350px] overflow-y-auto divide-y divide-ink-100">
              {statePositions.slice(0, 50).map((p) => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900 truncate">{p.title}</p>
                    <p className="text-sm text-ink-500 truncate">
                      {p.person_name ?? "Vacant"} · {p.jurisdiction_name}
                    </p>
                  </div>
                  <span className={`badge shrink-0 ${statusColor(p.data_status)}`}>
                    {p.data_status}
                  </span>
                </div>
              ))}
              {statePositions.length > 50 && (
                <p className="px-5 py-3 text-sm text-ink-400 text-center">
                  + {statePositions.length - 50} more — use Explore to search
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
