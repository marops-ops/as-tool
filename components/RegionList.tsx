"use client";
import { Enhet } from "@/lib/types";
import { toCSV, downloadCSV } from "@/lib/fetcher";

interface Props {
  enheter: Enhet[];
  segmentKey: string;
  theme: {
    bg: string;
    card: string;
    border: string;
    text: string;
    textMuted: string;
  };
}

export default function RegionList({ enheter, segmentKey, theme }: Props) {
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
    return <div style={{ textAlign: "center", padding: "48px 0", color: theme.textMuted, fontSize: 14 }}>Ingen data lastet ennå</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sorted.map(([fylke, count]) => (
        <div key={fylke} style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
          backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10,
        }}
          onMouseEnter={e => (e.currentTarget.querySelector(".csv-btn") as HTMLElement)?.style.setProperty("opacity", "1")}
          onMouseLeave={e => (e.currentTarget.querySelector(".csv-btn") as HTMLElement)?.style.setProperty("opacity", "0")}
        >
          <div style={{ width: 120, flexShrink: 0, fontSize: 14, color: theme.text }}>{fylke}</div>
          <div style={{ flex: 1, height: 8, backgroundColor: theme.bg, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(count / max) * 100}%`, backgroundColor: "#059669", borderRadius: 4 }} />
          </div>
          <div style={{ width: 60, textAlign: "right", fontSize: 14, fontWeight: 500, color: theme.text }}>{count.toLocaleString("nb-NO")}</div>
          <button className="csv-btn" onClick={() => exportRegion(fylke)}
            style={{ opacity: 0, transition: "opacity 0.15s", fontSize: 12, color: "#059669", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
            CSV ↓
          </button>
        </div>
      ))}
    </div>
  );
}
