import React, { useEffect, useRef, useState } from 'react';

type NodeRole = 'origin' | 'relay' | 'ipfs' | 'client';
type NodeColor = 'sky' | 'indigo' | 'emerald';

interface NodeSpec {
  id: string;
  role: NodeRole;
  label: string;
  mobileLabel: string;
  sublabel: string;
  color: NodeColor;
  toggleable: boolean;
  desktopPos: [number, number];
  mobilePos: [number, number];
  labelPosDesktop: 'top' | 'bottom';
  labelPosMobile: 'top' | 'bottom';
}

interface EdgeSpec {
  id: string;
  from: string;
  to: string;
  kind: 'ingress' | 'gossip' | 'egress' | 'ipfs';
  curveOffset: number;
}

interface Packet {
  fromId: string;
  toId: string;
  edgeId: string;
  progress: number;
  speed: number;
  color: NodeColor;
  kind: 'ingress' | 'gossip' | 'egress' | 'ipfs';
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: NodeColor | 'amber';
}

interface MicroNode {
  nx: number;
  ny: number;
  vx: number;
  vy: number;
}

const NODE_SPECS: NodeSpec[] = [
  {
    id: 'edge',
    role: 'origin',
    label: 'EDGE · HP TARGET',
    mobileLabel: 'EDGE · HP',
    sublabel: 'GPS + AES-256-GCM',
    color: 'sky',
    toggleable: false,
    desktopPos: [0.13, 0.50],
    mobilePos: [0.50, 0.14],
    labelPosDesktop: 'bottom',
    labelPosMobile: 'top',
  },
  {
    id: 'damus',
    role: 'relay',
    label: 'relay.damus.io',
    mobileLabel: 'damus.io',
    sublabel: 'Nostr Relay · WSS',
    color: 'sky',
    toggleable: true,
    desktopPos: [0.38, 0.22],
    mobilePos: [0.20, 0.36],
    labelPosDesktop: 'top',
    labelPosMobile: 'top',
  },
  {
    id: 'nos',
    role: 'relay',
    label: 'nos.lol',
    mobileLabel: 'nos.lol',
    sublabel: 'Nostr Relay · WSS',
    color: 'sky',
    toggleable: true,
    desktopPos: [0.49, 0.48],
    mobilePos: [0.50, 0.50],
    labelPosDesktop: 'top',
    labelPosMobile: 'bottom',
  },
  {
    id: 'primal',
    role: 'relay',
    label: 'relay.primal.net',
    mobileLabel: 'primal.net',
    sublabel: 'Nostr Relay · WSS',
    color: 'sky',
    toggleable: true,
    desktopPos: [0.39, 0.78],
    mobilePos: [0.20, 0.65],
    labelPosDesktop: 'bottom',
    labelPosMobile: 'bottom',
  },
  {
    id: 'offchain',
    role: 'relay',
    label: 'offchain.pub',
    mobileLabel: 'offchain.pub',
    sublabel: 'Nostr Relay · WSS',
    color: 'sky',
    toggleable: true,
    desktopPos: [0.63, 0.74],
    mobilePos: [0.80, 0.65],
    labelPosDesktop: 'bottom',
    labelPosMobile: 'bottom',
  },
  {
    id: 'ipfs',
    role: 'ipfs',
    label: 'ipfs.4everland',
    mobileLabel: 'ipfs.swarm',
    sublabel: 'IPFS Web Mirror · CID',
    color: 'indigo',
    toggleable: true,
    desktopPos: [0.62, 0.21],
    mobilePos: [0.80, 0.36],
    labelPosDesktop: 'top',
    labelPosMobile: 'top',
  },
  {
    id: 'client',
    role: 'client',
    label: 'CLIENT · PELACAK',
    mobileLabel: 'CLIENT · PELACAK',
    sublabel: 'BIP-340 + Dekripsi Lokal',
    color: 'emerald',
    toggleable: false,
    desktopPos: [0.87, 0.50],
    mobilePos: [0.50, 0.86],
    labelPosDesktop: 'bottom',
    labelPosMobile: 'bottom',
  },
];

const EDGE_SPECS: EdgeSpec[] = [
  // Primary ingress (HP -> Nostr relays)
  { id: 'e-damus', from: 'edge', to: 'damus', kind: 'ingress', curveOffset: -18 },
  { id: 'e-nos', from: 'edge', to: 'nos', kind: 'ingress', curveOffset: -8 },
  { id: 'e-primal', from: 'edge', to: 'primal', kind: 'ingress', curveOffset: 18 },
  { id: 'e-offchain', from: 'edge', to: 'offchain', kind: 'ingress', curveOffset: 24 },

  // Relay-to-relay gossip mesh
  { id: 'g-damus-nos', from: 'damus', to: 'nos', kind: 'gossip', curveOffset: -10 },
  { id: 'g-nos-primal', from: 'nos', to: 'primal', kind: 'gossip', curveOffset: 10 },
  { id: 'g-primal-offchain', from: 'primal', to: 'offchain', kind: 'gossip', curveOffset: 12 },
  { id: 'g-nos-offchain', from: 'nos', to: 'offchain', kind: 'gossip', curveOffset: -10 },
  { id: 'g-damus-ipfs', from: 'damus', to: 'ipfs', kind: 'gossip', curveOffset: -12 },

  // Primary egress (Nostr relays -> Verifier Client)
  { id: 'x-damus', from: 'damus', to: 'client', kind: 'egress', curveOffset: -18 },
  { id: 'x-nos', from: 'nos', to: 'client', kind: 'egress', curveOffset: -8 },
  { id: 'x-primal', from: 'primal', to: 'client', kind: 'egress', curveOffset: 20 },
  { id: 'x-offchain', from: 'offchain', to: 'client', kind: 'egress', curveOffset: 14 },

  // IPFS Web Mirror delivery
  { id: 'i-ipfs-client', from: 'ipfs', to: 'client', kind: 'ipfs', curveOffset: -22 },
];

const RELAY_IDS = ['damus', 'nos', 'primal', 'offchain'] as const;

const GOSSIP_NEIGHBORS: Record<string, { to: string; edgeId: string }[]> = {
  damus: [{ to: 'nos', edgeId: 'g-damus-nos' }],
  nos: [
    { to: 'primal', edgeId: 'g-nos-primal' },
    { to: 'offchain', edgeId: 'g-nos-offchain' },
  ],
  primal: [{ to: 'offchain', edgeId: 'g-primal-offchain' }],
  offchain: [{ to: 'nos', edgeId: 'g-nos-offchain' }],
};

const COLOR_RGB: Record<NodeColor | 'amber' | 'rose', string> = {
  sky: '56, 189, 248',
  indigo: '129, 140, 248',
  emerald: '52, 211, 153',
  amber: '245, 158, 11',
  rose: '244, 63, 94',
};

const NODE_BY_ID: Record<string, NodeSpec> = Object.fromEntries(
  NODE_SPECS.map((n) => [n.id, n])
);

const EDGE_BY_ID: Record<string, EdgeSpec> = Object.fromEntries(
  EDGE_SPECS.map((e) => [e.id, e])
);

function getQuadraticControlPoint(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  offset: number
): [number, number] {
  const mx = (ax + bx) * 0.5;
  const my = (ay + by) * 0.5;
  const dx = bx - ax;
  const dy = by - ay;
  const chordLen = Math.hypot(dx, dy) || 1;
  const scaledOffset =
    Math.min(Math.abs(offset), chordLen * 0.14) * Math.sign(offset);
  return [
    mx + (-dy / chordLen) * scaledOffset,
    my + (dx / chordLen) * scaledOffset,
  ];
}

function evalQuadraticBezier(
  ax: number,
  ay: number,
  cx: number,
  cy: number,
  bx: number,
  by: number,
  t: number
): [number, number] {
  const mt = 1 - t;
  const x = mt * mt * ax + 2 * mt * t * cx + t * t * bx;
  const y = mt * mt * ay + 2 * mt * t * cy + t * t * by;
  return [x, y];
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function drawCanvasLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  font: string,
  fillStyle: string,
  drawPill: boolean
): { safeX: number; safeY: number } {
  ctx.font = font;
  const textWidth = ctx.measureText(text).width;
  const safeX = Math.max(
    textWidth * 0.5 + 10,
    Math.min(w - textWidth * 0.5 - 10, x)
  );
  const safeY = Math.max(12, Math.min(h - 12, y));

  if (drawPill) {
    const padX = 5;
    const padY = 2;
    const pillH = 14 + padY * 2;
    const pillW = textWidth + padX * 2;
    ctx.fillStyle = 'rgba(6, 9, 17, 0.78)';
    fillRoundedRect(
      ctx,
      safeX - pillW * 0.5,
      safeY - pillH * 0.5,
      pillW,
      pillH,
      4
    );
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, safeX, safeY);

  return { safeX, safeY };
}

export const Web3SovereignMeshAnimation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [offlineIds, setOfflineIds] = useState<string[]>([]);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  const offlineRef = useRef<Set<string>>(new Set());
  const hoveredRef = useRef<string | null>(null);
  const packetsRef = useRef<Packet[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const nodeActivityRef = useRef<Record<string, number>>({});
  const edgeEnergyRef = useRef<Record<string, number>>({});
  const microNodesRef = useRef<MicroNode[]>(
    Array.from({ length: 12 }, (_, idx) => {
      const angle = (idx / 12) * Math.PI * 2;
      const rx = 0.44 * Math.cos(angle);
      const ry = 0.42 * Math.sin(angle);
      return {
        nx: Math.max(0.05, Math.min(0.95, 0.5 + rx)),
        ny: Math.max(0.07, Math.min(0.93, 0.5 + ry)),
        vx: (idx % 2 === 0 ? 1 : -1) * (0.00018 + (idx % 3) * 0.00008),
        vy: (idx % 3 === 0 ? -1 : 1) * (0.00015 + (idx % 4) * 0.00006),
      };
    })
  );
  const sizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const renderNowRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    offlineRef.current = new Set(offlineIds);
    renderNowRef.current?.();
  }, [offlineIds]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let rafId = 0;
    let lastDrawTs = 0;
    let lastBroadcastTs = 0;
    let lastIpfsTs = 0;
    let orbitAngle = 0;
    let bgGrad: CanvasGradient | null = null;

    const getCoords = (w: number, h: number): Record<string, [number, number]> => {
      const isMobile = w < 560;
      const out: Record<string, [number, number]> = {};
      for (const n of NODE_SPECS) {
        const [fx, fy] = isMobile ? n.mobilePos : n.desktopPos;
        out[n.id] = [fx * w, fy * h];
      }
      return out;
    };

    const dispatchGpsBurst = () => {
      const { width: w, height: h } = sizeRef.current;
      if (!w || !h) return;
      const coords = getCoords(w, h);
      const [ex, ey] = coords.edge;
      const onlineRelays = RELAY_IDS.filter((id) => !offlineRef.current.has(id));

      if (onlineRelays.length === 0) {
        nodeActivityRef.current.edge = 0.85;
        ripplesRef.current.push({
          x: ex,
          y: ey,
          radius: 10,
          maxRadius: 34,
          alpha: 0.7,
          color: 'amber',
        });
        return;
      }

      nodeActivityRef.current.edge = 1;
      ripplesRef.current.push({
        x: ex,
        y: ey,
        radius: 10,
        maxRadius: 38,
        alpha: 0.78,
        color: 'sky',
      });

      for (const relayId of onlineRelays) {
        const edgeId = `e-${relayId}`;
        packetsRef.current.push({
          fromId: 'edge',
          toId: relayId,
          edgeId,
          progress: 0,
          speed: 0.015 + Math.random() * 0.005,
          color: 'sky',
          kind: 'ingress',
        });
      }
    };

    const dispatchIpfsPulse = () => {
      if (offlineRef.current.has('ipfs')) return;
      nodeActivityRef.current.ipfs = 0.85;
      packetsRef.current.push({
        fromId: 'ipfs',
        toId: 'client',
        edgeId: 'i-ipfs-client',
        progress: 0,
        speed: 0.011,
        color: 'indigo',
        kind: 'ipfs',
      });
    };

    const drawFrame = (ts: number = performance.now()) => {
      rafId = 0;
      if (document.hidden && !prefersReducedMotion) return;

      const { width: w, height: h } = sizeRef.current;
      if (w <= 0 || h <= 0) return;

      const isMobile = w < 560;
      if (!prefersReducedMotion && w < 640 && ts - lastDrawTs < 33) {
        rafId = window.requestAnimationFrame(drawFrame);
        return;
      }
      lastDrawTs = ts;

      if (!prefersReducedMotion) {
        orbitAngle += 0.009;
        if (lastBroadcastTs === 0 || ts - lastBroadcastTs >= 1900) {
          lastBroadcastTs = ts;
          dispatchGpsBurst();
        }
        if (lastIpfsTs === 0 || ts - lastIpfsTs >= 3400) {
          lastIpfsTs = ts;
          dispatchIpfsPulse();
        }
      }

      ctx.clearRect(0, 0, w, h);

      // Cached radial ambient backdrop
      if (bgGrad) {
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // Micro dot-matrix grid (24px spacing)
      ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
      const step = 24;
      for (let gx = 12; gx < w; gx += step) {
        for (let gy = 12; gy < h; gy += step) {
          ctx.fillRect(gx, gy, 0.9, 0.9);
        }
      }

      const coords = getCoords(w, h);
      const hoveredId = hoveredRef.current;

      // Peripheral micro-nodes with hairline links to nearby relays for spatial P2P depth
      const relayCoords = RELAY_IDS.map((id) => ({ id, pos: coords[id] }));
      for (const m of microNodesRef.current) {
        if (!prefersReducedMotion) {
          m.nx += m.vx;
          m.ny += m.vy;
          if (m.nx < 0.04 || m.nx > 0.96) m.vx *= -1;
          if (m.ny < 0.06 || m.ny > 0.94) m.vy *= -1;
        }
        const mx = m.nx * w;
        const my = m.ny * h;

        let nearestDist = Infinity;
        let nearestPos: [number, number] | null = null;
        for (const r of relayCoords) {
          const d = Math.hypot(mx - r.pos[0], my - r.pos[1]);
          if (d < nearestDist) {
            nearestDist = d;
            nearestPos = r.pos;
          }
        }
        if (nearestPos && nearestDist < (isMobile ? 115 : 175)) {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(nearestPos[0], nearestPos[1]);
          ctx.stroke();
        }

        ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.beginPath();
        ctx.arc(mx, my, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Decay node & edge energy smoothly
      for (const id of Object.keys(nodeActivityRef.current)) {
        nodeActivityRef.current[id] = Math.max(0, nodeActivityRef.current[id] - 0.025);
      }
      for (const id of Object.keys(edgeEnergyRef.current)) {
        edgeEnergyRef.current[id] = Math.max(0, edgeEnergyRef.current[id] - 0.03);
      }

      // Advance multi-hop gossip packets
      if (!prefersReducedMotion) {
        for (let i = packetsRef.current.length - 1; i >= 0; i--) {
          const p = packetsRef.current[i];
          const fromOffline = offlineRef.current.has(p.fromId);
          const toOffline = offlineRef.current.has(p.toId);
          if (fromOffline || toOffline) {
            packetsRef.current.splice(i, 1);
            continue;
          }

          edgeEnergyRef.current[p.edgeId] = Math.max(
            edgeEnergyRef.current[p.edgeId] || 0,
            0.72
          );
          p.progress += p.speed;

          if (p.progress >= 1) {
            const targetPos = coords[p.toId];
            if (targetPos) {
              nodeActivityRef.current[p.toId] = 1;
              ripplesRef.current.push({
                x: targetPos[0],
                y: targetPos[1],
                radius: 8,
                maxRadius: p.toId === 'client' ? 30 : 24,
                alpha: 0.65,
                color:
                  p.toId === 'client'
                    ? p.kind === 'ipfs'
                      ? 'indigo'
                      : 'emerald'
                    : p.color,
              });
            }

            if (p.kind === 'ingress') {
              // Forward verified packet to Client Tracker
              packetsRef.current.push({
                fromId: p.toId,
                toId: 'client',
                edgeId: `x-${p.toId}`,
                progress: 0,
                speed: 0.017 + Math.random() * 0.005,
                color: 'emerald',
                kind: 'egress',
              });

              // Subtle peer-gossip pulse to an adjacent online relay
              const neighbors = GOSSIP_NEIGHBORS[p.toId] || [];
              const onlineNeighbor = neighbors.find(
                (n) => !offlineRef.current.has(n.to)
              );
              if (onlineNeighbor && Math.random() < 0.65) {
                packetsRef.current.push({
                  fromId: p.toId,
                  toId: onlineNeighbor.to,
                  edgeId: onlineNeighbor.edgeId,
                  progress: 0,
                  speed: 0.022,
                  color: 'sky',
                  kind: 'gossip',
                });
              }
            }

            packetsRef.current.splice(i, 1);
          }
        }
      }

      // Draw curved Bezier edges
      const offsetScale = isMobile ? 0.65 : 1;
      for (const e of EDGE_SPECS) {
        const a = coords[e.from];
        const b = coords[e.to];
        if (!a || !b) continue;

        const isOfflineEdge =
          offlineRef.current.has(e.from) || offlineRef.current.has(e.to);
        const isHoveredEdge =
          hoveredId !== null && (e.from === hoveredId || e.to === hoveredId);
        const energy = edgeEnergyRef.current[e.id] || 0;
        const [cx, cy] = getQuadraticControlPoint(
          a[0],
          a[1],
          b[0],
          b[1],
          e.curveOffset * offsetScale
        );

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.quadraticCurveTo(cx, cy, b[0], b[1]);

        if (isOfflineEdge) {
          ctx.setLineDash([4, 5]);
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.2)';
          ctx.lineWidth = 1;
        } else {
          if (e.kind === 'ipfs') {
            ctx.setLineDash([4, 4]);
          }
          const baseAlpha =
            e.kind === 'gossip' ? 0.12 : e.kind === 'ipfs' ? 0.18 : 0.17;
          const alpha = Math.min(
            0.55,
            baseAlpha + (isHoveredEdge ? 0.24 : 0) + energy * 0.28
          );
          const rgb =
            e.kind === 'ipfs'
              ? COLOR_RGB.indigo
              : e.kind === 'egress'
                ? COLOR_RGB.emerald
                : COLOR_RGB.sky;
          ctx.strokeStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
          ctx.lineWidth = isHoveredEdge || energy > 0.2 ? 1.45 : 1;
        }
        ctx.stroke();
        ctx.restore();
      }

      // Draw tapered comet packets along quadratic Bezier curves
      for (const p of packetsRef.current) {
        const edge = EDGE_BY_ID[p.edgeId];
        const a = coords[p.fromId];
        const b = coords[p.toId];
        if (!edge || !a || !b) continue;

        const reverseSign = edge.from === p.fromId ? 1 : -1;
        const [cx, cy] = getQuadraticControlPoint(
          a[0],
          a[1],
          b[0],
          b[1],
          edge.curveOffset * offsetScale * reverseSign
        );

        const rgb = COLOR_RGB[p.color];
        const tailSegments = 4;
        const tailSpan = 0.15;

        for (let s = 0; s < tailSegments; s++) {
          const t0 = Math.max(0, p.progress - ((s + 1) / tailSegments) * tailSpan);
          const t1 = Math.max(0, p.progress - (s / tailSegments) * tailSpan);
          if (t1 <= t0) continue;
          const [x0, y0] = evalQuadraticBezier(a[0], a[1], cx, cy, b[0], b[1], t0);
          const [x1, y1] = evalQuadraticBezier(a[0], a[1], cx, cy, b[0], b[1], t1);
          const segAlpha = ((tailSegments - s) / tailSegments) * 0.65;
          ctx.strokeStyle = `rgba(${rgb}, ${segAlpha.toFixed(3)})`;
          ctx.lineWidth = 2.2 - s * 0.35;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }

        const [px, py] = evalQuadraticBezier(
          a[0],
          a[1],
          cx,
          cy,
          b[0],
          b[1],
          p.progress
        );
        ctx.fillStyle = `rgba(${rgb}, 0.28)`;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${rgb}, 1)`;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw & decay arrival ripples
      for (let k = ripplesRef.current.length - 1; k >= 0; k--) {
        const r = ripplesRef.current[k];
        if (!prefersReducedMotion) {
          r.radius += 0.65;
          r.alpha -= 0.02;
        }
        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          ripplesRef.current.splice(k, 1);
          continue;
        }
        const rgb = COLOR_RGB[r.color];
        ctx.strokeStyle = `rgba(${rgb}, ${r.alpha.toFixed(3)})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw geometric nodes & dynamic clamped monospace labels
      for (const n of NODE_SPECS) {
        const pos = coords[n.id];
        if (!pos) continue;
        const [x, y] = pos;
        const isOffline = offlineRef.current.has(n.id);
        const isHovered = hoveredId === n.id;
        const activity = nodeActivityRef.current[n.id] || 0;
        const isPrimary = n.role === 'origin' || n.role === 'client';
        const baseR = isPrimary ? 9.5 : 7;
        const rgb = isOffline ? COLOR_RGB.rose : COLOR_RGB[n.color];

        // Slow rotating ultra-thin dashed orbit ring on origin & client
        if (isPrimary && !isOffline) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(n.role === 'origin' ? orbitAngle : -orbitAngle);
          ctx.setLineDash([3, 5]);
          ctx.strokeStyle = `rgba(${rgb}, ${(0.28 + activity * 0.25).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, baseR + 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Soft halo
        const haloAlpha = isOffline
          ? 0.08
          : 0.12 + activity * 0.24 + (isHovered ? 0.14 : 0);
        ctx.fillStyle = `rgba(${rgb}, ${haloAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, baseR + 7 + activity * 3, 0, Math.PI * 2);
        ctx.fill();

        // Crisp dark inner disk
        ctx.fillStyle = '#070b14';
        ctx.beginPath();
        ctx.arc(x, y, baseR, 0, Math.PI * 2);
        ctx.fill();

        // Precision outer ring
        ctx.save();
        if (isOffline) ctx.setLineDash([3, 3]);
        ctx.strokeStyle = `rgba(${rgb}, ${(isOffline ? 0.65 : isHovered ? 0.98 : 0.78).toFixed(3)})`;
        ctx.lineWidth = isHovered || isPrimary ? 1.6 : 1.25;
        ctx.beginPath();
        ctx.arc(x, y, baseR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Solid center dot or crisp offline × mark
        if (isOffline) {
          ctx.strokeStyle = `rgba(${COLOR_RGB.rose}, 0.85)`;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(x - 2.6, y - 2.6);
          ctx.lineTo(x + 2.6, y + 2.6);
          ctx.moveTo(x + 2.6, y - 2.6);
          ctx.lineTo(x - 2.6, y + 2.6);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${rgb}, 0.96)`;
          ctx.beginPath();
          ctx.arc(x, y, isPrimary ? 3.2 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Dynamic clamped monospace label with subtle legibility backdrop
        const label = isMobile ? n.mobileLabel : n.label;
        const posDir = isMobile ? n.labelPosMobile : n.labelPosDesktop;
        const labelOffsetY = posDir === 'top' ? -(baseR + 18) : baseR + 19;
        const primaryFont = `${isPrimary ? 600 : 500} ${isMobile ? 10 : 11}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
        const primaryFill = isOffline
          ? 'rgba(251, 113, 133, 0.92)'
          : isHovered || isPrimary
            ? 'rgba(241, 245, 249, 0.98)'
            : 'rgba(203, 213, 225, 0.88)';

        const { safeY } = drawCanvasLabel(
          ctx,
          label,
          x,
          y + labelOffsetY,
          w,
          h,
          primaryFont,
          primaryFill,
          true
        );

        if (isOffline) {
          const tagY = posDir === 'top' ? safeY - 14 : safeY + 14;
          drawCanvasLabel(
            ctx,
            '[OFFLINE]',
            x,
            tagY,
            w,
            h,
            '500 9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            'rgba(244, 63, 94, 0.88)',
            false
          );
        } else if (isPrimary && !isMobile) {
          const subY = posDir === 'top' ? safeY - 14 : safeY + 14;
          drawCanvasLabel(
            ctx,
            n.sublabel,
            x,
            subY,
            w,
            h,
            '400 9.5px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            'rgba(148, 163, 184, 0.78)',
            false
          );
        }
      }

      if (!prefersReducedMotion) {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    renderNowRef.current = () => {
      if (!rafId) {
        drawFrame(performance.now());
      }
    };

    const updateCanvasSize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) return;

      sizeRef.current = { width, height };
      const dpr = Math.min(window.devicePixelRatio || 1, width < 640 ? 1.5 : 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        10,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.65
      );
      bgGrad.addColorStop(0, 'rgba(14, 24, 44, 0.36)');
      bgGrad.addColorStop(1, 'rgba(6, 9, 17, 0)');

      drawFrame(performance.now());
    };

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    resizeObserver.observe(container);
    updateCanvasSize();

    const findHitNode = (clientX: number, clientY: number): NodeSpec | null => {
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const coords = getCoords(rect.width, rect.height);

      let closest: NodeSpec | null = null;
      let minDist = rect.width < 560 ? 36 : 28;
      for (const n of NODE_SPECS) {
        const pos = coords[n.id];
        if (!pos) continue;
        const d = Math.hypot(px - pos[0], py - pos[1]);
        if (d <= minDist) {
          minDist = d;
          closest = n;
        }
      }
      return closest;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const hit = findHitNode(e.clientX, e.clientY);
      const nextId = hit ? hit.id : null;
      canvas.style.cursor = hit ? 'pointer' : 'default';
      if (hoveredRef.current !== nextId) {
        hoveredRef.current = nextId;
        setFocusedNodeId(nextId);
        renderNowRef.current?.();
      }
    };

    const onPointerLeave = () => {
      canvas.style.cursor = 'default';
      if (hoveredRef.current !== null) {
        hoveredRef.current = null;
        setFocusedNodeId(null);
        renderNowRef.current?.();
      }
    };

    const onClick = (e: MouseEvent) => {
      const hit = findHitNode(e.clientX, e.clientY);
      if (!hit) {
        if (hoveredRef.current !== null) {
          hoveredRef.current = null;
          setFocusedNodeId(null);
          renderNowRef.current?.();
        }
        return;
      }

      hoveredRef.current = hit.id;
      setFocusedNodeId(hit.id);
      if (hit.id === 'edge') {
        dispatchGpsBurst();
        renderNowRef.current?.();
        return;
      }

      if (hit.toggleable) {
        setOfflineIds((prev) =>
          prev.includes(hit.id)
            ? prev.filter((id) => id !== hit.id)
            : [...prev, hit.id]
        );
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      } else if (!prefersReducedMotion && !rafId) {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('click', onClick);
    document.addEventListener('visibilitychange', onVisibilityChange);

    if (!prefersReducedMotion && !document.hidden) {
      rafId = window.requestAnimationFrame(drawFrame);
    }

    return () => {
      renderNowRef.current = null;
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const offlineSet = new Set(offlineIds);
  const activeRelayCount = RELAY_IDS.filter((id) => !offlineSet.has(id)).length;
  const focusedNode = focusedNodeId ? NODE_BY_ID[focusedNodeId] : null;
  const focusedOffline = focusedNode ? offlineSet.has(focusedNode.id) : false;

  const statusText = focusedNode
    ? `${focusedNode.label} · ${focusedNode.sublabel} · ${
        focusedOffline
          ? 'OFFLINE (Klik untuk aktifkan)'
          : focusedNode.toggleable
            ? 'ONLINE (Klik untuk simulasi gangguan)'
            : focusedNode.role === 'origin'
              ? 'Klik untuk kirim ping GPS'
              : 'Verifikasi BIP-340 lokal'
      }`
    : activeRelayCount === 0
      ? 'Semua relay offline — paket terenkripsi antre lokal di HP hingga minimal 1 relay aktif'
      : offlineIds.length > 0
        ? `${offlineIds.length} node dinonaktifkan — paket otomatis reroute melewati ${activeRelayCount} relay aktif`
        : 'Klik node relay untuk simulasi gangguan · Klik HP Target untuk ping';

  const relayStatusClass =
    activeRelayCount >= 2
      ? 'text-emerald-400'
      : activeRelayCount === 1
        ? 'text-amber-400'
        : 'text-rose-400';

  return (
    <section className="rounded-2xl bg-slate-950/85 border border-slate-800/90 overflow-hidden relative backdrop-blur-sm">
      {/* Minimal Top Header Strip */}
      <div className="px-4 sm:px-5 py-3 border-b border-slate-800/70 flex items-center justify-between gap-2 font-mono text-[0.6875rem]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="sm:hidden text-slate-200 font-semibold tracking-wider truncate">
            TOPOLOGI NODE P2P
          </span>
          <span className="hidden sm:inline text-slate-200 font-semibold tracking-wider truncate">
            TOPOLOGI JARINGAN P2P · ZERO-SERVER MESH
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className={`font-semibold ${relayStatusClass}`}>
            {activeRelayCount}/4 RELAY AKTIF
          </span>
          {offlineIds.length > 0 && (
            <button
              type="button"
              onClick={() => setOfflineIds([])}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition cursor-pointer"
            >
              RESET NODE
            </button>
          )}
        </div>
      </div>

      {/* Interactive Seamless Canvas */}
      <div
        ref={containerRef}
        className="relative w-full h-[360px] sm:h-[340px] md:h-[360px] select-none bg-[#060911]"
      >
        <canvas
          ref={canvasRef}
          aria-label="Visualisasi topologi node jaringan P2P Nostr dan IPFS LacakHP"
          className="block w-full h-full touch-manipulation"
        />
      </div>

      {/* Minimal Bottom Telemetry Strip */}
      <div className="px-4 sm:px-5 py-2.5 border-t border-slate-800/70 bg-slate-950/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-mono text-[0.6875rem] text-slate-400">
        <span className="text-slate-300 leading-relaxed">{statusText}</span>

        <div className="flex items-center gap-3 shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>GPS E2EE</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Nostr Relay</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>IPFS Swarm</span>
          </span>
        </div>
      </div>
    </section>
  );
};
