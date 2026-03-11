"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const [goal, setGoal] = useState("Study for 3 hours");
  const [startAt, setStartAt] = useState("");
  const [durationMin, setDurationMin] = useState(180);
  const [capacity, setCapacity] = useState(4);
  const [lat, setLat] = useState(49.2827);
  const [lng, setLng] = useState(-123.1207);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: "demo-host",
          goal,
          category: "Study",
          startAt: startAt
            ? new Date(startAt).toISOString()
            : new Date().toISOString(),
          durationMin: Number(durationMin),
          capacity: Number(capacity),
          rules: ["Quiet"],
          location: { coordinates: [Number(lng), Number(lat)] }, // [lng, lat]
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok)
        throw new Error(data.error ?? "Failed to create session");

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Create Session</h1>

      <form
        onSubmit={onSubmit}
        style={{ display: "grid", gap: 12, marginTop: 16 }}
      >
        <label>
          Goal
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              marginTop: 6,
            }}
          />
        </label>

        <label>
          Start time (optional)
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              marginTop: 6,
            }}
          />
        </label>

        <label>
          Duration (minutes)
          <input
            type="number"
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              marginTop: 6,
            }}
          />
        </label>

        <label>
          Capacity
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              marginTop: 6,
            }}
          />
        </label>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <label>
            Latitude
            <input
              type="number"
              value={lat}
              onChange={(e) => setLat(Number(e.target.value))}
              style={{
                display: "block",
                width: "100%",
                padding: 10,
                marginTop: 6,
              }}
            />
          </label>

          <label>
            Longitude
            <input
              type="number"
              value={lng}
              onChange={(e) => setLng(Number(e.target.value))}
              style={{
                display: "block",
                width: "100%",
                padding: 10,
                marginTop: 6,
              }}
            />
          </label>
        </div>

        {error && <p style={{ color: "crimson" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 12,
            fontWeight: 700,
            borderRadius: 10,
            border: "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          {loading ? "Posting..." : "Post Session"}
        </button>
      </form>

      <p style={{ marginTop: 16, opacity: 0.7 }}>
        ※ いまはdemo-host固定。後でGoogleログインを入れて本物のuserIdにします。
      </p>
    </main>
  );
}
