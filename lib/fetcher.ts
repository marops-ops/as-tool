import { Enhet } from "./types";
import { FYLKER } from "./segments";

const FYLKE_KOMMUNER: Record<string, string[]> = {
  "03": ["0301"],
  "11": ["1101","1103","1106","1108","1111","1112","1114","1119","1120","1121","1122","1124","1127","1130","1133","1134","1135","1144","1145","1146","1149","1151","1160"],
  "15": ["1505","1506","1507","1511","1514","1515","1516","1517","1519","1520","1525","1528","1531","1532","1535","1539","1547","1554","1557","1560","1563","1566","1573","1576","1577","1578","1579"],
  "18": ["1804","1806","1811","1813","1815","1816","1818","1820","1822","1824","1825","1826","1827","1828","1832","1833","1834","1835","1836","1837","1838","1839","1840","1841","1845","1848","1851","1853","1856","1857","1859","1860","1865","1866","1867","1868","1870","1871","1874","1875"],
  "31": ["3101","3103","3105","3107","3109","3110","3112","3114"],
  "32": ["3201","3203","3205","3207","3209","3210","3212","3214","3216","3218","3220","3222","3224"],
  "33": ["3301","3303","3305","3307","3309","3310","3312","3314","3316"],
  "34": ["3401","3403","3405","3407","3411","3412","3413","3414","3416","3417","3418","3419","3420","3421","3422","3423","3424","3425","3426","3427","3428","3429","3430","3431","3432","3433","3434","3435","3436","3437","3438","3439","3440","3441","3442","3443","3446","3447","3448","3449","3450","3451","3452","3453","3454"],
  "39": ["3901","3903","3905","3907"],
  "40": ["4001","4003","4005","4007","4009","4010","4012","4014","4016","4018"],
  "42": ["4201","4202","4203","4204","4205","4206","4207","4208","4209","4210","4211","4212","4213","4214","4215","4216","4217","4218","4219","4220","4221","4222","4223","4224","4225","4226"],
  "46": ["4601","4602","4611","4612","4613","4614","4615","4616","4617","4618","4619","4620","4621","4622","4623","4624","4625","4626","4627","4628","4629","4630","4631","4632","4633","4634","4635","4636","4637","4638","4639","4640","4641","4642","4643","4644","4645","4646","4647","4648","4649","4650","4651"],
  "50": ["5001","5006","5007","5014","5020","5021","5022","5025","5026","5027","5028","5029","5031","5032","5033","5034","5035","5036","5037","5038","5041","5042","5043","5044","5045","5046","5047","5049","5052","5053","5054","5055","5056","5057","5058","5059","5060","5061"],
  "55": ["5501","5503","5510","5512","5514","5516","5518","5520","5522","5524","5526","5528","5530","5532","5534","5536","5538","5540","5542","5544"],
  "56": ["5601","5603","5605","5607","5610","5612","5614","5616","5618","5620","5622","5624","5626","5628","5630"],
};

async function fetchPage(params: URLSearchParams): Promise<any> {
  const res = await fetch(`/api/brreg?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchAllPages(
  baseParams: URLSearchParams,
  ansatteFra?: number,
  ansatteTil?: number
): Promise<Enhet[]> {
  const results: Enhet[] = [];
  let page = 0;

  while (true) {
    const p = new URLSearchParams(baseParams);
    p.set("page", String(page));
    const data = await fetchPage(p);
    const items = data?._embedded?.enheter ?? [];

    for (const e of items) {
      const adr = e.forretningsadresse ?? {};
      const postnr: string = adr.postnummer ?? "";
      const fylkekode = postnr.slice(0, 2);
      const ansatte: number | null = e.antallAnsatte ?? null;

      if (ansatteFra != null && (ansatte === null || ansatte < ansatteFra)) continue;
      if (ansatteTil != null && ansatte !== null && ansatte > ansatteTil) continue;

      results.push({
        orgnr: e.organisasjonsnummer ?? "",
        navn: e.navn ?? "",
        form: e.organisasjonsform?.kode ?? "",
        ansatte: ansatte ?? "",
        adresse: (adr.adresse ?? []).join(", "),
        postnummer: postnr,
        poststed: adr.poststed ?? "",
        fylke: FYLKER[fylkekode] ?? fylkekode,
        fylkekode,
      });
    }

    const totalPages: number = data?.page?.totalPages ?? 1;
    if (page + 1 >= totalPages) break;
    page++;
    await new Promise((r) => setTimeout(r, 120));
  }

  return results;
}

export async function fetchSegment(
  orgformer: string[],
  ansatteFra?: number,
  ansatteTil?: number,
  onProgress?: (label: string, done: number, total: number) => void
): Promise<Enhet[]> {
  const allResults: Enhet[] = [];
  const seen = new Set<string>();
  const fylker = Object.entries(FYLKE_KOMMUNER);
  const total = fylker.length;

  for (let i = 0; i < total; i++) {
    const [fylkekode, kommuner] = fylker[i];
    const fylkenavn = FYLKER[fylkekode] ?? fylkekode;

    if (onProgress) onProgress(fylkenavn, i, total);

    for (const kommnr of kommuner) {
      const params = new URLSearchParams({
        organisasjonsform: orgformer.join(","),
        kommunenummer: kommnr,
        size: "100",
      });

      try {
        const enheter = await fetchAllPages(params, ansatteFra, ansatteTil);
        for (const e of enheter) {
          if (!seen.has(e.orgnr)) {
            seen.add(e.orgnr);
            allResults.push(e);
          }
        }
      } catch (err) {
        console.warn(`Feil for kommune ${kommnr}:`, err);
      }

      await new Promise((r) => setTimeout(r, 80));
    }
  }

  if (onProgress) onProgress("Ferdig", total, total);
  return allResults;
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
  const headers = ["orgnr", "navn", "form", "ansatte", "adresse", "postnummer", "poststed", "fylke"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      headers.map((k) => `"${String(r[k as keyof Enhet] ?? "").replace(/"/g, '""')}"`).join(",")
    );
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
