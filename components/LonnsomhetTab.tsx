"use client";
import { useState, useEffect, useMemo } from "react";
import { Enhet } from "@/lib/types";
import { toCSV, downloadCSV } from "@/lib/fetcher";

interface Regnskap {
  orgnr: string;
  aar: number;
  inntekter: number;
  driftsresultat: number;
  lonnsomhet: "god" | "ok" | "lav" | "ingen";
}

interface Props {
  enheter: Enhet[];
}

function kalkulerLonnsomhet(inntekter: number, driftsresultat: number): "god" | "ok" | "lav" | "ingen" {
  if (!inntekter) return "ingen";
  const margin = driftsresultat / inntekter;
  if (margin > 0.1) return "god";
  if (margin >= 0) return "ok";
  return "lav";
}

function fmt(n: number) {
  return (n / 1000).toLocaleString("nb-NO", { maximumFractionDigits: 0 }) + " k";
}

const LONNSOMHET_CONFIG = {
  god: { label: "God lønnsomhet", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800" },
  ok: { label: "Ok lønnsomhet", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" },
  lav: { label: "Lav lønnsomhet", color: "text-red-500", bg: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" },
  ingen: { label: "Ingen data", color: "text-gray-400", bg: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700" },
};

export default function LonnsomhetTab({ enheter }: Props) {
  const [regnskap, setRegnskap] = useState<Map<string, Regnskap>>(new Map());
  const [loading, setLoading] = useState(false);
  const [hentet, setHentet] = useState(false);
  const [aktivFilter, setAktivFilter] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  async function hentRegnskap() {
    setLoading(true);
    setHentet(false);
    const resultat = new Map<string, Regnskap>();
    const batch = 10;

    for (let i = 0; i < enheter.length; i += batch) {
      const gruppe = enheter.slice(i, i + batch);
      await Promise.all(gruppe.map(async (e) => {
        try {
          const res = await fetch(`/api/regnskap/${e.orgnr}`);
          if (!res.ok) return;
          const data = await res.json();
          const items = Array.isArray(data) ? data : [data];
          const siste = items.sort((a: any, b: any) =>
            (b.regnskapsperiode?.fraDato ?? "").localeCompare(a.regnskapsperiode?.fraDato ?? "")
          )[0];
          if (!siste) return;
          const inntekter = siste.resultatregnskapResultat?.driftsresultat?.driftsinntekter?.sumDriftsinntekter ?? 0;
          const driftsresultat = siste.resultatregnskapResultat?.driftsresultat?.driftsresultat ?? 0;
          resultat.set(e.orgnr, {
            orgnr: e.orgnr,
            aar: parseInt(siste.regnskapsperiode?.fraDato?.slice(0, 4) ?? "0"),
            inntekter,
            driftsresultat,
            lonnsomhet: kalkulerLonnsomhet(inntekter, driftsresultat),
          });
        } catch {}
      }));
      setRegnskap(new Map(resultat));
      await new Promise(r => setTimeout(r, 100));
    }

    setLoading(false);
    setHentet(true);
  }

  const counts = useMemo(() => {
    const c = { god: 0, ok: 0, lav: 0, ingen: 0 };
    for (const e of enheter) {
      const r = regnskap.get(e.orgnr);
      c[r?.lonnsomhet ?? "ingen"]++;
    }
    return c;
  }, [enheter, regnskap]);

  const filtrert = useMemo(() => {
    return enheter.filter(e => {
      if (aktivFilter.size === 0) return true;
      const r = regnskap.get(e.orgnr);
      return aktivFilter.has(r?.lonnsomhet ?? "ingen");
    });
  }, [enheter, regnskap, aktivFilter]);

  function toggleFilter(key: string) {
    setAktivFilter(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setPage(0);
      return next;
    });
  }

  const totalPages = Math.ceil(filtrert.length / PAGE_SIZE);
  const slice = filtrert.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return (
    <div>
      {!hentet && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm mb-4">
            Henter regnskapstall for {enheter.length.toLocaleString("nb-NO")} bedrifter fra Brønnøysund
          </p>
          <button
            onClick={hentRegnskap}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Henter ({regnskap.size}/{enheter.length})...</>
            ) : "Hent lønnsomhetstall"}
          </button>
        </div>
      )}

      {(hentet || regnskap.size > 0) && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {(["god", "ok", "lav", "ingen"] as const).map((key) => {
              const cfg = LONNSOMHET_CONFIG[key];
              const aktiv = aktivFilter.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleFilter(key)}
                  className={`p-4 rounded-xl border text-left transition-all ${aktiv ? cfg.bg + " border-2" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"}`}
                >
                  <p className="text-xs text-gray-500 mb-1">{cfg.label}</p>
                  <p className={`text-2xl font-medium ${cfg.color}`}>{counts[key].toLocaleString("nb-NO")}</p>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">{filtrert.length.toLocaleString("nb-NO")} bedrifter</span>
            <div className="flex gap-2">
              <button
                onClick={() => downloadCSV(toCSV(filtrert), `${date}_lonnsomhet.csv`)}
                className="px-3 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >↓ CSV</button>
              <button
                onClick={() => downloadCSV(toCSV(filtrert, true), `${date}_lonnsomhet_meta.csv`)}
                className="px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >↓ Meta</button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-[30%]">Navn</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-[18%]">Poststed</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-[15%]">Inntekter</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-[15%]">Driftsresultat</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-[22%]">Lønnsomhet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {slice.map((e, i) => {
                  const r = regnskap.get(e.orgnr);
                  const cfg = LONNSOMHET_CONFIG[r?.lonnsomhet ?? "ingen"];
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100 truncate" title={e.navn}>{e.navn}</td>
                      <td className="px-4 py-2.5 text-gray-500 truncate">{e.postnummer} {e.poststed}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{r ? fmt(r.inntekter) : "—"}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{r ? fmt(r.driftsresultat) : "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">← Forrige</button>
            <span className="text-sm text-gray-500">Side {page + 1} av {Math.max(1, totalPages)}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">Neste →</button>
          </div>
        </>
      )}
    </div>
  );
}
