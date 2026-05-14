"use client";

import { useState, useMemo, useEffect } from "react";
import { SEGMENTS, FYLKER } from "@/lib/segments";
import { toCSV, downloadCSV } from "@/lib/fetcher";
import { Enhet, SegmentKey } from "@/lib/types";
import SegmentCard from "@/components/SegmentCard";
import EnhetTable from "@/components/EnhetTable";
import EnhetModal from "@/components/EnhetModal";
import RegionList from "@/components/RegionList";
import LonnsomhetTab from "@/components/LonnsomhetTab";

type LoadState = "idle" | "loading" | "done" | "error";

interface SegmentState {
  data: Enhet[];
  state: LoadState;
  oppdatert: string;
}

const EMPTY: SegmentState = { data: [], state: "idle", oppdatert: "" };
const PAGE_SIZE = 30;

const LIGHT = {
  bg: "#F1EFE9",
  card: "#E8E6DF",
  border: "#C6C6B7",
  text: "#31353d",
  textMuted: "#6b7280",
};

const DARK = {
  bg: "#0a0a0a",
  card: "#111111",
  border: "#1f2937",
  text: "#f3f4f6",
  textMuted: "#9ca3af",
};

export default function Home() {
  const [darkMode, setDarkMode] = useState(true);
  const theme = darkMode ? DARK : LIGHT;

  const [segments, setSegments] = useState<Record<SegmentKey, SegmentState>>({
    ENK: { ...EMPTY }, SMB: { ...EMPTY }, MID: { ...EMPTY }, STOR: { ...EMPTY },
  });
  const [aktiveSegmenter, setAktiveSegmenter] = useState<Set<SegmentKey>>(new Set(["SMB"]));
  const [activeTab, setActiveTab] = useState<"liste" | "region" | "lonnsomhet">("liste");
  const [search, setSearch] = useState("");
  const [fylkeFilter, setFylkeFilter] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [page, setPage] = useState(0);
  const [valgtEnhet, setValgtEnhet] = useState<Enhet | null>(null);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  useEffect(() => {
    async function loadAll() {
      for (const seg of SEGMENTS) {
        setSegments((prev) => ({ ...prev, [seg.key]: { ...prev[seg.key], state: "loading" } }));
        try {
          const res = await fetch(`/api/data/${seg.key}`);
          const json = await res.json();
          setSegments((prev) => ({
            ...prev,
            [seg.key]: { data: json.enheter ?? [], state: "done", oppdatert: json.oppdatert ?? "" },
          }));
        } catch {
          setSegments((prev) => ({ ...prev, [seg.key]: { ...prev[seg.key], state: "error" } }));
        }
      }
    }
    loadAll();
  }, []);

  function toggleSegment(key: SegmentKey) {
    setAktiveSegmenter(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size === 1) return next; next.delete(key); }
      else next.add(key);
      setPage(0);
      return next;
    });
  }

  const kombinertData = useMemo(() => {
    const alle: Enhet[] = [];
    const seen = new Set<string>();
    for (const key of aktiveSegmenter) {
      for (const e of segments[key].data) {
        if (!seen.has(e.orgnr)) { seen.add(e.orgnr); alle.push(e); }
      }
    }
    return alle;
  }, [aktiveSegmenter, segments]);

  const kategorier = useMemo(() => {
    const s = new Set(kombinertData.map((e) => e.kategori).filter(Boolean));
    return [...s].sort();
  }, [kombinertData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return kombinertData.filter((e) => {
      const matchQ = !q || e.navn.toLowerCase().includes(q) || e.poststed.toLowerCase().includes(q) || e.postnummer.includes(q);
      const matchF = !fylkeFilter || e.fylke === fylkeFilter;
      const matchK = !kategoriFilter || e.kategori === kategoriFilter;
      return matchQ && matchF && matchK;
    });
  }, [kombinertData, search, fylkeFilter, kategoriFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const allFylker = useMemo(() => [...new Set(Object.values(FYLKER))].sort(), []);
  const totalCount = Object.values(segments).reduce((sum, s) => sum + s.data.length, 0);
  const oppdatert = segments.SMB.oppdatert ? new Date(segments.SMB.oppdatert).toLocaleDateString("nb-NO") : null;

  const s = {
    main: { backgroundColor: theme.bg, color: theme.text, minHeight: "100vh" },
    card: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: "1rem" },
    input: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "8px 12px", color: theme.text, fontSize: 14, outline: "none" },
    btnGray: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 12px", color: theme.text, fontSize: 14, cursor: "pointer" },
    table: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, overflow: "hidden" },
    th: { backgroundColor: theme.bg, color: theme.textMuted, fontSize: 11, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.05em", padding: "10px 16px", textAlign: "left" as const },
    td: { padding: "10px 16px", color: theme.text, fontSize: 14, borderTop: `1px solid ${theme.border}` },
  };

  return (
    <main style={s.main}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#059669", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 18 }}>B</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: theme.text }}>Bedriftstargeting</div>
              <div style={{ fontSize: 13, color: theme.textMuted }}>Finn bedrifter og lag bedriftslister for Google Ads og SOME-kanaler</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {oppdatert && <span style={{ fontSize: 12, color: theme.textMuted }}>Sist oppdatert {oppdatert}</span>}
            <button onClick={() => setDarkMode(!darkMode)}
              style={{ ...s.btnGray, width: 36, height: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Totalt", val: totalCount, sub: "aktive enheter" },
            { label: "ENK", val: segments.ENK.data.length, sub: "enkeltmannsforetak" },
            { label: "Mellomstore", val: segments.SMB.data.length, sub: "1–49 ansatte" },
            { label: "Store", val: segments.MID.data.length + segments.STOR.data.length, sub: "50+ ansatte" },
          ].map((m) => (
            <div key={m.label} style={s.card}>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 24, fontWeight: 500, color: theme.text }}>{segments.ENK.state === "loading" ? "…" : m.val.toLocaleString("nb-NO")}</div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Segment label */}
        <div style={{ fontSize: 11, fontWeight: 500, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Velg segment — klikk for å toggle, kombiner flere
        </div>

        {/* Segment cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          {SEGMENTS.map((seg) => (
            <div key={seg.key} onClick={() => toggleSegment(seg.key)} style={{
              ...s.card,
              cursor: "pointer",
              border: aktiveSegmenter.has(seg.key) ? `2px solid #059669` : `1px solid ${theme.border}`,
              transition: "border-color 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: seg.color, flexShrink: 0 }} />
                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{seg.label}</div>
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 10 }}>{seg.desc}</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: theme.text }}>
                {segments[seg.key].state === "done" ? segments[seg.key].data.length.toLocaleString("nb-NO") : "—"}
              </div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>aktive enheter</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${theme.border}`, marginBottom: 20 }}>
          {([{ key: "liste", label: "Bedriftsliste" }, { key: "region", label: "Per region" }, { key: "lonnsomhet", label: "Lønnsomhet" }] as const).map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "8px 16px", fontSize: 14, fontWeight: 500, cursor: "pointer",
              background: "none", border: "none", borderBottom: activeTab === tab.key ? "2px solid #059669" : "2px solid transparent",
              color: activeTab === tab.key ? "#059669" : theme.textMuted, marginBottom: -1,
            }}>{tab.label}</button>
          ))}
        </div>

        {activeTab === "liste" && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}>⌕</span>
                <input type="text" placeholder="Søk navn, poststed, postnr..." value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  style={{ ...s.input, width: "100%", paddingLeft: 32 }} />
              </div>
              <select value={fylkeFilter} onChange={(e) => { setFylkeFilter(e.target.value); setPage(0); }} style={s.input}>
                <option value="">Alle fylker</option>
                {allFylker.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <select value={kategoriFilter} onChange={(e) => { setKategoriFilter(e.target.value); setPage(0); }} style={s.input}>
                <option value="">Alle bransjer</option>
                {kategorier.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <button onClick={() => downloadCSV(toCSV(filtered), `${date}_utvalg.csv`)}
                style={{ backgroundColor: "#059669", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>↓ CSV</button>
              <button onClick={() => downloadCSV(toCSV(filtered, true), `${date}_utvalg_meta.csv`)}
                style={{ backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>↓ Meta</button>
            </div>

            <div style={s.table}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    {["Navn", "Form", "Ansatte", "Poststed", "Fylke", "Bransje"].map((h, i) => (
                      <th key={h} style={{ ...s.th, width: ["28%","8%","7%","18%","15%","24%"][i] }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((e, i) => (
                    <tr key={i} onClick={() => setValgtEnhet(e)} style={{ cursor: "pointer" }}
                      onMouseEnter={ev => (ev.currentTarget.style.backgroundColor = theme.bg)}
                      onMouseLeave={ev => (ev.currentTarget.style.backgroundColor = "transparent")}>
                      <td style={{ ...s.td, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.navn}>{e.navn}</td>
                      <td style={s.td}>
                        <span style={{ backgroundColor: e.form === "ENK" ? "#fef3c7" : "#d1fae5", color: e.form === "ENK" ? "#92400e" : "#065f46", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>{e.form}</span>
                      </td>
                      <td style={{ ...s.td, color: theme.textMuted }}>{e.ansatte !== "" ? e.ansatte : "—"}</td>
                      <td style={{ ...s.td, color: theme.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.postnummer} {e.poststed}</td>
                      <td style={{ ...s.td, color: theme.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.fylke || "—"}</td>
                      <td style={{ ...s.td, color: theme.textMuted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.kategori || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ ...s.btnGray, opacity: page === 0 ? 0.4 : 1 }}>← Forrige</button>
                <span style={{ fontSize: 14, color: theme.textMuted }}>Side {page + 1} av {Math.max(1, totalPages)} · {filtered.length.toLocaleString("nb-NO")} bedrifter</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ ...s.btnGray, opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Neste →</button>
              </div>
            </div>
          </>
        )}

        {activeTab === "region" && <RegionList enheter={kombinertData} segmentKey={[...aktiveSegmenter].join("+")} />}
        {activeTab === "lonnsomhet" && <LonnsomhetTab enheter={filtered} />}
      </div>

      <EnhetModal enhet={valgtEnhet} onClose={() => setValgtEnhet(null)} />
    </main>
  );
}
