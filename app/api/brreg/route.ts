import { NextRequest, NextResponse } from "next/server";

const BASE = "https://data.brreg.no/enhetsregisteret/api/enheter";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const params = new URLSearchParams();

  for (const [k, v] of searchParams.entries()) params.set(k, v);

  params.set("konkurs", "false");
  params.set("underAvvikling", "false");
  if (!params.has("size")) params.set("size", "100");

  const res = await fetch(`${BASE}?${params}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Brreg API feil" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
