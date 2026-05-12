"use client";

import { useState, useMemo } from "react";
import { SEGMENTS, FYLKER } from "@/lib/segments";
import { fetchSegment, toCSV, downloadCSV } from "@/lib/fetcher";
import { Enhet, SegmentKey } from "@/lib/types";
import SegmentCard from "@/components/SegmentCard";
import EnhetTable from "@/components/EnhetTable";
import RegionList from "@/components/RegionList";

type LoadState = "idle" | "loading" | "done" | "error";

interface SegmentState {
  data: Enhet[];
  state: LoadState;
  progress: string;
}

const EMPTY: SegmentState = { data: [], state: "idle", progress: "" };
const PAGE_SIZE = 100;

export default function Home() {
  const [segments, setSegments] = useState<Record<SegmentKey, SegmentState>>({
    ENK: { ...EMPTY },
    SMB: { ...EMPTY },
    MID: { ...EMPTY },
    STOR: { ...EMPTY },
  });
  const [activeSeg, setActiveSeg] = useState<SegmentKey>("SMB");
  const [activeTab, setActiveTab] = useState<"liste" | "region">("liste");
  const [search, setSearch] = useState("");
  const [fylkeFilter, setFylkeFilter] = useState("");
  const [page, setPage] = useState(0);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalDone, setGlobalDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  function setSegState(key: SegmentKey, patch: Partial<SegmentState>) {
    setSegments((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function loadAll() {
    setGlobalLoading(true);
    setGlobalDone(false);
    setErrorMsg("");

    for (const seg of SEGMENTS) {
      setSegState(seg.key, { state: "loading", progress: "Starter..." });
      try {
        const data = await fetchSegment(
          seg.orgformer,
          seg.ansatteFra,
          seg.ansatteTil,
          (label, done, total) =>
            setSegState(seg.key, {
              progress: `${label} (${done}/${total} fylker)`,
            })
        );
        setSegState(seg.key, { data, state: "done", progress: "" });
      } catch {
        setSegState(seg.key, { state: "error", progress: "" });
        setErrorMsg("Feil ved henting fra Enhetsregisteret. Prøv igjen.");
      }
    }

    setGlobalLoading(false);
    setGlobalDone(true);
  }

  const current = segments[activeSeg];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return current.data.filter((e) => {
      const matchQ =
        !q ||
        e.navn.toLowerCase().includes(q) ||
        e.poststed.toLowerCase().includes(q) ||
        e.postnummer.includes(q);
      const matchF = !fylkeFilter || e.fylke === fylkeFilter;
      return matchQ && matchF;
    });
  }, [current.data, search, fylkeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const allFylker = useMemo(() => [...new Set(Object.values(FYLKER))].sort(), []);
  const totalCount = Object.values(segments).reduce((sum, s) => sum + s.data.length, 0);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-lg font-bold">F</div>
            <div>
              <h1 className="text-lg font-semibold">Audience Segmenter</h1>
              <p className="text-sm text-gray-500">Folio.no — live bedriftslister for Meta & Google Ads</p>
            </div>
          </div>
          <button
            onClick={loadAll}
            disabled={globalLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            {globalLoading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Henter data...</>
            ) : (
              <>↻ Hent alle segmenter</>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">⚠ {errorMsg}</div>
        )}

        {globalDone && !errorMsg && (
          <div className="mb-6 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm">
            ✓ Data lastet fra Enhetsregisteret — {new Date().toLocaleString("nb-NO")}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Totalt hentet", val: totalCount, sub: "aktive enheter" },
            { label: "ENK", val: segments.ENK.data.length, sub: "enkeltmannsforetak" },
            { label: "Mellomstore", val: segments.SMB.data.length, sub: "1–49 ansatte" },
            { label: "Store", val: segments.MID.data.length + segments.STOR.data.length, sub: "50+ ansatte" },
          ].map((m) => (
            <div key={m.label} className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-1">{m.label}</p>
              <p className="text-2xl font-medium">{totalCount === 0 ? "—" : m.val.toLocaleString("nb-NO")}</p>
              <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>

        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Velg segment</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {SEGMENTS.map((seg) => (
            <SegmentCard
              key={seg.key}
              segment={seg}
              count={segments[seg.key].state === "idle" ? null : segments[seg.key].state === "loading" ? null : segments[seg.key].data.length}
              active={activeSeg === seg.key}
              onClick={() => { setActiveSeg(seg.key); setPage(0); setSearch(""); setFylkeFilter(""); }}
            />
          ))}
        </div>

        {current.state === "loading" && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-emerald-600 rounded-full animate-spin" />
            {current.progress || "Henter data..."}
          </div>
        )}

        {current.state === "done" && (
          <>
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-5">
              {(["liste", "region"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                    activeTab === tab ? "border-emerald-600 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "liste" ? "Bedriftsliste" : "Per region"}
                </button>
              ))}
            </div>

            {activeTab === "liste" && (
              <>
                <div className="flex gap-3 mb-4 flex-wrap">
                  <div className="relative flex-1 min-w-48">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌕</span>
                    <input
                      type="text"
                      placeholder="Søk på navn, poststed, postnummer..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                      className="w-full pl-8 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <select
                    value={fylkeFilter}
                    onChange={(e) => { setFylkeFilter(e.target.value); setPage(0); }}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Alle fylker</option>
                    {allFylker.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <EnhetTable enheter={filtered} segmentKey={activeSeg} page={page} pageSize={PAGE_SIZE} />

                <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >← Forrige</button>
                    <span className="text-sm text-gray-500">
                      Side {page + 1} av {Math.max(1, totalPages)} · {filtered.length.toLocaleString("nb-NO")} bedrifter
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >Neste →</button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadCSV(toCSV(filtered), `${date}_${activeSeg}_alle.csv`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    >↓ Last ned CSV</button>
                    <button
                      onClick={() => downloadCSV(toCSV(filtered, true), `${date}_${activeSeg}_meta.csv`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >↓ Meta-format</button>
                  </div>
                </div>
              </>
            )}

            {activeTab === "region" && (
              <RegionList enheter={current.data} segmentKey={activeSeg} />
            )}
          </>
        )}

        {current.state === "idle" && !globalLoading && (
          <div className="text-center py-16 text-gray-400 text-sm">
            Trykk «Hent alle segmenter» for å laste data fra Enhetsregisteret
          </div>
        )}
      </div>
    </main>
  );
}
