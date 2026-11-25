import { DecryptedLocationPoint } from './crypto';
import { RawNostrEvent, RelayQueryStatus } from './nostr';

export const DEMO_DEVICE_ID = 'demo-samsung-a21s';
export const DEMO_SECRET = 'kucing-hitam-jaga-hp-2026';

export interface DemoStoryStage {
  stage: number;
  title: string;
  badge: string;
  tone: 'sky' | 'amber' | 'rose' | 'emerald' | 'indigo';
  detail: string;
  point: DecryptedLocationPoint;
}

export interface DemoScenarioData {
  stages: DemoStoryStage[];
  rawSampleEvent: RawNostrEvent;
  relayStatuses: Record<string, RelayQueryStatus>;
  failoverRelayStatuses: Record<string, RelayQueryStatus>;
  pubHex: string;
}

export function buildDemoScenario(): DemoScenarioData {
  const now = Date.now();
  const min = 60_000;

  // Realistic route in Bandar Lampung: Stasiun Tanjungkarang -> Jl. Teuku Umar -> Mal Boemi Kedaton (MBK)
  const stages: DemoStoryStage[] = [
    {
      stage: 1,
      title: 'HP Tertinggal di Stasiun Tanjung Karang',
      badge: '4G • Enkripsi v2',
      tone: 'sky',
      detail:
        'Pelacak mencatat posisi awal di Bandar Lampung dan langsung mengacaknya dengan AES-256-GCM sebelum dikirim ke 3 relay Nostr.',
      point: {
        lat: -5.4088,
        lng: 105.26,
        acc: 12,
        prv: 'gps',
        bat: 32,
        ts: now - 35 * min,
        mdl: 'SAMSUNG SM-A217F (DEMO)',
      },
    },
    {
      stage: 2,
      title: 'Pencuri Aktifkan Mode Pesawat',
      badge: 'Kotak Hitam SQLite',
      tone: 'amber',
      detail:
        'Internet diputus di koridor Jl. Teuku Umar! Chip GPS satelit tidak butuh kuota — HP diam-diam menyimpan koordinat ke antrean lokal SQLite.',
      point: {
        lat: -5.4015,
        lng: 105.25985,
        acc: 15,
        prv: 'gps',
        bat: 27,
        ts: now - 24 * min,
        mdl: 'SAMSUNG SM-A217F (DEMO)',
      },
    },
    {
      stage: 3,
      title: 'Tersambung Wi-Fi Kedaton → Auto-Flush',
      badge: 'Wi-Fi Auto-Sync',
      tone: 'indigo',
      detail:
        'Begitu melewati area Wi-Fi terbuka selama 4 detik, seluruh antrean SQLite otomatis tersinkron ke jaringan relay.',
      point: {
        lat: -5.3948,
        lng: 105.25965,
        acc: 19,
        prv: 'fused',
        bat: 21,
        ts: now - 18 * min,
        mdl: 'SAMSUNG SM-A217F (DEMO)',
      },
    },
    {
      stage: 4,
      title: 'Ganti SIM & Salah PIN Layar 3x',
      badge: 'Anti-SIM Swap',
      tone: 'rose',
      detail:
        'Pencuri menukar kartu SIM di sekitar Kedaton dan salah menebak PIN layar. HP mengirim alert lokasi via Nostr serta SMS darurat memakai pulsa SIM baru.',
      point: {
        lat: -5.3886,
        lng: 105.25945,
        acc: 14,
        prv: 'gps',
        bat: 16,
        ts: now - 11 * min,
        mdl: 'SAMSUNG SM-A217F (DEMO)',
      },
    },
    {
      stage: 5,
      title: 'Last-Gasp Baterai Kritis (7%)',
      badge: 'Napas Terakhir ≤ 8%',
      tone: 'amber',
      detail:
        'Mendekati simpang Sultan Agung sebelum daya habis, HP memaksa penguncian GPS akurat terakhir lalu menembakkan laporan darurat ke Nostr & keluarga.',
      point: {
        lat: -5.3842,
        lng: 105.2593,
        acc: 11,
        prv: 'gps',
        bat: 7,
        ts: now - 5 * min,
        mdl: 'SAMSUNG SM-A217F (DEMO)',
      },
    },
    {
      stage: 6,
      title: 'Titik Terakhir di Mall MBK (±9m)',
      badge: 'Mal Boemi Kedaton • Lampung',
      tone: 'emerald',
      detail:
        'Posisi paling akurat terkunci di area Mal Boemi Kedaton (MBK), Bandar Lampung — siap dibuka di Google Maps atau dicetak ke PDF untuk laporan Polsek/Polres.',
      point: {
        lat: -5.38216,
        lng: 105.25922,
        acc: 9,
        prv: 'gps',
        bat: 7,
        ts: now - 2 * min,
        mdl: 'SAMSUNG SM-A217F (DEMO)',
      },
    },
  ];

  const rawSampleEvent: RawNostrEvent = {
    id: '4f9c2a8b10e3d77f8912a34b5c6d7e8f9012a34b5c6d7e8f9012a34b5c6d7e8f',
    pubkey: '9a7c4e21b8d503f6c112a984e7d21f408c55e12b3a9f701d8e6c2a44b91e03f2',
    created_at: Math.floor((now - 2 * min) / 1000),
    kind: 30078,
    tags: [['d', 'lacakhp-latest']],
    content:
      'v1:r7KpQ9xWmN2aL8vC:mZ4tYpQ1sX9wK7bN3cV6jH8fD2gR5uI0oP1aS3dF5gH7jK9lZ2xC4vB6nM8==',
    sig: 'demo_bip340_schnorr_signature_verified_locally_in_browser',
  };

  const relayStatuses: Record<string, RelayQueryStatus> = {
    'wss://relay.damus.io': {
      url: 'wss://relay.damus.io',
      state: 'done',
      eventCount: 6,
      latencyMs: 184,
    },
    'wss://nos.lol': {
      url: 'wss://nos.lol',
      state: 'done',
      eventCount: 6,
      latencyMs: 132,
    },
    'wss://relay.primal.net': {
      url: 'wss://relay.primal.net',
      state: 'done',
      eventCount: 6,
      latencyMs: 96,
    },
  };

  const failoverRelayStatuses: Record<string, RelayQueryStatus> = {
    'wss://relay.damus.io': {
      url: 'wss://relay.damus.io',
      state: 'error',
      eventCount: 0,
      latencyMs: 5500,
    },
    'wss://nos.lol': {
      url: 'wss://nos.lol',
      state: 'error',
      eventCount: 0,
      latencyMs: 5500,
    },
    'wss://relay.primal.net': {
      url: 'wss://relay.primal.net',
      state: 'done',
      eventCount: 6,
      latencyMs: 112,
    },
    'wss://offchain.pub': {
      url: 'wss://offchain.pub',
      state: 'done',
      eventCount: 6,
      latencyMs: 245,
      isFallback: true,
    },
    'wss://nostr.mom': {
      url: 'wss://nostr.mom',
      state: 'done',
      eventCount: 6,
      latencyMs: 289,
      isFallback: true,
    },
    'wss://nostr.bitcoiner.social': {
      url: 'wss://nostr.bitcoiner.social',
      state: 'done',
      eventCount: 6,
      latencyMs: 214,
      isFallback: true,
    },
  };

  return {
    stages,
    rawSampleEvent,
    relayStatuses,
    failoverRelayStatuses,
    pubHex: rawSampleEvent.pubkey,
  };
}
