// 계정: 로그인하면 유산 상점·카드 컬렉션·저장 칸이 계정에 붙는다.
//  · 서버(Cloudflare Pages Functions + KV, functions/api)가 있으면 ☁ 클라우드 계정 — 어느 기기에서든 같은 계정.
//  · 서버가 없거나(GitHub Pages 미러·KV 미연결) 연결이 안 되면 📱 이 기기 계정 — 같은 브라우저에서만.
//  · 로그인하지 않아도 이 기기의 "손님 기록"에 쌓이고, 로그인하면 계정으로 합쳐진다.
import type { Ancestor, GameState } from '../core/types';

export interface LegacyBank {
  points: number;
  cart: Record<string, number>;
}
export interface Collected {
  /** 몇 번 얻었나 (가문·사람이 달라야 센다) */
  n: number;
  /** 최근에 얻은 사람들 "이름 (김씨 가문)" */
  names: string[];
  /** 처음 얻은 때 */
  first: number;
  /** 중복 방지 열쇠 (가문 시드:사람) */
  keys: string[];
}
export interface CloudSave {
  label: string;
  at: number;
  /** 예전 저장: 게임을 그대로 담았다. 지금은 큰 기록(blob) 'save-칸' 에 따로 둔다 */
  data?: string;
  blob?: string;
}
/** 📚 지난 가문 기록 (요약). 가계도·연대기가 담긴 게임 전체는 큰 기록 'fam-id' 에 */
export interface FamilyArchive {
  id: string;
  family: string;
  era?: string;
  from: number;
  to: number;
  gens: number;
  score: number;
  legacy: number;
  reason: string;
  /** 대대 가주: "1대 김철수 (1955~2031) · 대기업 사장" */
  heads: string[];
  cards: number;
  at: number;
  voluntary?: boolean;
}
export interface Profile {
  bank: LegacyBank;
  collection: Record<string, Collected>;
  saves: Record<string, CloudSave>;
  /** 끝난 가문 수 · 최고 점수 */
  runs: number;
  best: number;
  /** 지난 가문들 (최근 30개) */
  archives: FamilyArchive[];
  /** 💠 가문 내력 (영구로 산 것) */
  perma: string[];
  /** 🪦 다음 가문에 내려갈 조상 카드 */
  ancestor?: Ancestor;
}
export interface Account {
  user?: string;
  token?: string;
  mode: 'guest' | 'cloud' | 'local';
}

const OLD_LEGACY_KEY = 'gamun-kiugi-legacy';
const ACC_KEY = 'gamun-kiugi-account';
const PROFILE_KEY = (who: string) => `gamun-kiugi-profile:${who}`;
const LOCAL_USERS = 'gamun-kiugi-local-users';

const empty = (): Profile => ({ bank: { points: 0, cart: {} }, collection: {}, saves: {}, runs: 0, best: 0, archives: [], perma: [] });
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}

export const account: Account = read<Account>(ACC_KEY, { mode: 'guest' });
const who = () => (account.user ? `${account.mode}:${account.user.toLowerCase()}` : 'guest');
/** 지금 기록의 주인 (손님 또는 계정): 하던 가문(이어하기)도 주인별로 따로 둔다 */
export const ownerKey = who;

function normalize(p: Partial<Profile> | null | undefined): Profile {
  const e = empty();
  if (!p) return e;
  return {
    bank: { points: Number(p.bank?.points) || 0, cart: p.bank?.cart && typeof p.bank.cart === 'object' ? p.bank.cart : {} },
    collection: p.collection && typeof p.collection === 'object' ? p.collection : {},
    saves: p.saves && typeof p.saves === 'object' ? p.saves : {},
    runs: Number(p.runs) || 0,
    best: Number(p.best) || 0,
    archives: Array.isArray(p.archives) ? p.archives : [],
    perma: Array.isArray(p.perma) ? p.perma : [],
    ancestor: p.ancestor && typeof p.ancestor === 'object' ? p.ancestor : undefined,
  };
}

/** 지금 계정(또는 손님)의 기록. 예전 유산 저장소가 있으면 손님 기록으로 옮긴다 */
export function profile(): Profile {
  const p = normalize(read<Partial<Profile> | null>(PROFILE_KEY(who()), null));
  if (who() === 'guest') {
    const old = read<LegacyBank | null>(OLD_LEGACY_KEY, null);
    if (old && (old.points || Object.keys(old.cart ?? {}).length)) {
      p.bank.points += Number(old.points) || 0;
      for (const [k, v] of Object.entries(old.cart ?? {})) p.bank.cart[k] = (p.bank.cart[k] ?? 0) + v;
      try {
        localStorage.removeItem(OLD_LEGACY_KEY);
      } catch {
        /* noop */
      }
      write(PROFILE_KEY('guest'), p);
    }
  }
  return p;
}

let pushTimer: ReturnType<typeof setTimeout> | undefined;
export function saveProfile(p: Profile) {
  write(PROFILE_KEY(who()), p);
  if (account.mode === 'cloud' && account.token) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void push(p), 1500);
  }
}

/** 두 기록 합치기: 유산은 더하고(같은 기록이면 큰 쪽), 컬렉션은 합집합, 저장 칸은 최신 */
function merge(a: Profile, b: Profile): Profile {
  const out = normalize(JSON.parse(JSON.stringify(a)));
  out.bank.points = a.bank.points + b.bank.points;
  for (const [k, v] of Object.entries(b.bank.cart)) out.bank.cart[k] = Math.max(out.bank.cart[k] ?? 0, v);
  for (const [id, c] of Object.entries(b.collection)) {
    const cur = out.collection[id];
    if (!cur) out.collection[id] = c;
    else {
      const keys = [...new Set([...cur.keys, ...c.keys])].slice(-60);
      out.collection[id] = { n: keys.length, names: [...new Set([...c.names, ...cur.names])].slice(0, 8), first: Math.min(cur.first, c.first), keys };
    }
  }
  for (const [k, s] of Object.entries(b.saves)) if (!out.saves[k] || out.saves[k].at < s.at) out.saves[k] = s;
  out.runs = a.runs + b.runs;
  out.best = Math.max(a.best, b.best);
  const seen = new Set(out.archives.map((x) => x.id));
  out.archives = [...out.archives, ...b.archives.filter((x) => !seen.has(x.id))].sort((x, y) => y.at - x.at).slice(0, ARCHIVE_MAX);
  out.perma = [...new Set([...a.perma, ...b.perma])];
  out.ancestor = a.ancestor ?? b.ancestor;
  return out;
}

// ───────── 서버 ─────────

const api = (route: string) => new URL('api/' + route, location.href).toString();
async function call(route: string, init: RequestInit = {}): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (account.token) headers.authorization = 'Bearer ' + account.token;
  const r = await fetch(api(route), { ...init, headers, cache: 'no-store' });
  let body: Record<string, unknown> = {};
  try {
    body = await r.json();
  } catch {
    /* 서버가 없다 (정적 호스팅의 404 HTML 등) */
    return { status: r.status === 200 ? 502 : r.status, body: {} };
  }
  return { status: r.status, body };
}
async function push(p: Profile) {
  try {
    await call('me', { method: 'PUT', body: JSON.stringify({ data: p }) });
  } catch {
    /* 오프라인: 다음 저장 때 다시 */
  }
}

// ───────── 이 기기 계정 (서버가 없을 때) ─────────

async function pbkdf2(pass: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 60_000 }, key, 256);
  return [...new Uint8Array(bits)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
async function localAuth(user: string, pass: string, signup: boolean): Promise<string | undefined> {
  const users = read<Record<string, { salt: string; hash: string }>>(LOCAL_USERS, {});
  const k = user.toLowerCase();
  if (signup) {
    if (users[k]) return '이 기기에 이미 있는 아이디입니다';
    const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    users[k] = { salt, hash: await pbkdf2(pass, salt) };
    write(LOCAL_USERS, users);
    return undefined;
  }
  if (!users[k] || users[k].hash !== (await pbkdf2(pass, users[k].salt))) return '아이디 또는 비밀번호가 틀렸습니다';
  return undefined;
}

export const validUser = (u: string) => /^[a-zA-Z0-9_가-힣]{2,16}$/.test(u);

/** 로그인·가입. 성공하면 손님 기록을 계정으로 합친다. 실패하면 이유를 돌려준다 */
export async function login(user: string, pass: string, signup: boolean): Promise<{ ok: boolean; msg: string }> {
  user = user.trim();
  if (!validUser(user)) return { ok: false, msg: '아이디는 2~16자 (한글·영문·숫자·_)' };
  if (pass.length < 4) return { ok: false, msg: '비밀번호는 4자 이상' };
  const guest = profile();
  let res: { status: number; body: Record<string, unknown> } | undefined;
  try {
    res = await call(signup ? 'signup' : 'login', { method: 'POST', body: JSON.stringify({ user, pass }) });
  } catch {
    res = undefined;
  }
  // 서버가 있다
  if (res && res.status !== 503 && res.status !== 404 && res.status !== 502 && res.status !== 405) {
    if (res.status >= 400) return { ok: false, msg: String(res.body.error ?? '로그인 실패') };
    account.user = user;
    account.token = String(res.body.token);
    account.mode = 'cloud';
    write(ACC_KEY, account);
    const merged = merge(normalize(res.body.data as Partial<Profile>), guest);
    write(PROFILE_KEY(who()), merged);
    await push(merged);
    clearGuest();
    return { ok: true, msg: signup ? `☁ 가입 완료! 어느 기기에서든 "${user}"로 로그인하면 이어진다.` : `☁ ${user} 로그인 — 유산과 카드 컬렉션을 불러왔다.` };
  }
  // 서버가 없다: 이 기기 계정
  const why = await localAuth(user, pass, signup);
  if (why) return { ok: false, msg: why };
  account.user = user;
  account.token = undefined;
  account.mode = 'local';
  write(ACC_KEY, account);
  const mine = normalize(read<Partial<Profile> | null>(PROFILE_KEY(who()), null));
  write(PROFILE_KEY(who()), merge(mine, guest));
  clearGuest();
  return { ok: true, msg: `📱 ${user} 로그인 (이 기기 계정 — 계정 서버가 연결되면 다른 기기에서도 이어진다)` };
}
function clearGuest() {
  write(PROFILE_KEY('guest'), empty());
}

export function logout() {
  if (account.mode === 'cloud' && account.token) void call('logout', { method: 'POST' }).catch(() => undefined);
  account.user = account.token = undefined;
  account.mode = 'guest';
  write(ACC_KEY, account);
}

/** 클라우드 계정이면 서버의 최신 기록을 받아 온다 (다른 기기에서 쌓인 것) */
export async function refresh(): Promise<boolean> {
  if (account.mode !== 'cloud' || !account.token) return false;
  try {
    const r = await call('me');
    if (r.status === 401) {
      logout();
      return true;
    }
    if (r.status !== 200) return false;
    const server = normalize(r.body.data as Partial<Profile>);
    write(PROFILE_KEY(who()), server);
    return true;
  } catch {
    return false;
  }
}

// ───────── 카드 컬렉션 · 저장 칸 ─────────

/** 이 가문에서 얻은 카드를 계정 컬렉션에 더한다 (같은 가문·같은 사람은 한 번만) */
export function recordCards(g: GameState, nameOf: (personId: string) => string): boolean {
  if (!g.cards?.length) return false;
  const p = profile();
  let changed = false;
  for (const c of g.cards) {
    const key = `${g.seed}:${c.personId}`;
    const cur = (p.collection[c.id] ??= { n: 0, names: [], first: Date.now(), keys: [] });
    if (cur.keys.includes(key)) continue;
    cur.keys = [...cur.keys, key].slice(-60);
    cur.n += 1;
    cur.names = [`${nameOf(c.personId)} (${g.familyName}씨)`, ...cur.names].slice(0, 8);
    changed = true;
  }
  if (changed) saveProfile(p);
  return changed;
}

// ───────── 큰 기록 (blob): 저장 칸의 게임 · 지난 가문의 가계도·연대기 ─────────
//  계정 요약(유산·컬렉션·목록)과 따로 둔다 — 요약은 작게 유지해야 로그인·동기화가 빠르다.
//  gzip 으로 줄여(보통 1/8~1/12) base64 로 담는다. 이 기기에도 같이 두고, ☁ 계정이면 서버에도 올린다.
export const ARCHIVE_MAX = 30;
const BLOB_KEY = (name: string) => `gamun-kiugi-blob:${who()}:${name}`;
async function pack(text: string): Promise<string> {
  if (typeof CompressionStream === 'undefined') return 'raw:' + text;
  const buf = await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  let bin = '';
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return 'gz:' + btoa(bin);
}
async function unpack(v: string): Promise<string> {
  if (v.startsWith('raw:')) return v.slice(4);
  if (!v.startsWith('gz:')) return v;
  const bin = atob(v.slice(3));
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}
/** 큰 기록 저장. 이 기기 저장이 꽉 차도 ☁ 계정이면 서버에는 올라간다 */
export async function putBlob(name: string, text: string): Promise<boolean> {
  const v = await pack(text);
  const local = write(BLOB_KEY(name), v);
  if (account.mode === 'cloud' && account.token) {
    try {
      const r = await call('blob/' + name, { method: 'PUT', body: JSON.stringify({ data: v }) });
      return r.status === 200 || local;
    } catch {
      return local;
    }
  }
  return local;
}
export async function getBlob(name: string): Promise<string | undefined> {
  let v = read<string | null>(BLOB_KEY(name), null);
  if (!v && account.mode === 'cloud' && account.token) {
    try {
      const r = await call('blob/' + name);
      if (typeof r.body.data === 'string') v = r.body.data;
    } catch {
      /* 오프라인 */
    }
  }
  return v ? unpack(v) : undefined;
}
export function delBlob(name: string) {
  try {
    localStorage.removeItem(BLOB_KEY(name));
  } catch {
    /* noop */
  }
  if (account.mode === 'cloud' && account.token) void call('blob/' + name, { method: 'DELETE' }).catch(() => undefined);
}

/** 가문이 끝나면: 요약은 목록에, 게임 전체(가계도·연대기)는 큰 기록으로 */
export async function archiveFamily(meta: FamilyArchive, g: GameState): Promise<void> {
  const p = profile();
  if (p.archives.some((x) => x.id === meta.id)) return;
  p.archives = [meta, ...p.archives];
  for (const old of p.archives.slice(ARCHIVE_MAX)) delBlob('fam-' + old.id);
  p.archives = p.archives.slice(0, ARCHIVE_MAX);
  saveProfile(p);
  await putBlob('fam-' + meta.id, JSON.stringify(g));
}
export async function loadArchive(id: string): Promise<GameState | undefined> {
  const t = await getBlob('fam-' + id);
  return t ? (JSON.parse(t) as GameState) : undefined;
}
export function deleteArchive(id: string) {
  const p = profile();
  p.archives = p.archives.filter((x) => x.id !== id);
  saveProfile(p);
  delBlob('fam-' + id);
}

export async function putSave(slot: string, label: string, g: GameState): Promise<boolean> {
  const name = 'save-' + slot.toLowerCase();
  const ok = await putBlob(name, JSON.stringify(g));
  if (!ok) return false;
  const p = profile();
  p.saves[slot] = { label, at: Date.now(), blob: name };
  saveProfile(p);
  return true;
}
export async function getSave(slot: string): Promise<string | undefined> {
  const cs = profile().saves[slot];
  if (!cs) return undefined;
  return cs.data ?? (cs.blob ? getBlob(cs.blob) : undefined);
}
export function delSave(slot: string) {
  const p = profile();
  const cs = p.saves[slot];
  delete p.saves[slot];
  saveProfile(p);
  if (cs?.blob) delBlob(cs.blob);
}
/** ☁ 자동 저장: 로그인해 있으면 지금 가문을 계정의 '자동' 칸에 (너무 자주는 말고) */
let lastAuto = 0;
export function autoCloudSave(label: string, g: GameState, force = false) {
  if (account.mode !== 'cloud' || !account.token) return; // 이 기기 계정·손님은 이 기기 저장만으로 충분하다
  const now = Date.now();
  if (!force && now - lastAuto < 20_000) return;
  lastAuto = now;
  void putSave('auto', label, g);
}

/** 예전 저장 칸(A·B·C)은 없앴다: '자동'(이어하기)만 남기고 지운다 */
export function dropOldSaveSlots() {
  const p = profile();
  const old = Object.keys(p.saves).filter((k) => k !== 'auto');
  if (!old.length) return;
  for (const k of old) {
    const b = p.saves[k].blob;
    delete p.saves[k];
    if (b) delBlob(b);
  }
  saveProfile(p);
}
/** 계정(☁)에 있는 '이어하기'가 이 기기 것보다 새것이면 그 시각을, 아니면 0 */
export const cloudAutoAt = () => profile().saves.auto?.at ?? 0;
export const cloudAutoLabel = () => profile().saves.auto?.label;
