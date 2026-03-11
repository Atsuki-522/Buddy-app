import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Session } from "@/models/Session";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    // MVP: 認証前なので hostId は仮で受け取る
    const created = await Session.create({
      hostId: body.hostId ?? "demo-host",
      goal: body.goal,
      category: body.category ?? "",
      startAt: new Date(body.startAt),
      durationMin: body.durationMin,
      capacity: body.capacity,
      rules: body.rules ?? [],
      location: {
        type: "Point",
        coordinates: body.location?.coordinates, // [lng, lat]
      },
      status: "open",
    });

    return NextResponse.json({ ok: true, session: created }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDB();

    const sessions = await Session.find().sort({ startAt: 1 }).limit(50);

    return NextResponse.json({ ok: true, sessions });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
