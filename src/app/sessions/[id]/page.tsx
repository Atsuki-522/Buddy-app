'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Session = {
  _id: string;
  title: string;
  startAt: string;
  endAt: string;
  publicAreaLabel?: string;
  status: string;
  requiresApproval: boolean;
  privateLocation: null | { placeText?: string; point?: unknown };
};

type DetailResponse = {
  session: Session;
  viewer: { role: string | null };
};

type JoinRequest = {
  _id: string;
  userId: string;
  message?: string;
  status: string;
};

const fieldStyle: React.CSSProperties = { marginBottom: 12 };
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 };
const valueStyle: React.CSSProperties = { fontSize: 15, marginTop: 2 };

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [joinStatus, setJoinStatus] = useState<'idle' | 'success_joined' | 'success_requested'>('idle');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  // HOST: pending join requests
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [requestsError, setRequestsError] = useState('');
  const [actionError, setActionError] = useState('');

  function loadRequests() {
    setRequestsError('');
    apiFetch<{ items: JoinRequest[] }>(`/sessions/${id}/join-requests?status=PENDING`)
      .then((res) => setRequests(res.items))
      .catch(() => setRequestsError('Failed to load join requests.'));
  }

  async function handleAction(rid: string, action: 'approve' | 'deny') {
    setActionError('');
    try {
      await apiFetch(`/join-requests/${rid}/${action}`, { method: 'PATCH' });
      loadRequests();
    } catch {
      setActionError(`Failed to ${action} request.`);
    }
  }

  useEffect(() => {
    if (data?.viewer.role === 'HOST') loadRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.viewer.role]);

  async function handleJoin() {
    setJoinError('');
    setJoinLoading(true);
    try {
      const body = joinMessage.trim() ? { message: joinMessage.trim() } : {};
      const res = await apiFetch<{ joined?: boolean; request?: unknown }>(
        `/sessions/${id}/join-requests`,
        { method: 'POST', body }
      );
      setJoinStatus(res.joined ? 'success_joined' : 'success_requested');
    } catch (err) {
      const e = err as { error?: { code?: string } };
      const code = e?.error?.code;
      if (code === 'UNAUTHORIZED' || code === 'INVALID_TOKEN') {
        setJoinError('401');
      } else if (code === 'ALREADY_MEMBER' || code === 'ALREADY_REQUESTED') {
        setJoinError('Already joined or already requested.');
      } else {
        setJoinError('Failed to send request.');
      }
    } finally {
      setJoinLoading(false);
    }
  }

  useEffect(() => {
    apiFetch<DetailResponse>(`/sessions/${id}`, { auth: true })
      .then(setData)
      .catch((err) => {
        const e = err as { error?: { message?: string } };
        setErrorMsg(e?.error?.message ?? 'Failed to load session.');
      });
  }, [id]);

  return (
    <main style={{ maxWidth: 560 }}>
      <Link href="/sessions" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'underline' }}>
        ← Back to sessions
      </Link>

      {errorMsg && (
        <p style={{ marginTop: 16, color: '#ef4444' }}>Error: {errorMsg}</p>
      )}

      {!data && !errorMsg && (
        <p style={{ marginTop: 16, color: '#6b7280' }}>Loading...</p>
      )}

      {data && (
        <div style={{ marginTop: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{data.session.title}</h1>

          <div style={fieldStyle}>
            <div style={labelStyle}>Start</div>
            <div style={valueStyle}>{new Date(data.session.startAt).toLocaleString('en-CA')}</div>
          </div>

          <div style={fieldStyle}>
            <div style={labelStyle}>End</div>
            <div style={valueStyle}>{new Date(data.session.endAt).toLocaleString('en-CA')}</div>
          </div>

          {data.session.publicAreaLabel && (
            <div style={fieldStyle}>
              <div style={labelStyle}>Area</div>
              <div style={valueStyle}>{data.session.publicAreaLabel}</div>
            </div>
          )}

          <div style={fieldStyle}>
            <div style={labelStyle}>Status</div>
            <div style={valueStyle}>{data.session.status}</div>
          </div>

          <div style={fieldStyle}>
            <div style={labelStyle}>Approval required</div>
            <div style={valueStyle}>{data.session.requiresApproval ? 'Yes' : 'No'}</div>
          </div>

          <div style={fieldStyle}>
            <div style={labelStyle}>Your role</div>
            <div style={valueStyle}>{data.viewer.role ?? 'Guest'}</div>
          </div>

          {data.viewer.role === null && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Join this session</h2>
              {joinStatus === 'success_joined' && (
                <p style={{ color: '#16a34a' }}>Joined successfully.</p>
              )}
              {joinStatus === 'success_requested' && (
                <p style={{ color: '#2563eb' }}>Request sent.</p>
              )}
              {joinStatus === 'idle' && (
                <>
                  <textarea
                    placeholder="Message (optional)"
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    rows={3}
                    style={{ display: 'block', width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, marginBottom: 10, resize: 'vertical' }}
                  />
                  {joinError === '401' ? (
                    <p style={{ color: '#ef4444', fontSize: 14 }}>
                      Please login to continue —{' '}
                      <Link href="/login" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Login</Link>
                    </p>
                  ) : joinError ? (
                    <p style={{ color: '#ef4444', fontSize: 14 }}>{joinError}</p>
                  ) : null}
                  <button
                    onClick={handleJoin}
                    disabled={joinLoading}
                    style={{ marginTop: 8, padding: '9px 18px', borderRadius: 7, background: joinLoading ? '#9ca3af' : '#111827', color: '#fff', fontWeight: 600, border: 'none', cursor: joinLoading ? 'not-allowed' : 'pointer', fontSize: 14 }}
                  >
                    {joinLoading ? 'Sending...' : 'Request to join'}
                  </button>
                </>
              )}
            </div>
          )}

          {data.viewer.role === 'HOST' && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Join requests</h2>
              {requestsError && <p style={{ color: '#ef4444', fontSize: 14 }}>{requestsError}</p>}
              {actionError && <p style={{ color: '#ef4444', fontSize: 14 }}>{actionError}</p>}
              {requests.length === 0 && !requestsError && (
                <p style={{ color: '#6b7280', fontSize: 14 }}>No pending requests.</p>
              )}
              {requests.map((r) => (
                <div key={r._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ flex: 1, fontSize: 14 }}>
                    <div style={{ color: '#374151' }}>{r.message || <em style={{ color: '#9ca3af' }}>No message</em>}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{r.userId}</div>
                  </div>
                  <button
                    onClick={() => handleAction(r._id, 'approve')}
                    style={{ padding: '5px 12px', borderRadius: 6, background: '#16a34a', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 13 }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(r._id, 'deny')}
                    style={{ padding: '5px 12px', borderRadius: 6, background: '#ef4444', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 13 }}
                  >
                    Deny
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={fieldStyle}>
            <div style={labelStyle}>Private location</div>
            <div style={valueStyle}>
              {data.session.privateLocation === null
                ? 'Private location is visible to members only.'
                : data.session.privateLocation?.placeText ?? 'Not set'}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
