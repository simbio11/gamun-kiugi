// 가문 키우기 계정 API (Cloudflare Pages Functions).
// 저장소: Cloudflare KV — Pages 프로젝트 설정 → Bindings 에서 KV 네임스페이스를 변수 이름 GAMUN_KV 로 연결해야 동작한다.
// 연결 전에는 /api/* 가 503을 돌려주고, 게임은 "이 기기 계정"(로컬 저장)으로 대신 동작한다.
//
//   POST /api/signup {user, pass}  → {token, user, data}
//   POST /api/login  {user, pass}  → {token, user, data}
//   GET  /api/me     (Bearer)      → {user, data}
//   PUT  /api/me     (Bearer) {data} → {ok}
//   GET    /api/blob/<name> (Bearer)        → {data}      큰 기록(저장 칸 게임·지난 가문 가계도·연혁)은 따로
//   PUT    /api/blob/<name> (Bearer) {data} → {ok}
//   DELETE /api/blob/<name> (Bearer)        → {ok}
//   POST /api/logout (Bearer)      → {ok}
//   GET  /api/health               → {ok, kv}
//
// 비밀번호는 PBKDF2-SHA256 (10만 회) + 사용자별 소금으로만 저장한다. 세션 토큰은 90일.

interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}
interface Env {
  GAMUN_KV?: KV;
}
interface Ctx {
  request: Request;
  env: Env;
  params: { route?: string[] };
}
interface UserRec {
  salt: string;
  hash: string;
  created: number;
  data: unknown;
}

const SESSION_TTL = 60 * 60 * 24 * 90;
const MAX_DATA = 900_000; // KV 값 한도(25MB)보다 훨씬 작게: 계정 요약(유산·컬렉션·목록)
const MAX_BLOB = 3_000_000; // 큰 기록 하나 (압축된 게임 한 판·지난 가문 하나)
const validBlob = (n: string) => /^[a-z0-9_-]{1,40}$/.test(n);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const err = (msg: string, status = 400) => json({ error: msg }, status);

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
function randomHex(n: number): string {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return hex(a.buffer);
}
async function hashPass(pass: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100_000 }, key, 256);
  return hex(bits);
}
/** 길이가 같은 두 문자열을 시간 차 없이 비교 */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const validUser = (u: unknown): u is string => typeof u === 'string' && /^[a-zA-Z0-9_가-힣]{2,16}$/.test(u);
const validPass = (p: unknown): p is string => typeof p === 'string' && p.length >= 4 && p.length <= 64;

async function session(kv: KV, req: Request): Promise<string | null> {
  const t = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!t || !/^[0-9a-f]{64}$/.test(t)) return null;
  return kv.get('t:' + t);
}
async function newSession(kv: KV, user: string): Promise<string> {
  const t = randomHex(32);
  await kv.put('t:' + t, user, { expirationTtl: SESSION_TTL });
  return t;
}

export async function onRequest(ctx: Ctx): Promise<Response> {
  const { request: req, env } = ctx;
  const route = (ctx.params.route ?? []).join('/');
  const kv = env.GAMUN_KV;
  if (route === 'health') return json({ ok: true, kv: !!kv });
  if (!kv) return err('계정 저장소(KV)가 아직 연결되지 않았습니다', 503);

  if (req.method === 'POST' && (route === 'signup' || route === 'login')) {
    let body: { user?: unknown; pass?: unknown };
    try {
      body = await req.json();
    } catch {
      return err('잘못된 요청');
    }
    const user = typeof body.user === 'string' ? body.user.trim() : body.user;
    if (!validUser(user)) return err('아이디는 2~16자 (한글·영문·숫자·_)');
    if (!validPass(body.pass)) return err('비밀번호는 4~64자');
    const key = 'u:' + user.toLowerCase();
    const rec = await kv.get(key);
    if (route === 'signup') {
      if (rec) return err('이미 있는 아이디입니다', 409);
      const salt = randomHex(16);
      const r: UserRec = { salt, hash: await hashPass(body.pass, salt), created: Date.now(), data: null };
      await kv.put(key, JSON.stringify(r));
      return json({ token: await newSession(kv, user.toLowerCase()), user, data: null });
    }
    if (!rec) return err('아이디 또는 비밀번호가 틀렸습니다', 401);
    const r = JSON.parse(rec) as UserRec;
    if (!same(await hashPass(body.pass, r.salt), r.hash)) return err('아이디 또는 비밀번호가 틀렸습니다', 401);
    return json({ token: await newSession(kv, user.toLowerCase()), user, data: r.data });
  }

  const who = await session(kv, req);
  if (!who) return err('로그인이 필요합니다', 401);
  const key = 'u:' + who;
  if (route === 'me' && req.method === 'GET') {
    const rec = await kv.get(key);
    if (!rec) return err('계정이 없습니다', 404);
    return json({ user: who, data: (JSON.parse(rec) as UserRec).data });
  }
  if (route === 'me' && req.method === 'PUT') {
    const text = await req.text();
    if (text.length > MAX_DATA) return err('저장 데이터가 너무 큽니다', 413);
    let body: { data?: unknown };
    try {
      body = JSON.parse(text);
    } catch {
      return err('잘못된 요청');
    }
    const rec = await kv.get(key);
    if (!rec) return err('계정이 없습니다', 404);
    const r = JSON.parse(rec) as UserRec;
    r.data = body.data ?? null;
    await kv.put(key, JSON.stringify(r));
    return json({ ok: true });
  }
  if (route.startsWith('blob/')) {
    const name = route.slice(5);
    if (!validBlob(name)) return err('잘못된 이름');
    const bkey = `b:${who}:${name}`;
    if (req.method === 'GET') return json({ data: await kv.get(bkey) });
    if (req.method === 'DELETE') return await kv.delete(bkey), json({ ok: true });
    if (req.method === 'PUT') {
      const text = await req.text();
      if (text.length > MAX_BLOB) return err('저장 데이터가 너무 큽니다', 413);
      let body: { data?: unknown };
      try {
        body = JSON.parse(text);
      } catch {
        return err('잘못된 요청');
      }
      if (typeof body.data !== 'string') return err('잘못된 요청');
      await kv.put(bkey, body.data);
      return json({ ok: true });
    }
  }
  if (route === 'logout' && req.method === 'POST') {
    const t = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (t) await kv.delete('t:' + t);
    return json({ ok: true });
  }
  return err('없는 경로', 404);
}
