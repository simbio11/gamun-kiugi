// 국빈급 환자: 아주 드물게, 의사·한의사에게 세계적인 인물의 치료 의뢰가 온다.
//   성공 확률은 능력치(지능·성품·매력) + 직급 + 재능(약손·수재·공감 능력) + 적성(의료 분야)으로 정해진다.
//   살려 내면 칭호 카드: 의사는 「의술의 신」, 한의사는 「침술의 신」.
import { gate, type Choice, type EventDef } from './ev-util';
import { formatMoney } from './economy';
import { fitCats } from './interests';
import { addFlag, age, alive, clamp, fullName, hasFlag, hasTalent, isMainline } from './people';
import { chance, pick } from './rng';
import type { GameState, Person } from './types';

const PATIENTS = [
  '방한 중인 미국 대통령',
  '영국 국왕',
  '중동 산유국의 왕세자',
  '세계 1위 부호',
  '할리우드 톱스타',
  '일본 총리',
  '노벨상 수상자 노학자',
  '월드컵 득점왕 축구 스타',
];

const DOC = (p: Person) => (p.job === 'doctor' && p.jobLevel >= 2) || (p.job === 'kmd' && p.jobLevel >= 1);
const isKmd = (p: Person) => p.job === 'kmd';
export const cureTitle = (p: Person) => (isKmd(p) ? '침술의 신' : '의술의 신');
const flagOf = (p: Person) => (isKmd(p) ? 'god_acupuncture' : 'god_medicine');

/** 이 의료인의 치료 성공 확률: 직접 치료(지능·성품) / 협진(매력·지능) */
export function cureOdds(p: Person, team: boolean): number {
  const a = p.actual;
  const stat = team ? a.cha * 0.5 + a.int * 0.5 : a.int * 0.6 + a.mor * 0.4;
  let o = 0.08 + (stat - 50) * 0.009 + p.jobLevel * 0.04;
  if (hasTalent(p, 'healer')) o += 0.15;
  if (hasTalent(p, 'genius')) o += 0.08;
  if (hasTalent(p, 'empath')) o += 0.05;
  if (fitCats(p, 2).includes('medical' as never)) o += 0.06;
  if (team) o += 0.05;
  return clamp(o, 0.05, 0.85);
}

/** 해마다: 본가의 의사(전문의 이상)·한의사에게 드물게 */
export function vipCureYear(s: GameState): void {
  const seen = (s.storySeen ??= {});
  for (const p of Object.values(s.people)) {
    if (!alive(p) || !isMainline(s, p) || !DOC(p) || hasFlag(p, flagOf(p))) continue;
    if (age(s, p) < 32 || s.year - (seen[`vip:${p.id}`] ?? -99) < 6) continue;
    if (!chance(s, 0.015 + p.jobLevel * 0.004)) continue;
    seen[`vip:${p.id}`] = s.year;
    s.events.push({ uid: s.eventSeq++, defId: 'vip_cure', personId: p.id, data: { who: pick(s, PATIENTS) } });
  }
}

const vip: EventDef = {
  id: 'vip_cure',
  title: (c) => (isKmd(c.p) ? '🪡 극비 왕진 요청' : '🚑 극비 진료 요청'),
  valid: (c) => alive(c.p) && DOC(c.p),
  text: (c) => {
    const who = c.ev.data.who as string;
    return isKmd(c.p)
      ? `한밤중, 검은 차가 ${fullName(c.p)}의 한의원 앞에 섰다. ${who}이(가) 원인 모를 통증으로 쓰러졌다. 세계 최고 병원들이 손을 들었고, 마지막으로 동양 의학을 찾았다고 한다. "침 한 번에 세계가 지켜봅니다."`
      : `정부 의전팀이 ${fullName(c.p)}을(를) 조용히 불렀다. ${who}이(가) 갑자기 쓰러졌다. 극비 진료다. 실패하면 외교 문제가 되고, 살려 내면 세계가 이름을 기억할 것이다.`;
  },
  choices: (c) => {
    const kmd = isKmd(c.p);
    const who = c.ev.data.who as string;
    const go = (team: boolean): Choice => ({
      label: team ? (kmd ? '양·한방 협진팀을 꾸린다 (매력·지능)' : '국내 최고 의료진과 협진한다 (매력·지능)') : kmd ? '직접 침을 놓는다 (지능·성품)' : '직접 집도한다 (지능·성품)',
      odds: cureOdds(c.p, team),
      run: (x) => {
        if (!chance(x.s, cureOdds(x.p, team))) {
          x.s.fame = Math.max(0, x.s.fame - 2);
          x.p.happiness = clamp(x.p.happiness - 10, 0, 100);
          return `최선을 다했지만 ${who}의 상태는 해외 병원으로 넘어갔다. 언론은 조용했지만, ${fullName(x.p)}의 마음엔 오래 남았다. (명성 −2) …언젠가 또 기회가 올지도 모른다.`;
        }
        addFlag(x.p, flagOf(x.p));
        const fee = 30000;
        x.p.cash += fee;
        x.s.fame += 6;
        x.p.happiness = clamp(x.p.happiness + 25, 0, 100);
        x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100);
        return kmd
          ? `🪡 침 세 대. ${who}이(가) 눈을 떴다. 다음 날 세계 언론 1면: "한국의 기적의 손". (+${formatMoney(fee)}, 명성 +6)\n✨ 칭호 「침술의 신」`
          : `⚕ 9시간의 사투 끝에 ${who}이(가) 의식을 되찾았다. 퇴원 기자회견에서 ${fullName(x.p)}의 이름을 불렀다. (+${formatMoney(fee)}, 명성 +6)\n✨ 칭호 「의술의 신」`;
      },
    });
    return gate(c.s, [go(false), go(true), { label: '감당할 수 없다며 정중히 사양한다', run: () => '다른 의사가 맡았다. 뉴스로 소식을 들었다.' }]);
  },
};

export const VIP_EVENTS: EventDef[] = [vip];
