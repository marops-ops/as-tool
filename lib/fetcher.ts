import { Enhet } from "./types";

export async function fetchSegment(): Promise<Enhet[]> {
  return [];
}

export function toCSV(rows: Enhet[], meta = false): string {
  if (meta) {
    const headers = ["fn", "ln", "company", "zip", "ct", "st", "country", "street"];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(
        ["", "", r.navn, r.postnummer, r.poststed, r.fylke, "NO", r.adresse]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
    }
    return lines.join("\n");
  }
  const headers = ["orgnr", "navn", "form", "ansatte", "adresse", "postnummer", "poststed", "fylke", "nace", "kategori"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      headers.map((k) => `"${String(r[k as keyof Enhet] ?? "").replace(/"/g, '""')}"`).join(",")
    );
  }
  return lines.join("\n");
}

export function toLinkedInCSV(rows: Enhet[]): string {
  const headers = ["companyname"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(`"${r.navn.replace(/"/g, '""')}"`);
  }
  return lines.join("\n");
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
