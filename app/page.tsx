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

export default function Home() {
  const [darkMode, setDarkMode] = useState(true);
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
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
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
      if (next.has(key)) {
        if (next.size === 1) return next;
        next.delete(key);
      } else {
        next.add(key);
      }
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

  const inputCls = "px-3 py-2 text-sm rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <main className={`min-h-screen ${darkMode ? "bg-gray-950 text-gray-100" : "text-[#31353d]"}`}
      style={darkMode ? {} : { backgroundColor: "#F1EFE9" }}>
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">B</div>
            <div>
              <h1 className="text-lg font-semibold">Bedriftstargeting</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Finn bedrifter og lag bedriftslister for Google Ads og SOME-kanaler</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {oppdatert && <span className="text-xs text-gray-400">Sist oppdatert {oppdatert}</span>}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={darkMode ? "Bytt til lyst tema" : "Bytt til mørkt tema"}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Totalt", val: totalCount, sub: "aktive enheter" },
            { label: "ENK", val: segments.ENK.data.length, sub: "enkeltmannsforetak" },
            { label: "Mellomstore", val: segments.SMB.data.length, sub: "1–49 ansatte" },
            { label: "Store", val: segments.MID.data.length + segments.STOR.data.length, sub: "50+ ansatte" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl p-4 border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              style={darkMode ? {} : { borderColor: "#C6C6B7" }}>
              <p className="text-xs text-gray-500 mb-1">{m.label}</p>
              <p className="text-2xl font-medium">{segments.ENK.state === "loading" ? "…" : m.val.toLocaleString("nb-NO")}</p>
              <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Segment cards */}
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
          Velg segment — klikk for å toggle, kombiner flere
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {SEGMENTS.map((seg) => (
            <SegmentCard
              key={seg.key}
              segment={seg}
              count={segments[seg.key].state === "done" ? segments[seg.key].data.length : null}
              active={aktiveSegmenter.has(seg.key)}
              onClick={() => toggleSegment(seg.key)}
            />
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-5"
          style={darkMode ? {} : { borderColor: "#C6C6B7" }}>
          {([
            { key: "liste", label: "Bedriftsliste" },
            { key: "region", label: "Per region" },
            { key: "lonnsomhet", label: "Lønnsomhet" },
          ] as const).map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "liste" && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap items-center">
              <div className="relative flex-1 min-w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌕</span>
                <input type="text" placeholder="Søk navn, poststed, postnr..." value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className={`w-full pl-8 pr-4 ${inputCls}`} />
              </div>
              <select value={fylkeFilter} onChange={(e) => { setFylkeFilter(e.target.value); setPage(0); }} className={inputCls}>
                <option value="">Alle fylker</option>
                {allFylker.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <select value={kategoriFilter} onChange={(e) => { setKategoriFilter(e.target.value); setPage(0); }} className={inputCls}>
                <option value="">Alle bransjer</option>
                {kategorier.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <button onClick={() => downloadCSV(toCSV(filtered), `${date}_utvalg.csv`)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium">↓ CSV</button>
              <button onClick={() => downloadCSV(toCSV(filtered, true), `${date}_utvalg_meta.csv`)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">↓ Meta</button>
            </div>

            <EnhetTable enheter={filtered} segmentKey={[...aktiveSegmenter].join("+")}
              page={page} pageSize={PAGE_SIZE} onClickEnhet={setValgtEnhet} />

            <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">← Forrige</button>
                <span className="text-sm text-gray-500">
                  Side {page + 1} av {Math.max(1, totalPages)} · {filtered.length.toLocaleString("nb-NO")} bedrifter
                </span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">Neste →</button>
              </div>
            </div>
          </>
        )}

        {activeTab === "region" && (
          <RegionList enheter={kombinertData} segmentKey={[...aktiveSegmenter].join("+")} />
        )}

        {activeTab === "lonnsomhet" && (
          <LonnsomhetTab enheter={filtered} />
        )}
      </div>

      <EnhetModal enhet={valgtEnhet} onClose={() => setValgtEnhet(null)} />
    </main>
  );
}
