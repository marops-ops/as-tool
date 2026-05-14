import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgnr: string }> }
) {
  const { orgnr } = await params;
  const res = await fetch(
    `https://data.brreg.no/regnskapsregisteret/regnskap/${orgnr}`,
    { headers: { Accept: "application/json" }, next: { revalidate: 86400 } }
  );
  if (!res.ok) return NextResponse.json([], { status: 200 });
  const data = await res.json();
  return NextResponse.json(data);
}
