/**
 * Draft monthly humidity (%) and sunshine (% of possible) from Köppen,
 * archetype, latitude, and precipitation seasonality — screening normals
 * aligned with atlas archetype reasoning (not station-grade).
 */
import type { Place } from "../../src/types";

type Monthly12 = readonly [number, number, number, number, number, number, number, number, number, number, number, number];

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function koppenPrimary(koppen: string): string {
  return koppen.split(/[\s/]/)[0]!.trim();
}

function wetMonthIndices(precip: readonly number[]): readonly number[] {
  const order = precip.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  return order.slice(0, 3).map(o => o.i);
}

function buildMonthly(base: number, amplitude: number, peakMonth: number, jitter: number): Monthly12 {
  const out: number[] = [];
  for (let m = 0; m < 12; m++) {
    const phase = Math.cos(((m - peakMonth) / 12) * Math.PI * 2);
    out.push(clamp(base + amplitude * phase + ((hashId(String(m)) % 5) - 2) * jitter, 8, 98));
  }
  return out as unknown as Monthly12;
}

function applyArchetypeHumidity(place: Place, hum: number[]): void {
  const bump = (delta: number, months?: readonly number[]) => {
    const idx = months ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    for (const m of idx) hum[m] = clamp(hum[m] + delta, 10, 98);
  };
  if (place.archetypes.some(a => ["fog-belt-coast", "hyper-maritime", "cool-summer-maritime"].includes(a))) {
    bump(6, [4, 5, 6, 7, 8]);
    bump(4, [0, 1, 11]);
  }
  if (place.archetypes.some(a => ["rain-shadow-sanctuary", "high-desert-escape", "badland-steppe"].includes(a))) {
    bump(-8, [5, 6, 7, 8]);
  }
  if (place.archetypes.includes("urban-heat-contrast")) bump(4, [5, 6, 7, 8]);
  if (place.archetypes.includes("monsoon-edge")) bump(10, [6, 7, 8]);
}

function applyArchetypeSunshine(place: Place, sun: number[]): void {
  const bump = (delta: number, months?: readonly number[]) => {
    const idx = months ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    for (const m of idx) sun[m] = clamp(sun[m] + delta, 12, 92);
  };
  if (place.archetypes.some(a => ["fog-belt-coast", "hyper-maritime", "cool-summer-maritime"].includes(a))) {
    bump(-12, [4, 5, 6, 7, 8]);
  }
  if (place.archetypes.some(a => ["rain-shadow-sanctuary", "high-desert-escape"].includes(a))) {
    bump(10, [4, 5, 6, 7, 8, 9]);
  }
  if (place.archetypes.includes("urban-heat-contrast")) bump(-4, [5, 6, 7]);
}

export function draftHumidityPct(place: Place): Monthly12 {
  const k = koppenPrimary(place.koppen);
  const seed = (hashId(place.id) % 7) - 3;
  let base: number;
  let amp: number;
  let peak: number;

  if (k.startsWith("B")) { base = 42; amp = 8; peak = 7; }
  else if (k.startsWith("A")) { base = 78; amp = 6; peak = 8; }
  else if (k.startsWith("Cfa")) { base = 74; amp = 10; peak = 7; }
  else if (k.startsWith("Cfb") || k.startsWith("Cfc")) { base = 78; amp = 8; peak = 0; }
  else if (k.startsWith("Csa") || k.startsWith("Csb")) { base = 68; amp = 12; peak = 0; }
  else if (k.startsWith("Cwa")) { base = 72; amp = 14; peak = 7; }
  else if (k.startsWith("Dfb") || k.startsWith("Dfc")) { base = 72; amp = 10; peak = 0; }
  else if (k.startsWith("Dfa") || k.startsWith("Dwa")) { base = 70; amp = 12; peak = 7; }
  else if (k.startsWith("ET") || k === "ET") { base = 78; amp = 6; peak = 0; }
  else { base = 65; amp = 10; peak = 6; }

  const hum = [...buildMonthly(base + seed * 0.5, amp, peak, 1.2)];
  const wet = wetMonthIndices(place.climate.precipMm);
  for (const m of wet) hum[m] = clamp(hum[m] + 4, 10, 98);
  applyArchetypeHumidity(place, hum);
  return hum as unknown as Monthly12;
}

export function draftSunshinePct(place: Place): Monthly12 {
  const k = koppenPrimary(place.koppen);
  const seed = (hashId(`${place.id}-sun`) % 9) - 4;
  let base: number;
  let amp: number;
  let peak: number;

  if (k.startsWith("B")) { base = 78; amp = 8; peak = 5; }
  else if (k.startsWith("A")) { base = 62; amp = 8; peak = 2; }
  else if (k.startsWith("Cfa")) { base = 58; amp = 10; peak = 6; }
  else if (k.startsWith("Cfb") || k.startsWith("Cfc")) { base = 42; amp = 10; peak = 6; }
  else if (k.startsWith("Csa") || k.startsWith("Csb")) { base = 68; amp = 14; peak = 6; }
  else if (k.startsWith("Cwa")) { base = 55; amp = 12; peak = 3; }
  else if (k.startsWith("Dfb") || k.startsWith("Dfc")) { base = 48; amp = 14; peak = 5; }
  else if (k.startsWith("Dfa") || k.startsWith("Dwa")) { base = 58; amp = 12; peak = 6; }
  else if (k.startsWith("ET") || k === "ET") { base = 38; amp = 18; peak = 5; }
  else { base = 55; amp = 10; peak = 6; }

  const sun = [...buildMonthly(base + seed * 0.6, amp, peak, 1.5)];
  applyArchetypeSunshine(place, sun);
  return sun as unknown as Monthly12;
}
