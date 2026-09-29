// 일상 이야기: 데이터로 쓰는 작은 이벤트들. 나이대별로 가족 누구에게나 일어난다.
// 효과(Eff)는 그 인물에게 적용. roll 이 있으면 능력치 판정으로 결과가 갈린다. later 로 후폭풍 예약 가능.

import { chance, int } from './rng';
import { eul, eun, gate, iga, schedule, type Choice, type Ctx } from './ev-util';
import { addFlag, age, alive, check, clamp, fullName, hasFlag, hasTrait, householder, mark, markOf, parentsOf, spouseOf } from './people';
import type { GameState, Person, StatKey } from './types';
import type { LifeDef } from './life';
import { MORE_STORIES } from './stories-more';
import { severance } from './economy';
import { acquireCar, affordCar } from './vehicle';
import { PATH_STORIES } from './stories-path';
import { pathOf, type Path } from './path';
import { trackOf } from './tracks';
import { TRACK_STORIES } from './stories-track';
import { HOOD_STORIES } from './stories-hood';
import { MINI_STORIES } from './stories-mini';
import { EXTRA_STORIES } from './stories-extra';
import { CAREER_STORIES } from './stories-career';
import { LIFE2_STORIES } from './stories-life2';
import { SUDDEN_STORIES } from './stories-sudden';
import { INTEREST_STORIES } from './stories-interest';
import { LIFE3_STORIES } from './stories-life3';
import { TEMPER_STORIES } from './stories-temper';

export interface Eff {
  str?: number;
  int?: number;
  cha?: number;
  mor?: number;
  hp?: number;
  /** 행복 */
  hap?: number;
  /** 가주(부모)와의 관계 */
  aff?: number;
  cash?: number;
  fame?: number;
  study?: number;
  /** 배우자·연인과의 애정 */
  bond?: number;
  flag?: string;
  /** 차를 산다 (vehicle.ts 모델 id). 끝에 '+'가 붙으면 할부 허용 */
  car?: string;
  /** [확률, 최소년, 최대년, 이벤트 id] */
  later?: [number, number, number, string];
  /** 보이지 않게 쌓이는 흔적 (seeds.ts) */
  mark?: Record<string, number>;
}
export interface SC {
  label: string;
  /** 이 선택이 남기는 흔적 (보이지 않음) */
  mark?: Record<string, number>;
  cost?: number;
  req?: string[];
  need?: (s: GameState, p: Person) => boolean;
  eff?: Eff;
  text: string;
  /** 능력치 판정: [능력치, 기준] → 성공/실패 */
  roll?: [StatKey | 'luck', number, [Eff, string], [Eff, string]];
}
export interface Story {
  id: string;
  title: string;
  /** 나이 범위 */
  age: [number, number];
  w: number;
  text: string;
  choices: SC[];
  /** 가주 본인에게만 */
  head?: boolean;
  /** 평생 한 번 */
  once?: boolean;
  /** 같은 사람에게 다시 일어나기까지 최소 햇수 (기본 8년) */
  cooldown?: number;
  /** 흔적이 쌓일수록 더 자주 일어난다: { 흔적: 배율 } */
  boost?: Record<string, number>;
  cond?: (s: GameState, p: Person) => boolean;
  /** 이 길(전공·직업)을 걷는 사람에게만 */
  paths?: Path[];
  /** 이 길이면 일어나지 않는다 */
  notPaths?: Path[];
  /** 대학생에게만 / 직장인에게만 */
  student?: boolean;
  /** 이 트랙(tracks.ts: u:전공 · x:시험 · w:직업 그룹)일 때만 */
  tracks?: string[];
}

/** {n} 이름, {n이} {n은} {n을} 조사 */
function fill(t: string, p: Person): string {
  const n = fullName(p);
  const wa = n + ((n.charCodeAt(n.length - 1) - 0xac00) % 28 ? '과' : '와');
  const elder = p.sex === 'F' ? '할머니' : '할아버지';
  return t.replaceAll('할머니(할아버지)', elder).replaceAll('할아버지(할머니)', elder).replaceAll('{n와}', wa).replaceAll('{n이}', iga(n)).replaceAll('{n은}', eun(n)).replaceAll('{n을}', eul(n)).replaceAll('{n}', n);
}

function apply(x: Ctx, e: Eff | undefined) {
  if (!e) return;
  const p = x.p;
  for (const k of ['str', 'int', 'cha', 'mor', 'hp'] as StatKey[]) if (e[k]) p.actual[k] = clamp(p.actual[k] + e[k]!, 0, Math.max(p.potential[k], p.actual[k]));
  if (e.hap) p.happiness = clamp(p.happiness + e.hap, 0, 100);
  if (e.aff) p.affinity = clamp(p.affinity + e.aff, -100, 100);
  if (e.cash) (e.cash < 0 && age(x.s, p) < 20 ? householder(x.s) : p).cash += e.cash;
  if (e.fame) x.s.fame = Math.max(0, x.s.fame + e.fame);
  if (e.study) p.study = clamp((p.study ?? 40) + e.study, 0, 100);
  if (e.bond) {
    const q = spouseOf(x.s, p) ?? (p.partnerId ? x.s.people[p.partnerId] : undefined);
    if (q && alive(q)) p.bond = q.bond = clamp((p.bond ?? 60) + e.bond, 0, 100);
  }
  if (e.flag) addFlag(p, e.flag);
  if (e.car) {
    const r = acquireCar(x.s, p, e.car.replace('+', ''), e.car.endsWith('+'));
    if (r) x.s.log.push({ year: x.s.year, text: `🔑 ${fullName(p)} 새 차: ${r}`, kind: 'money' });
  }
  // 시험을 접는다 / 회사에서 나온다: 실제로 상태가 바뀐다
  if (e.flag === 'quit_prep') p.flags = p.flags.filter((f) => !f.startsWith('prep:') && !f.startsWith('tries:') && f !== 'quit_prep');
  if (e.flag === 'laid_off') {
    p.flags = p.flags.filter((f) => f !== 'laid_off');
    severance(x.s, p);
    p.job = 'none';
    p.jobLevel = 0;
    p.jobYears = 0;
  }
  // 유급: 졸업이 1년 미뤄진다
  if (e.flag === 'repeat_year') {
    const g = p.flags.find((f) => f.startsWith('grad:'));
    if (g) p.flags = [...p.flags.filter((f) => f !== g && f !== 'repeat_year'), 'grad:' + (Number(g.slice(5)) + 1)];
  }
  if (e.mark) for (const [k, n] of Object.entries(e.mark)) mark(p, k, n);
  if (e.later && chance(x.s, e.later[0])) schedule(x.s, int(x.s, e.later[1], e.later[2]), e.later[3], p.id);
}

function toChoice(sc: SC): Choice {
  return {
    label: sc.label,
    cost: sc.cost,
    req: sc.req,
    run: (x) => {
      apply(x, sc.eff);
      if (sc.mark) for (const [k, n] of Object.entries(sc.mark)) mark(x.p, k, n);
      if (sc.roll) {
        const [k, need, win, lose] = sc.roll;
        const okk = k === 'luck' ? chance(x.s, need / 100) : check(x.s, x.p.actual[k], need, 8);
        const [e, t] = okk ? win : lose;
        apply(x, e);
        return fill(t, x.p);
      }
      return fill(sc.text, x.p);
    },
  };
}

function toLife(st: Story): LifeDef {
  return {
    id: 'st_' + st.id,
    title: () => st.title,
    text: (c) => fill(st.text, c.p),
    weight: (s, p) => {
      const a = age(s, p);
      if (a < st.age[0] || a > st.age[1] || p.inLaw) return 0;
      if (st.head && p.id !== s.headId) return 0;
      if (st.once && hasFlag(p, 'st:' + st.id)) return 0;
      const last = s.storySeen?.[p.id + ':' + st.id];
      if (last !== undefined && s.year - last < (st.cooldown ?? 8)) return 0;
      if (st.cond && !st.cond(s, p)) return 0;
      if (st.paths && !st.paths.includes(pathOf(p))) return 0;
      if (st.notPaths && st.notPaths.includes(pathOf(p))) return 0;
      if (st.student !== undefined && st.student !== p.flags.includes('student')) return 0;
      if (st.tracks && !st.tracks.includes(trackOf(s, p) ?? '')) return 0;
      let w = st.w;
      if (st.boost) for (const [k, m] of Object.entries(st.boost)) w *= 1 + Math.min(6, markOf(p, k)) * m;
      return w;
    },
    choices: (c) => {
      if (st.once) addFlag(c.p, 'st:' + st.id);
      (c.s.storySeen ??= {})[c.p.id + ':' + st.id] = c.s.year;
      return gate(
        c.s,
        st.choices.filter((sc) => !sc.need || sc.need(c.s, c.p)).map(toChoice),
      );
    },
  };
}

const working = (_s: GameState, p: Person) => !['none', 'parttime', 'pension'].includes(p.job) && !p.flags.includes('student');
const married = (s: GameState, p: Person) => !!spouseOf(s, p) && alive(spouseOf(s, p)!);
const hasKids = (s: GameState, p: Person) => p.childIds.some((id) => alive(s.people[id]) && age(s, s.people[id]) < 20);
const hasParents = (s: GameState, p: Person) => parentsOf(s, p).some(alive);

const S: Story[] = [
  // ───────── 어린 시절 (5~12) ─────────
  { id: 'errand', title: '첫 심부름', age: [5, 7], w: 0.05, once: true, text: '{n이} 처음으로 혼자 슈퍼에 심부름을 간다.', choices: [
    { label: '믿고 보낸다', mark: { warmth: 1 }, text: '', roll: ['int', 15, [{ mor: 3, hap: 5 }, '두부를 사 들고 의기양양하게 돌아왔다!'], [{ hap: -2 }, '두부 대신 아이스크림을 사 왔다. 거스름돈은 없다.']] },
    { label: '몰래 뒤따라간다', mark: { warmth: 1 }, text: '전봇대 뒤에 숨어 지켜봤다. 무사히 다녀왔다.', eff: { aff: 4 } },
  ] },
  { id: 'talent_show', title: '장기자랑', age: [6, 11], w: 0.04, text: '학교 장기자랑에 {n이} 나가고 싶어 한다.', choices: [
    { label: '노래 연습을 도와준다', mark: { warmth: 1, art: 1 }, text: '', roll: ['cha', 25, [{ cha: 3, hap: 8 }, '박수갈채! {n이} 반에서 스타가 됐다.'], [{ hap: -4 }, '가사를 까먹었다. 울면서 내려왔다.']] },
    { label: '공부나 하라고 한다', mark: { hurt: 1, study: 1 }, text: '{n이} 시무룩하다.', eff: { study: 1, hap: -5, aff: -3 } },
  ] },
  { id: 'class_pres', title: '반장 선거', age: [8, 16], w: 0.05, text: '{n이} 반장 선거에 나가겠다고 한다.', choices: [
    { label: '연설문을 같이 쓴다', mark: { warmth: 1, honest: 1 }, text: '', roll: ['cha', 35, [{ cha: 3, mor: 2, hap: 8, flag: 'class_pres' }, '반장 당선! 리더십이 생겼다.'], [{ hap: -5 }, '2표 차이로 떨어졌다.']] },
    { label: '햄버거를 돌리게 한다', mark: { cheat: 1 }, cost: 30, text: '', roll: ['luck', 70, [{ hap: 6, mor: -2, flag: 'class_pres' }, '당선됐다. …공약은 햄버거였다.'], [{ hap: -5 }, '선관위에 걸려 자격 박탈.']] },
    { label: '관심 없다', text: '다른 친구가 반장이 됐다.' },
  ] },
  { id: 'kid_fight', title: '친구와 싸움', age: [6, 13], w: 0.05, text: '{n이} 친구와 주먹다짐을 하고 왔다. 코피가 났다.', choices: [
    { label: '먼저 사과하라고 가르친다', mark: { honest: 1 }, text: '다음 날 둘이 어깨동무를 하고 왔다.', eff: { mor: 3 } },
    { label: '맞고 다니지 말라고 한다', mark: { sport: 1 }, text: '{n이} 태권도를 배우겠다고 한다.', eff: { str: 2, mor: -1 } },
    { label: '상대 부모에게 따진다', mark: { warmth: 1 }, text: '엄마들 단톡방이 시끄러워졌다.', eff: { fame: -1, aff: 3 } },
  ] },
  { id: 'crush_kid', title: '짝사랑', age: [9, 13], w: 0.04, text: '{n이} 같은 반 친구를 좋아한다며 밤새 편지를 쓴다.', choices: [
    { label: '응원해 준다', mark: { warmth: 1 }, text: '', roll: ['cha', 30, [{ hap: 10 }, '편지 답장을 받았다! 설레서 잠을 못 잔다.'], [{ hap: -8 }, '읽씹당했다. 인생 첫 실연이다.']] },
    { label: '공부나 하라고 한다', mark: { hurt: 1 }, text: '편지는 서랍 속으로 들어갔다.', eff: { study: 1, aff: -4 } },
  ] },
  { id: 'game_addict', boost: { risk: 0.3 }, title: '게임 중독', age: [9, 17], w: 0.05, text: '{n이} 밤새 게임을 한다. 성적이 떨어지고 있다.', choices: [
    { label: '컴퓨터를 치운다', mark: { hurt: 1, study: 1 }, text: '방문이 쾅 닫혔다.', eff: { study: 3, aff: -8, hap: -6 } },
    { label: '하루 1시간 약속한다', mark: { warmth: 1, study: 1 }, text: '', roll: ['mor', 35, [{ study: 2, mor: 2 }, '약속을 꽤 잘 지킨다.'], [{ study: -2 }, '1시간이 3시간이 됐다.']] },
    { label: '재능일지도 모른다', mark: { warmth: 1, risk: 1 }, text: '랭킹에 이름이 올랐다. 프로게이머 꿈을 꾼다.', eff: { int: 1, study: -3, hap: 6, flag: 'gamer_dream' } },
  ] },
  { id: 'youtube_kid', title: '어린이 유튜버', age: [7, 13], w: 0.02, text: '{n이} 자기도 유튜브 채널을 만들고 싶다고 조른다.', choices: [
    { label: '같이 영상을 찍어준다', mark: { warmth: 1, art: 1 }, cost: 100, text: '', roll: ['cha', 45, [{ cha: 4, hap: 8, fame: 1 }, '장난감 리뷰가 조회수 10만! 동네 스타가 됐다.'], [{ hap: 2 }, '조회수 23. 그래도 재밌었다.']] },
    { label: '아직 이르다', mark: { hurt: 1 }, text: '"다른 애들은 다 하는데…"', eff: { aff: -3 } },
  ] },
  { id: 'broken_arm', title: '골절', age: [6, 15], w: 0.03, text: '{n이} 놀이터에서 떨어져 팔이 부러졌다.', choices: [
    { label: '병원에서 깁스', cost: 80, text: '반 친구들이 깁스에 낙서를 해줬다.', eff: { hp: -2 } },
  ] },
  { id: 'grandma_summer', title: '시골 할머니댁', age: [6, 12], w: 0.04, cond: (s) => Object.values(s.people).some((x) => alive(x) && age(s, x) >= 60), text: '여름방학, {n이} 시골 할머니댁에서 한 달을 보낸다.', choices: [
    { label: '보낸다', mark: { family: 1, sport: 1 }, text: '개울에서 가재를 잡고, 별을 셌다. 까맣게 타서 돌아왔다.', eff: { hp: 3, hap: 10, mor: 2 } },
    { label: '방학 특강을 듣게 한다', mark: { study: 1, hurt: 1 }, cost: 300, text: '학원에서 방학을 보냈다.', eff: { study: 3, hap: -6 } },
  ] },
  { id: 'lost_kid', title: '미아', age: [5, 8], w: 0.02, text: '놀이공원에서 {n을} 잃어버렸다!', choices: [
    { label: '안내방송을 한다', text: '30분 만에 미아보호소에서 찾았다. 아이스크림을 들고 있었다.', eff: { aff: 3 } },
  ] },
  { id: 'shoplift', title: '문구점', age: [8, 13], w: 0.02, text: '{n이} 문구점에서 지우개를 몰래 가져왔다.', choices: [
    { label: '같이 가서 사과하고 돌려준다', mark: { honest: 1, warmth: 1 }, text: '주인 할아버지가 머리를 쓰다듬어 줬다.', eff: { mor: 5 } },
    { label: '크게 혼낸다', mark: { hurt: 1, honest: 1 }, text: '다시는 안 그러겠다며 울었다.', eff: { mor: 3, aff: -4 } },
    { label: '모른 척한다', mark: { cheat: 1 }, text: '다음엔 필통이었다.', eff: { mor: -4 } },
  ] },
  { id: 'piano', boost: { art: 0.4 }, title: '피아노 콩쿠르', age: [7, 13], w: 0.03, text: '{n이} 다니는 피아노 학원에서 콩쿠르에 나가보라고 한다.', choices: [
    { label: '출전시킨다', mark: { art: 1, warmth: 1 }, cost: 100, text: '', roll: ['cha', 40, [{ cha: 3, hap: 6, fame: 1 }, '금상! 상장을 거실에 걸었다.'], [{ hap: -2 }, '참가상. 그래도 끝까지 쳤다.']] },
    { label: '학원을 끊는다', mark: { hurt: 1 }, text: '피아노 뚜껑이 닫혔다.', eff: { cash: 200 } },
  ] },
  { id: 'taekwondo', boost: { sport: 0.4 }, title: '태권도 승급', age: [6, 12], w: 0.03, text: '{n이} 태권도 품띠 심사를 본다.', choices: [
    { label: '응원 간다', mark: { sport: 1, warmth: 1 }, text: '', roll: ['str', 25, [{ str: 3, hap: 6 }, '검은띠를 맸다! 기합 소리가 우렁차다.'], [{ hap: -3 }, '발차기에서 넘어졌다. 다음 달에 재도전.']] },
  ] },
  { id: 'santa', title: '산타클로스', age: [5, 9], w: 0.03, once: true, text: '{n이} 산타할아버지가 진짜 있냐고 묻는다.', choices: [
    { label: '당연히 있지!', mark: { warmth: 1 }, text: '크리스마스 아침, {n이} 선물을 보고 소리를 질렀다.', eff: { hap: 8 } },
    { label: '사실은…', text: '{n이} 조금 일찍 어른이 됐다.', eff: { int: 1, hap: -3 } },
  ] },
  { id: 'new_sibling', title: '동생이 생겼다', age: [4, 10], w: 0.06, once: true, cond: (s, p) => parentsOf(s, p).some((par) => par.childIds.some((id) => s.people[id] && s.people[id].birthYear === s.year)), text: '동생이 태어났다. {n이} 괜히 심술을 부린다.', choices: [
    { label: '큰아이를 더 안아준다', mark: { warmth: 2 }, text: '"나도 형아(언니)다!" 동생을 예뻐하기 시작했다.', eff: { hap: 5, mor: 2, aff: 4 } },
    { label: '형이니까 참으라고 한다', mark: { hurt: 1 }, text: '{n이} 서운해한다.', eff: { hap: -5, aff: -3 } },
  ] },
  { id: 'allowance', title: '용돈', age: [8, 14], w: 0.04, text: '{n이} 용돈을 올려달라고 협상을 시작했다. 파워포인트까지 준비했다.', choices: [
    { label: '논리에 감동해 올려준다', mark: { warmth: 1, spend: 1 }, text: '{n은} 용돈 기입장을 쓰기 시작했다.', eff: { int: 2, hap: 4, cash: -100 } },
    { label: '심부름하면 준다', mark: { thrift: 1 }, text: '설거지 한 번에 천 원. 경제관념이 생겼다.', eff: { mor: 2, flag: 'thrifty_kid' } },
    { label: '안 된다', mark: { hurt: 1 }, text: '"치사해!"', eff: { aff: -3 } },
  ] },
  { id: 'dictation', title: '받아쓰기 빵점', age: [7, 9], w: 0.03, text: '{n이} 받아쓰기 시험지를 몰래 숨겼다. 0점이다.', choices: [
    { label: '같이 연습한다', mark: { warmth: 1, study: 1 }, text: '다음 주엔 80점을 받아왔다.', eff: { study: 3, aff: 4 } },
    { label: '혼낸다', mark: { hurt: 1 }, text: '시험지를 숨기는 기술만 늘었다.', eff: { study: 1, aff: -5 } },
  ] },
  { id: 'science_fair', boost: { study: 0.3 }, title: '과학 경진대회', age: [9, 15], w: 0.03, text: '{n이} 과학 경진대회에 낼 발명품을 만들고 있다.', choices: [
    { label: '재료비를 대준다', mark: { study: 1, warmth: 1 }, cost: 100, text: '', roll: ['int', 45, [{ int: 3, study: 3, hap: 6 }, '대상! 교육감 상을 받았다.'], [{ int: 1 }, '입선. 로봇이 첫 무대에서 멈췄다.']] },
    { label: '대신 만들어 준다', mark: { cheat: 1 }, text: '입상했다. {n은} 아무것도 배우지 못했다.', eff: { study: 1, mor: -2 } },
  ] },
  // ───────── 청소년 (13~19) ─────────
  { id: 'acne', title: '여드름', age: [13, 17], w: 0.03, text: '{n이} 여드름 때문에 거울 앞에서 한숨을 쉰다.', choices: [
    { label: '피부과에 데려간다', mark: { warmth: 1 }, cost: 150, text: '피부가 좋아지자 표정도 밝아졌다.', eff: { cha: 2, hap: 5 } },
    { label: '다 한때다', text: '사진 찍기를 싫어하게 됐다.', eff: { hap: -3 } },
  ] },
  { id: 'school_trip', title: '수학여행', age: [14, 18], w: 0.04, text: '{n이} 수학여행을 떠난다. 친구들과 밤새 놀 생각에 들떴다.', choices: [
    { label: '용돈을 두둑이 준다', mark: { warmth: 1, spend: 1 }, cost: 30, text: '평생 얘깃거리가 될 추억을 만들었다.', eff: { hap: 8, aff: 3 } },
    { label: '조심하라고 당부만', text: '베개 싸움 끝에 선생님께 걸렸다. 그래도 즐거웠다.', eff: { hap: 5 } },
  ] },
  { id: 'smoking', boost: { hurt: 0.3 }, title: '담배 냄새', age: [14, 19], w: 0.03, cond: (_s, p) => !hasTrait(p, 'filial'), text: '{n}의 교복에서 담배 냄새가 난다.', choices: [
    { label: '조용히 이야기한다', mark: { warmth: 1 }, text: '', roll: ['mor', 35, [{ mor: 3, hp: 1 }, '다시는 안 피우겠다고 약속했다.'], [{ hp: -2 }, '몰래 계속 피우는 것 같다.']] },
    { label: '용돈을 끊는다', mark: { hurt: 1 }, text: '용돈 대신 알바를 시작했다.', eff: { aff: -8, mor: 1 } },
    { label: '모른 척', mark: { health_x: 2 }, text: '담배가 습관이 됐다.', eff: { hp: -4, flag: 'smoker' } },
  ] },
  { id: 'fandom', title: '덕질', age: [12, 19], w: 0.04, text: '{n이} 아이돌 콘서트 티켓팅에 목숨을 걸었다. 굿즈 방이 따로 있다.', choices: [
    { label: '콘서트에 보내준다', mark: { warmth: 1, art: 1 }, cost: 30, text: '콘서트장에서 목이 쉬어 돌아왔다. 행복해 보인다.', eff: { hap: 10, study: -1, aff: 5 } },
    { label: '공부부터 하라고 한다', mark: { hurt: 1, study: 1 }, text: '포스터를 뗐지만 마음은 그대로다.', eff: { study: 1, hap: -6, aff: -4 } },
  ] },
  { id: 'runaway', boost: { hurt: 0.5 }, title: '가출', age: [14, 18], w: 0.015, cond: (_s, p) => p.happiness < 35 || hasTrait(p, 'rebel'), text: '{n이} "찾지 마"라는 쪽지를 남기고 사라졌다.', choices: [
    { label: '밤새 찾아다닌다', mark: { warmth: 2 }, text: 'PC방에서 찾았다. 끌어안고 같이 울었다.', eff: { aff: 10, hap: 5 } },
    { label: '경찰에 신고한다', mark: { hurt: 1 }, text: '이틀 만에 친구 집에서 돌아왔다.', eff: { aff: -2 } },
  ] },
  { id: 'student_council', title: '전교회장 선거', age: [15, 18], w: 0.03, cond: (_s, p) => hasFlag(p, 'class_pres') || p.actual.cha > 45, text: '{n이} 전교회장에 도전한다.', choices: [
    { label: '선거 운동을 돕는다', mark: { network: 1, warmth: 1 }, cost: 50, text: '', roll: ['cha', 50, [{ cha: 3, mor: 2, study: 2, hap: 8, flag: 'school_president' }, '전교회장 당선! 생기부가 빛난다.'], [{ hap: -4 }, '낙선. 그래도 많이 배웠다.']] },
  ] },
  { id: 'report_forge', boost: { cheat: 0.5 }, title: '성적표', age: [12, 18], w: 0.02, cond: (_s, p) => (p.study ?? 50) < 40, text: '{n}의 성적표 숫자가 이상하다. 볼펜으로 고친 흔적이 있다.', choices: [
    { label: '정직이 먼저라고 가르친다', mark: { honest: 1 }, text: '"다음엔 진짜로 잘 볼게요."', eff: { mor: 4, study: 2 } },
    { label: '크게 혼낸다', mark: { hurt: 1 }, text: '다음 성적표는 아예 안 보여줬다.', eff: { aff: -8 } },
  ] },
  { id: 'first_kiss', title: '첫 키스', age: [15, 19], w: 0.03, once: true, text: '{n이} 요즘 휴대폰만 보면 실실 웃는다. 연애하는 눈치다.', choices: [
    { label: '모른 척해준다', mark: { warmth: 1 }, text: '첫사랑의 추억이 생겼다.', eff: { hap: 8, study: -1 } },
    { label: '누군지 캐묻는다', mark: { hurt: 1 }, text: '"엄마(아빠)는 몰라도 돼!"', eff: { aff: -5 } },
  ] },
  { id: 'bystander', title: '왕따 목격', age: [11, 18], w: 0.03, text: '{n이} 반에서 한 친구가 괴롭힘당하는 걸 봤다고 한다.', choices: [
    { label: '도와주라고 한다', mark: { kind: 1, honest: 1 }, text: '', roll: ['mor', 40, [{ mor: 5, cha: 2, flag: 'defender' }, '{n이} 그 친구 편에 섰다. 둘은 단짝이 됐다.'], [{ hap: -6, mor: 3 }, '도와주려다 같이 따돌림을 당했다. 그래도 옳은 일이었다.']] },
    { label: '선생님께 알리라고 한다', mark: { honest: 1 }, text: '담임이 조용히 해결했다.', eff: { mor: 2 } },
    { label: '괜히 끼지 말라고 한다', mark: { cheat: 1 }, text: '{n이} 오래 마음에 걸려 했다.', eff: { mor: -3 } },
  ] },
  { id: 'dance_contest', boost: { art: 0.4 }, title: '댄스 대회', age: [13, 19], w: 0.02, text: '{n이} 친구들과 댄스팀을 만들어 대회에 나간다.', choices: [
    { label: '연습실을 빌려준다', mark: { art: 1, warmth: 1 }, cost: 100, text: '', roll: ['cha', 45, [{ cha: 4, hap: 8, fame: 1 }, '우승! 영상이 SNS에서 퍼졌다.'], [{ hap: 3 }, '예선 탈락. 하지만 춤이 좋아졌다.']] },
    { label: '공부나 해라', mark: { hurt: 1 }, text: '', eff: { study: 1, hap: -5 } },
  ] },
  { id: 'insta_star', title: 'SNS 스타', age: [14, 22], w: 0.02, cond: (_s, p) => p.actual.cha > 45, text: '{n}의 사진이 SNS에서 난리가 났다. 팔로워가 하루 만에 만 명.', choices: [
    { label: '계정을 키워본다', mark: { art: 1, network: 1 }, text: '', roll: ['cha', 55, [{ cha: 3, hap: 6, cash: 500, flag: 'influencer_teen' }, '협찬 제안이 들어오기 시작했다.'], [{ hap: -8 }, '악플이 달리기 시작했다. 계정을 닫았다.']] },
    { label: '비공개로 돌린다', text: '조용한 일상으로 돌아왔다.', eff: { study: 1 } },
  ] },
  { id: 'volunteer', title: '봉사활동', age: [13, 19], w: 0.03, text: '{n이} 방학 동안 복지관 봉사활동을 하겠다고 한다.', choices: [
    { label: '적극 지지한다', mark: { kind: 1, warmth: 1 }, text: '어르신들 사이에서 인기 만점. 봉사상을 받았다.', eff: { mor: 5, hap: 4, study: 1 } },
    { label: '시간 아깝다', text: '', eff: { study: 1, mor: -1 } },
  ] },
  { id: 'consulting', title: '입시 컨설팅', age: [16, 18], w: 0.04, text: '학부모 모임에서 유명 입시 컨설턴트 이야기가 나왔다. 한 시간에 50만원.', choices: [
    { label: '컨설팅을 받는다', mark: { study: 1 }, cost: 500, text: '생기부 전략을 짰다. 조금 유리해졌다.', eff: { study: 3 } },
    { label: '아이를 믿는다', text: '', eff: { hap: 2 } },
  ] },
  { id: 'motorcycle', title: '오토바이', age: [16, 20], w: 0.015, text: '{n이} 친구 오토바이를 타고 다닌다는 소문을 들었다.', choices: [
    { label: '당장 그만두게 한다', mark: { hurt: 1 }, text: '몇 달 뒤 그 친구가 크게 다쳤다는 소식을 들었다.', eff: { aff: -3 } },
    { label: '헬멧이라도 사준다', mark: { risk: 1 }, cost: 30, text: '', roll: ['luck', 85, [{ hap: 3 }, '다행히 별일 없었다.'], [{ hp: -15, hap: -10 }, '사고가 났다. 몇 주를 병원에서 보냈다.']] },
  ] },
  // ───────── 20대 ─────────
  { id: 'mt', title: '대학 MT', age: [19, 23], w: 0.04, cond: (_s, p) => p.flags.includes('student'), text: '{n}의 첫 MT. 선배들이 술을 권한다.', choices: [
    { label: '분위기를 즐긴다', mark: { network: 1, health_x: 1 }, text: '밤새 게임하고 노래 불렀다. 동기들과 친해졌다.', eff: { cha: 2, hap: 6, hp: -1 } },
    { label: '적당히 빠진다', text: '', eff: { mor: 1 } },
  ] },
  { id: 'club', title: '동아리', age: [19, 24], w: 0.03, cond: (_s, p) => p.flags.includes('student'), text: '{n이} 어떤 동아리에 들어갈지 고민한다.', choices: [
    { label: '밴드 동아리', mark: { art: 1, network: 1 }, text: '축제 무대에 섰다. 인생 최고의 날.', eff: { cha: 3, hap: 6 } },
    { label: '학술 동아리', mark: { study: 1 }, text: '논문 공모전에 입상했다.', eff: { int: 3, study: 2 } },
    { label: '창업 동아리', mark: { risk: 1, network: 1 }, text: '아이템을 두고 밤새 토론한다.', eff: { int: 1, cha: 1, flag: 'startup_club' } },
    { label: '봉사 동아리', mark: { kind: 1 }, text: '해외 봉사를 다녀왔다.', eff: { mor: 4 } },
  ] },
  { id: 'gap_year', title: '휴학', age: [20, 25], w: 0.02, cond: (_s, p) => p.flags.includes('student'), text: '{n이} 1년 휴학하고 하고 싶은 게 있다고 한다.', choices: [
    { label: '워킹홀리데이', mark: { sport: 1, thrift: 1 }, text: '호주 농장에서 1년. 영어와 근육이 늘었다.', eff: { str: 3, cha: 3, hap: 8, cash: 800 } },
    { label: '배낭여행', mark: { spend: 1 }, cost: 800, text: '유럽 30개 도시. 세상을 보는 눈이 넓어졌다.', eff: { cha: 3, int: 2, hap: 10 } },
    { label: '휴학은 안 된다', text: '', eff: { aff: -5 } },
  ] },
  { id: 'contest', boost: { study: 0.3 }, title: '공모전', age: [20, 29], w: 0.03, paths: ['biz', 'tech', 'art', 'none', 'office'], text: '{n이} 대기업 공모전에 도전한다.', choices: [
    { label: '밤새 준비한다', mark: { study: 1 }, text: '', roll: ['int', 55, [{ int: 2, study: 3, cash: 500, flag: 'contest_winner' }, '대상! 상금 500만원에 입사 가산점까지.'], [{ hap: -3 }, '본선 탈락. 경험은 남았다.']] },
    { label: '포기한다', text: '' },
  ] },
  { id: 'student_loan', title: '학자금 대출', age: [19, 26], w: 0.03, cond: (s, p) => p.flags.includes('student') && personWorth2(s, householder(s)) < 20000, text: '{n이} 등록금 때문에 학자금 대출을 받겠다고 한다.', choices: [
    { label: '대출받게 한다', text: '졸업과 동시에 빚쟁이다.', eff: { cash: -2000, mor: 2 } },
    { label: '무리해서라도 대준다', cost: 1000, text: '', eff: { aff: 8 } },
  ] },
  { id: 'first_salary', title: '첫 월급', age: [20, 32], w: 0.08, once: true, cond: working, text: '{n}의 첫 월급날이다!', choices: [
    { label: '부모님 내복을 산다', mark: { filial: 1 }, text: '부모님이 몰래 눈물을 훔치셨다.', eff: { aff: 10, cash: -30, hap: 5 }, need: hasParents },
    { label: '적금을 든다', mark: { thrift: 1 }, text: '월급의 절반을 떼어 적금을 들었다.', eff: { cash: 300, mor: 2 } },
    { label: '나를 위한 선물 (명품)', mark: { spend: 1 }, text: '첫 명품 가방. 카드값이 무섭다.', eff: { hap: 8, cash: -400, cha: 1 } },
  ] },
  { id: 'car', title: '첫 차', age: [23, 35], w: 0.04, once: true, cond: (s, p) => working(s, p) && !s.assets.some((a) => a.kind === 'vehicle' && a.ownerId === p.id), text: '{n이} 차를 사려고 한다. 친구들 단톡방은 온통 차 얘기다.', choices: [
    { label: '경차를 할부로', need: (s, p) => affordCar(s, p, 'kei', true), mark: { thrift: 1 }, text: '작지만 소중한 내 차. 주말마다 세차를 한다.', eff: { hap: 5, car: 'kei+' } },
    { label: '준중형 세단을 할부로', need: (s, p) => affordCar(s, p, 'compact', true), text: '사회초년생 첫 차의 정석. 에어컨 틀고 퇴근하는 맛.', eff: { hap: 7, car: 'compact+' } },
    { label: '할부로 수입차', need: (s, p) => affordCar(s, p, 'import', true), mark: { spend: 2 }, text: '카푸어의 길. 월급의 절반이 할부로 나간다.', eff: { hap: 10, cha: 2, car: 'import+' } },
    { label: '대중교통이면 충분', mark: { thrift: 1 }, text: '차 대신 적금을 들었다.', eff: { cash: 500 } },
  ] },
  { id: 'gym', title: '바디프로필', age: [20, 40], w: 0.03, text: '{n이} 바디프로필을 찍겠다며 헬스장에 등록했다.', choices: [
    { label: 'PT까지 등록', mark: { exercise: 1 }, cost: 300, text: '', roll: ['mor', 45, [{ str: 5, hp: 4, cha: 3, hap: 8 }, '석 달 만에 복근이 생겼다! 사진이 인생샷이다.'], [{ hap: -3 }, '3주 만에 치킨에 무너졌다.']] },
    { label: '홈트로 도전', mark: { exercise: 1 }, text: '', roll: ['mor', 55, [{ str: 3, hp: 3 }, '꾸준히 해냈다.'], [{}, '매트는 옷걸이가 됐다.']] },
  ] },
  { id: 'crypto_friend', boost: { risk: 0.5 }, title: '코인 단톡방', age: [20, 35], w: 0.03, text: '{n}의 친구들이 코인으로 몇 배를 벌었다며 들떠 있다.', choices: [
    { label: '월급을 몰빵한다', mark: { risk: 2 }, text: '', roll: ['luck', 30, [{ cash: 3000, hap: 8 }, '떡상! 한 달 만에 3천만원을 벌었다.'], [{ cash: -2000, hap: -10 }, '상장폐지. 월급이 사라졌다.']] },
    { label: '조금만 해본다', mark: { risk: 1 }, text: '', roll: ['luck', 50, [{ cash: 200 }, '치킨값 벌었다.'], [{ cash: -200 }, '치킨값 날렸다.']] },
    { label: '관심 없다', text: '' },
  ] },
  { id: 'license', title: '운전면허', age: [19, 30], w: 0.04, once: true, text: '{n이} 운전면허 시험을 본다.', choices: [
    { label: '학원 등록', cost: 70, text: '', roll: ['int', 25, [{ hap: 4 }, '한 번에 합격!'], [{ hap: -3, cash: -20 }, '도로주행에서 떨어졌다. 두 번 만에 붙었다.']] },
  ] },
  { id: 'side_job', boost: { risk: 0.3, thrift: 0.2 }, title: 'N잡', age: [24, 45], w: 0.03, cond: working, text: '{n이} 퇴근 후 부업을 해볼까 고민한다.', choices: [
    { label: '스마트스토어', mark: { risk: 1 }, cost: 300, text: '', roll: ['int', 50, [{ cash: 1500, hap: 4 }, '월 100만원씩 들어온다!'], [{ hap: -4 }, '재고만 쌓였다.']] },
    { label: '배달 알바', mark: { thrift: 1, health_x: 1 }, text: '주말마다 배달을 뛰었다. 몸은 힘들지만 통장은 든든.', eff: { cash: 800, hp: -2 } },
    { label: '쉬는 게 남는 거다', text: '', eff: { hap: 3 } },
  ] },
  { id: 'luxury', boost: { spend: 0.5 }, title: '보복 소비', age: [22, 40], w: 0.03, text: '스트레스가 쌓인 {n}, 백화점에서 명품 매장 앞을 서성인다.', choices: [
    { label: '지른다', mark: { spend: 1 }, text: '기분은 좋다. 카드 명세서가 오기 전까지는.', eff: { hap: 8, cash: -800 } },
    { label: '참는다', mark: { thrift: 1 }, text: '', eff: { mor: 1, hap: -2 } },
  ] },
  { id: 'dorm', title: '독립', age: [22, 32], w: 0.03, once: true, cond: (s, p) => householder(s).id !== p.id && hasParents(s, p), text: '{n이} 독립해서 혼자 살아보겠다고 한다.', choices: [
    { label: '보증금을 보태준다', mark: { warmth: 1 }, cost: 1000, text: '원룸에 첫 살림을 차렸다. 자유롭다!', eff: { hap: 8, mor: 2, aff: 5 } },
    { label: '집에서 살라고 한다', mark: { thrift: 1 }, text: '"언제까지 애 취급이야."', eff: { aff: -4, cash: 300 } },
  ] },
  // ───────── 직장 (25~59) ─────────
  { id: 'overtime', paths: ['office', 'tech', 'biz', 'law', 'med', 'public'], title: '야근', age: [24, 58], w: 0.05, cond: working, text: '{n}의 팀에 대형 프로젝트가 떨어졌다. 한 달째 야근이다.', choices: [
    { label: '끝까지 해낸다', mark: { health_x: 1, honest: 1 }, text: '', roll: ['int', 50, [{ hp: -3, hap: -2, fame: 1, flag: 'project_star' }, '프로젝트 대성공! 임원 눈에 들었다.'], [{ hp: -4, hap: -5 }, '고생만 하고 공은 팀장이 가져갔다.']] },
    { label: '칼퇴한다', mark: { family: 1 }, text: '눈치가 보이지만 저녁이 있는 삶.', eff: { hap: 4, bond: 3 } },
  ] },
  { id: 'gapjil', notPaths: ['sport', 'soldier'], title: '상사 갑질', age: [24, 55], w: 0.04, cond: working, text: '{n}의 상사가 매일 폭언을 한다. 녹음 버튼을 누를까 고민된다.', choices: [
    { label: '녹음해서 신고한다', mark: { honest: 1 }, text: '', roll: ['mor', 45, [{ mor: 3, hap: 6 }, '상사가 징계를 받았다. 사내에서 영웅이 됐다.'], [{ hap: -8 }, '오히려 {n이} 한직으로 밀려났다.']] },
    { label: '참는다', mark: { health_x: 1 }, text: '', eff: { hap: -8, hp: -2 } },
    { label: '사표를 던진다', text: '속은 시원하다. 통장은 불안하다.', eff: { hap: 6, flag: 'quit_rage' } },
  ] },
  { id: 'office_romance', paths: ['office', 'tech', 'biz', 'law', 'public'], title: '사내 연애', age: [24, 38], w: 0.03, cond: (s, p) => working(s, p) && !married(s, p) && !p.partnerId, text: '{n이} 옆 팀 동료와 자꾸 눈이 마주친다.', choices: [
    { label: '데이트 신청', mark: { network: 1 }, text: '', roll: ['cha', 45, [{ hap: 10 }, '비밀 사내 연애 시작! (얼마 안 가 다 알게 됐다)'], [{ hap: -6 }, '"저 남자(여자)친구 있어요." 한동안 어색했다.']] },
    { label: '일에만 집중', text: '', eff: { int: 1 } },
  ] },
  { id: 'business_trip', paths: ['office', 'tech', 'biz', 'law'], title: '해외 출장', age: [26, 58], w: 0.03, cond: working, text: '{n}에게 뉴욕 출장 기회가 왔다.', choices: [
    { label: '간다', mark: { network: 1 }, text: '', roll: ['cha', 45, [{ cha: 2, int: 2, fame: 1 }, '현지 바이어와 계약을 따냈다!'], [{ hap: 2 }, '시차 적응만 하다 왔다.']] },
    { label: '가족 때문에 사양한다', mark: { family: 1 }, text: '', eff: { bond: 3 }, need: married },
  ] },
  { id: 'hoesik', notPaths: ['sport', 'art', 'soldier'], title: '회식', age: [24, 55], w: 0.04, cond: working, text: '부장님이 3차 노래방까지 가자고 한다.', choices: [
    { label: '끝까지 달린다', mark: { network: 1, health_x: 1 }, text: '다음 날 숙취로 죽을 뻔했다. 부장님이 {n을} 기억한다.', eff: { hp: -2, cha: 1 } },
    { label: '1차만 하고 빠진다', mark: { family: 1 }, text: '', eff: { bond: 2 } },
  ] },
  { id: 'burnout2', boost: { health_x: 0.4 }, title: '퇴사 충동', age: [27, 50], w: 0.03, cond: working, text: '{n}, 출근길 지하철에서 갑자기 숨이 막힌다. 다 그만두고 싶다.', choices: [
    { label: '한 달 휴직', mark: { family: 1 }, text: '제주도에서 한 달 살기. 다시 일할 힘이 생겼다.', eff: { hap: 12, hp: 3, cash: -500 } },
    { label: '정신과 상담', mark: { health_x: -1 }, cost: 200, text: '공황장애 진단. 약을 먹으며 버틴다.', eff: { hap: 6 } },
    { label: '버틴다', mark: { health_x: 2 }, text: '', eff: { hap: -8, hp: -3 } },
  ] },
  { id: 'parental_leave', title: '육아휴직', age: [26, 45], w: 0.05, cond: (s, p) => hasKids(s, p) && working(s, p) && p.childIds.some((id) => s.people[id] && age(s, s.people[id]) <= 1), text: '아기가 태어났다. {n이} 육아휴직을 쓸지 고민한다.', choices: [
    { label: '1년 육아휴직', mark: { family: 2 }, text: '아이의 첫 걸음마를 직접 봤다. 승진은 한발 늦었다.', eff: { bond: 10, hap: 10, cash: -1500, aff: 5 } },
    { label: '회사에 남는다', text: '', eff: { bond: -5 } },
  ] },
  { id: 'daycare', title: '어린이집 대기', age: [26, 45], w: 0.04, cond: (s, p) => p.childIds.some((id) => s.people[id] && age(s, s.people[id]) >= 1 && age(s, s.people[id]) <= 3), text: '국공립 어린이집 대기 번호가 247번이다.', choices: [
    { label: '사립 어린이집', cost: 300, text: '비싸지만 어쩔 수 없다.', eff: {} },
    { label: '부모님께 맡긴다', mark: { filial: 1 }, text: '황혼 육아. 부모님 허리가 걱정이다.', eff: { aff: 3, bond: 2 }, need: hasParents },
    { label: '베이비시터', cost: 1500, text: '좋은 선생님을 만났다.', eff: { hap: 3 } },
  ] },
  // ───────── 가족·가정 (가주) ─────────
  { id: 'family_trip', title: '가족 여행', age: [28, 70], w: 0.05, head: true, text: '여름휴가, 가족 여행을 어디로 갈까?', choices: [
    { label: '해외여행', mark: { family: 1, spend: 1 }, cost: 800, text: '온 가족이 발리에서 인생 사진을 찍었다.', eff: { hap: 10, bond: 8 } },
    { label: '국내 캠핑', mark: { family: 1 }, cost: 150, text: '모닥불 앞에서 오랜만에 대화를 나눴다.', eff: { hap: 6, bond: 5, hp: 1 } },
    { label: '집에서 쉰다', text: '에어컨 밑이 천국이다.', eff: { hap: 2 } },
  ] },
  { id: 'jesa', title: '제사', age: [30, 90], w: 0.04, head: true, text: '명절 제사 준비로 집안이 시끄럽다. 음식만 20가지.', choices: [
    { label: '전통대로 지낸다', mark: { filial: 1 }, cost: 100, text: '조상님께 예를 다했다. 배우자의 허리가 휘었다.', eff: { fame: 1, bond: -4, flag: 'keeps_jesa' } },
    { label: '간소화한다', text: '과일과 송편만 올렸다. 어른들이 혀를 찼다.', eff: { bond: 3 } },
    { label: '제사를 없앤다', text: '가족 여행으로 대신했다. 친척들 사이에 말이 많다.', eff: { fame: -2, bond: 5, hap: 4 } },
  ] },
  { id: 'kimjang', title: '김장', age: [30, 80], w: 0.03, head: true, text: '김장철이 돌아왔다. 배추 100포기.', choices: [
    { label: '온 가족이 모여 담근다', mark: { family: 1 }, text: '수육을 삶아 먹으며 웃음꽃이 피었다.', eff: { hap: 4, bond: 2, mor: 1 } },
    { label: '사 먹는다', cost: 50, text: '편하긴 한데 뭔가 허전하다.', eff: {} },
  ] },
  { id: 'inlaw_conflict', boost: { family: -0.1 }, title: '고부 갈등', age: [28, 60], w: 0.04, cond: (s, p) => married(s, p) && hasParents(s, p), text: '{n}의 부모님과 배우자 사이에 냉기가 흐른다. 가운데서 난처하다.', choices: [
    { label: '배우자 편을 든다', mark: { family: 1 }, text: '부모님이 서운해하신다.', eff: { bond: 8, aff: -3 } },
    { label: '부모님 편을 든다', mark: { filial: 1 }, text: '배우자가 짐을 쌌다가 풀었다.', eff: { bond: -12 } },
    { label: '양쪽 다 달랜다', text: '', roll: ['cha', 50, [{ bond: 4 }, '신기하게도 둘이 같이 쇼핑을 갔다.'], [{ bond: -4, hap: -4 }, '양쪽 모두에게 욕먹었다.']] },
  ] },
  { id: 'edu_fight', title: '교육관 차이', age: [30, 55], w: 0.03, cond: (s, p) => married(s, p) && hasKids(s, p), text: '아이 학원 문제로 {n와} 배우자가 크게 싸웠다. "애를 잡는다" vs "남들 다 한다"', choices: [
    { label: '배우자 뜻을 따른다', text: '', eff: { bond: 5 } },
    { label: '내 뜻대로 한다', text: '', eff: { bond: -8 } },
    { label: '아이에게 물어본다', mark: { family: 1 }, text: '아이의 생각을 처음으로 제대로 들었다.', eff: { bond: 2, mor: 2 } },
  ] },
  { id: 'anniversary', boost: { family: 0.2 }, title: '결혼기념일', age: [25, 85], w: 0.04, cond: married, text: '오늘은 결혼기념일. {n}, 까맣게 잊고 있었다!', choices: [
    { label: '급하게 레스토랑 예약', cost: 50, text: '겨우 수습했다. 꽃다발은 편의점 것이다.', eff: { bond: 3 } },
    { label: '진심을 담은 편지', mark: { family: 1 }, text: '', roll: ['cha', 40, [{ bond: 10 }, '배우자가 편지를 읽고 울었다.'], [{ bond: -3 }, '"편지로 때우려고?"']] },
    { label: '모른 척한다', mark: { hurt: 0 }, text: '냉전이 일주일 갔다.', eff: { bond: -10 } },
  ] },
  { id: 'move', title: '이사', age: [28, 70], w: 0.03, head: true, text: '아이들 학교 때문에 이사를 고민한다. 학군지는 집값이 비싸다.', choices: [
    { label: '학군지로 전세 이사', cost: 2000, text: '대치동 학원가 근처로 옮겼다.', eff: { hap: -2 } },
    { label: '지금 동네가 좋다', text: '', eff: { hap: 2 } },
  ] },
  { id: 'interior', title: '리모델링', age: [30, 75], w: 0.02, head: true, text: '집이 낡아 수리할 곳투성이다.', choices: [
    { label: '올수리', mark: { spend: 1 }, cost: 5000, text: '새집 같다. 매일 기분이 좋다.', eff: { hap: 10, bond: 4 } },
    { label: '셀프 인테리어', cost: 300, text: '', roll: ['int', 45, [{ hap: 6 }, '생각보다 그럴듯하다!'], [{ hap: -4 }, '벽지가 울었다.']] },
  ] },
  { id: 'hwangap', title: '환갑잔치', age: [60, 60], w: 0.6, once: true, text: '{n}의 환갑이다.', choices: [
    { label: '성대하게 잔치를 연다', mark: { network: 1 }, cost: 1500, text: '친척이 모두 모였다. 가문의 위세를 떨쳤다.', eff: { fame: 3, hap: 8 } },
    { label: '가족끼리 조촐하게', cost: 200, text: '자식들이 준비한 케이크에 촛불 60개.', eff: { hap: 6 } },
    { label: '해외여행으로 대신', mark: { family: 1 }, cost: 800, text: '부부가 크루즈 여행을 떠났다.', eff: { hap: 8, bond: 8 } },
  ] },
  { id: 'chilsun', title: '칠순', age: [70, 70], w: 0.6, once: true, text: '{n}의 칠순. 자손들이 모였다.', choices: [
    { label: '가족사진을 찍는다', cost: 100, text: '3대가 한 액자에 담겼다.', eff: { hap: 10 } },
    { label: '잔치를 연다', cost: 1000, text: '동네 어르신들까지 모셨다.', eff: { fame: 2, hap: 8 } },
  ] },
  { id: 'dol', title: '돌잔치', age: [25, 50], w: 0.3, cond: (s, p) => p.childIds.some((id) => s.people[id] && age(s, s.people[id]) === 1), text: '아이의 첫 돌이다! 돌잡이를 한다.', choices: [
    { label: '성대한 돌잔치', cost: 800, text: '', roll: ['luck', 50, [{ hap: 8 }, '아기가 청진기를 잡았다! 의사 되려나.'], [{ hap: 8 }, '아기가 마이크를 잡았다! 연예인 되려나.']] },
    { label: '가족끼리 돌상', cost: 100, text: '아기가 돈을 잡았다. 모두가 웃었다.', eff: { hap: 6 } },
  ] },
  { id: 'wedding_gift', title: '축의금', age: [25, 70], w: 0.04, text: '10년 연락 없던 동창에게 청첩장이 왔다.', choices: [
    { label: '가서 10만원', mark: { network: 1 }, text: '밥은 맛있었다.', eff: { cash: -10 } },
    { label: '계좌로 5만원만', text: '', eff: { cash: -5 } },
    { label: '모른 척', mark: { thrift: 1 }, text: '동창 단톡방에서 조용히 나왔다.', eff: { cha: -1 } },
  ] },
  { id: 'grand_babysit', title: '황혼 육아', age: [55, 78], w: 0.06, cond: (s, p) => p.childIds.some((id) => s.people[id] && s.people[id].childIds.some((g) => s.people[g] && age(s, s.people[g]) < 5)), text: '맞벌이하는 자식이 손주를 봐달라고 부탁한다.', choices: [
    { label: '봐준다', mark: { family: 1, health_x: 1 }, text: '손주 재롱에 웃지만 허리가 끊어질 것 같다.', eff: { hap: 6, hp: -3, fame: 1 } },
    { label: '용돈 받고 봐준다 (월 100만)', text: '서로 편하다.', eff: { cash: 1200, hp: -3 } },
    { label: '거절한다', text: '"나도 내 인생이 있다." 자식이 서운해한다.', eff: { hap: 3 } },
  ] },
  { id: 'kid_wedding_cost', title: '자녀 혼수', age: [50, 80], w: 0.05, cond: (s, p) => p.childIds.some((id) => s.people[id] && s.people[id].partnerId), text: '결혼을 앞둔 자식의 신혼집 문제로 머리가 아프다.', choices: [
    { label: '전세금을 보태준다', mark: { family: 1 }, cost: 10000, text: '노후 자금이 줄었지만 자식이 환하게 웃었다.', eff: { hap: 5 } },
    { label: '알아서 하라고 한다', text: '', eff: {} },
  ] },
  // ───────── 중장년 (40~69) ─────────
  { id: 'hair_loss', title: '탈모', age: [35, 60], w: 0.03, cond: (_s, p) => p.sex === 'M', text: '{n}의 정수리가 휑하다. 샤워할 때마다 한숨이 나온다.', choices: [
    { label: '모발이식', cost: 800, text: '10년은 젊어 보인다!', eff: { cha: 3, hap: 8 } },
    { label: '탈모약을 먹는다', cost: 50, text: '더 빠지지는 않는다.', eff: { hap: 2 } },
    { label: '밀어버린다', text: '의외로 잘 어울린다.', eff: { hap: 3 } },
  ] },
  { id: 'menopause', title: '갱년기', age: [45, 58], w: 0.04, text: '{n}, 이유 없이 화가 나고 눈물이 난다. 갱년기인가 보다.', choices: [
    { label: '병원 치료', cost: 150, text: '', eff: { hap: 5, hp: 2 } },
    { label: '등산을 시작한다', mark: { exercise: 1 }, text: '산 정상에서 소리를 질렀다. 한결 낫다.', eff: { hp: 3, hap: 4 } },
    { label: '가족에게 털어놓는다', mark: { family: 1 }, text: '', eff: { bond: 5, hap: 4 } },
  ] },
  { id: 'disc', boost: { health_x: 0.3 }, title: '허리디스크', age: [35, 70], w: 0.03, text: '{n}의 허리가 끊어질 것 같다. 디스크 판정.', choices: [
    { label: '수술', cost: 700, text: '재활까지 석 달.', eff: { hp: 2 } },
    { label: '도수치료·운동', mark: { exercise: 1 }, cost: 200, text: '', roll: ['mor', 45, [{ hp: 3, str: 1 }, '꾸준히 운동해서 나았다.'], [{ hp: -3 }, '결국 다시 도졌다.']] },
  ] },
  { id: 'diet', boost: { health_x: 0.4 }, title: '건강 경고', age: [40, 70], w: 0.04, text: '건강검진 결과표에 빨간 글씨가 가득하다. 혈압, 당뇨 전단계.', choices: [
    { label: '식단과 운동을 시작한다', mark: { exercise: 1, health_x: -1 }, text: '', roll: ['mor', 45, [{ hp: 6, hap: 3 }, '석 달 만에 수치가 정상으로 돌아왔다.'], [{ hp: -2 }, '작심삼일이었다.']] },
    { label: '약만 먹는다', cost: 30, text: '', eff: { hp: 1 } },
    { label: '무시한다', mark: { health_x: 2 }, text: '', eff: { hp: -5 } },
  ] },
  { id: 'marathon', boost: { exercise: 0.4 }, title: '마라톤', age: [30, 65], w: 0.02, text: '{n}, 동호회 친구가 풀코스 마라톤을 같이 뛰자고 한다.', choices: [
    { label: '도전한다', mark: { exercise: 2 }, text: '', roll: ['hp', 50, [{ hp: 4, str: 3, hap: 10, flag: 'marathoner' }, '42.195km 완주! 결승선에서 울었다.'], [{ hp: -2 }, '25km에서 쥐가 나 포기했다.']] },
    { label: '응원만 한다', text: '' },
  ] },
  { id: 'golf', notPaths: ['soldier', 'sport'], boost: { network: 0.3 }, title: '골프', age: [35, 70], w: 0.03, cond: working, text: '거래처 사람들이 {n}에게 골프를 치자고 한다.', choices: [
    { label: '장비 사고 입문', mark: { network: 1, spend: 1 }, cost: 500, text: '', roll: ['str', 40, [{ cha: 2, hap: 5, flag: 'golfer' }, '싱글 핸디캡! 비즈니스 인맥이 넓어졌다.'], [{ hap: -2 }, '공보다 잔디를 더 많이 팠다.']] },
    { label: '나는 등산파', text: '', eff: { hp: 1 } },
  ] },
  { id: 'reunion', boost: { network: 0.3 }, title: '동창회', age: [35, 75], w: 0.04, text: '30년 만의 동창회. 다들 뭐 하고 사나.', choices: [
    { label: '나간다', mark: { network: 1 }, text: '', roll: ['luck', 50, [{ hap: 8, cha: 1 }, '추억 얘기로 밤을 새웠다. 옛 친구와 다시 연락하기 시작했다.'], [{ hap: -6 }, '다들 부장, 사장, 건물주… 괜히 나갔다.']] },
    { label: '안 나간다', text: '' },
  ] },
  { id: 'hiking_club', title: '산악회', age: [45, 75], w: 0.03, text: '{n}, 동네 산악회에 가입할까?', choices: [
    { label: '가입한다', mark: { exercise: 1, network: 1 }, cost: 50, text: '매주 산에 오른다. 친구도 생겼다.', eff: { hp: 4, hap: 5 } },
    { label: '혼자가 편하다', text: '' },
  ] },
  { id: 'trot', title: '트로트 오디션', age: [45, 80], w: 0.01, cond: (_s, p) => p.actual.cha > 45, text: '{n}, TV 트로트 오디션에 나가보라는 권유를 받았다.', choices: [
    { label: '나간다!', text: '', roll: ['cha', 60, [{ fame: 6, hap: 12, cash: 3000, flag: 'trot_star' }, '결승 진출! 늦깎이 트로트 스타 탄생.'], [{ hap: 4 }, '예선 탈락. 그래도 방송은 탔다.']] },
    { label: '무슨 주책이냐', text: '' },
  ] },
  { id: 'retire_plan', title: '노후 준비', age: [45, 60], w: 0.04, text: '{n}, 노후 자금 계산을 해보니 막막하다.', choices: [
    { label: '연금저축에 넣는다 (연 400만)', mark: { thrift: 1 }, text: '세액공제도 받았다. 든든하다.', eff: { cash: -400, flag: 'pension_saver', hap: 2 } },
    { label: '자식이 있잖아', text: '', eff: {} },
    { label: '건물주가 되겠다', text: '부동산 공부를 시작했다.', eff: { int: 2 } },
  ] },
  { id: 'return_rural', title: '귀촌', age: [55, 75], w: 0.03, cond: (_s, p) => ['pension', 'none'].includes(p.job), text: '{n}, 도시 생활에 지쳤다. 시골에 내려가 텃밭을 가꾸고 싶다.', choices: [
    { label: '귀촌한다', cost: 3000, text: '마당 있는 집에서 상추를 키운다. 건강해졌다.', eff: { hp: 5, hap: 10, flag: 'rural_life' } },
    { label: '주말농장만', cost: 50, text: '', eff: { hp: 2, hap: 4 } },
  ] },
  // ───────── 노년 (65+) ─────────
  { id: 'smartphone', title: '스마트폰', age: [65, 90], w: 0.03, text: '손주가 {n}에게 스마트폰 쓰는 법을 가르쳐 준다.', choices: [
    { label: '열심히 배운다', mark: { study: 1 }, text: '', roll: ['int', 30, [{ int: 2, hap: 6 }, '이제 영상통화도 하고 유튜브도 본다!'], [{ hap: 2 }, '카톡 보내는 것까지는 성공.']] },
    { label: '폴더폰이 좋다', text: '' },
  ] },
  { id: 'senior_center', title: '경로당', age: [68, 95], w: 0.03, text: '{n}, 동네 경로당 회장 선거에 나가볼까?', choices: [
    { label: '출마한다', text: '', roll: ['cha', 40, [{ hap: 8, fame: 1 }, '당선! 경로당의 실세가 됐다.'], [{ hap: -2 }, '한 표 차로 졌다. 재검표를 요구했다.']] },
    { label: '고스톱이나 친다', mark: { risk: 1 }, text: '', roll: ['luck', 50, [{ cash: 5, hap: 3 }, '오늘은 땄다.'], [{ cash: -5 }, '오늘은 잃었다.']] },
  ] },
  { id: 'memoir', title: '자서전', age: [65, 95], w: 0.02, once: true, text: '{n}, 살아온 이야기를 책으로 남기고 싶다.', choices: [
    { label: '자서전을 낸다', cost: 500, text: '가족 모두에게 한 권씩 나눠줬다. 가문의 역사가 됐다.', eff: { fame: 3, hap: 8 } },
    { label: '손주에게 이야기해 준다', text: '손주가 할아버지(할머니) 이야기를 받아 적었다.', eff: { hap: 5 } },
  ] },
  { id: 'dementia_fear', title: '깜빡깜빡', age: [70, 95], w: 0.03, text: '{n}, 요즘 자꾸 가스불을 켜놓고 잊는다.', choices: [
    { label: '검사를 받는다', cost: 100, text: '', roll: ['hp', 30, [{ hap: 5 }, '단순 건망증이란다. 휴.'], [{ int: -5, hap: -8, flag: 'dementia' }, '경도 인지장애. 약을 먹기 시작했다.']] },
    { label: '나이 들면 다 그렇지', text: '', eff: { int: -2 } },
  ] },
  { id: 'nursing_home', title: '요양원', age: [80, 99], w: 0.03, cond: (_s, p) => p.actual.hp < 25, text: '{n}의 거동이 불편해졌다. 가족들이 요양원을 이야기한다.', choices: [
    { label: '좋은 요양원에 모신다', cost: 2000, text: '전문 간병을 받는다. 주말마다 가족이 찾아온다.', eff: { hp: 3 } },
    { label: '집에서 모신다', text: '가족이 번갈아 간병한다. 모두 지쳐간다.', eff: { hap: 5 } },
  ] },
  // ───────── 사회·시대 (가주) ─────────
  { id: 'pandemic', title: '전염병', age: [20, 99], w: 0.006, head: true, text: '신종 전염병이 퍼졌다. 거리두기가 시작됐다.', choices: [
    { label: '재택근무·집콕', text: '가족이 하루 종일 붙어 있다. 싸우거나, 가까워지거나.', eff: { bond: 4, hap: -3 } },
    { label: '마스크 쓰고 일상대로', mark: { health_x: 1 }, text: '', roll: ['hp', 40, [{}, '다행히 걸리지 않았다.'], [{ hp: -8 }, '확진됐다. 2주를 앓았다.']] },
  ] },
  { id: 'world_cup', title: '월드컵', age: [10, 99], w: 0.02, head: true, cond: (s) => s.year % 4 === 2, text: '월드컵 시즌! 대표팀이 16강에 올랐다.', choices: [
    { label: '광화문 거리응원', mark: { network: 1 }, text: '대~한민국! 모르는 사람과 얼싸안았다.', eff: { hap: 10 } },
    { label: '치킨 시켜 집에서', cost: 5, text: '', eff: { hap: 6 } },
  ] },
  { id: 'typhoon', title: '태풍', age: [20, 99], w: 0.01, head: true, text: '초강력 태풍이 상륙했다. 집에 물이 들어온다!', choices: [
    { label: '보험 처리', text: '', roll: ['luck', 50, [{ cash: -200 }, '보험 덕에 피해를 줄였다.'], [{ cash: -1500, hap: -8 }, '보장 범위 밖이란다. 수리비 폭탄.']] },
    { label: '이웃과 함께 복구', mark: { kind: 1, network: 1 }, text: '온 동네가 함께 흙을 퍼냈다.', eff: { cash: -800, mor: 3 } },
  ] },
  { id: 'vote', title: '선거', age: [18, 99], w: 0.015, head: true, text: '선거일이다. 투표하러 갈까?', choices: [
    { label: '투표한다', mark: { honest: 1 }, text: '소중한 한 표를 행사했다.', eff: { mor: 1 } },
    { label: '놀러 간다', text: '', eff: { hap: 3 } },
  ] },
  { id: 'inflation', title: '고물가', age: [25, 99], w: 0.008, head: true, text: '물가가 미친 듯이 오른다. 장바구니가 가볍다.', choices: [
    { label: '허리띠를 졸라맨다', mark: { thrift: 1 }, text: '', eff: { cash: 300, hap: -4 } },
    { label: '그래도 먹고 싶은 건 먹는다', mark: { spend: 1 }, text: '', eff: { cash: -500, hap: 2 } },
  ] },
  { id: 'rate_hike', title: '금리 인상', age: [25, 99], w: 0.01, head: true, cond: (_s, p) => p.cash < -5000, text: '기준금리가 올랐다. {n}의 대출 이자가 눈덩이처럼 불어난다.', choices: [
    { label: '허리띠를 졸라맨다', mark: { thrift: 1 }, text: '외식을 끊었다.', eff: { hap: -6, cash: 500 } },
    { label: '대출을 갈아탄다', cost: 100, text: '', roll: ['int', 50, [{ cash: 800 }, '금리가 낮은 곳으로 옮겼다.'], [{}, '중도상환수수료가 더 컸다.']] },
  ] },
  { id: 'jury', title: '배심원', age: [25, 70], w: 0.005, text: '{n}, 국민참여재판 배심원으로 뽑혔다.', choices: [
    { label: '성실히 참여한다', mark: { honest: 1 }, text: '법정에서 한 사람의 운명을 고민했다.', eff: { mor: 3, int: 1 } },
  ] },
  { id: 'hero', boost: { kind: 0.5 }, title: '의인', age: [18, 75], w: 0.004, text: '{n}, 출근길에 물에 빠진 아이를 목격했다!', choices: [
    { label: '뛰어든다', mark: { kind: 2 }, text: '', roll: ['str', 40, [{ fame: 8, mor: 5, hap: 10, flag: 'hero' }, '아이를 구했다! 의인상을 받고 뉴스에 나왔다.'], [{ hp: -10, fame: 3 }, '아이는 구했지만 {n이} 크게 다쳤다.']] },
    { label: '119에 신고한다', mark: { kind: 1 }, text: '구조대가 아이를 구했다.', eff: { mor: 1 } },
  ] },
  { id: 'found_wallet', boost: { honest: 0.2, cheat: 0.3 }, title: '지갑', age: [10, 90], w: 0.01, text: '{n}, 길에서 현금 200만원이 든 지갑을 주웠다.', choices: [
    { label: '경찰서에 맡긴다', mark: { honest: 1, kind: 1 }, text: '', roll: ['luck', 50, [{ mor: 3, cash: 20 }, '주인이 사례금 20만원을 줬다.'], [{ mor: 3 }, '주인이 고맙다는 문자를 보냈다.']] },
    { label: '꿀꺽한다', mark: { cheat: 2 }, text: '', roll: ['luck', 70, [{ cash: 200, mor: -5 }, '아무도 모른다. …아무도.'], [{ cash: -300, fame: -3, mor: -5 }, 'CCTV에 찍혔다. 점유이탈물횡령으로 벌금.']] },
  ] },
];

/** 오래 산 사람이 보험 등 계산에 쓰는 순자산 (economy 순환 참조 회피용) */
function personWorth2(s: GameState, p: Person): number {
  return p.cash + s.assets.filter((a) => a.ownerId === p.id).reduce((t, a) => t + a.value, 0);
}

export const STORIES: LifeDef[] = [...S, ...MORE_STORIES, ...PATH_STORIES, ...TRACK_STORIES, ...HOOD_STORIES, ...MINI_STORIES, ...EXTRA_STORIES, ...CAREER_STORIES, ...LIFE2_STORIES, ...SUDDEN_STORIES, ...INTEREST_STORIES, ...LIFE3_STORIES, ...TEMPER_STORIES].map(toLife);
export const STORY_COUNT = S.length + MORE_STORIES.length + PATH_STORIES.length + TRACK_STORIES.length + HOOD_STORIES.length + MINI_STORIES.length + EXTRA_STORIES.length + CAREER_STORIES.length + LIFE2_STORIES.length + SUDDEN_STORIES.length + INTEREST_STORIES.length + LIFE3_STORIES.length + TEMPER_STORIES.length;
