"use client";
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
  const aktiveGrupper = BRANSJE_GRUPPER.filter(g =>
    g.kategorier.some(k => tilgjengelige.has(k))
  );

  function toggleKategori(k: string) {
    const next = new Set(valgte);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onChange(next);
  }

  function toggleGruppe(gruppe: typeof BRANSJE_GRUPPER[0]) {
    const aktiveIGruppe = gruppe.kategorier.filter(k => tilgjengelige.has(k));
    const alleValgt = aktiveIGruppe.every(k => valgte.has(k));
    const next = new Set(valgte);
    for (const k of aktiveIGruppe) {
      if (alleValgt) next.delete(k);
      else next.add(k);
    }
    onChange(next);
  }

  function toggleAlle() {
    const alle = new Set([...tilgjengelige]);
    const alleValgt = [...tilgjengelige].every(k => valgte.has(k));
    if (alleValgt) onChange(new Set());
    else onChange(alle);
  }

  const alleValgt = [...tilgjengelige].every(k => valgte.has(k));
  const antallValgt = [...tilgjengelige].filter(k => valgte.has(k)).length;

  return (
    <div style={{
      backgroundColor: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      padding: "16px 20px",
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: theme.text }}>
          Bransjer <span style={{ color: theme.textMuted, fontWeight: 400 }}>({antallValgt} av {tilgjengelige.size} valgt)</span>
        </span>
        <button onClick={toggleAlle} style={{
          fontSize: 12, color: "#059669", background: "none", border: "none", cursor: "pointer", fontWeight: 500,
        }}>
          {alleValgt ? "Fjern alle" : "Velg alle"}
        </button>
      </div>

      {/* Grupper */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px 32px" }}>
        {aktiveGrupper.map(gruppe => {
          const aktiveKat = gruppe.kategorier.filter(k => tilgjengelige.has(k));
          if (!aktiveKat.length) return null;
          const alleIGruppeValgt = aktiveKat.every(k => valgte.has(k));
          const noenIGruppeValgt = aktiveKat.some(k => valgte.has(k));

          return (
            <div key={gruppe.label}>
              {/* Gruppenavn med checkbox */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}
                onClick={() => toggleGruppe(gruppe)}>
                <div style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${alleIGruppeValgt ? "#059669" : noenIGruppeValgt ? "#059669" : theme.border}`,
                  backgroundColor: alleIGruppeValgt ? "#059669" : noenIGruppeValgt ? "#d1fae5" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {alleIGruppeValgt && <span style={{ color: "white", fontSize: 10, lineHeight: 1 }}>✓</span>}
                  {noenIGruppeValgt && !alleIGruppeValgt && <span style={{ color: "#059669", fontSize: 10, lineHeight: 1 }}>–</span>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: theme.text, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {gruppe.label}
                </span>
              </div>

              {/* Kategorier */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {aktiveKat.map(k => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                    onClick={() => toggleKategori(k)}>
                    <div style={{
                      width: 13, height: 13, borderRadius: 3, flexShrink: 0,
                      border: `1.5px solid ${valgte.has(k) ? "#059669" : theme.border}`,
                      backgroundColor: valgte.has(k) ? "#059669" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {valgte.has(k) && <span style={{ color: "white", fontSize: 9, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: valgte.has(k) ? theme.text : theme.textMuted }}>
                      {k}
                    </span>
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
