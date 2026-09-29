// 손맛: 효과음(8비트 합성) · 진동 · 숫자 굴리기 · 떠오르는 증감 표시
// 모든 효과는 실패해도 조용히 넘어간다 (지원 안 하는 기기, 자동재생 제한 등)

let ctx: AudioContext | null = null;
let enabled = true;

export function setSound(on: boolean) {
  enabled = on;
}
export const soundOn = () => enabled;

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** 짧은 네모파 음 하나 */
function tone(freq: number, at: number, dur: number, vol = 0.05, type: OscillatorType = 'square', slide?: number) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export type Sfx = 'tap' | 'choose' | 'great' | 'bad' | 'next' | 'coin' | 'close' | 'error';

export function sfx(kind: Sfx) {
  try {
    switch (kind) {
      case 'tap':
        tone(880, 0, 0.04, 0.03);
        break;
      case 'close':
        tone(660, 0, 0.05, 0.025, 'triangle', 440);
        break;
      case 'choose':
        tone(660, 0, 0.05, 0.035);
        tone(990, 0.05, 0.07, 0.035);
        break;
      case 'great':
        [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.06, 0.1, 0.04));
        break;
      case 'bad':
        tone(220, 0, 0.12, 0.04, 'square', 150);
        break;
      case 'error':
        tone(180, 0, 0.08, 0.04);
        tone(150, 0.09, 0.1, 0.04);
        break;
      case 'coin':
        tone(988, 0, 0.05, 0.035);
        tone(1319, 0.05, 0.12, 0.035);
        break;
      case 'next':
        tone(330, 0, 0.18, 0.035, 'triangle', 660);
        tone(784, 0.16, 0.12, 0.03);
        break;
    }
  } catch {
    /* 소리 없이 진행 */
  }
}

let vibe = true;
export function setVibe(on: boolean) {
  vibe = on;
}
export const vibeOn = () => vibe;

export function buzz(ms = 8) {
  if (!vibe) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* noop */
  }
}

const reduced = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** 숫자를 from → to로 굴린다. format은 표시 형식 */
export function rollNumber(el: Element, from: number, to: number, format: (n: number) => string, ms = 520) {
  if (reduced() || from === to) {
    el.textContent = format(to);
    return;
  }
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = format(Math.round(from + (to - from) * e));
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** 요소 옆에서 "+300만"이 떠올랐다 사라진다 */
export function floatDelta(anchor: Element, text: string, good: boolean) {
  if (reduced()) return;
  const r = anchor.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = `float-delta ${good ? 'pos' : 'neg'}`;
  d.textContent = text;
  d.style.left = `${Math.max(8, r.right - 12)}px`;
  d.style.top = `${r.bottom - 4}px`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1200);
}
