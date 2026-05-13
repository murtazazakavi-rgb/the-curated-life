import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ error: "Google authentication is disabled." }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "Google authentication is disabled." }, { status: 404 });
}
