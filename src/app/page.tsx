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
    <main>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Nearby Sessions</h1>

      {errorMsg && (
        <p style={{ color: "#ef4444" }}>Error: {errorMsg}</p>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {items.length === 0 && !errorMsg ? (
          <p>No sessions yet. Create one!</p>
        ) : (
          items.map(({ session, distanceMeters }) => (
            <Link
              key={session._id}
              href={`/sessions/${session._id}`}
              style={{
                display: "block",
                padding: '16px 18px',
                background: '#fff',
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{session.title}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span>{new Date(session.startAt).toLocaleString("en-CA")}</span>
                {session.publicAreaLabel && <><span>·</span><span>{session.publicAreaLabel}</span></>}
                <span>·</span><span>{Math.round(distanceMeters)}m away</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
