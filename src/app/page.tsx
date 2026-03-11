import Link from "next/link";

type Session = {
  _id: string;
  goal: string;
  startAt: string;
  durationMin: number;
  capacity: number;
  location: { coordinates: [number, number] };
};

export default async function HomePage() {
  const res = await fetch("http://localhost:3002/api/sessions", {
    cache: "no-store",
  });
  const data = await res.json();

  const sessions: Session[] = data?.sessions ?? [];

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
        <Link href="/create" style={{ fontWeight: 700 }}>
          + Create
        </Link>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {sessions.length === 0 ? (
          <p>No sessions yet. Create one!</p>
        ) : (
          sessions.map((s) => (
            <Link
              key={s._id}
              href={`/sessions/${s._id}`}
              style={{
                display: "block",
                padding: 12,
                border: "1px solid #e5e5e5",
                borderRadius: 12,
              }}
            >
              <div style={{ fontWeight: 800 }}>{s.goal}</div>
              <div style={{ opacity: 0.7, marginTop: 4 }}>
                {new Date(s.startAt).toLocaleString()} • {s.durationMin} min •{" "}
                {s.capacity} people
              </div>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
