// 떡밥이 있는 연쇄 사건: 처음엔 작은 신호, 몇 년 뒤 그 선택의 결과가 돌아온다.
//
// 전세 사기: 전세로 사는 집에서만 (자가·월세·부모님 댁이면 일어나지 않는다).
//   ① 계약 — 수상한 신호(진짜 위험일 수도, 흔한 일일 수도). 보증보험·확정일자·그냥 도장
//   ② 1~3년 뒤 소문 — 집주인 연락 두절, 경매 개시. 임차권 등기·대책위·보증기관 청구
//   ③ 1~2년 뒤 결말 — ①②의 선택에 따라 돌려받는 몫이 다르다. 특별법(2023~) 우선매수, 이사, 소송
//   ④ 소송을 이어 가면 몇 년 뒤 판결
import { chance, int } from './rng';
import { gate, schedule, type Choice, type EventDef } from './ev-util';
import { formatMoney } from './economy';
import { wageIndex } from './pay';
import { addFlag, age, clamp, hasFlag, householder } from './people';
import { buyCurrentHome, homeBuyQuote, homeHolder, moveTo, tiers } from './housing';
import { unlock } from './achievements';
import type { GameState, Person } from './types';

const W = (s: GameState, v: number) => Math.max(1, Math.round(v * wageIndex(s.year)));
const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const holderOf = (s: GameState) => homeHolder(s, householder(s));
const jeonse = (s: GameState) => holderOf(s)?.home?.type === 'jeonse';

const BAD_CLUES = [
  '집주인이 두 달 전에 바뀌었다. 같은 이름으로 이 동네 빌라가 수십 채 있다는 말을 들었다.',
  '전세금이 매매 시세의 95%다. 집값이 조금만 내려도 돌려받을 돈이 모자란다.',
  '등기부등본에 근저당이 두 건 잡혀 있다. 중개사는 "곧 말소된다"고 한다.',
  '중개사가 "보증보험은 안 들어도 괜찮다, 계약은 오늘 해야 한다"고 서두른다.',
];
const OK_CLUES = [
  '집주인이 법인이다. 요즘은 흔한 일이라고 한다.',
  '전세금이 시세보다 조금 싸다. 집주인이 급하게 해외로 나간다고 한다.',
  '등기부에 오래된 근저당이 하나 있다. 금액은 크지 않다.',
  '집주인이 계약을 대리인에게 맡겼다. 위임장은 있다.',
];

const sign: EventDef = {
  id: 'jf_sign',
  title: () => '📋 전세 계약서에 도장을 찍기 전에',
  portraits: (c) => [c.p],
  valid: (c) => jeonse(c.s),
  text: (c) => {
    c.ev.data ??= { bad: chance(c.s, 0.45), i: int(c.s, 0, 3) };
    const clue = (c.ev.data.bad ? BAD_CLUES : OK_CLUES)[c.ev.data.i];
    return `전세 계약 만기가 다가와 재계약(또는 이사)을 앞두고 있다. 그런데 마음에 걸리는 게 하나 있다.\n\n${clue}\n\n괜한 걱정일까, 떡밥일까?`;
  },
  choices: (c) =>
    gate(c.s, [
      {
        label: '등기부를 떼고 전세보증보험까지 든다',
        cost: W(c.s, 40),
        run: (x) => {
          if (!x.ev.data.bad) return (addFlag(x.p, 'jf:checked'), '꼼꼼히 확인했다. 아무 문제 없었다. 마음 편히 2년을 산다.');
          if (chance(x.s, 0.5)) {
            unlock(x.s, 'jf_dodged');
            x.p.actual.int = clamp(x.p.actual.int + 2, 0, 100);
            return '보증보험 심사에서 거절됐다. "이 집은 위험합니다." 계약을 접고 다른 집을 구했다. 몇 달 뒤 그 건물 세입자들이 뉴스에 나왔다.';
          }
          addFlag(x.p, 'jf:active');
          schedule(x.s, int(x.s, 1, 3), 'jf_rumor', x.p.id, { prot: 'insured' });
          return '보증보험에 가입했다. 보험증권을 서랍 깊숙이 넣었다. 이게 쓸 일이 없어야 할 텐데.';
        },
      },
      {
        label: '전입신고·확정일자만 챙긴다',
        run: (x) => {
          if (!x.ev.data.bad) return '주민센터에서 확정일자 도장을 받았다. 별일 없었다.';
          addFlag(x.p, 'jf:active');
          schedule(x.s, int(x.s, 1, 3), 'jf_rumor', x.p.id, { prot: 'dated' });
          return '확정일자를 받았다. 이 정도면 됐겠지. 집주인은 계약 날 끝내 얼굴을 보이지 않았다.';
        },
      },
      {
        label: '"설마" 하고 도장을 찍는다',
        run: (x) => {
          if (!x.ev.data.bad) return '아무 일도 없었다. 걱정이 많았나 보다.';
          addFlag(x.p, 'jf:active');
          schedule(x.s, int(x.s, 1, 3), 'jf_rumor', x.p.id, { prot: 'none' });
          return '도장을 찍었다. 중개사가 유난히 밝게 웃었다.';
        },
      },
    ]),
};

const rumor: EventDef = {
  id: 'jf_rumor',
  title: () => '🚨 같은 건물 세입자 단톡방',
  portraits: (c) => [c.p],
  valid: (c) => jeonse(c.s),
  text: (c) =>
    `"혹시 집주인이랑 연락되시는 분?" 단톡방에 메시지가 쏟아진다. 현관문에 경매 개시 결정문이 붙었다.\n${c.ev.data.prot === 'insured' ? '서랍 속 보증보험 증권이 떠오른다.' : c.ev.data.prot === 'dated' ? '확정일자를 받아 둔 게 그나마 다행일까.' : '계약서 말고는 아무것도 없다.'}`,
  choices: (c) =>
    gate(c.s, [
      ...(c.ev.data.prot === 'insured'
        ? [{ label: '보증기관에 보증금 반환을 청구한다', run: (x) => ((x.ev.data.claim = true), schedule(x.s, 1, 'jf_end', x.p.id, x.ev.data), '서류를 냈다. 심사에 몇 달이 걸린단다.') } as Choice]
        : []),
      {
        label: '임차권 등기를 하고 피해자 대책위에 들어간다',
        cost: W(c.s, 60),
        run: (x) => {
          x.ev.data.reg = true;
          hap(x.p, -3);
          schedule(x.s, int(x.s, 1, 2), 'jf_end', x.p.id, x.ev.data);
          return '법원에 임차권 등기를 했다. 대책위 사람들과 국회 앞에서 피켓을 들었다.';
        },
      },
      { label: '일단 기다려 본다', run: (x) => (schedule(x.s, int(x.s, 1, 2), 'jf_end', x.p.id, x.ev.data), hap(x.p, -5), '잠이 오지 않는 밤이 이어진다.') },
    ]),
};

const end: EventDef = {
  id: 'jf_end',
  title: () => '⚖ 전세 보증금의 행방',
  portraits: (c) => [c.p],
  valid: (c) => jeonse(c.s),
  text: (c) => {
    const d = c.ev.data;
    if (d.ratio === undefined) {
      d.ratio =
        d.prot === 'insured' && d.claim ? 1 : d.prot === 'insured' ? 0.85 : d.prot === 'dated' ? (d.reg ? 0.55 + int(c.s, 0, 25) / 100 : 0.3 + int(c.s, 0, 20) / 100) : d.reg ? 0.2 + int(c.s, 0, 20) / 100 : int(c.s, 0, 20) / 100;
      const h = c.p.home!;
      d.loss = Math.round(h.deposit * (1 - d.ratio));
      h.deposit -= d.loss;
      if (d.loss > 0) addFlag(c.p, 'jf_victim');
    }
    if (d.loss <= 0) return '보증기관이 보증금을 전액 돌려줬다. 1년 가까이 걸렸지만, 한 푼도 잃지 않았다. 그때 보험을 든 자신이 고맙다.';
    return `경매가 끝났다. 보증금 가운데 ${Math.round(d.ratio * 100)}%만 돌아왔다. ${formatMoney(d.loss)}이 사라졌다.\n${d.reg ? '임차권 등기 덕에 순서를 지킬 수 있었다.' : '미리 움직였다면 달랐을까.'}\n\n이제 어떻게 할까?`;
  },
  choices: (c) => {
    const d = c.ev.data;
    if (d.loss <= 0) return [{ label: '휴, 살았다', run: (x) => (unlock(x.s, 'jf_dodged'), hap(x.p, 5), '다음 계약서엔 보증보험부터 넣기로 했다.') }];
    const q = homeBuyQuote(c.s, c.p);
    const out: Choice[] = [];
    if (c.s.year >= 2023 && q) {
      const discount = Math.round(q.price * 0.25);
      out.push({
        label: `특별법 우선매수권으로 이 집을 산다 (경매가 ${formatMoney(q.price - discount)})`,
        disabled: q.need - discount > householder(c.s).cash,
        req: q.need - discount > householder(c.s).cash ? ['돈이 모자란다'] : undefined,
        run: (x) => {
          x.p.cash += discount;
          const r = buyCurrentHome(x.s, x.p);
          if (!x.p.home || x.p.home.type !== 'own') x.p.cash -= discount;
          unlock(x.s, 'jf_survivor');
          return `피해자 우선매수권을 썼다. 사기당한 그 집이 이제 내 집이다. ${r}`;
        },
      });
    }
    out.push(
      {
        label: '정든 집을 떠나 월세로 옮긴다',
        run: (x) => {
          const t = tiers(x.s);
          const low = t[Math.max(0, t.findIndex((z) => z.id === x.p.home!.tier) - 1)] ?? t[0];
          const r = moveTo(x.s, x.p, low.id, 'wolse');
          hap(x.p, -6);
          return `짐을 쌌다. 좁아졌지만 다시 시작한다. ${r}`;
        },
      },
      {
        label: '민사소송으로 끝까지 받아 낸다',
        cost: W(c.s, 200),
        run: (x) => (schedule(x.s, int(x.s, 2, 4), 'jf_suit', x.p.id, { loss: d.loss }), '변호사를 선임했다. 집주인은 이미 다른 사건으로 구속됐다고 한다.'),
      },
      { label: '털고 일어난다', run: (x) => (hap(x.p, -8), (x.p.actual.mor = clamp(x.p.actual.mor + 1, 0, 100)), x.p.flags = x.p.flags.filter((f) => f !== 'jf:active'), '비싼 수업료였다. 아이들에게 등기부 보는 법만은 꼭 가르치겠다.') },
    );
    return gate(c.s, out).map((ch) => ({ ...ch, run: (x) => ((x.p.flags = x.p.flags.filter((f) => f !== 'jf:active')), ch.run(x)) }));
  },
};

const suit: EventDef = {
  id: 'jf_suit',
  title: () => '⚖ 전세 사기 판결',
  portraits: (c) => [c.p],
  text: (c) => {
    c.ev.data.win ??= chance(c.s, 0.4);
    return c.ev.data.win ? `재판부가 집주인에게 보증금 반환을 명령했다. 은닉 재산에서 일부가 회수됐다.` : '승소했지만 집주인에게 남은 재산이 없었다. 판결문만 손에 쥐었다.';
  },
  choices: (c) => [
    {
      label: c.ev.data.win ? '돌려받는다' : '받아들인다',
      run: (x) => {
        if (!x.ev.data.win) return (hap(x.p, -3), '"종이 한 장이네." 그래도 끝까지 싸운 게 후회되진 않는다.');
        const back = Math.round(x.ev.data.loss * 0.4);
        x.p.cash += back;
        unlock(x.s, 'jf_survivor');
        return `${formatMoney(back)}을 돌려받았다. 대책위 사람들과 조촐하게 밥을 먹었다.`;
      },
    },
  ],
};

export const CHAIN_EVENTS: EventDef[] = [sign, rumor, end, suit];

/** 해마다: 전세로 사는 집에만 가끔 계약 사건이 온다 (전세 사기가 사회 문제였던 2020년대 전후엔 더 자주) */
export function chainYear(s: GameState): void {
  const h = holderOf(s);
  if (!h?.home || h.home.type !== 'jeonse' || age(s, h) < 20) return;
  if (hasFlag(h, 'jf:active') || s.events.some((e) => e.defId.startsWith('jf_')) || (s.scheduled ?? []).some((e) => e.defId.startsWith('jf_'))) return;
  const seen = (s.storySeen ??= {});
  if (s.year - (seen['jf:last'] ?? -99) < 6) return;
  const p = s.year < 1990 ? 0 : s.year >= 2019 && s.year <= 2032 ? 0.12 : 0.05;
  if (!chance(s, p)) return;
  seen['jf:last'] = s.year;
  s.events.push({ uid: s.eventSeq++, defId: 'jf_sign', personId: h.id });
}

