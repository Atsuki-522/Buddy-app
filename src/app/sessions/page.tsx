'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';
import { apiFetch } from '@/lib/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const SessionsMap = dynamic(() => import('@/components/SessionsMap'), { ssr: false });
const PinMap = dynamic(() => import('@/components/PinMap'), { ssr: false });

type Session = {
  _id: string;
  title: string;
  startAt: string;
  publicAreaLabel?: string;
  publicLocation: { type: 'Point'; coordinates: [number, number] };
};

type SessionItem = {
  session: Session;
  distanceMeters: number;
};

export default function SessionsPage() {
  const { locale, t, formatDateTime, datePickerLocale } = useLocale();
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationText, setLocationText] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [withinHours, setWithinHours] = useState('');
  const [withinMin, setWithinMin] = useState('');
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState<SessionItem[]>([]);
  const [searchedRadius, setSearchedRadius] = useState<number | null>(null);
  const [searchedStartAt, setSearchedStartAt] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewLat, setPreviewLat] = useState<number | null>(null);
  const [previewLng, setPreviewLng] = useState<number | null>(null);
  const [previewMsg, setPreviewMsg] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
      () => {}
    );
  }, []);

  function getLocation() {
    if (!navigator.geolocation) {
      setErrorMsg(t('geolocationUnsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationText('');
        setErrorMsg('');
      },
      () => setErrorMsg(t('locationPermissionDenied'))
    );
  }

  async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
      { headers: { 'Accept-Language': locale } }
    );
    const data = await res.json();
    if (!data.length) return null;
    if (userLat != null && userLng != null) {
      let best = data[0];
      let bestDist = Infinity;
      for (const item of data) {
        const dLat = parseFloat(item.lat) - userLat;
        const dLng = parseFloat(item.lon) - userLng;
        const dist = dLat * dLat + dLng * dLng;
        if (dist < bestDist) { bestDist = dist; best = item; }
      }
      return { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
    }
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }

  async function handlePreview() {
    setPreviewMsg('');
    setPreviewLat(null);
    setPreviewLng(null);
    if (!locationText.trim() && lat == null) {
      setPreviewMsg(t('enterLocationFirst'));
      return;
    }
    if (lat != null && lng != null && !locationText.trim()) {
      setPreviewLat(lat);
      setPreviewLng(lng);
      return;
    }
    setPreviewLoading(true);
    const result = await geocode(locationText.trim());
    setPreviewLoading(false);
    if (!result) {
      setPreviewMsg(t('locationSearchFailed'));
      return;
    }
    setPreviewLat(result.lat);
    setPreviewLng(result.lng);
  }

  async function handleSearch() {
    setErrorMsg('');
    setLoading(true);

    let searchLat = lat;
    let searchLng = lng;

    if (locationText.trim()) {
      const result = await geocode(locationText.trim());
      if (!result) {
        setErrorMsg(t('locationNotFound'));
        setLoading(false);
        return;
      }
      searchLat = result.lat;
      searchLng = result.lng;
      setLat(searchLat);
      setLng(searchLng);
    } else if (searchLat == null || searchLng == null) {
      setErrorMsg(t('enterLocationOrUseCurrent'));
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        lat: String(searchLat),
        lng: String(searchLng),
        radiusKm: String(radiusKm),
        limit: String(limit),
      });
      if (startAt) params.set('startAt', startAt.toISOString());
      if (withinHours) params.set('startsWithinHours', withinHours);
      if (withinMin) params.set('startsWithinMin', withinMin);
      const data = await apiFetch<{ items: SessionItem[] }>(`/sessions?${params.toString()}`, { auth: false });
      setItems(data.items ?? []);
      setSearchedRadius(radiusKm);
      setSearchedStartAt(startAt);
    } catch (err) {
      const e = err as { error?: { message?: string } };
      setErrorMsg(e?.error?.message ?? t('failedToLoadSessions'));
    } finally {
      setLoading(false);
    }
  }

  function distanceLabel(distanceMeters: number) {
    if (distanceMeters >= 1000) {
      return t('kmAway', { value: (distanceMeters / 1000).toFixed(1) });
    }
    return t('metersAway', { value: Math.round(distanceMeters) });
  }

  const sessionWord = items.length === 1 ? t('sessionSingular') : t('sessionPlural');

  return (
    <main>
      <style>{`
        .sessions-search-row { display: flex; gap: 8px; }
        .datepicker-startAt { display: inline-block !important; margin-top: 4px; }
        .datepicker-startAt .react-datepicker__input-container input { padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none; width: 200px; }
        .react-datepicker-popper { z-index: 9999 !important; }
        .sessions-results { margin-top: 20px; display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
        .sessions-list { flex: 55 1 280px; min-width: 0; }
        .sessions-map { flex: 45 1 240px; }
        @media (max-width: 640px) {
          .sessions-search-row { flex-wrap: wrap; }
          .sessions-search-row input { flex: 1 1 100%; }
          .sessions-list { height: auto !important; }
          .sessions-list > div { height: auto !important; overflow-y: visible !important; }
        }
      `}</style>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{t('findSessions')}</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="sessions-search-row">
          <input
            type="text"
            placeholder={t('locationPlaceholder')}
            value={locationText}
            onChange={(e) => { setLocationText(e.target.value); setLat(null); setLng(null); }}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', minWidth: 0 }}
          />
          <button
            type="button"
            onClick={getLocation}
            style={{ padding: '8px 14px', borderRadius: 8, background: '#eff6ff', color: '#3b82f6', fontWeight: 600, border: '1px solid #bfdbfe', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
          >
            {t('useMyLocation')}
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading}
            style={{ padding: '8px 14px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', fontWeight: 600, border: '1px solid #bbf7d0', cursor: previewLoading ? 'not-allowed' : 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
          >
            {previewLoading ? '...' : t('previewOnMap')}
          </button>
        </div>

        {previewMsg && (
          <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{previewMsg}</p>
        )}
        {previewLat != null && previewLng != null && (
          <PinMap lat={previewLat} lng={previewLng} height={200} />
        )}

        {lat != null && lng != null && (
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            {locationText ? locationText : `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ fontSize: 13 }}>
            {t('radiusKm')}
            <input
              type="number"
              min={1}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            {t('limit')}
            <input
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6 }}
            />
          </label>
        </div>

        <div style={{ fontSize: 13 }}>
          <div>{t('startAt')}</div>
          <DatePicker
            selected={startAt}
            onChange={(date: Date | null) => setStartAt(date)}
            showTimeSelect
            timeIntervals={15}
            dateFormat={locale === 'ja' ? 'yyyy/MM/dd HH:mm' : 'MMM d, yyyy h:mm aa'}
            locale={datePickerLocale}
            placeholderText={t('selectDateTime')}
            isClearable
            popperPlacement="right-start"
            wrapperClassName="datepicker-startAt"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ fontSize: 13 }}>
            {t('withinHours')}
            <input
              type="number"
              min={0}
              placeholder="2"
              value={withinHours}
              onChange={(e) => setWithinHours(e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            {t('withinMinutes')}
            <input
              type="number"
              min={0}
              placeholder="30"
              value={withinMin}
              onChange={(e) => setWithinMin(e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6 }}
            />
          </label>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 8, background: loading ? '#9ca3af' : '#111827', color: '#fff', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? t('searching') : t('search')}
        </button>
      </div>

      {errorMsg && (
        <p style={{ marginTop: 16, color: '#ef4444', fontSize: 14 }}>Error: {errorMsg}</p>
      )}

      <div className="sessions-results">
        <div className="sessions-list">
          {searchedRadius != null && (
            <div style={{ marginBottom: 10, fontSize: 13, color: '#6b7280' }}>
              <span>{t('sessionsWithinRadius', { count: items.length, sessionWord, radius: searchedRadius })}</span>
              {searchedStartAt && (
                <span> {' · '}{t('sortedByClosestTo', { value: formatDateTime(searchedStartAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) })}</span>
              )}
            </div>
          )}
          <div style={{ height: 460, overflowY: 'auto', paddingRight: 4 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              {items.length === 0 ? (
                <div style={{ padding: '28px 20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{t('noSessionsFound')}</div>
                  <div style={{ fontSize: 13, color: '#9ca3af' }}>{t('tryWiderRadius')}</div>
                </div>
              ) : (
                items.map(({ session, distanceMeters }) => (
                  <Link
                    key={session._id}
                    href={`/sessions/${session._id}`}
                    style={{ display: 'block', padding: '16px 18px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textDecoration: 'none', color: 'inherit' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 6 }}>{session.title}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span>{formatDateTime(session.startAt)}</span>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {session.publicAreaLabel && <span>{session.publicAreaLabel}</span>}
                        <span style={{ color: '#9ca3af' }}>{distanceLabel(distanceMeters)}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="sessions-map">
          <SessionsMap
            items={items}
            center={lat != null && lng != null ? [lat, lng] : null}
            height={300}
          />
        </div>
      </div>
    </main>
  );
}
