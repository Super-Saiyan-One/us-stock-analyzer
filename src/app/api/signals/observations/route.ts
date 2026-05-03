import { NextResponse } from "next/server";
import { getSignalObservations, getForwardReturns } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const signalId = searchParams.get("signalId") || undefined;
  const symbol = searchParams.get("symbol") || undefined;
  const limit = Math.min(Number(searchParams.get("limit") || "100"), 500);

  const observations = getSignalObservations(signalId, symbol, limit);

  const enriched = observations.map((obs) => {
    const fwd = getForwardReturns(obs.symbol, obs.observedAt, obs.priceAtSignal);
    return {
      ...obs,
      forwardReturn1D: fwd.return1D,
      forwardReturn5D: fwd.return5D,
      forwardReturn20D: fwd.return20D,
    };
  });

  return NextResponse.json(enriched);
}
