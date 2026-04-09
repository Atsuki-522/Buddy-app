'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';
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
  host: { _id: string; displayName: string } | null;
};

type JoinRequest = {
  _id: string;
  userId: { _id: string; displayName: string };
  message?: string;
  status: string;
};

type Message = {
  _id: string;
  userId: { _id: string; displayName: string };
  text: string;
  createdAt: string;
};

const fieldStyle: React.CSSProperties = { marginBottom: 12 };
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 };
const valueStyle: React.CSSProperties = { fontSize: 15, marginTop: 2 };

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { locale, t, formatDateTime, formatTime, statusLabel } = useLocale();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [joinStatus, setJoinStatus] = useState<'idle' | 'success_joined' | 'success_requested'>('idle');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({ title: '', startAt: '', endAt: '', status: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatFetchError, setChatFetchError] = useState('');
  const [chatText, setChatText] = useState('');
  const [chatError, setChatError] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [requestsError, setRequestsError] = useState('');
  const [actionError, setActionError] = useState('');

  const isMember = (role: string | null) => role === 'HOST' || role === 'MEMBER';

  function loadMessages(initial = false) {
    if (initial) setChatLoading(true);
    setChatFetchError('');
    apiFetch<Message[]>(`/sessions/${id}/messages`)
      .then((msgs) => {
        setMessages((prev) => {
          const changed = msgs.length !== prev.length || msgs.some((m, i) => m._id !== prev[i]?._id);
          return changed ? msgs : prev;
        });
        if (initial) setChatLoading(false);
      })
      .catch(() => {
        setChatFetchError(t('failedToLoadMessages'));
        if (initial) setChatLoading(false);
      });
  }

  async function handleSend() {
    if (!chatText.trim()) return;
    setChatError('');
    setChatSending(true);
    try {
      await apiFetch(`/sessions/${id}/messages`, { method: 'POST', body: { text: chatText.trim() } });
      setChatText('');
      loadMessages();
    } catch {
      setChatError(t('failedToSendMessage'));
    } finally {
      setChatSending(false);
    }
  }

  function loadRequests() {
    setRequestsError('');
    apiFetch<{ items: JoinRequest[] }>(`/sessions/${id}/join-requests?status=PENDING`)
      .then((res) => setRequests(res.items))
      .catch(() => setRequestsError(t('failedToLoadJoinRequests')));
  }

  async function handleAction(rid: string, action: 'approve' | 'deny') {
    setActionError('');
    try {
      await apiFetch(`/join-requests/${rid}/${action}`, { method: 'PATCH' });
      loadRequests();
    } catch {
      setActionError(action === 'approve' ? t('failedToApproveRequest') : t('failedToDenyRequest'));
    }
  }

  useEffect(() => {
    if (data?.viewer.role === 'HOST') loadRequests();
    if (!isMember(data?.viewer.role ?? null)) return;
    loadMessages(true);
    const timer = setInterval(() => loadMessages(), 7000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.viewer.role]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        setJoinError(t('alreadyJoinedOrRequested'));
      } else {
        setJoinError(t('failedToSendRequest'));
      }
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleEditSubmit() {
    setEditError('');
    setEditLoading(true);
    try {
      const res = await apiFetch<{ session: Session }>(`/sessions/${id}`, { method: 'PATCH', body: editFields });
      setData((prev) => prev ? { ...prev, session: res.session } : prev);
      setEditMode(false);
    } catch {
      setEditError(t('failedToUpdateSession'));
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t('deleteSessionConfirm'))) return;
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await apiFetch(`/sessions/${id}`, { method: 'DELETE' });
      router.push('/me');
    } catch {
      setDeleteError(t('failedToDeleteSession'));
      setDeleteLoading(false);
    }
  }

  useEffect(() => {
    apiFetch<{ user: { _id: string } }>('/auth/me')
      .then((res) => setMyUserId(res.user._id))
      .catch(() => {});

    apiFetch<DetailResponse>(`/sessions/${id}`, { auth: true })
      .then((d) => {
        setData(d);
        if (d.viewer.role === 'HOST') {
          setEditFields({
            title: d.session.title,
            startAt: d.session.startAt.slice(0, 16),
            endAt: d.session.endAt.slice(0, 16),
            status: d.session.status,
          });
        }
      })
      .catch((err) => {
        const e = err as { error?: { message?: string } };
        setErrorMsg(e?.error?.message ?? t('failedToLoadSession'));
      });
  }, [id, t]);

  return (
    <main style={{ maxWidth: 560 }}>
      <Link href="/sessions" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'underline' }}>
        {t('backToSessions')}
      </Link>

      {errorMsg && (
        <p style={{ marginTop: 16, color: '#ef4444' }}>Error: {errorMsg}</p>
      )}

      {!data && !errorMsg && (
        <p style={{ marginTop: 16, color: '#6b7280' }}>{t('loading')}</p>
      )}

      {data && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{data.session.title}</h1>
              {data.host && (
                <Link href={`/users/${data.host._id}`} style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                  {t('byHost', { name: data.host.displayName })}
                </Link>
              )}
            </div>
            {data.viewer.role === 'HOST' && !editMode && (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => setEditMode(true)}
                  style={{ padding: '5px 14px', borderRadius: 6, background: '#111827', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 13 }}
                >
                  {t('edit')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  style={{ padding: '5px 14px', borderRadius: 6, background: deleteLoading ? '#d1d5db' : '#6b7280', color: '#fff', fontWeight: 600, border: 'none', cursor: deleteLoading ? 'not-allowed' : 'pointer', fontSize: 13 }}
                >
                  {deleteLoading ? t('deleting') : t('delete')}
                </button>
              </div>
            )}
          </div>
          {deleteError && <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 12 }}>{deleteError}</p>}

          {editMode && (
            <div style={{ marginBottom: 20, padding: '16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{t('editSession')}</h2>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>{t('title')}</label>
                <input
                  value={editFields.title}
                  onChange={(e) => setEditFields((p) => ({ ...p, title: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>{t('start')}</label>
                <input
                  type="datetime-local"
                  lang={locale}
                  value={editFields.startAt}
                  onChange={(e) => setEditFields((p) => ({ ...p, startAt: e.target.value }))}
                  style={{ display: 'block', marginTop: 4, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>{t('end')}</label>
                <input
                  type="datetime-local"
                  lang={locale}
                  value={editFields.endAt}
                  onChange={(e) => setEditFields((p) => ({ ...p, endAt: e.target.value }))}
                  style={{ display: 'block', marginTop: 4, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{t('status')}</label>
                <select
                  value={editFields.status}
                  onChange={(e) => setEditFields((p) => ({ ...p, status: e.target.value }))}
                  style={{ display: 'block', marginTop: 4, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
                >
                  <option value="OPEN">{statusLabel('OPEN')}</option>
                  <option value="CLOSED">{statusLabel('CLOSED')}</option>
                  <option value="CANCELLED">{statusLabel('CANCELLED')}</option>
                </select>
              </div>
              {editError && <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 8 }}>{editError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleEditSubmit}
                  disabled={editLoading}
                  style={{ padding: '7px 18px', borderRadius: 6, background: editLoading ? '#9ca3af' : '#111827', color: '#fff', fontWeight: 600, border: 'none', cursor: editLoading ? 'not-allowed' : 'pointer', fontSize: 14 }}
                >
                  {editLoading ? t('saving') : t('save')}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  style={{ padding: '7px 18px', borderRadius: 6, background: '#f3f4f6', color: '#374151', fontWeight: 600, border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 14 }}
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}

          <div style={fieldStyle}>
            <div style={labelStyle}>{t('start')}</div>
            <div style={valueStyle}>{formatDateTime(data.session.startAt)}</div>
          </div>

          <div style={fieldStyle}>
            <div style={labelStyle}>{t('end')}</div>
            <div style={valueStyle}>{formatDateTime(data.session.endAt)}</div>
          </div>

          {data.session.publicAreaLabel && (
            <div style={fieldStyle}>
              <div style={labelStyle}>{t('area')}</div>
              <div style={valueStyle}>{data.session.publicAreaLabel}</div>
            </div>
          )}

          <div style={fieldStyle}>
            <div style={labelStyle}>{t('status')}</div>
            <div style={valueStyle}>{statusLabel(data.session.status)}</div>
          </div>

          <div style={fieldStyle}>
            <div style={labelStyle}>{t('approvalRequired')}</div>
            <div style={valueStyle}>{data.session.requiresApproval ? t('yes') : t('no')}</div>
          </div>

          <div style={fieldStyle}>
            <div style={labelStyle}>{t('yourRole')}</div>
            <div style={valueStyle}>{statusLabel(data.viewer.role ?? 'GUEST')}</div>
          </div>

          {data.viewer.role === null && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>{t('joinThisSession')}</h2>
              {joinStatus === 'success_joined' && (
                <p style={{ color: '#16a34a' }}>{t('joinedSuccessfully')}</p>
              )}
              {joinStatus === 'success_requested' && (
                <p style={{ color: '#2563eb' }}>{t('requestSent')}</p>
              )}
              {joinStatus === 'idle' && (
                <>
                  <textarea
                    placeholder={t('messageOptional')}
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    rows={3}
                    style={{ display: 'block', width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, marginBottom: 10, resize: 'vertical' }}
                  />
                  {joinError === '401' ? (
                    <p style={{ color: '#ef4444', fontSize: 14 }}>
                      {t('pleaseLoginToContinue')}{' '}
                      <Link href="/login" style={{ color: '#3b82f6', textDecoration: 'underline' }}>{t('login')}</Link>
                    </p>
                  ) : joinError ? (
                    <p style={{ color: '#ef4444', fontSize: 14 }}>{joinError}</p>
                  ) : null}
                  <button
                    onClick={handleJoin}
                    disabled={joinLoading}
                    style={{ marginTop: 8, padding: '9px 18px', borderRadius: 7, background: joinLoading ? '#9ca3af' : '#111827', color: '#fff', fontWeight: 600, border: 'none', cursor: joinLoading ? 'not-allowed' : 'pointer', fontSize: 14 }}
                  >
                    {joinLoading ? t('sending') : t('requestToJoin')}
                  </button>
                </>
              )}
            </div>
          )}

          {data.viewer.role === 'HOST' && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{t('joinRequests')}</h2>
              {requestsError && <p style={{ color: '#ef4444', fontSize: 14 }}>{requestsError}</p>}
              {actionError && <p style={{ color: '#ef4444', fontSize: 14 }}>{actionError}</p>}
              {requests.length === 0 && !requestsError && (
                <p style={{ color: '#6b7280', fontSize: 14 }}>{t('noPendingRequests')}</p>
              )}
              {requests.map((r) => (
                <div key={r._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ flex: 1, fontSize: 14 }}>
                    <Link href={`/users/${r.userId._id}`} style={{ fontSize: 13, fontWeight: 600, color: '#111827', textDecoration: 'underline', display: 'inline-block', marginBottom: 2 }}>
                      {r.userId.displayName}
                    </Link>
                    <div style={{ color: '#374151' }}>{r.message || <em style={{ color: '#9ca3af' }}>{t('noMessage')}</em>}</div>
                  </div>
                  <button
                    onClick={() => handleAction(r._id, 'approve')}
                    style={{ padding: '5px 12px', borderRadius: 6, background: '#111827', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 13 }}
                  >
                    {t('approve')}
                  </button>
                  <button
                    onClick={() => handleAction(r._id, 'deny')}
                    style={{ padding: '5px 12px', borderRadius: 6, background: '#6b7280', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 13 }}
                  >
                    {t('deny')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {isMember(data.viewer.role) && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{t('chat')}</h2>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', minHeight: 120, maxHeight: 320, overflowY: 'auto', marginBottom: 10, background: '#f9fafb' }}>
                {chatLoading ? (
                  <p style={{ color: '#9ca3af', fontSize: 14 }}>{t('loadingMessages')}</p>
                ) : chatFetchError ? (
                  <p style={{ color: '#ef4444', fontSize: 14 }}>{chatFetchError}</p>
                ) : messages.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 14 }}>{t('noMessagesYet')}</p>
                ) : (
                  messages.map((m) => {
                    const isMine = myUserId && m.userId._id === myUserId;
                    return (
                      <div key={m._id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                        {!isMine && (
                          <Link href={`/users/${m.userId._id}`} style={{ fontSize: 11, fontWeight: 600, color: '#111827', marginBottom: 2, marginLeft: 4, textDecoration: 'underline' }}>
                            {m.userId.displayName}
                          </Link>
                        )}
                        <div style={{
                          maxWidth: '75%',
                          padding: '8px 12px',
                          borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          background: isMine ? '#111827' : '#e5e7eb',
                          color: isMine ? '#fff' : '#111827',
                          fontSize: 14,
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                        }}>
                          {m.text}
                        </div>
                        <span style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, marginLeft: isMine ? 0 : 4, marginRight: isMine ? 4 : 0 }}>
                          {formatTime(m.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>
              {chatError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 6 }}>{chatError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  rows={2}
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={t('messageInputHint')}
                  style={{ flex: 1, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, resize: 'vertical' }}
                />
                <button
                  onClick={handleSend}
                  disabled={chatSending || !chatText.trim()}
                  style={{ padding: '8px 16px', borderRadius: 7, background: chatSending || !chatText.trim() ? '#9ca3af' : '#111827', color: '#fff', fontWeight: 600, border: 'none', cursor: chatSending || !chatText.trim() ? 'not-allowed' : 'pointer', fontSize: 14, alignSelf: 'flex-end' }}
                >
                  {chatSending ? t('sending') : t('send')}
                </button>
              </div>
            </div>
          )}

          <div style={fieldStyle}>
            <div style={labelStyle}>{t('privateLocation')}</div>
            <div style={valueStyle}>
              {data.session.privateLocation === null
                ? t('privateLocationMembersOnly')
                : data.session.privateLocation?.placeText ?? t('notSet')}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
