import requests
import json
import time
import os
from datetime import datetime

BASE_URL = "https://data.brreg.no/enhetsregisteret/api/enheter"

FYLKE_KOMMUNER = {
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
}

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

def fetch_kommune(orgformer, kommunenummer, ansatte_fra=None, ansatte_til=None):
    results = []
    page = 0
    while True:
        params = {
            "organisasjonsform": ",".join(orgformer),
            "kommunenummer": kommunenummer,
            "konkurs": "false",
            "underAvvikling": "false",
            "size": 100,
            "page": page,
        }
        retries = 3
        data = None
        while retries > 0:
            try:
                r = requests.get(BASE_URL, params=params, timeout=30)
                if r.status_code == 400:
                    return results
                r.raise_for_status()
                data = r.json()
                break
            except Exception as e:
                retries -= 1
                if retries == 0:
                    print(f"\n    ⚠ Gir opp {kommunenummer}: {e}")
                    return results
                print(f"\n    ↺ Retry {kommunenummer}...", end="", flush=True)
                time.sleep(3)

        items = data.get("_embedded", {}).get("enheter", [])
        for e in items:
            adr = e.get("forretningsadresse") or {}
            kommnr = adr.get("kommunenummer", "")
            fylkekode = kommnr[:2] if kommnr else ""
            ansatte = e.get("antallAnsatte")

            if ansatte_fra is not None and (ansatte is None or ansatte < ansatte_fra):
                continue
            if ansatte_til is not None and ansatte is not None and ansatte > ansatte_til:
                continue

            nace = e.get("naeringskode1") or {}
            nace_kode = nace.get("kode", "")

            results.append({
                "orgnr": e.get("organisasjonsnummer", ""),
                "navn": e.get("navn", ""),
                "form": (e.get("organisasjonsform") or {}).get("kode", ""),
                "ansatte": ansatte if ansatte is not None else "",
                "adresse": ", ".join(filter(None, adr.get("adresse", []))),
                "postnummer": adr.get("postnummer", ""),
                "poststed": adr.get("poststed", ""),
                "fylke": FYLKENAVN.get(fylkekode, fylkekode),
                "fylkekode": fylkekode,
                "nace": nace_kode,
                "kategori": get_nace_kategori(nace_kode),
            })

        total_pages = data.get("page", {}).get("totalPages", 1)
        if page + 1 >= total_pages:
            break
        page += 1
        time.sleep(0.1)

    return results

def fetch_segment(key, orgformer, ansatte_fra=None, ansatte_til=None):
    print(f"\n▶ {key}")
    alle = []
    seen = set()

    for fylkekode, kommuner in FYLKE_KOMMUNER.items():
        fylkenavn = FYLKENAVN.get(fylkekode, fylkekode)
        print(f"  {fylkenavn}...", end="", flush=True)
        fylke_count = 0
        for kommnr in kommuner:
            enheter = fetch_kommune(orgformer, kommnr, ansatte_fra, ansatte_til)
            for e in enheter:
                if e["orgnr"] not in seen:
                    seen.add(e["orgnr"])
                    alle.append(e)
                    fylke_count += 1
            time.sleep(0.08)
        print(f" {fylke_count}")

    print(f"  ✓ Totalt: {len(alle)}")
    return alle

def main():
    os.makedirs("data", exist_ok=True)
    ts = datetime.now().isoformat()

    segments = [
        ("ENK",  ["ENK"],                 None, None),
        ("SMB",  ["AS","ANS","DA","NUF"],  1,   49),
        ("MID",  ["AS","ANS","NUF"],       50,  200),
        ("STOR", ["AS","ANS","NUF"],       201, None),
    ]

    for key, orgformer, fra, til in segments:
        path = f"data/{key}.json"
        if os.path.exists(path):
            print(f"\n⏭  {key} — allerede lagret, hopper over")
            continue
        data = fetch_segment(key, orgformer, fra, til)
        out = {"oppdatert": ts, "antall": len(data), "enheter": data}
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  → {path} lagret")

    print("\n✓ Ferdig!")

if __name__ == "__main__":
    main()
