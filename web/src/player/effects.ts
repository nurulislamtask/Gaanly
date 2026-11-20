/**
 * Sound effects through the Web Audio API: bass boost and reverb.
 * The browser only lets Web Audio read a stream that comes from the same address as the app (the desktop app, the web
 * app and Docker do; the phone apps stream from YouTube directly, so they get the speed effects only).
 */

interface Chain {
  ctx: AudioContext;
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

/** Sets bass (dB) and reverb (0-1). Returns false when this device can't apply them. */
export function setSoundEffects(el: unknown, bassDb: number, reverb: number): boolean {
  if (!(el instanceof HTMLMediaElement) || failed) return bassDb === 0 && reverb === 0;
  if (!chain) {
    if (bassDb === 0 && reverb === 0) return true;
    if (!el.src || !sameOrigin(el.src) || typeof AudioContext === "undefined") return false;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(el);
      const bass = ctx.createBiquadFilter();
      bass.type = "lowshelf";
      bass.frequency.value = 160;
      const convolver = ctx.createConvolver();
      convolver.buffer = impulse(ctx);
      const wet = ctx.createGain();
      source.connect(bass);
      bass.connect(ctx.destination);
      bass.connect(convolver);
      convolver.connect(wet);
      wet.connect(ctx.destination);
      chain = { ctx, bass, wet };
    } catch {
      failed = true;
      return false;
    }
  }
  chain.bass.gain.value = bassDb;
  chain.wet.gain.value = reverb;
  void chain.ctx.resume();
  return true;
}
