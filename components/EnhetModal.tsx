"use client";
import { useEffect, useState } from "react";
import { Enhet } from "@/lib/types";

interface Regnskap {
  aar: number;
  sumDriftsinntekter?: number;
  driftsresultat?: number;
  aarsresultat?: number;
  sumEiendeler?: number;
}

interface Props {
  enhet: Enhet | null;
  onClose: () => void;
}

function lonnsomhet(r: Regnskap): { label: string; color: string } {
  if (!r.sumDriftsinntekter || r.sumDriftsinntekter === 0) return { label: "Ingen data", color: "text-gray-400" };
  const margin = (r.driftsresultat ?? 0) / r.sumDriftsinntekter;
  if (margin > 0.1) return { label: "God lønnsomhet", color: "text-emerald-600" };
  if (margin >= 0) return { label: "Ok lønnsomhet", color: "text-amber-500" };
  return { label: "Lav lønnsomhet", color: "text-red-500" };
}

function fmt(n?: number) {
  if (n == null) return "—";
  return (n / 1000).toLocaleString("nb-NO", { maximumFractionDigits: 0 }) + " k";
}

export default function EnhetModal({ enhet, onClose }: Props) {
  const [regnskap, setRegnskap] = useState<Regnskap[]>([]);
  const [roller, setRoller] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enhet) return;
    setRegnskap([]);
    setRoller([]);
    setLoading(true);

    async function hent() {
      try {
        const [regRes, rolleRes] = await Promise.all([
          fetch(`https://data.brreg.no/regnskapsregisteret/regnskap/${enhet!.orgnr}`),
          fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${enhet!.orgnr}/roller`),
        ]);

        if (regRes.ok) {
          const data = await regRes.json();
          const items = Array.isArray(data) ? data : [data];
          const parsed: Regnskap[] = items.map((r: any) => ({
            aar: r.regnskapsperiode?.fraDato?.slice(0, 4),
            sumDriftsinntekter: r.resultatregnskapResultat?.driftsresultat?.driftsinntekter?.sumDriftsinntekter,
            driftsresultat: r.resultatregnskapResultat?.driftsresultat?.driftsresultat,
            aarsresultat: r.resultatregnskapResultat?.aarsresultat,
            sumEiendeler: r.eiendeler?.sumEiendeler,
          })).sort((a: Regnskap, b: Regnskap) => b.aar - a.aar).slice(0, 3);
          setRegnskap(parsed);
        }

        if (rolleRes.ok) {
          const data = await rolleRes.json();
          const grupper = data.rollegrupper ?? [];
          const dagligLedere: string[] = [];
          for (const g of grupper) {
            for (const r of g.roller ?? []) {
              if (r.type?.kode === "DAGL") {
                const p = r.person?.navn;
                if (p) dagligLedere.push(`${p.fornavn ?? ""} ${p.etternavn ?? ""}`.trim());
              }
            }
          }
          setRoller(dagligLedere);
        }
      } catch {}
      setLoading(false);
    }

    hent();
  }, [enhet]);

  if (!enhet) return null;

  const sisteRegnskap = regnskap[0];
  const lstat = sisteRegnskap ? lonnsomhet(sisteRegnskap) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{enhet.navn}</h2>
          <p className="text-sm text-gray-500">{enhet.orgnr} · {enhet.form} · {enhet.kategori}</p>
          <p className="text-sm text-gray-500">{enhet.adresse}, {enhet.postnummer} {enhet.poststed}</p>
        </div>

        {roller.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Daglig leder</p>
            {roller.map((r, i) => <p key={i} className="text-sm font-medium text-gray-900 dark:text-gray-100">{r}</p>)}
          </div>
        )}

        {loading && <p className="text-sm text-gray-400 text-center py-4">Henter regnskapstall...</p>}

        {!loading && sisteRegnskap && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Regnskap {sisteRegnskap.aar}</p>
              {lstat && <span className={`text-sm font-medium ${lstat.color}`}>{lstat.label}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Driftsinntekter", val: fmt(sisteRegnskap.sumDriftsinntekter) },
                { label: "Driftsresultat", val: fmt(sisteRegnskap.driftsresultat) },
                { label: "Årsresultat", val: fmt(sisteRegnskap.aarsresultat) },
                { label: "Sum eiendeler", val: fmt(sisteRegnskap.sumEiendeler) },
              ].map((m) => (
                <div key={m.label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">{m.label}</p>
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">{m.val}</p>
                </div>
              ))}
            </div>
            {regnskap.length > 1 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Historikk</p>
                <div className="space-y-1">
                  {regnskap.slice(1).map((r) => (
                    <div key={r.aar} className="flex justify-between text-sm">
                      <span className="text-gray-500">{r.aar}</span>
                      <span className="text-gray-700 dark:text-gray-300">Inntekter: {fmt(r.sumDriftsinntekter)}</span>
                      <span className={lonnsomhet(r).color}>{lonnsomhet(r).label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !sisteRegnskap && (
          <p className="text-sm text-gray-400 text-center py-4">Ingen regnskapstall tilgjengelig</p>
        )}
      </div>
    </div>
  );
}
