import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Crosshair,
  Moon,
  Sun,
  Satellite,
  Route,
  ExternalLink,
  Play,
} from 'lucide-react';
import { DecryptedLocationPoint } from '../lib/crypto';

type MapStyle = 'dark' | 'light' | 'satellite';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const CARTO_FALLBACK_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';
const ESRI_SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

function pointKey(p: DecryptedLocationPoint): string {
  return `${p.ts}_${p.lat.toFixed(6)}_${p.lng.toFixed(6)}`;
}

function escapeHtml(raw: string): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface RadarMapProps {
  points: DecryptedLocationPoint[];
  focusedPoint: DecryptedLocationPoint | null;
  deviceId: string;
  onStartDemo: () => void;
}

export const RadarMap: React.FC<RadarMapProps> = ({
  points,
  focusedPoint,
  deviceId,
  onStartDemo,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const markersByKeyRef = useRef<Map<string, L.Marker>>(new Map());
  const lastNewestKeyRef = useRef<string>('');
  const useCartoFallbackRef = useRef<boolean>(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark');

  const latest = points[0] ?? null;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      zoomControl: true,
    }).setView([-5.38216, 105.25922], 14);

    const layers = L.layerGroup().addTo(map);
    mapRef.current = map;
    layersRef.current = layers;

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.invalidateSize({ animate: false });
          })
        : null;
    ro?.observe(el);

    return () => {
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      layersRef.current = null;
      markersByKeyRef.current.clear();
    };
  }, []);

  // Swap tile layer cleanly between OSM/CARTO street tiles (dark/light) and Esri World Imagery (satellite)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    let layer: L.TileLayer;

    if (mapStyle === 'satellite') {
      layer = L.tileLayer(ESRI_SATELLITE_TILE_URL, {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri',
      });
    } else {
      const initialStreetUrl = useCartoFallbackRef.current
        ? CARTO_FALLBACK_TILE_URL
        : OSM_TILE_URL;

      layer = L.tileLayer(initialStreetUrl, {
        maxZoom: 19,
        // OSM Tile Usage Policy requires a valid HTTP Origin/Referer header (blocks empty no-referrer with 403).
        // Element-level strict-origin-when-cross-origin sends ONLY bare domain "https://lacakinhp110.my.id/"
        // while keeping global document Referrer-Policy locked at no-referrer.
        referrerPolicy: 'strict-origin-when-cross-origin',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      });

      let osmLoadedAtLeastOne = false;
      layer.on('tileload', () => {
        osmLoadedAtLeastOne = true;
      });

      layer.on('tileerror', (err) => {
        // Automatic failover to CARTO Basemaps if OSM blocks Referer (e.g. Brave Shields) or is unreachable
        if (!useCartoFallbackRef.current && !osmLoadedAtLeastOne) {
          useCartoFallbackRef.current = true;
          layer.setUrl(CARTO_FALLBACK_TILE_URL);
          return;
        }

        // Single-tile recovery if a transient OSM tile failed after initial load
        const img = err.tile;
        const { x, y, z } = err.coords;
        if (
          img &&
          !img.dataset.cartoRetry &&
          Number.isFinite(x) &&
          Number.isFinite(y) &&
          Number.isFinite(z)
        ) {
          img.dataset.cartoRetry = '1';
          img.onload = () => {
            img.classList.add('leaflet-tile-loaded');
          };
          img.src = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
        }
      });
    }

    layer.addTo(map);
    layer.bringToBack();
    tileLayerRef.current = layer;
  }, [mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    layers.clearLayers();
    markersByKeyRef.current.clear();
    if (points.length === 0) return;

    const newest = points[0];

    // Draw route polyline from oldest to newest
    if (points.length > 1) {
      const coords = points
        .slice()
        .reverse()
        .map((p) => [p.lat, p.lng] as L.LatLngTuple);

      L.polyline(coords, {
        color: '#38bdf8',
        weight: 3.5,
        opacity: 0.78,
        dashArray: '6 6',
      }).addTo(layers);

      // Historical breadcrumb dots (excluding newest)
      points.slice(1).forEach((p, idx) => {
        const dotIcon = L.divIcon({
          className: '',
          html: `<div style="width:10px;height:10px;border-radius:9999px;background:#6366f1;border:2px solid #e2e8f0;box-shadow:0 0 6px rgba(99,102,241,0.8);"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        const marker = L.marker([p.lat, p.lng], { icon: dotIcon })
          .bindPopup(
            `<div style="font-size:12px;line-height:1.45;"><b>Titik Riwayat #${points.length - 1 - idx}</b><br/>${escapeHtml(
              new Date(p.ts).toLocaleString('id-ID')
            )}<br/>Akurasi: ±${Math.round(
              p.acc || 0
            )}m (${escapeHtml(p.prv || 'gps')}) • Baterai: ${p.bat >= 0 ? `${Math.round(p.bat)}%` : '-'}</div>`
          )
          .addTo(layers);
        markersByKeyRef.current.set(pointKey(p), marker);
      });
    }

    // Accuracy radius circle for latest position
    L.circle([newest.lat, newest.lng], {
      radius: Math.max(newest.acc || 20, 12),
      color: '#38bdf8',
      weight: 1.5,
      fillColor: '#38bdf8',
      fillOpacity: 0.14,
    }).addTo(layers);

    // Custom pulsing radar beacon marker for latest position
    const radarIcon = L.divIcon({
      className: '',
      html: `<div class="radar-wrapper"><div class="radar-wave"></div><div class="radar-wave-2"></div><div class="radar-beacon"></div></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const safeTitle = escapeHtml(newest.mdl || deviceId || 'Perangkat');
    const safePrv = escapeHtml(newest.prv || 'gps');
    const safeLat = Number.isFinite(newest.lat) ? newest.lat : 0;
    const safeLng = Number.isFinite(newest.lng) ? newest.lng : 0;

    const latestMarker = L.marker([safeLat, safeLng], {
      icon: radarIcon,
    })
      .bindPopup(
        `<div style="font-size:12px;line-height:1.45;max-width:210px;word-break:break-word;">
          <strong style="font-size:13px;">${safeTitle}</strong><br/>
          Akurasi: <b>±${Math.round(newest.acc || 0)}m</b> (${safePrv})<br/>
          Baterai: <b>${newest.bat >= 0 ? `${Math.round(newest.bat)}%` : '-'}</b><br/>
          <a href="https://maps.google.com/?q=${encodeURIComponent(`${safeLat},${safeLng}`)}" target="_blank" rel="noopener noreferrer" style="color:#0284c7;font-weight:600;display:inline-block;margin-top:4px;">Buka di Google Maps &rarr;</a>
        </div>`,
        { maxWidth: 230 }
      )
      .addTo(layers);

    const latestKey = pointKey(newest);
    markersByKeyRef.current.set(latestKey, latestMarker);

    if (lastNewestKeyRef.current !== latestKey) {
      lastNewestKeyRef.current = latestKey;
      latestMarker.openPopup();
      map.setView([newest.lat, newest.lng], 16, { animate: true });
    }
  }, [points, deviceId]);

  useEffect(() => {
    if (!focusedPoint || !mapRef.current) return;
    mapRef.current.flyTo([focusedPoint.lat, focusedPoint.lng], 17, {
      duration: 0.55,
    });
    const marker = markersByKeyRef.current.get(pointKey(focusedPoint));
    if (marker) {
      marker.openPopup();
    }
  }, [focusedPoint]);

  const handleRecenter = () => {
    if (!latest || !mapRef.current) return;
    mapRef.current.flyTo([latest.lat, latest.lng], 16, { duration: 0.5 });
    markersByKeyRef.current.get(pointKey(latest))?.openPopup();
  };

  const handleFitRoute = () => {
    if (points.length < 2 || !mapRef.current) return;
    const bounds = L.latLngBounds(
      points.map((p) => [p.lat, p.lng] as L.LatLngTuple)
    );
    mapRef.current.fitBounds(bounds, {
      padding: [38, 38],
      maxZoom: 17,
      animate: true,
    });
  };

  const cycleMapStyle = () => {
    setMapStyle((prev) =>
      prev === 'dark' ? 'light' : prev === 'light' ? 'satellite' : 'dark'
    );
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl ${
        mapStyle === 'dark' ? 'osm-dark-tiles' : ''
      }`}
    >
      <div
        ref={containerRef}
        className="w-full h-[320px] sm:h-[450px] z-10"
      />

        {/* Floating Map Controls */}
        <div className="no-print absolute top-2.5 right-2.5 z-20 flex flex-wrap items-center justify-end gap-1.5 max-w-[88%]">
          <button
            type="button"
            onClick={cycleMapStyle}
            title="Ganti tampilan peta: Gelap / Terang / Satelit"
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-slate-200 border border-slate-700/80 backdrop-blur-md text-xs font-medium shadow-lg transition min-h-[38px] touch-manipulation"
          >
            {mapStyle === 'dark' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Gelap</span>
              </>
            ) : mapStyle === 'light' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Terang</span>
              </>
            ) : (
              <>
                <Satellite className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Satelit</span>
              </>
            )}
          </button>

          {points.length > 1 && (
            <button
              type="button"
              onClick={handleFitRoute}
              title="Lihat seluruh jalur riwayat"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-slate-200 border border-slate-700/80 backdrop-blur-md text-xs font-medium shadow-lg transition min-h-[38px] touch-manipulation"
            >
              <Route className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Semua Rute</span>
            </button>
          )}

          {latest && (
            <>
              <button
                type="button"
                onClick={handleRecenter}
                title="Pusatkan ke posisi terbaru"
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-slate-200 border border-slate-700/80 backdrop-blur-md text-xs font-medium shadow-lg transition min-h-[38px] touch-manipulation"
              >
                <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Pusatkan</span>
              </button>

              <a
                href={`https://maps.google.com/?q=${latest.lat},${latest.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg transition min-h-[38px] touch-manipulation"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Maps</span>
              </a>
            </>
          )}
        </div>

        {/* Empty State Overlay when no points decrypted yet */}
        {points.length === 0 && (
          <div className="no-print absolute inset-0 z-20 flex items-center justify-center p-3 sm:p-4 bg-slate-950/55 backdrop-blur-[2px]">
            <div className="max-w-sm w-full bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 sm:p-5 text-center shadow-2xl space-y-3">
              <div className="mx-auto w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Crosshair className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Peta Radar Siap Mendekripsi
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Masukkan <b>ID Perangkat</b> &amp; <b>Kunci Rahasia</b> di panel
                  kiri, atau klik tautan darurat 1-klik dari WhatsApp keluarga.
                </p>
              </div>
              <button
                type="button"
                onClick={onStartDemo}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-sky-300 transition"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Lihat Simulasi Demo Interaktif</span>
              </button>
            </div>
          </div>
        )}
    </div>
  );
};
