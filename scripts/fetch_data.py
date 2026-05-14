import requests
import json
import os
from datetime import datetime

LASTNED_URL = "https://data.brreg.no/enhetsregisteret/api/enheter/lastned"

FYLKENAVN = {
    "03":"Oslo","11":"Rogaland","15":"Møre og Romsdal","18":"Nordland",
    "31":"Østfold","32":"Akershus","33":"Buskerud","34":"Innlandet",
    "39":"Vestfold","40":"Telemark","42":"Agder","46":"Vestland",
    "50":"Trøndelag","55":"Troms","56":"Finnmark",
}

NACE_KATEGORIER = {
    "01":"Jordbruk","02":"Skogbruk","03":"Fiske","05":"Bergverk",
    "10":"Næringsmiddel","11":"Drikkevarer","13":"Tekstil","14":"Bekledning",
    "16":"Trevarer","17":"Papir","18":"Trykking","19":"Petroleum",
    "20":"Kjemikalier","21":"Legemidler","22":"Gummi/plast","23":"Mineral",
    "24":"Metall","25":"Metallvarer","26":"Elektronikk","27":"Elektrisk utstyr",
    "28":"Maskiner","29":"Motorkjøretøy","30":"Transportmidler","31":"Møbler",
    "32":"Annen industri","33":"Reparasjon","35":"Energi","36":"Vann",
    "37":"Avløp","38":"Avfall","41":"Byggevirksomhet","42":"Anlegg",
    "43":"Spesialisert bygg","45":"Bilhandel","46":"Engros","47":"Detaljhandel",
    "49":"Landtransport","50":"Sjøtransport","51":"Lufttransport","52":"Lagring",
    "53":"Post","55":"Overnatting","56":"Servering","58":"Forlag",
    "59":"Film/TV","60":"Kringkasting","61":"Telekommunikasjon","62":"IT-tjenester",
    "63":"Informasjonstjenester","64":"Finans","65":"Forsikring","66":"Finanshjelp",
    "68":"Eiendom","69":"Juridisk","70":"Ledelseskonsulent","71":"Arkitekt/ingeniør",
    "72":"Forskning","73":"Reklame/marked","74":"Annen faglig","75":"Veterinær",
    "77":"Utleie","78":"Arbeidskraft","79":"Reise","80":"Vakt/sikkerhet",
    "81":"Renhold/eiendomsdrift","82":"Kontortjenester","84":"Offentlig forvaltning",
    "85":"Utdanning","86":"Helse","87":"Pleie","88":"Sosiale tjenester",
    "90":"Kunst","91":"Bibliotek/museum","92":"Lotteri/spill","93":"Sport/fritid",
    "94":"Organisasjoner","95":"Reparasjon forbruker","96":"Andre personlige tjenester",
}

def get_nace_kategori(kode):
    if not kode:
        return "Ukjent"
    return NACE_KATEGORIER.get(kode[:2], "Annet")

def get_fylke(kommunenummer):
    if not kommunenummer:
        return ""
    return FYLKENAVN.get(str(kommunenummer)[:2], str(kommunenummer)[:2])

def last_ned_alle():
    print("Laster ned hele Enhetsregisteret...")
    r = requests.get(LASTNED_URL, timeout=300, stream=True)
    r.raise_for_status()
    total = 0
    enheter = []
    data = r.json()
    enheter = data if isinstance(data, list) else data.get("enheter", data.get("_embedded", {}).get("enheter", []))
    print(f"  ✓ {len(enheter):,} enheter lastet ned")
    return enheter

def parse_enhet(e):
    adr = e.get("forretningsadresse") or {}
    kommnr = str(adr.get("kommunenummer", "") or "")
    fylkekode = kommnr[:2] if kommnr else ""
    ansatte = e.get("antallAnsatte")
    nace = e.get("naeringskode1") or {}
    nace_kode = nace.get("kode", "") if isinstance(nace, dict) else ""
    return {
        "orgnr": str(e.get("organisasjonsnummer", "")),
        "navn": e.get("navn", ""),
        "form": (e.get("organisasjonsform") or {}).get("kode", "") if isinstance(e.get("organisasjonsform"), dict) else str(e.get("organisasjonsform", "")),
        "ansatte": ansatte if ansatte is not None else "",
        "adresse": ", ".join(filter(None, adr.get("adresse", []) or [])),
        "postnummer": str(adr.get("postnummer", "") or ""),
        "poststed": adr.get("poststed", "") or "",
        "fylke": get_fylke(kommnr),
        "fylkekode": fylkekode,
        "nace": nace_kode,
        "kategori": get_nace_kategori(nace_kode),
    }

def main():
    os.makedirs("data", exist_ok=True)
    ts = datetime.now().isoformat()

    alle = last_ned_alle()

    segmenter = {
        "ENK":  {"form": ["ENK"], "fra": None, "til": None},
        "SMB":  {"form": ["AS","ANS","DA","NUF"], "fra": 1, "til": 49},
        "MID":  {"form": ["AS","ANS","NUF"], "fra": 50, "til": 200},
        "STOR": {"form": ["AS","ANS","NUF"], "fra": 201, "til": None},
    }

    print("\nSegmenterer...")
    for key, cfg in segmenter.items():
        resultat = []
        for e in alle:
            if e.get("slettedato"):
                continue
            if e.get("konkurs"):
                continue
            form = (e.get("organisasjonsform") or {}).get("kode", "") if isinstance(e.get("organisasjonsform"), dict) else str(e.get("organisasjonsform", ""))
            if form not in cfg["form"]:
                continue
            ansatte = e.get("antallAnsatte")
            if cfg["fra"] is not None and (ansatte is None or ansatte < cfg["fra"]):
                continue
            if cfg["til"] is not None and ansatte is not None and ansatte > cfg["til"]:
                continue
            resultat.append(parse_enhet(e))

        out = {"oppdatert": ts, "antall": len(resultat), "enheter": resultat}
        path = f"data/{key}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  ✓ {key}: {len(resultat):,} enheter → {path}")

    print("\n✓ Ferdig!")

if __name__ == "__main__":
    main()
