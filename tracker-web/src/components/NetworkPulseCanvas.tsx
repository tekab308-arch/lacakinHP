import React, { useEffect, useRef } from 'react';

interface NodePoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  isHub: boolean;
  pulsePhase: number;
}

interface PacketPulse {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
  color: 'sky' | 'emerald';
}

interface ArrivalFlare {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: 'sky' | 'emerald';
}

/**
 * Full-viewport 60fps HTML5 Canvas Nostr Relay Mesh visualization.
 * Crisp HiDPI nodes, hairline edges, glowing encrypted packet trails,
 * subtle desktop cursor proximity highlight, and reduced-motion / tab-visibility safety.
 */
export const NetworkPulseCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let rafId = 0;
    let lastDrawTs = 0;
    let nodes: NodePoint[] = [];
    let pulses: PacketPulse[] = [];
    let flares: ArrivalFlare[] = [];
    const pointer = { x: -9999, y: -9999, active: false };

    const initNetwork = (w: number, h: number) => {
      const count = w < 640 ? 18 : w < 1024 ? 28 : 38;
      const hubCount = w < 640 ? 3 : 5;

      nodes = Array.from({ length: count }, (_, idx) => {
        const isHub = idx < hubCount;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * (isHub ? 0.2 : 0.36),
          vy: (Math.random() - 0.5) * (isHub ? 0.2 : 0.36),
          r: isHub ? 3.2 : Math.random() * 1.2 + 1.7,
          isHub,
          pulsePhase: Math.random() * Math.PI * 2,
        };
      });

      const pulseCount = w < 640 ? 4 : 7;
      pulses = Array.from({ length: pulseCount }, (_, idx) => ({
        fromIdx: idx % count,
        toIdx: (idx + 1) % count,
        progress: Math.random(),
        speed: 0.008 + Math.random() * 0.009,
        color: idx % 3 === 0 ? 'emerald' : 'sky',
      }));
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dprCap = width < 640 ? 1.5 : 2;
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (nodes.length === 0) {
        initNetwork(width, height);
      } else {
        for (const n of nodes) {
          n.x = Math.min(width, Math.max(0, n.x));
          n.y = Math.min(height, Math.max(0, n.y));
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.active = true;
      }
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    const scheduleNext = () => {
      if (!prefersReducedMotion && !document.hidden && !rafId) {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      } else {
        scheduleNext();
      }
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    resize();

    const drawFrame = (ts: number = 0) => {
      rafId = 0;
      if (document.hidden) return;

      // Cap canvas redraw to ~30fps on mobile viewports to cut battery/CPU usage in half.
      if (!prefersReducedMotion && width < 640 && ts > 0 && ts - lastDrawTs < 33) {
        rafId = window.requestAnimationFrame(drawFrame);
        return;
      }
      lastDrawTs = ts;

      ctx.clearRect(0, 0, width, height);
      if (nodes.length === 0) return;

      const maxDist = width < 640 ? 135 : 175;
      const maxDistSq = maxDist * maxDist;
      const pointerDist = 170;
      const pointerDistSq = pointerDist * pointerDist;

      // Update node coordinates gently
      if (!prefersReducedMotion) {
        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;
          n.pulsePhase += 0.025;
          if (n.x <= 0 || n.x >= width) {
            n.vx *= -1;
            n.x = Math.max(0, Math.min(width, n.x));
          }
          if (n.y <= 0 || n.y >= height) {
            n.vy *= -1;
            n.y = Math.max(0, Math.min(height, n.y));
          }
        }
      }

      // Draw constellation connections (squared distance check skips sqrt on non-neighbors)
      const activePairs: [number, number][] = [];
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            activePairs.push([i, j]);
            const dist = Math.sqrt(distSq);
            let alpha = (1 - dist / maxDist) * 0.38;

            // Subtle pointer proximity boost on desktop
            if (pointer.active) {
              const pdx = (a.x + b.x) * 0.5 - pointer.x;
              const pdy = (a.y + b.y) * 0.5 - pointer.y;
              const pDistSq = pdx * pdx + pdy * pdy;
              if (pDistSq < pointerDistSq) {
                alpha += (1 - Math.sqrt(pDistSq) / pointerDist) * 0.32;
              }
            }

            ctx.strokeStyle =
              a.isHub || b.isHub
                ? `rgba(56, 189, 248, ${Math.min(0.7, alpha * 1.25).toFixed(3)})`
                : `rgba(148, 163, 184, ${Math.min(0.55, alpha).toFixed(3)})`;
            ctx.lineWidth = a.isHub || b.isHub ? 1.2 : 0.9;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw relay nodes & outer halo rings
      for (const n of nodes) {
        if (n.isHub) {
          const haloRadius = n.r + 6 + Math.sin(n.pulsePhase) * 2.2;
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.36)';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, haloRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(56, 189, 248, 0.92)';
        } else {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.58)';
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw traveling encrypted packets without per-frame gradient heap allocation
      if (!prefersReducedMotion && activePairs.length > 0) {
        for (const p of pulses) {
          p.progress += p.speed;

          if (
            p.progress >= 1 ||
            p.fromIdx >= nodes.length ||
            p.toIdx >= nodes.length
          ) {
            if (p.toIdx < nodes.length) {
              const targetNode = nodes[p.toIdx];
              flares.push({
                x: targetNode.x,
                y: targetNode.y,
                radius: targetNode.r + 1,
                alpha: 0.7,
                color: p.color,
              });
            }

            const pick =
              activePairs[Math.floor(Math.random() * activePairs.length)];
            const reverse = Math.random() > 0.5;
            p.fromIdx = reverse ? pick[1] : pick[0];
            p.toIdx = reverse ? pick[0] : pick[1];
            p.progress = 0;
          }

          const a = nodes[p.fromIdx];
          const b = nodes[p.toIdx];
          const px = a.x + (b.x - a.x) * p.progress;
          const py = a.y + (b.y - a.y) * p.progress;

          const midProgress = Math.max(0, p.progress - 0.08);
          const tailProgress = Math.max(0, p.progress - 0.16);
          const mx = a.x + (b.x - a.x) * midProgress;
          const my = a.y + (b.y - a.y) * midProgress;
          const tx = a.x + (b.x - a.x) * tailProgress;
          const ty = a.y + (b.y - a.y) * tailProgress;

          const rgb =
            p.color === 'emerald' ? '52, 211, 153' : '56, 189, 248';

          ctx.strokeStyle = `rgba(${rgb}, 0.25)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(mx, my);
          ctx.stroke();

          ctx.strokeStyle = `rgba(${rgb}, 0.85)`;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(px, py);
          ctx.stroke();

          ctx.fillStyle = `rgba(${rgb}, 1)`;
          ctx.beginPath();
          ctx.arc(px, py, 2.7, 0, Math.PI * 2);
          ctx.fill();
        }

        // Arrival ring flares
        for (let k = flares.length - 1; k >= 0; k--) {
          const f = flares[k];
          f.radius += 0.45;
          f.alpha -= 0.028;
          if (f.alpha <= 0) {
            flares.splice(k, 1);
            continue;
          }
          const rgb =
            f.color === 'emerald' ? '52, 211, 153' : '56, 189, 248';
          ctx.strokeStyle = `rgba(${rgb}, ${f.alpha.toFixed(3)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      if (!prefersReducedMotion) {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    drawFrame();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="no-print fixed inset-0 z-0 w-full h-full pointer-events-none opacity-100"
    />
  );
};
