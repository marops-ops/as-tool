"use client";

import { useState, useMemo, useEffect } from "react";
import { SEGMENTS, FYLKER } from "@/lib/segments";
import { toCSV, downloadCSV } from "@/lib/fetcher";
import { Enhet, SegmentKey } from "@/lib/types";
import SegmentCard from "@/components/SegmentCard";
import EnhetTable from "@/components/EnhetTable";
import RegionList from "@/components/RegionList";

type LoadState = "idle" | "loading" | "done" | "error";

interface SegmentState {
  data: Enhet[];
  state: LoadState;
  oppdatert: string;
}

const EMPTY: SegmentState = { data: [], state: "idle", oppdatert: "" };
const PAGE_SIZE = 30;

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
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function loadAll() {
      for (const seg of SEGMENTS) {
        setSegments((prev) => ({
          ...prev,
          [seg.key]: { ...prev[seg.key], state: "loading" },
        }));
        try {
          const res = await fetch(`/api/data/${seg.key}`);
          const json = await res.json();
          setSegments((prev) => ({
            ...prev,
            [seg.key]: {
              data: json.enheter ?? [],
              state: "done",
              oppdatert: json.oppdatert ?? "",
            },
          }));
        } catch {
          setSegments((prev) => ({
            ...prev,
            [seg.key]: { ...prev[seg.key], state: "error" },
          }));
        }
      }
    }
    loadAll();
  }, []);

  const current = segments[activeSeg];

  const kategorier = useMemo(() => {
    const s = new Set(current.data.map((e) => e.kategori).filter(Boolean));
    return [...s].sort();
  }, [current.data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return current.data.filter((e) => {
      const matchQ =
        !q ||
        e.navn.toLowerCase().includes(q) ||
        e.poststed.toLowerCase().includes(q) ||
        e.postnummer.includes(q);
      const matchF = !fylkeFilter || e.fylke === fylkeFilter;
      const matchK = !kategoriFilter || e.kategori === kategoriFilter;
      return matchQ && matchF && matchK;
    });
  }, [current.data, search, fylkeFilter, kategoriFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const allFylker = useMemo(() => [...new Set(Object.values(FYLKER))].sort(), []);
  const totalCount = Object.values(segments).reduce((sum, s) => sum + s.data.length, 0);
  const oppdatert = current.oppdatert
    ? new Date(current.oppdatert).toLocaleDateString("nb-NO")
    : null;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-lg font-bold">F</div>
            <div>
              <h1 className="text-lg font-semibold">Audience Segmenter</h1>
              <p className="text-sm text-gray-500">Folio.no — bedriftslister for Meta & Google Ads</p>
            </div>
          </div>
          {oppdatert && (
            <span className="text-xs text-gray-400">Sist oppdatert {oppdatert}</span>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Totalt", val: totalCount, sub: "aktive enheter" },
            { label: "ENK", val: segments.ENK.data.length, sub: "enkeltmannsforetak" },
            { label: "Mellomstore", val: segments.SMB.data.length, sub: "1–49 ansatte" },
            { label: "Store", val: segments.MID.data.length + segments.STOR.data.length, sub: "50+ ansatte" },
          ].map((m) => (
            <div key={m.label} className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-1">{m.label}</p>
              <p className="text-2xl font-medium">
                {segments.ENK.state === "loading" ? "…" : m.val.toLocaleString("nb-NO")}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Segment cards */}
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Velg segment</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {SEGMENTS.map((seg) => (
            <SegmentCard
              key={seg.key}
              segment={seg}
              count={segments[seg.key].state === "done" ? segments[seg.key].data.length : null}
              active={activeSeg === seg.key}
              onClick={() => {
                setActiveSeg(seg.key);
                setPage(0);
                setSearch("");
                setFylkeFilter("");
                setKategoriFilter("");
              }}
            />
          ))}
        </div>

        {current.state === "loading" && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-emerald-600 rounded-full animate-spin" />
            Laster data...
          </div>
        )}

        {current.state === "done" && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-5">
              {(["liste", "region"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? "border-emerald-600 text-emerald-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "liste" ? "Bedriftsliste" : "Per region"}
                </button>
              ))}
            </div>

            {activeTab === "liste" && (
              <>
                {/* Controls + eksport i samme rad */}
                <div className="flex gap-3 mb-4 flex-wrap items-center">
                  <div className="relative flex-1 min-w-40">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌕</span>
                    <input
                      type="text"
                      placeholder="Søk navn, poststed, postnr..."
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
                  <select
                    value={kategoriFilter}
                    onChange={(e) => { setKategoriFilter(e.target.value); setPage(0); }}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Alle bransjer</option>
                    {kategorier.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <button
                    onClick={() => downloadCSV(toCSV(filtered), `${date}_${activeSeg}_alle.csv`)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    ↓ CSV
                  </button>
                  <button
                    onClick={() => downloadCSV(toCSV(filtered, true), `${date}_${activeSeg}_meta.csv`)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    ↓ Meta
                  </button>
                </div>

                <EnhetTable enheter={filtered} segmentKey={activeSeg} page={page} pageSize={PAGE_SIZE} />

                {/* Paginering */}
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
                </div>
              </>
            )}

            {activeTab === "region" && (
              <RegionList enheter={current.data} segmentKey={activeSeg} />
            )}
          </>
        )}

        {current.state === "error" && (
          <div className="text-center py-16 text-red-400 text-sm">
            Feil ved lasting av data.
          </div>
        )}
      </div>
    </main>
  );
}
