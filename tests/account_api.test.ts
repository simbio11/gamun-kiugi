import { describe, expect, it } from 'vitest';
import { onRequest } from '../functions/api/[[route]]';

function kv() {
  const m = new Map<string, string>();
  return { get: async (k: string) => m.get(k) ?? null, put: async (k: string, v: string) => void m.set(k, v), delete: async (k: string) => void m.delete(k) };
}
const call = async (env: object, route: string, method = 'GET', body?: unknown, token?: string) => {
  const req = new Request('https://x/api/' + route, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: token ? { authorization: 'Bearer ' + token } : {} });
  const r: Response = await onRequest({ request: req, env: env as never, params: { route: route.split('/') } });
  return { status: r.status, body: (await r.json()) as Record<string, unknown> };
};

describe('계정 API', () => {
  it('KV가 없으면 503 (게임은 이 기기 계정으로 대신)', async () => {
    expect((await call({}, 'login', 'POST', { user: 'abc', pass: '1234' })).status).toBe(503);
  });
  it('가입 → 저장 → 다른 세션 로그인 → 같은 데이터, 틀린 비밀번호는 401', async () => {
    const env = { GAMUN_KV: kv() };
    const a = await call(env, 'signup', 'POST', { user: '김가문', pass: 'pass1234' });
    expect(a.status).toBe(200);
    expect((await call(env, 'signup', 'POST', { user: '김가문', pass: 'x1234' })).status).toBe(409);
    expect((await call(env, 'me', 'PUT', { data: { bank: { points: 42 } } }, String(a.body.token))).status).toBe(200);
    expect((await call(env, 'login', 'POST', { user: '김가문', pass: 'wrong' })).status).toBe(401);
    const b = await call(env, 'login', 'POST', { user: '김가문', pass: 'pass1234' });
    expect((b.body.data as { bank: { points: number } }).bank.points).toBe(42);
    expect((await call(env, 'me', 'GET', undefined, 'f'.repeat(64))).status).toBe(401);
  });
  it('큰 기록(blob): 계정별로 따로, 이름 검사, 지우기', async () => {
    const env = { GAMUN_KV: kv() };
    const a = String((await call(env, 'signup', 'POST', { user: 'aaa', pass: 'pass1234' })).body.token);
    const b = String((await call(env, 'signup', 'POST', { user: 'bbb', pass: 'pass1234' })).body.token);
    expect((await call(env, 'blob/fam-1', 'PUT', { data: 'gz:abc' }, a)).status).toBe(200);
    expect((await call(env, 'blob/fam-1', 'GET', undefined, a)).body.data).toBe('gz:abc');
    expect((await call(env, 'blob/fam-1', 'GET', undefined, b)).body.data).toBe(null);
    expect((await call(env, 'blob/../u:aaa', 'GET', undefined, a)).status).toBe(400);
    expect((await call(env, 'blob/fam-1', 'GET')).status).toBe(401);
    await call(env, 'blob/fam-1', 'DELETE', undefined, a);
    expect((await call(env, 'blob/fam-1', 'GET', undefined, a)).body.data).toBe(null);
  });
});
