import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

// Vancouver downtown, 5km radius, sessions starting within 3 days
const DEFAULT_QUERY =
  "lat=49.2827&lng=-123.1207&radiusKm=5&startsWithinMin=4320&limit=20";

type Session = {
  _id: string;
  title: string;
  startAt: string;
  endAt: string;
  publicAreaLabel?: string;
};

type SessionItem = {
  session: Session;
  distanceMeters: number;
};

async function fetchSessions(): Promise<SessionItem[]> {
  const res = await fetch(`${API_BASE}/sessions?${DEFAULT_QUERY}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `API error ${res.status}`);
  }
  const data = await res.json();
  return data?.items ?? [];
}

export default async function HomePage() {
  let items: SessionItem[] = [];
  let errorMsg = "";

  try {
    items = await fetchSessions();
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Failed to load sessions.";
  }

  return (
    <main style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Event Buddy Map</h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/notifications" style={{ fontSize: 14, color: '#6b7280' }}>Notifications</Link>
          <Link href="/sessions/new" style={{ fontWeight: 700 }}>+ Create</Link>
        </div>
      </div>

      {errorMsg && (
        <p style={{ marginTop: 16, color: "#ef4444" }}>Error: {errorMsg}</p>
      )}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {items.length === 0 && !errorMsg ? (
          <p>No sessions yet. Create one!</p>
        ) : (
          items.map(({ session, distanceMeters }) => (
            <Link
              key={session._id}
              href={`/sessions/${session._id}`}
              style={{
                display: "block",
                padding: 12,
                border: "1px solid #e5e5e5",
                borderRadius: 12,
              }}
            >
              <div style={{ fontWeight: 800 }}>{session.title}</div>
              <div style={{ opacity: 0.7, marginTop: 4 }}>
                {new Date(session.startAt).toLocaleString("en-CA")} •{" "}
                {session.publicAreaLabel ?? ""} •{" "}
                {Math.round(distanceMeters)}m
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
