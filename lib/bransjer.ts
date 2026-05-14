export interface BransjeGruppe {
  label: string;
  kategorier: string[];
}

export const BRANSJE_GRUPPER: BransjeGruppe[] = [
  {
    label: "Produksjon & industri",
    kategorier: ["Næringsmiddel","Drikkevarer","Tekstil","Bekledning","Trevarer","Papir","Trykking","Petroleum","Kjemikalier","Legemidler","Gummi/plast","Mineral","Metall","Metallvarer","Elektronikk","Elektrisk utstyr","Maskiner","Motorkjøretøy","Transportmidler","Møbler","Annen industri","Reparasjon","Energi","Vann","Avløp","Avfall"],
  },
  {
    label: "Bygg & eiendom",
    kategorier: ["Byggevirksomhet","Anlegg","Spesialisert bygg","Eiendom"],
  },
  {
    label: "Handel & transport",
    kategorier: ["Bilhandel","Engros","Detaljhandel","Landtransport","Sjøtransport","Lufttransport","Lagring","Post"],
  },
  {
    label: "Teknologi & media",
    kategorier: ["IT-tjenester","Informasjonstjenester","Telekommunikasjon","Film/TV","Kringkasting","Forlag"],
  },
  {
    label: "Finans & juss",
    kategorier: ["Finans","Forsikring","Finanshjelp","Juridisk","Ledelseskonsulent"],
  },
  {
    label: "Helse & omsorg",
    kategorier: ["Helse","Pleie","Sosiale tjenester","Veterinær"],
  },
  {
    label: "Mat & overnatting",
    kategorier: ["Servering","Overnatting"],
  },
  {
    label: "Faglig & marked",
    kategorier: ["Reklame/marked","Forskning","Arkitekt/ingeniør","Annen faglig","Kontortjenester","Arbeidskraft","Utleie","Renhold/eiendomsdrift","Vakt/sikkerhet","Reise"],
  },
  {
    label: "Offentlig & org",
    kategorier: ["Offentlig forvaltning","Utdanning","Organisasjoner","Bibliotek/museum","Kunst","Sport/fritid","Lotteri/spill","Andre personlige tjenester","Reparasjon forbruker"],
  },
  {
    label: "Primærnæring",
    kategorier: ["Jordbruk","Skogbruk","Fiske","Bergverk"],
  },
  {
    label: "Annet",
    kategorier: ["Annet","Ukjent"],
  },
];

export function getAlleKategorier(): string[] {
  return BRANSJE_GRUPPER.flatMap(g => g.kategorier);
}
