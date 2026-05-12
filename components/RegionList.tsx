"use client";
import { Enhet } from "@/lib/types";
import { toCSV, downloadCSV } from "@/lib/fetcher";

interface Props {
  enheter: Enhet[];
  segmentKey: string;
}

export default function RegionList({ enheter, segmentKey }: Props) {
  const counts: Record<string, number> = {};
  for (const e of enheter) {
    if (e.fylke) counts[e.fylke] = (counts[e.fylke] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] ?? 1;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  function exportRegion(fylke: string) {
    const rows = enheter.filter((e) => e.fylke === fylke);
    const safe = fylke.replace(/\s+/g, "_").replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "aa");
    downloadCSV(toCSV(rows), `${date}_${segmentKey}_${safe}.csv`);
  }

  if (!sorted.length) {
    return <div className="text-center py-12 text-gray-400 text-sm">Ingen data lastet ennå</div>;
  }

  return (
    <div className="space-y-2">
      {sorted.map(([fylke, count]) => (
        <div
          key={fylke}
          className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 group"
        >
          <div className="w-32 flex-shrink-0 text-sm text-gray-900 dark:text-gray-100">{fylke}</div>
          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <div className="w-16 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
            {count.toLocaleString("nb-NO")}
          </div>
          <button
            onClick={() => exportRegion(fylke)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            CSV ↓
          </button>
        </div>
      ))}
    </div>
  );
}
