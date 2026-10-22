import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "Toto",
    status: "ready",
    storage: "supabase-postgres",
    timestamp: new Date().toISOString(),
  });
}
