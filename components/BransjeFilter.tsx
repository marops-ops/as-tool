"use client";
import { useState } from "react";
import { BRANSJE_GRUPPER } from "@/lib/bransjer";

interface Props {
  tilgjengelige: Set<string>;
  valgte: Set<string>;
  onChange: (valgte: Set<string>) => void;
  theme: {
    bg: string;
    card: string;
    border: string;
    text: string;
    textMuted: string;
  };
}

export default function BransjeFilter({ tilgjengelige, valgte, onChange, theme }: Props) {
  const [hoverGruppe, setHoverGruppe] = useState<string | null>(null);

  const aktiveGrupper = BRANSJE_GRUPPER.filter(g =>
    g.kategorier.some(k => tilgjengelige.has(k))
  );

  function toggleKategori(k: string) {
    const next = new Set(valgte);
    if (next.has(k)) next.delete(k); else next.add(k);
    onChange(next);
  }

  function toggleGruppe(gruppe: typeof BRANSJE_GRUPPER[0]) {
    const aktiveIGruppe = gruppe.kategorier.filter(k => tilgjengelige.has(k));
    const alleValgt = aktiveIGruppe.every(k => valgte.has(k));
    const next = new Set(valgte);
    for (const k of aktiveIGruppe) {
      if (alleValgt) next.delete(k); else next.add(k);
    }
    onChange(next);
  }

  function kunDenne(gruppe: typeof BRANSJE_GRUPPER[0]) {
    const aktiveIGruppe = new Set(gruppe.kategorier.filter(k => tilgjengelige.has(k)));
    onChange(aktiveIGruppe);
  }

  function toggleAlle() {
    const alleValgt = [...tilgjengelige].every(k => valgte.has(k));
    if (alleValgt) onChange(new Set());
    else onChange(new Set([...tilgjengelige]));
  }

  const alleValgt = [...tilgjengelige].every(k => valgte.has(k));
  const antallValgt = [...tilgjengelige].filter(k => valgte.has(k)).length;

  return (
    <div style={{
      backgroundColor: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      padding: "14px 18px",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: theme.text }}>
          Bransjer <span style={{ color: theme.textMuted, fontWeight: 400 }}>({antallValgt} av {tilgjengelige.size} valgt)</span>
        </span>
        <button onClick={toggleAlle} style={{ fontSize: 11, color: "#059669", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
          {alleValgt ? "Fjern alle" : "Velg alle"}
        </button>
      </div>

      <div style={{ columns: 4, columnGap: 24 }}>
        {aktiveGrupper.map(gruppe => {
          const aktiveKat = gruppe.kategorier.filter(k => tilgjengelige.has(k));
          if (!aktiveKat.length) return null;
          const alleIGruppeValgt = aktiveKat.every(k => valgte.has(k));
          const noenIGruppeValgt = aktiveKat.some(k => valgte.has(k));
          const erHover = hoverGruppe === gruppe.label;

          return (
            <div key={gruppe.label} style={{ breakInside: "avoid", marginBottom: 14 }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, cursor: "pointer" }}
                onMouseEnter={() => setHoverGruppe(gruppe.label)}
                onMouseLeave={() => setHoverGruppe(null)}
              >
                <div onClick={() => toggleGruppe(gruppe)} style={{
                  width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${noenIGruppeValgt ? "#059669" : theme.border}`,
                  backgroundColor: alleIGruppeValgt ? "#059669" : noenIGruppeValgt ? "#d1fae5" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {alleIGruppeValgt && <span style={{ color: "white", fontSize: 8, lineHeight: 1 }}>✓</span>}
                  {noenIGruppeValgt && !alleIGruppeValgt && <span style={{ color: "#059669", fontSize: 8, lineHeight: 1 }}>–</span>}
                </div>
                <span onClick={() => toggleGruppe(gruppe)} style={{ fontSize: 10, fontWeight: 700, color: theme.text, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {gruppe.label}
                </span>
                {erHover && (
                  <button
                    onClick={e => { e.stopPropagation(); kunDenne(gruppe); }}
                    style={{ fontSize: 10, color: "#059669", background: "none", border: "none", cursor: "pointer", fontWeight: 500, marginLeft: 4, whiteSpace: "nowrap" }}
                  >
                    kun denne
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 2 }}>
                {aktiveKat.map(k => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                    onClick={() => toggleKategori(k)}>
                    <div style={{
                      width: 11, height: 11, borderRadius: 2, flexShrink: 0,
                      border: `1.5px solid ${valgte.has(k) ? "#059669" : theme.border}`,
                      backgroundColor: valgte.has(k) ? "#059669" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {valgte.has(k) && <span style={{ color: "white", fontSize: 8, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 11, color: valgte.has(k) ? theme.text : theme.textMuted, lineHeight: 1.4 }}>{k}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
