import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { search } from "../lib/data";
import type { SearchRecord } from "../lib/types";

interface SearchBarProps {
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  placeholder = "Search offices, people, jurisdictions…",
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchRecord[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setResults(search(q, 12));
    setOpen(true);
  }, []);

  const handleSelect = (item: SearchRecord) => {
    setOpen(false);
    setQuery("");
    navigate(`/explore?type=${item.type}&id=${item.id}`);
  };

  return (
    <div className="relative">
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          className="input pl-10"
          placeholder={placeholder}
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-ink-200 bg-white shadow-lg overflow-hidden">
          {results.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-ink-50 transition"
              onMouseDown={() => handleSelect(item)}
            >
              <span className="badge bg-ink-100 text-ink-600 shrink-0 mt-0.5">
                {item.type}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-ink-900 truncate">{item.label}</p>
                {item.subtitle && (
                  <p className="text-sm text-ink-500 truncate">{item.subtitle}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
