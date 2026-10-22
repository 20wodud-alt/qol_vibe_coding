import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "Toto",
    status: "ready",
    storage: "browser-local",
    timestamp: new Date().toISOString(),
  });
}
