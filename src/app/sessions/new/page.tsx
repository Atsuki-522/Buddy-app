'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/LocaleProvider';
import { apiFetch } from '@/lib/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const PinMap = dynamic(() => import('@/components/PinMap'), { ssr: false });

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 6,
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
};

export default function NewSessionPage() {
  const router = useRouter();
  const { locale, t, datePickerLocale } = useLocale();
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [locationText, setLocationText] = useState('');
  const [publicAreaLabel, setPublicAreaLabel] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [previewLat, setPreviewLat] = useState<number | null>(null);
  const [previewLng, setPreviewLng] = useState<number | null>(null);
  const [previewMsg, setPreviewMsg] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'Accept-Language': locale } }
    );
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }

  function getLocation() {
    if (!navigator.geolocation) {
      setErrorMsg(t('geolocationUnsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setPreviewLat(pos.coords.latitude);
        setPreviewLng(pos.coords.longitude);
        setPreviewMsg('');
        setLocationText('');
        setErrorMsg('');
      },
      () => setErrorMsg(t('locationPermissionDenied'))
    );
  }

  async function handlePreview() {
    setPreviewMsg('');
    setPreviewLat(null);
    setPreviewLng(null);
    if (!locationText.trim()) {
      setPreviewMsg(t('enterLocationFirst'));
      return;
    }
    setPreviewLoading(true);
    const result = await geocode(locationText.trim());
    setPreviewLoading(false);
    if (!result) {
      setPreviewMsg(t('locationSearchFailed'));
      return;
    }
    setLat(result.lat);
    setLng(result.lng);
    setPreviewLat(result.lat);
    setPreviewLng(result.lng);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    let resolvedLat = lat;
    let resolvedLng = lng;

    if ((resolvedLat == null || resolvedLng == null) && locationText.trim()) {
      const result = await geocode(locationText.trim());
      if (!result) {
        setErrorMsg(t('locationSearchFailed'));
        setLoading(false);
        return;
      }
      resolvedLat = result.lat;
      resolvedLng = result.lng;
      setLat(resolvedLat);
      setLng(resolvedLng);
    }

    if (!startAt || !endAt) {
      setErrorMsg(t('startEndRequired'));
      setLoading(false);
      return;
    }

    if (resolvedLat == null || resolvedLng == null) {
      setErrorMsg(t('enterLocationOrCurrent'));
      setLoading(false);
      return;
    }

    const areaLabel = publicAreaLabel.trim() || (locationText.trim() ? locationText.trim() : '');

    try {
      const data = await apiFetch<{ session: { _id: string } }>('/sessions', {
        method: 'POST',
        body: {
          title,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          publicAreaLabel: areaLabel,
          requiresApproval,
          publicLocation: { lng: resolvedLng, lat: resolvedLat },
        },
      });
      router.push(`/sessions/${data.session._id}`);
    } catch (err) {
      const e = err as { error?: { code?: string; message?: string } };
      if (e?.error?.code === 'UNAUTHORIZED' || e?.error?.code === 'INVALID_TOKEN') {
        setErrorMsg(t('mustLoginFirst'));
      } else {
        setErrorMsg(e?.error?.message ?? t('failedToCreateSession'));
      }
    } finally {
      setLoading(false);
    }
  }

  const isUnauth = errorMsg === t('mustLoginFirst');

  return (
    <main style={{ maxWidth: 520 }}>
      <style>{`
        .new-session-dates { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 640px) { .new-session-dates { grid-template-columns: 1fr; } }
        .new-session-card { padding: 28px; }
        @media (max-width: 640px) { .new-session-card { padding: 20px 16px; } }
      `}</style>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#111827' }}>{t('createSession')}</h1>

      <div className="new-session-card" style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <label style={labelStyle}>
            {t('titleRequired')}
            <input required value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          </label>

          <div className="new-session-dates">
            <label style={labelStyle}>
              {t('start')}
              <DatePicker
                selected={startAt}
                onChange={(date: Date | null) => setStartAt(date)}
                showTimeSelect
                timeIntervals={15}
                dateFormat={locale === 'ja' ? 'yyyy/MM/dd HH:mm' : 'MMM d, yyyy h:mm aa'}
                locale={datePickerLocale}
                placeholderText={t('selectDateTime')}
                customInput={<input style={inputStyle} />}
              />
            </label>
            <label style={labelStyle}>
              {t('end')}
              <DatePicker
                selected={endAt}
                onChange={(date: Date | null) => setEndAt(date)}
                showTimeSelect
                timeIntervals={15}
                dateFormat={locale === 'ja' ? 'yyyy/MM/dd HH:mm' : 'MMM d, yyyy h:mm aa'}
                locale={datePickerLocale}
                placeholderText={t('selectDateTime')}
                minDate={startAt ?? undefined}
                customInput={<input style={inputStyle} />}
              />
            </label>
          </div>

          <label style={labelStyle}>
            {t('locationRequired')}
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder={t('locationPlaceholder')}
                value={locationText}
                onChange={(e) => { setLocationText(e.target.value); setLat(null); setLng(null); setPreviewLat(null); setPreviewLng(null); setPreviewMsg(''); }}
                style={{ ...inputStyle, marginTop: 0, flex: 1, minWidth: 0 }}
              />
              <button
                type="button"
                onClick={getLocation}
                style={{ padding: '10px 14px', borderRadius: 8, background: '#eff6ff', color: '#3b82f6', fontWeight: 600, border: '1px solid #bfdbfe', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
              >
                {t('useMyLocation')}
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewLoading}
                style={{ padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', fontWeight: 600, border: '1px solid #bbf7d0', cursor: previewLoading ? 'not-allowed' : 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
              >
                {previewLoading ? '...' : t('previewOnMap')}
              </button>
            </div>
            {previewMsg && (
              <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'block' }}>{previewMsg}</span>
            )}
            {previewLat != null && previewLng != null && (
              <>
                <span style={{ fontSize: 12, color: '#6b7280', marginTop: 4, display: 'block' }}>
                  {locationText || `${previewLat.toFixed(4)}, ${previewLng.toFixed(4)}`}
                </span>
                <div style={{ marginTop: 10 }}>
                  <PinMap lat={previewLat} lng={previewLng} height={200} />
                </div>
              </>
            )}
          </label>

          <label style={labelStyle}>
            {t('areaLabel')} <span style={{ fontWeight: 400, color: '#9ca3af' }}>{t('areaLabelHint')}</span>
            <input
              value={publicAreaLabel}
              onChange={(e) => setPublicAreaLabel(e.target.value)}
              placeholder={t('areaLabelPlaceholder')}
              style={inputStyle}
            />
          </label>

          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            {t('requiresApproval')}
          </label>

          {errorMsg && (
            <p style={{ fontSize: 13, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', margin: 0 }}>
              {errorMsg}
              {isUnauth && (
                <> {' - '}<a href="/login" style={{ color: '#3b82f6', textDecoration: 'underline' }}>{t('signIn')}</a></>
              )}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '11px 0', borderRadius: 8, background: loading ? '#9ca3af' : '#111827', color: '#fff', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, marginTop: 4 }}
          >
            {loading ? t('creating') : t('createSession')}
          </button>
        </form>
      </div>
    </main>
  );
}
