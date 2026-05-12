import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ segment: string }> }
) {
  const allowed = ["ENK", "SMB", "MID", "STOR"];
  const { segment } = await params;
  const key = segment.toUpperCase();

  if (!allowed.includes(key)) {
    return NextResponse.json({ error: "Ukjent segment" }, { status: 400 });
  }

  try {
    const path = join(process.cwd(), "data", `${key}.json`);
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Data ikke tilgjengelig" }, { status: 404 });
  }
}
