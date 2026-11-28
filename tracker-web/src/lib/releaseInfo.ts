import { useEffect, useState } from 'react';

export interface ReleaseInfo {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  certSha256: string;
  apkSha256: string;
  notes: string;
}

export const GITHUB_REPO_URL = 'https://github.com/tekab308-arch/lacakinHP';
export const GITHUB_RELEASES_URL =
  'https://github.com/tekab308-arch/lacakinHP/releases';
export const GITHUB_LICENSE_URL =
  'https://github.com/tekab308-arch/lacakinHP/blob/main/LICENSE';
export const GITHUB_SECURITY_URL =
  'https://github.com/tekab308-arch/lacakinHP/blob/main/SECURITY.md';
export const GITHUB_CONTRIBUTING_URL =
  'https://github.com/tekab308-arch/lacakinHP/blob/main/CONTRIBUTING.md';
export const GITHUB_ISSUES_URL =
  'https://github.com/tekab308-arch/lacakinHP/issues';
export const GITHUB_RELAY_NODE_URL =
  'https://github.com/tekab308-arch/lacakinHP/tree/main/relay-node';
export const GITHUB_ACTIONS_URL =
  'https://github.com/tekab308-arch/lacakinHP/actions';

const TRUSTED_DIRECT_APK_URLS = new Set([
  '/lacakhp-resmi.apk',
  'https://lacakinhp110.my.id/lacakhp-resmi.apk',
  'https://lacakinhp.pages.dev/lacakhp-resmi.apk',
  'https://tracker-web-xi.vercel.app/lacakhp-resmi.apk',
]);

const GITHUB_RELEASE_APK_PREFIX =
  'https://github.com/tekab308-arch/lacakinHP/releases/';

export function isTrustedApkUrl(url: string): boolean {
  const clean = (url || '').trim();
  if (!clean || clean.includes('..') || /\s/.test(clean)) return false;
  if (TRUSTED_DIRECT_APK_URLS.has(clean)) return true;
  return (
    clean.startsWith(GITHUB_RELEASE_APK_PREFIX) &&
    clean.toLowerCase().endsWith('.apk')
  );
}

export function isExternalApkUrl(apkUrl: string): boolean {
  return /^https?:\/\//i.test((apkUrl || '').trim());
}

export function getProvisioningApkUrl(apkUrl: string): string {
  const clean = (apkUrl || '').trim();
  if (isTrustedApkUrl(clean) && clean.startsWith('https://')) {
    return clean;
  }
  return 'https://lacakinhp110.my.id/lacakhp-resmi.apk';
}

export function triggerApkDownload(apkUrl: string): void {
  const target = isTrustedApkUrl(apkUrl)
    ? apkUrl.trim()
    : '/lacakhp-resmi.apk';
  const link = document.createElement('a');
  link.href = target;
  if (isExternalApkUrl(target)) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  } else {
    link.download = 'lacakhp-resmi.apk';
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const DEFAULT_RELEASE_INFO: ReleaseInfo = {
  versionCode: 8,
  versionName: '2.6',
  apkUrl: '/lacakhp-resmi.apk',
  certSha256:
    'E3:10:0D:61:55:7B:49:1F:65:E4:B2:42:CC:43:29:25:27:3B:7C:96:F5:55:27:CA:27:A9:EB:48:C3:A8:07:48',
  apkSha256:
    'de81c0fe3bc3d6cbe50a467bb4143fe4a0a41d9207ba56f12281f105cea1d970',
  notes: '',
};

let cachedReleaseInfo: ReleaseInfo | null = null;
let inflightPromise: Promise<ReleaseInfo> | null = null;

const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;
const CERT_SHA256_RE = /^([A-F0-9]{2}:){31}[A-F0-9]{2}$/i;
const VERSION_NAME_RE = /^[0-9]+\.[0-9]+(\.[0-9]+)?$/;

async function fetchReleaseInfo(): Promise<ReleaseInfo> {
  if (cachedReleaseInfo) return cachedReleaseInfo;
  if (!inflightPromise) {
    inflightPromise = fetch('/version.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (
          data &&
          typeof data.versionName === 'string' &&
          VERSION_NAME_RE.test(data.versionName.trim()) &&
          typeof data.apkSha256 === 'string' &&
          SHA256_HEX_RE.test(data.apkSha256.trim())
        ) {
          const validCert =
            typeof data.certSha256 === 'string' &&
            CERT_SHA256_RE.test(data.certSha256.trim())
              ? data.certSha256.trim().toUpperCase()
              : DEFAULT_RELEASE_INFO.certSha256;

          const rawApkUrl =
            typeof data.apkUrl === 'string' ? data.apkUrl.trim() : '';
          const resolvedApkUrl =
            rawApkUrl.startsWith(GITHUB_RELEASE_APK_PREFIX) &&
            isTrustedApkUrl(rawApkUrl)
              ? rawApkUrl
              : DEFAULT_RELEASE_INFO.apkUrl;

          cachedReleaseInfo = {
            versionCode:
              typeof data.versionCode === 'number' &&
              Number.isInteger(data.versionCode) &&
              data.versionCode > 0
                ? data.versionCode
                : DEFAULT_RELEASE_INFO.versionCode,
            versionName: data.versionName.trim(),
            apkUrl: resolvedApkUrl,
            certSha256: validCert,
            apkSha256: data.apkSha256.trim().toLowerCase(),
            notes: typeof data.notes === 'string' ? data.notes.slice(0, 500) : '',
          };
          return cachedReleaseInfo;
        }
        return DEFAULT_RELEASE_INFO;
      })
      .catch(() => DEFAULT_RELEASE_INFO)
      .finally(() => {
        inflightPromise = null;
      });
  }
  return inflightPromise;
}

export function useReleaseInfo(): ReleaseInfo {
  const [info, setInfo] = useState<ReleaseInfo>(
    () => cachedReleaseInfo ?? DEFAULT_RELEASE_INFO
  );

  useEffect(() => {
    let active = true;
    fetchReleaseInfo().then((resolved) => {
      if (active) setInfo(resolved);
    });
    return () => {
      active = false;
    };
  }, []);

  return info;
}

export function shortHexHash(hex: string): string {
  const clean = (hex || '').trim();
  if (clean.length <= 19) return clean;
  return `${clean.slice(0, 8)}...${clean.slice(-8)}`;
}

export function shortCertFingerprint(cert: string): string {
  const clean = (cert || '').trim();
  if (clean.length <= 23) return clean;
  return `${clean.slice(0, 11)}...${clean.slice(-8)}`;
}

export async function computeBufferSha256Hex(
  buffer: ArrayBuffer
): Promise<string> {
  const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuf), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

export function verifyApkHash(
  actualSha256: string,
  expectedSha256: string
): boolean {
  const a = (actualSha256 || '').trim().toLowerCase();
  const e = (expectedSha256 || '').trim().toLowerCase();
  if (!SHA256_HEX_RE.test(a) || !SHA256_HEX_RE.test(e)) return false;
  return a === e;
}
