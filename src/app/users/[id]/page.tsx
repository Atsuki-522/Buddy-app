'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type PublicUser = {
  _id: string;
  displayName: string;
  bio: string;
  photoUrl: string | null;
  reliabilityScore: number;
};

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    apiFetch<{ user: PublicUser }>(`/users/${id}`, { auth: false })
      .then((res) => setUser(res.user))
      .catch(() => setErrorMsg('User not found.'));
  }, [id]);

  return (
    <main style={{ maxWidth: 480 }}>
      <Link href="javascript:history.back()" style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'underline' }}>
        ← Back
      </Link>

      {errorMsg && <p style={{ marginTop: 16, color: '#ef4444' }}>{errorMsg}</p>}
      {!user && !errorMsg && <p style={{ marginTop: 16, color: '#6b7280' }}>Loading...</p>}

      {user && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.displayName}
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }}
              />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#6b7280' }}>
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{user.displayName}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                Reliability: {user.reliabilityScore}
              </div>
            </div>
          </div>

          {user.bio ? (
            <div style={{ padding: '14px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {user.bio}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: '#9ca3af' }}>No bio yet.</p>
          )}
        </div>
      )}
    </main>
  );
}
