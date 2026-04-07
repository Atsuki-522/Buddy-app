'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { apiFetch } from '@/lib/api';

declare global {
  interface Window {
    cloudinary: {
      openUploadWidget: (
        options: object,
        cb: (error: unknown, result: { event: string; info: { secure_url: string } }) => void
      ) => void;
    };
  }
}

type User = {
  _id: string;
  displayName: string;
  email: string;
  reliabilityScore: number;
  photoUrl?: string | null;
  bio?: string;
};

type Session = {
  _id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
};

type PendingRequest = {
  _id: string;
  sessionId: string;
  message?: string;
  createdAt: string;
  session: Session | null;
};

type IncomingRequest = {
  _id: string;
  sessionId: string;
  message?: string;
  session: { title: string } | null;
  requester: { displayName: string } | null;
};

const now = Date.now();
function byClosest<T extends { startAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    Math.abs(new Date(a.startAt).getTime() - now) - Math.abs(new Date(b.startAt).getTime() - now)
  );
}
function upcoming(items: Session[]): Session[] {
  return items.filter((s) => new Date(s.endAt).getTime() >= now);
}
function pendingByClosest(items: PendingRequest[]): PendingRequest[] {
  return [...items].sort((a, b) => {
    const ta = a.session ? Math.abs(new Date(a.session.startAt).getTime() - now) : Infinity;
    const tb = b.session ? Math.abs(new Date(b.session.startAt).getTime() - now) : Infinity;
    return ta - tb;
  });
}

const itemStyle: React.CSSProperties = {
  display: 'block',
  textDecoration: 'none',
  color: 'inherit',
  padding: '13px 0',
  borderBottom: '1px solid #6b7280',
};
const emptyStyle: React.CSSProperties = { fontSize: 13, color: '#9ca3af' };

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hosted, setHosted] = useState<Session[]>([]);
  const [joined, setJoined] = useState<Session[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [incomingError, setIncomingError] = useState('');
  const [hostedPast, setHostedPast] = useState<Session[]>([]);
  const [joinedPast, setJoinedPast] = useState<Session[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [bio, setBio] = useState('');
  const [bioEdit, setBioEdit] = useState(false);
  const [bioSaving, setBioSaving] = useState(false);
  const [bioError, setBioError] = useState('');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://upload-widget.cloudinary.com/global/all.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  function handleUpload() {
    setUploadError('');
    window.cloudinary.openUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local'],
        multiple: false,
        cropping: true,
        croppingAspectRatio: 1,
        folder: 'profiles',
      },
      async (error, result) => {
        if (error) { setUploadError('Upload failed.'); return; }
        if (result.event === 'success') {
          const url = result.info.secure_url;
          try {
            await apiFetch('/auth/profile', { method: 'PATCH', body: { photoUrl: url } });
            setPhotoUrl(url);
          } catch {
            setUploadError('Failed to save photo.');
          }
        }
      }
    );
  }

  async function handleSaveBio() {
    setBioError('');
    setBioSaving(true);
    try {
      await apiFetch('/auth/profile', { method: 'PATCH', body: { bio } });
      setBioEdit(false);
    } catch {
      setBioError('Failed to save bio.');
    } finally {
      setBioSaving(false);
    }
  }

  async function handleLogout() {
    localStorage.removeItem('token');
    await signOut({ callbackUrl: '/login' });
  }

  async function handleDeleteHosted(id: string) {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    setDeleteError('');
    try {
      await apiFetch(`/sessions/${id}`, { method: 'DELETE' });
      setHosted((prev) => prev.filter((s) => s._id !== id));
    } catch {
      setDeleteError('Failed to delete session.');
    }
  }

  async function handleIncomingAction(rid: string, action: 'approve' | 'deny') {
    setIncomingError('');
    try {
      await apiFetch(`/join-requests/${rid}/${action}`, { method: 'PATCH' });
      setIncoming((prev) => prev.filter((r) => r._id !== rid));
    } catch {
      setIncomingError(`Failed to ${action} request.`);
    }
  }

  useEffect(() => {
    Promise.all([
      apiFetch<{ user: User }>('/auth/me'),
      apiFetch<{ items: Session[] }>('/sessions/mine?role=HOST'),
      apiFetch<{ items: Session[] }>('/sessions/mine?role=MEMBER'),
      apiFetch<{ items: PendingRequest[] }>('/join-requests/mine'),
      apiFetch<{ items: IncomingRequest[] }>('/me/incoming-requests'),
      apiFetch<{ hostedPast: Session[]; joinedPast: Session[] }>('/me/history'),
    ])
      .then(([meRes, hostedRes, joinedRes, pendingRes, incomingRes, historyRes]) => {
        setUser(meRes.user);
        setPhotoUrl(meRes.user.photoUrl ?? null);
        setBio(meRes.user.bio ?? '');
        setHosted(hostedRes.items);
        setJoined(joinedRes.items);
        setPending(pendingRes.items);
        setIncoming(incomingRes.items);
        setHostedPast(historyRes.hostedPast);
        setJoinedPast(historyRes.joinedPast);
      })
      .catch(() => setErrorMsg('Failed to load account data. Please log in.'));
  }, []);

  if (errorMsg) {
    return (
      <main style={{ maxWidth: 560 }}>
        <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 8 }}>{errorMsg}</p>
        <Link href="/login" style={{ fontSize: 14, color: '#3b82f6', textDecoration: 'underline' }}>Go to Login</Link>
      </main>
    );
  }

  if (!user) {
    return <main><p style={{ color: '#6b7280', fontSize: 14 }}>Loading...</p></main>;
  }

  return (
    <main>
      <style>{`
        .me-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          margin-top: 28px;
        }
        @media (min-width: 640px) {
          .me-grid {
            grid-template-columns: repeat(3, 1fr);
            align-items: start;
          }
        }
      `}</style>

      <div style={{ paddingBottom: 20, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 20, position: 'relative' }}>
        <button
          onClick={handleLogout}
          style={{ position: 'absolute', top: 0, right: 0, padding: '5px 14px', borderRadius: 6, background: '#f3f4f6', color: '#374151', fontWeight: 600, border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 12 }}
        >
          Log out
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Profile"
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }}
            />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f3f4f6', border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#9ca3af' }}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            onClick={handleUpload}
            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 500 }}
          >
            {photoUrl ? 'Change' : 'Add photo'}
          </button>
          {uploadError && <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{uploadError}</p>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{user.displayName}</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>{user.email}</p>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Reliability score: <strong style={{ color: '#374151' }}>{user.reliabilityScore}</strong></p>

          {/* Bio */}
          {bioEdit ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="Write a short introduction..."
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={handleSaveBio}
                  disabled={bioSaving}
                  style={{ padding: '4px 14px', borderRadius: 6, background: bioSaving ? '#9ca3af' : '#111827', color: '#fff', fontWeight: 600, border: 'none', cursor: bioSaving ? 'not-allowed' : 'pointer', fontSize: 12 }}
                >
                  {bioSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setBioEdit(false); setBio(user.bio ?? ''); }}
                  style={{ padding: '4px 14px', borderRadius: 6, background: '#f3f4f6', color: '#374151', fontWeight: 600, border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 12 }}
                >
                  Cancel
                </button>
                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>{bio.length}/200</span>
              </div>
              {bioError && <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{bioError}</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <p style={{ fontSize: 13, color: bio ? '#374151' : '#9ca3af', margin: 0, flex: 1 }}>
                {bio || 'No bio yet.'}
              </p>
              <button
                onClick={() => setBioEdit(true)}
                style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 500, flexShrink: 0 }}
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="me-grid">
        {/* Hosted sessions */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Hosted · {upcoming(hosted).length}
          </p>
          {deleteError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>{deleteError}</p>}
          {upcoming(hosted).length === 0 ? (
            <p style={emptyStyle}>No upcoming hosted sessions.</p>
          ) : (
            byClosest(upcoming(hosted)).map((s) => (
              <div key={s._id} style={{ ...itemStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link href={`/sessions/${s._id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    {new Date(s.startAt).toLocaleString('en-CA')} · {s.status}
                  </div>
                </Link>
                <div style={{ display: 'flex', gap: 6, marginLeft: 10, flexShrink: 0 }}>
                  <button
                    onClick={() => router.push(`/sessions/${s._id}`)}
                    style={{ padding: '3px 10px', borderRadius: 5, background: '#111827', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 12 }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteHosted(s._id)}
                    style={{ padding: '3px 10px', borderRadius: 5, background: '#6b7280', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 12 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pending join requests */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Pending · {pending.length}
          </p>
          {pending.length === 0 ? (
            <p style={emptyStyle}>No pending requests.</p>
          ) : (
            pendingByClosest(pending).map((r) => (
              <Link key={r._id} href={`/sessions/${r.sessionId}`} style={itemStyle}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{r.session?.title ?? r.sessionId}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                  {r.session ? new Date(r.session.startAt).toLocaleString('en-CA') : ''}
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Joined sessions */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Joined · {upcoming(joined).length}
          </p>
          {upcoming(joined).length === 0 ? (
            <p style={emptyStyle}>No upcoming joined sessions.</p>
          ) : (
            byClosest(upcoming(joined)).map((s) => (
              <Link key={s._id} href={`/sessions/${s._id}`} style={itemStyle}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{s.title}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                  {new Date(s.startAt).toLocaleString('en-CA')} · {s.status}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Incoming join requests */}
      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Incoming Requests · {incoming.length}
        </p>
        {incomingError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>{incomingError}</p>}
        {incoming.length === 0 ? (
          <p style={emptyStyle}>No incoming requests.</p>
        ) : (
          incoming.map((r) => (
            <div key={r._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{r.session?.title ?? r.sessionId}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 1 }}>
                  {r.requester?.displayName ?? <em style={{ color: '#9ca3af' }}>Unknown user</em>}
                </div>
                {r.message && <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{r.message}</div>}
              </div>
              <button
                onClick={() => handleIncomingAction(r._id, 'approve')}
                style={{ padding: '4px 12px', borderRadius: 6, background: '#111827', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}
              >
                Approve
              </button>
              <button
                onClick={() => handleIncomingAction(r._id, 'deny')}
                style={{ padding: '4px 12px', borderRadius: 6, background: '#6b7280', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}
              >
                Deny
              </button>
            </div>
          ))
        )}
      </div>

      {/* Past sessions */}
      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
        <style>{`
          .history-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 32px;
            margin-top: 16px;
          }
          @media (min-width: 640px) {
            .history-grid { grid-template-columns: 1fr 1fr; }
          }
        `}</style>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>
          History
        </p>
        <div className="history-grid">
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#d1d5db', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Hosted past · {hostedPast.length}
            </p>
            {hostedPast.length === 0 ? (
              <p style={emptyStyle}>No past hosted sessions.</p>
            ) : (
              hostedPast.map((s) => (
                <Link key={s._id} href={`/sessions/${s._id}`} style={itemStyle}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    {new Date(s.endAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })} · {s.status}
                  </div>
                </Link>
              ))
            )}
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#d1d5db', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Joined past · {joinedPast.length}
            </p>
            {joinedPast.length === 0 ? (
              <p style={emptyStyle}>No past joined sessions.</p>
            ) : (
              joinedPast.map((s) => (
                <Link key={s._id} href={`/sessions/${s._id}`} style={itemStyle}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    {new Date(s.endAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })} · {s.status}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
