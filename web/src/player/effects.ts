/**
 * Sound effects through the Web Audio API: bass boost and reverb.
 * The browser only lets Web Audio read a stream that comes from the same address as the app (the desktop app, the web
 * app and Docker do; the phone apps stream from YouTube directly, so they get the speed effects only).
 */

/** The ten equaliser bands, in Hz. */
export const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

interface Chain {
  ctx: AudioContext;
  eq: BiquadFilterNode[];
  bass: BiquadFilterNode;
  wet: GainNode;
}

let chain: Chain | null = null;
let failed = false;

function impulse(ctx: AudioContext, seconds = 2.6, decay = 2.4): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, length, rate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return buf;
}

const sameOrigin = (src: string) => {
  try {
    const u = new URL(src, location.href);
    return u.origin === location.origin || u.protocol === "blob:";
  } catch {
    return false;
  }
};

/** Builds the chain on first use: source -> ten EQ bands -> bass shelf -> output, with a reverb branch. */
function ensureChain(el: unknown): Chain | null {
  if (chain) return chain;
  if (!(el instanceof HTMLMediaElement) || failed) return null;
  if (!el.src || !sameOrigin(el.src) || typeof AudioContext === "undefined") return null;
  try {
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(el);
    const eq = EQ_BANDS.map((f, i) => {
      const b = ctx.createBiquadFilter();
      b.type = i === 0 ? "lowshelf" : i === EQ_BANDS.length - 1 ? "highshelf" : "peaking";
      b.frequency.value = f;
      b.Q.value = 1.1;
      return b;
    });
    const bass = ctx.createBiquadFilter();
    bass.type = "lowshelf";
    bass.frequency.value = 160;
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0;
    let node: AudioNode = source;
    for (const b of eq) {
      node.connect(b);
      node = b;
    }
    node.connect(bass);
    bass.connect(ctx.destination);
    bass.connect(convolver);
    convolver.connect(wet);
    wet.connect(ctx.destination);
    chain = { ctx, eq, bass, wet };
    return chain;
  } catch {
    failed = true;
    return null;
  }
}

/** Sets bass (dB) and reverb (0-1). Returns false when this device can't apply them. */
export function setSoundEffects(el: unknown, bassDb: number, reverb: number): boolean {
  if (!chain && bassDb === 0 && reverb === 0) return true;
  const c = ensureChain(el);
  if (!c) return false;
  c.bass.gain.value = bassDb;
  c.wet.gain.value = reverb;
  void c.ctx.resume();
  return true;
}

/** Sets the ten equaliser gains (dB). Returns false when this device can't (the chain needs a same-origin stream). */
export function setEqualizerBands(el: unknown, gains: readonly number[]): boolean {
  if (!chain && gains.every((g) => g === 0)) return true;
  const c = ensureChain(el);
  if (!c) return false;
  c.eq.forEach((b, i) => (b.gain.value = gains[i] ?? 0));
  void c.ctx.resume();
  return true;
}
