import { NextResponse } from "next/server";
import { clearSessionCookie, deleteCurrentSession } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function POST() {
  await deleteCurrentSession();

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);

  return response;
}
