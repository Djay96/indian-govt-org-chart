import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { loadDataset, formatLevel, statusColor } from "../lib/data";
import type { Dataset, SearchRecord } from "../lib/types";
import { LoadingState, ErrorState } from "../components/MetricCard";
import SearchBar from "../components/SearchBar";

function DetailPanel({ item }: { item: SearchRecord }) {
  const d = item.data;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="badge bg-ink-100 text-ink-600 mb-2">{item.type}</span>
          <h2 className="font-display text-2xl font-bold text-ink-950">
            {item.label}
          </h2>
          {item.subtitle && (
            <p className="text-ink-600 mt-1">{item.subtitle}</p>
          )}
        </div>
        {typeof d.data_status === "string" && (
          <span className={`badge ${statusColor(d.data_status)}`}>
            {d.data_status}
          </span>
        )}
      </div>

      <dl className="grid sm:grid-cols-2 gap-3 text-sm">
        {Object.entries(d)
          .filter(
            ([k, v]) =>
              !k.startsWith("_") &&
              v != null &&
              v !== "" &&
              !["id"].includes(k)
          )
          .slice(0, 16)
          .map(([key, value]) => (
            <div key={key} className="rounded-lg bg-ink-50 px-3 py-2">
              <dt className="text-xs font-medium text-ink-400 uppercase tracking-wide">
                {key.replace(/_/g, " ")}
              </dt>
              <dd className="text-ink-800 mt-0.5 break-words">
                {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
              </dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

export default function Explore() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SearchRecord | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [params] = useSearchParams();

  useEffect(() => {
    loadDataset()
      .then(setData)
      .catch(() => setError("Could not load dataset."));
  }, []);

  useEffect(() => {
    if (!data) return;
    const type = params.get("type");
    const id = params.get("id");
    if (type && id) {
      const found = data.searchIndex.find(
        (r) => r.type === type && String(r.id) === id
      );
      if (found) setSelected(found);
    }
  }, [data, params]);

  const filteredBrowse = useMemo(() => {
    if (!data) return [];
    const items = data.searchIndex.filter(
      (r) => filter === "all" || r.type === filter
    );
    return items.slice(0, 100);
  }, [data, filter]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;

  const types = ["all", "position", "person", "jurisdiction", "body", "topic"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-950">
          Explore Data
        </h1>
        <p className="text-ink-600 mt-2">
          Search {data.searchIndex.length.toLocaleString()} records across offices,
          people, jurisdictions, and topics.
        </p>
      </div>

      <SearchBar autoFocus />

      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              filter === t
                ? "bg-ink-950 text-white"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredBrowse.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              onClick={() => setSelected(item)}
              className={`w-full text-left rounded-xl border p-4 transition ${
                selected?.id === item.id && selected?.type === item.type
                  ? "border-saffron-400 bg-saffron-50/50"
                  : "border-ink-200 bg-white hover:border-ink-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="badge bg-ink-100 text-ink-600 text-xs">
                  {item.type}
                </span>
                {typeof item.data.jurisdiction_level === "string" && (
                  <span className="text-xs text-ink-400">
                    {formatLevel(item.data.jurisdiction_level)}
                  </span>
                )}
              </div>
              <p className="font-medium text-ink-900">{item.label}</p>
              {item.subtitle && (
                <p className="text-sm text-ink-500 truncate">{item.subtitle}</p>
              )}
            </button>
          ))}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          {selected ? (
            <DetailPanel item={selected} />
          ) : (
            <div className="card p-8 text-center text-ink-500">
              Select a record or search to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
