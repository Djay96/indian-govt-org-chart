import Fuse from "fuse.js";
import type { Dataset, SearchRecord } from "./types";

let cached: Dataset | null = null;
let fuse: Fuse<SearchRecord> | null = null;

export async function loadDataset(): Promise<Dataset> {
  if (cached) return cached;
  const res = await fetch("/data/accountable-india.json");
  if (!res.ok) throw new Error("Failed to load dataset");
  cached = await res.json();
  fuse = new Fuse(cached!.searchIndex, {
    keys: ["label", "subtitle", "keywords", "type"],
    threshold: 0.35,
    includeScore: true,
  });
  return cached!;
}

export function search(query: string, limit = 20): SearchRecord[] {
  if (!fuse || !query.trim()) return [];
  return fuse.search(query, { limit }).map((r) => r.item);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function formatLevel(level: string): string {
  return level
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusColor(status: string): string {
  switch (status) {
    case "verified":
      return "bg-green-100 text-green-700";
    case "collected":
      return "bg-blue-100 text-blue-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "stale":
      return "bg-red-100 text-red-700";
    default:
      return "bg-ink-100 text-ink-600";
  }
}

export const CHART_COLORS = [
  "#f58220",
  "#138808",
  "#667690",
  "#515f78",
  "#ff9933",
  "#0f6d06",
  "#8593ab",
  "#e06b0a",
];
