// 임대 관리: 내가 살지 않는 집은 월세·전세로 놓거나 비워 둘 수 있다. 세입자가 있으면 일도 생긴다.
// 전세가율(매매가 대비 전세금): 서울 아파트 50~60%, 지방 아파트 65~75%, 오피스텔·다가구 60~70% (한국부동산원 통계 흐름).
// 2020년 7월부터 주택임대차보호법 계약갱신청구권: 세입자는 한 번 더(2+2년) 살 수 있고 보증금·월세 인상은 5% 이내.

import { chance, next, pick } from './rng';
import { gate, type Choice, type EventDef } from './ev-util';
import { formatMoney } from './economy';
import { alive, head, spouseOf } from './people';
import { JEONSE_TERM } from './housing';
import type { Asset, GameState, Person } from './types';

export type Lease = 'wolse' | 'jeonse' | 'empty';

export function jeonseRatio(a: Asset): number {
  if (a.kind === 'apt_seoul') return 0.55;
  if (a.kind === 'apt_local') return 0.7;
  return 0.65;
}
export const leaseOf = (a: Asset): Lease => (a.deposit ? 'jeonse' : a.lease ?? 'wolse');
export const LEASE_NAME: Record<Lease, string> = { wolse: '월세 놓는 중', jeonse: '전세 놓는 중', empty: '비어 있음' };

/** 임대 방식을 바꾼다. 전세를 빼려면 보증금을 돌려줘야 한다 */
export function setLease(s: GameState, a: Asset, to: Lease): string {
  const o = s.people[a.ownerId];
  if (!o) return '';
  const cur = leaseOf(a);
  if (cur === to) return '';
  if (cur === 'jeonse') {
    if (o.cash < (a.deposit ?? 0)) return `보증금 ${formatMoney(a.deposit ?? 0)}을 돌려줄 현금이 없다`;
    o.cash -= a.deposit ?? 0;
    const back = a.deposit ?? 0;
    a.deposit = undefined;
    a.depositEnd = undefined;
    a.lease = to;
    return `${a.name}: 전세 세입자에게 보증금 ${formatMoney(back)}을 돌려주고 ${to === 'wolse' ? '월세로 돌렸다' : '비워 뒀다'}.`;
  }
  if (to === 'jeonse') {
    const dep = Math.round((a.value * jeonseRatio(a) * (0.95 + next(s) * 0.1)) / 100) * 100;
    a.deposit = dep;
    a.depositEnd = s.year + JEONSE_TERM;
    a.lease = 'jeonse';
    o.cash += dep;
    return `${a.name}: 전세 세입자를 들였다. 보증금 ${formatMoney(dep)}이 들어왔다 (${JEONSE_TERM}년 뒤 돌려줘야 할 빚).`;
  }
  a.lease = to;
  return to === 'empty' ? `${a.name}: 세를 빼고 비워 뒀다. 월세는 없지만 언제든 들어가 살거나 팔 수 있다.` : `${a.name}: 월세 세입자를 구했다.`;
}

const mineOf = (s: GameState) => {
  const h = head(s);
  const sp = spouseOf(s, h);
  return new Set([h.id, ...(sp && alive(sp) ? [sp.id] : [])]);
};

type TKind = 'arrears' | 'repair' | 'leak' | 'raise' | 'good' | 'damage' | 'remodel' | 'renew';

/** 해마다: 세를 준 우리 집마다 가끔 일이 생긴다 */
export function tenantYear(s: GameState, rented: Asset[]) {
  const mine = mineOf(s);
  for (const a of rented) {
    if (!mine.has(a.ownerId) || s.events.some((e) => e.defId === 'tenant' && e.data?.assetId === a.id)) continue;
    if (!chance(s, 0.16)) continue;
    const l = leaseOf(a);
    const pool: TKind[] = l === 'wolse' ? ['arrears', 'repair', 'leak', 'raise', 'good', 'damage', 'remodel'] : ['repair', 'leak', 'good'];
    s.events.push({ uid: s.eventSeq++, defId: 'tenant', personId: a.ownerId, data: { assetId: a.id, k: pick(s, pool) } });
  }
}

const rentOf = (a: Asset) => Math.round(a.value * (a.yield ?? 0.03));

const tenantEv: EventDef = {
  id: 'tenant',
  title: () => '🔑 임대 관리',
  valid: (c) => c.s.assets.some((a) => a.id === c.ev.data.assetId),
  text: (c) => {
    const a = c.s.assets.find((x) => x.id === c.ev.data.assetId)!;
    const k = c.ev.data.k as TKind;
    const r = formatMoney(Math.round(rentOf(a) / 12));
    const T: Record<TKind, string> = {
      arrears: `${a.name} 세입자가 월세를 석 달째 밀렸다. 월 ${r}. 전화도 잘 안 받는다.`,
      repair: `${a.name} 세입자 문자: "보일러가 고장 나서 온수가 안 나와요. 집주인이 고쳐 주셔야 하는 거죠?" (민법상 수선 의무는 임대인에게 있다)`,
      leak: `${a.name} 아랫집에서 연락이 왔다. 천장에 물이 샌다고. 배관 누수면 집주인 책임이다.`,
      raise: `${a.name} 주변 월세가 올랐다. 지금 월 ${r}인데 올려 볼까?${c.s.year >= 2020 ? ' (계약갱신청구권: 기존 세입자에겐 5%까지만)' : ''}`,
      good: `${a.name} 세입자가 계약을 더 연장하고 싶다고 한다. 월세를 한 번도 밀린 적 없고 집도 깨끗이 쓴다.`,
      damage: `${a.name} 세입자가 이사 나간 뒤 가 보니 벽지·장판이 엉망이고 문짝이 부서져 있다. 반려동물을 몰래 키웠던 모양이다.`,
      remodel: `${a.name}이(가) 낡아서 새 세입자가 잘 안 구해진다. 중개사가 올수리를 권한다.`,
      renew: '',
    };
    return T[k];
  },
  choices: (c) => {
    const a = c.s.assets.find((x) => x.id === c.ev.data.assetId)!;
    const o: Person = c.s.people[a.ownerId];
    const k = c.ev.data.k as TKind;
    const rent = rentOf(a);
    const out: Choice[] = [];
    switch (k) {
      case 'arrears':
        out.push({
          label: '사정 봐서 기다려 준다',
          run: () => {
            if (chance(c.s, 0.6)) return '두 달 뒤 밀린 월세가 한꺼번에 들어왔다. "정말 감사합니다."';
            o.cash -= Math.round(rent * 0.4);
            return `결국 야반도주했다. 보증금으로 메우고도 ${formatMoney(Math.round(rent * 0.4))}을 날렸다.`;
          },
        });
        out.push({ label: '보증금에서 까고 내보낸다', run: () => ((o.cash -= Math.round(rent * 0.25)), '보증금에서 밀린 월세를 제하고 계약을 끝냈다. 새 세입자를 구하는 석 달 동안 공실.') });
        out.push({ label: '내용증명 → 명도소송 (300만)', cost: 300, run: () => '반년 걸려 명도 판결을 받았다. 밀린 월세는 보증금에서 받아냈다.' });
        break;
      case 'repair':
        out.push({ label: '바로 고쳐 준다', cost: 180, run: () => ((a.value = Math.round(a.value * 1.002)), '다음 날 기사님을 보냈다. 세입자가 고맙다며 귤 한 상자를 보냈다.') });
        out.push({
          label: '"쓰다 망가진 건 세입자 몫"이라며 버틴다',
          run: () => {
            if (chance(c.s, 0.5)) return (o.cash -= 250), '세입자가 분쟁조정위원회에 신청했다. 결국 수리비에 조정 비용까지 냈다.';
            return '세입자가 자기 돈으로 고쳤다. 계약이 끝나면 나가겠단다.';
          },
        });
        break;
      case 'leak':
        out.push({ label: '배관 공사 + 아랫집 배상', cost: 450, run: () => '벽을 뜯고 배관을 새로 깔았다. 아랫집 도배까지 해 줬다. (주택 화재·누수 배상책임 보험이 있었다면…)' });
        out.push({ label: '우리 집 탓인지 따져 본다', run: () => (chance(c.s, 0.35) ? '윗집 누수로 밝혀졌다. 한 푼도 안 냈다.' : ((o.cash -= 700), '누수 탐지 결과 우리 집 배관. 시간 끄는 사이 피해가 커져 700만 원을 물어 줬다.')) });
        break;
      case 'raise':
        out.push({
          label: c.s.year >= 2020 ? '5% 올린다 (갱신청구권 한도)' : '10% 올린다',
          run: () => {
            const up = c.s.year >= 2020 ? 0.05 : 0.1;
            if (c.s.year < 2020 && chance(c.s, 0.35)) return (o.cash -= Math.round(rent * 0.25)), '세입자가 나갔다. 새 세입자를 구하는 석 달 동안 공실.';
            a.yield = Math.round((a.yield ?? 0.03) * (1 + up) * 10000) / 10000;
            return `월세를 ${Math.round(up * 100)}% 올렸다. 세입자가 한숨을 쉬며 도장을 찍었다.`;
          },
        });
        out.push({ label: '그대로 둔다 (좋은 세입자 유지)', run: () => '올리지 않았다. 세입자가 오래 살겠다고 한다.' });
        break;
      case 'good':
        out.push({ label: '흔쾌히 연장한다', run: () => ((a.tags = [...new Set([...(a.tags ?? []), '장기 세입자'])]), '10년째 사는 세입자. 공실 걱정이 없다.') });
        break;
      case 'damage':
        out.push({ label: '보증금에서 원상복구비를 뺀다', run: () => (chance(c.s, 0.7) ? '사진을 보여 주니 순순히 인정했다. 보증금에서 수리비를 뺐다.' : ((o.cash -= 200), '"원래 그랬다"며 버틴다. 소액 소송까지 가긴 번거로워 200만 원을 내가 댔다.')) });
        out.push({ label: '그냥 내 돈으로 고친다', cost: 300, run: () => '도배·장판을 새로 했다. 새 세입자가 금방 구해졌다.' });
        break;
      case 'remodel':
        out.push({
          label: `올수리한다 (${formatMoney(Math.round(a.value * 0.02))})`,
          cost: Math.round(a.value * 0.02),
          run: () => {
            a.value = Math.round(a.value * 1.025);
            a.yield = Math.round((a.yield ?? 0.03) * 1.12 * 10000) / 10000;
            a.tags = (a.tags ?? []).filter((t) => t !== '구축');
            return '욕실·주방을 새로 했다. 월세를 올려 받고도 새 세입자가 바로 들어왔다.';
          },
        });
        out.push({ label: '월세를 낮춰 내놓는다', run: () => ((a.yield = Math.round((a.yield ?? 0.03) * 0.9 * 10000) / 10000), '월세를 10% 내리자 금방 계약이 됐다.') });
        break;
    }
    return gate(c.s, out);
  },
};

/** 전세 만기 (우리 집): 재계약·월세 전환·새 세입자 중 고른다. 시세가 떨어졌으면 역전세 */
const jeonseEnd: EventDef = {
  id: 'jeonse_end',
  title: () => '📅 전세 만기',
  valid: (c) => c.s.assets.some((a) => a.id === c.ev.data.assetId && a.deposit),
  text: (c) => {
    const a = c.s.assets.find((x) => x.id === c.ev.data.assetId)!;
    const market = Math.round((a.value * jeonseRatio(a)) / 100) * 100;
    c.ev.data.market ??= market;
    const renew = c.s.year >= 2020;
    const diff = market - (a.deposit ?? 0);
    return (
      `${a.name} 전세 계약이 끝난다. 지금 보증금 ${formatMoney(a.deposit ?? 0)} · 요즘 시세 ${formatMoney(market)}\n` +
      (diff < 0 ? `😰 역전세: 시세가 떨어져 새 세입자를 들여도 ${formatMoney(-diff)}이 모자란다.` : `시세가 ${formatMoney(diff)} 올랐다.`) +
      (a.deposit! > a.value * 0.9 ? '\n⚠ 보증금이 집값에 육박한다 (깡통전세 위험). 세입자가 불안해한다.' : '') +
      (renew ? '\n(세입자가 계약갱신청구권을 쓰면 5%까지만 올릴 수 있다)' : '')
    );
  },
  choices: (c) => {
    const a = c.s.assets.find((x) => x.id === c.ev.data.assetId)!;
    const o = c.s.people[a.ownerId];
    const market: number = c.ev.data.market;
    const renew = c.s.year >= 2020;
    const out: Choice[] = [];
    const cap = renew ? Math.round((a.deposit! * 1.05) / 100) * 100 : market;
    const nd = market < a.deposit! ? market : Math.min(market, cap);
    out.push({
      label: renew && market > a.deposit! ? `재계약 (+5%: ${formatMoney(cap)})` : `시세대로 재계약 (${formatMoney(nd)})`,
      disabled: nd < a.deposit! && o.cash < a.deposit! - nd,
      run: () => {
        const diff = nd - a.deposit!;
        o.cash += diff;
        a.deposit = nd;
        a.depositEnd = c.s.year + JEONSE_TERM;
        return diff >= 0 ? `재계약. 보증금 ${formatMoney(diff)}을 더 받았다.` : `역전세. 차액 ${formatMoney(-diff)}을 돌려주고 재계약했다.`;
      },
    });
    out.push({
      label: `월세로 돌린다 (보증금 ${formatMoney(a.deposit!)} 반환)`,
      disabled: o.cash < a.deposit!,
      run: () => setLease(c.s, a, 'wolse'),
    });
    if (market < a.deposit!)
      out.push({
        label: `전세보증금 반환 대출을 받아 돌려준다`,
        run: () => {
          const gap = a.deposit! - market;
          a.loan = (a.loan ?? 0) + gap;
          o.cash += 0;
          a.deposit = market;
          a.depositEnd = c.s.year + JEONSE_TERM;
          return `모자란 ${formatMoney(gap)}은 반환 대출로 막았다. 이자 부담이 늘었다.`;
        },
      });
    out.push({
      label: '집을 팔아 정리한다',
      run: () => {
        const got = Math.round(a.value * 0.996 - (a.loan ?? 0) - a.deposit!);
        o.cash += got;
        c.s.assets = c.s.assets.filter((x) => x.id !== a.id);
        return `세입자 보증금을 끼고 팔았다. 손에 쥔 돈 ${formatMoney(got)} (양도세는 따로).`;
      },
    });
    return out;
  },
};

export const TENANT_EVENTS = [tenantEv, jeonseEnd];

/** 전세 만기인 우리 집이면 이벤트로 (다른 사람 집은 자동) */
export function queueJeonseEnd(s: GameState, a: Asset): boolean {
  if (!mineOf(s).has(a.ownerId)) return false;
  if (!s.events.some((e) => e.defId === 'jeonse_end' && e.data?.assetId === a.id)) s.events.push({ uid: s.eventSeq++, defId: 'jeonse_end', personId: a.ownerId, data: { assetId: a.id } });
  return true;
}

