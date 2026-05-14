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
  theme: {
    bg: string;
    card: string;
    border: string;
    text: string;
    textMuted: string;
  };
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
  god:  { label: "God lønnsomhet",  color: "#059669" },
  ok:   { label: "Ok lønnsomhet",   color: "#d97706" },
  lav:  { label: "Lav lønnsomhet",  color: "#dc2626" },
  ingen:{ label: "Ingen data",      color: "#9ca3af" },
};

export default function LonnsomhetTab({ enheter, theme }: Props) {
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
      if (next.has(key)) next.delete(key); else next.add(key);
      setPage(0);
      return next;
    });
  }

  const totalPages = Math.ceil(filtrert.length / PAGE_SIZE);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const s = {
    card: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: "1rem" },
    table: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, overflow: "hidden" },
    th: { backgroundColor: theme.bg, color: theme.textMuted, fontSize: 11, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.05em", padding: "10px 16px", textAlign: "left" as const },
    td: { padding: "10px 16px", color: theme.text, fontSize: 14, borderTop: `1px solid ${theme.border}` },
    btnGray: { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 12px", color: theme.text, fontSize: 14, cursor: "pointer" },
  };

  return (
    <div>
      {!hentet && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 16 }}>
            Henter regnskapstall for {enheter.length.toLocaleString("nb-NO")} bedrifter fra Brønnøysund
          </p>
          <button onClick={hentRegnskap} disabled={loading}
            style={{ backgroundColor: "#059669", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer", opacity: loading ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 8 }}>
            {loading ? `Henter (${regnskap.size}/${enheter.length})...` : "Hent lønnsomhetstall"}
          </button>
        </div>
      )}

      {(hentet || regnskap.size > 0) && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {(["god", "ok", "lav", "ingen"] as const).map((key) => {
              const cfg = LONNSOMHET_CONFIG[key];
              const aktiv = aktivFilter.has(key);
              return (
                <div key={key} onClick={() => toggleFilter(key)} style={{
                  ...s.card,
                  cursor: "pointer",
                  border: aktiv ? `2px solid ${cfg.color}` : `1px solid ${theme.border}`,
                }}>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>{cfg.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 500, color: cfg.color }}>{counts[key].toLocaleString("nb-NO")}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: theme.textMuted }}>{filtrert.length.toLocaleString("nb-NO")} bedrifter</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => downloadCSV(toCSV(filtrert), `${date}_lonnsomhet.csv`)}
                style={{ backgroundColor: "#059669", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>↓ CSV</button>
              <button onClick={() => downloadCSV(toCSV(filtrert, true), `${date}_lonnsomhet_meta.csv`)}
                style={{ backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>↓ Meta</button>
            </div>
          </div>

          <div style={s.table}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  {[["Navn","30%"],["Poststed","18%"],["Inntekter","15%"],["Driftsresultat","15%"],["Lønnsomhet","22%"]].map(([h, w]) => (
                    <th key={h} style={{ ...s.th, width: w }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrert.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((e, i) => {
                  const r = regnskap.get(e.orgnr);
                  const cfg = LONNSOMHET_CONFIG[r?.lonnsomhet ?? "ingen"];
                  return (
                    <tr key={i} onMouseEnter={ev => (ev.currentTarget.style.backgroundColor = theme.bg)}
                      onMouseLeave={ev => (ev.currentTarget.style.backgroundColor = "transparent")}>
                      <td style={{ ...s.td, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={e.navn}>{e.navn}</td>
                      <td style={{ ...s.td, color: theme.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.postnummer} {e.poststed}</td>
                      <td style={{ ...s.td, color: theme.textMuted }}>{r ? fmt(r.inntekter) : "—"}</td>
                      <td style={{ ...s.td, color: theme.textMuted }}>{r ? fmt(r.driftsresultat) : "—"}</td>
                      <td style={s.td}><span style={{ fontSize: 13, fontWeight: 500, color: cfg.color }}>{cfg.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              style={{ ...s.btnGray, opacity: page === 0 ? 0.4 : 1 }}>← Forrige</button>
            <span style={{ fontSize: 14, color: theme.textMuted }}>Side {page + 1} av {Math.max(1, totalPages)}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              style={{ ...s.btnGray, opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Neste →</button>
          </div>
        </>
      )}
    </div>
  );
}
