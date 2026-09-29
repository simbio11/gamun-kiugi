// 학생 행동: 초·중·고 때 할 수 있는 진로 탐색·자기계발·가족·용돈 활동. 해 볼수록 그 분야 관심(i:분야)이 쌓인다.
import type { ActionDef, ActionCat, Stage } from './actions';
import type { GameState, Person, StatKey } from './types';
import { chance, pick } from './rng';
import { fmt, grow, rollTier, stat, TIER_MARK, type Delta, type Tier } from './practice';
import { clamp, head, mark } from './people';
import { fitCats, mbtiLabel, temperamentLine, topInterests } from './interests';
import { JOB_CATS } from './jobs';

const h = head;
type Lines = Record<Tier, string[]>;
const L = (great: string[], good: string[], meh: string[], bad: string[]): Lines => ({ great, good, meh, bad });
const ok = (t: Tier) => t === 'great' || t === 'good';

interface Spec {
  id: string;
  cat?: ActionCat;
  icon: string;
  name: string;
  desc: string;
  stages: Stage[];
  cost?: number;
  stat: StatKey;
  /** 좋게 끝나면 쌓이는 관심 분야 */
  interest?: string;
  marks?: Record<string, number>;
  cash?: [number, number, number, number];
  hap?: [number, number, number, number];
  study?: [number, number, number, number];
  lines: Lines;
  extra?: (s: GameState, p: Person, t: Tier) => string;
}

function build(sp: Spec): ActionDef {
  return {
    id: sp.id,
    cat: sp.cat ?? '진로·자기계발',
    icon: sp.icon,
    name: sp.name,
    desc: sp.desc,
    ap: 1,
    cost: sp.cost,
    stages: sp.stages,
    run: (s) => {
      const p = h(s);
      const t = rollTier(s, p, { stat: sp.stat });
      const i = { great: 0, good: 1, meh: 2, bad: 3 }[t];
      const out: Delta[] = [stat(sp.stat, t === 'bad' ? 0 : grow(s, p, sp.stat, t))];
      if (sp.interest) {
        const g = ok(t) ? 2 : t === 'meh' ? 1 : 0;
        if (g) mark(p, 'i:' + sp.interest, g);
        if (g) out.push(`${JOB_CATS[sp.interest as keyof typeof JOB_CATS].split(' ')[0]} 관심 +${g}`);
      }
      if (sp.marks && ok(t)) for (const [k, n] of Object.entries(sp.marks)) mark(p, k, n);
      if (sp.cash) {
        p.cash += sp.cash[i];
        if (sp.cash[i]) out.push(['용돈(만)', sp.cash[i]]);
      }
      if (sp.hap) {
        p.happiness = clamp(p.happiness + sp.hap[i], 0, 100);
        out.push(['행복', sp.hap[i]]);
      }
      if (sp.study) {
        p.study = clamp((p.study ?? 40) + sp.study[i], 0, 100);
        out.push(['성적', sp.study[i]]);
      }
      return TIER_MARK[t] + pick(s, sp.lines[t]) + fmt(out) + (sp.extra?.(s, p, t) ?? '');
    },
  };
}

const T: Stage[] = ['teen'];
const ET: Stage[] = ['elem', 'teen'];

const SPECS: Spec[] = [
  { id: 's_career_test', icon: '🧭', name: '진로 적성 검사', desc: '내 MBTI·성향과 잘 맞는 분야를 알아본다 · 맞는 분야 관심 +1', stages: T, cost: 5, stat: 'int',
    lines: L(['상담 선생님이 결과지를 보며 한참 이야기해 줬다.'], ['결과지를 방에 붙였다.'], ['"이게 나라고?" 반신반의.'], ['검사 중에 졸았다.']),
    extra: (_s, p) => {
      const [top] = fitCats(p, 1);
      if (top) mark(p, 'i:' + top, 1);
      return `\n📋 ${temperamentLine(p)}`;
    } },
  { id: 's_science_report', icon: '🔬', name: '과학 탐구 보고서', desc: '지능↑ · IT·과학 관심 · 성적↑', stages: ET, stat: 'int', interest: 'tech', study: [3, 2, 1, 0], marks: { study: 1 },
    lines: L(['"페트병 로켓의 최적 물 양" 보고서가 교내 1등!', '가설이 딱 맞아떨어졌다.'], ['실험 노트가 빼곡해졌다.'], ['결과가 이상하게 나왔다.'], ['실험하다 식초를 쏟았다.']) },
  { id: 's_coding_self', icon: '⌨️', name: '코딩 독학', desc: '지능↑ · IT 관심', stages: ET, stat: 'int', interest: 'tech', hap: [6, 3, 0, -3],
    lines: L(['만든 계산기 앱이 폰에서 돌아간다!'], ['반복문을 이해했다.'], ['에러 메시지만 한참 봤다.'], ['코드가 다 날아갔다.']) },
  { id: 's_volunteer_care', icon: '🩺', name: '요양원·병원 봉사', desc: '도덕성↑ · 의료 관심 · 봉사 시간', stages: T, stat: 'mor', interest: 'medical', marks: { kind: 1 }, hap: [6, 3, 1, -2],
    lines: L(['할머니들이 손자(손녀)처럼 대해 주셨다. 간호사가 되고 싶어졌다.'], ['휠체어 산책을 도왔다.'], ['봉사 시간만 채웠다.'], ['분위기가 무거워 힘들었다.']) },
  { id: 's_speech', icon: '🎤', name: '토론·스피치 연습', desc: '매력↑ · 법률·공공 관심', stages: ET, stat: 'cha', interest: 'legal', hap: [5, 2, 0, -3],
    lines: L(['교내 토론 대회 최우수! 반박이 날카롭다.'], ['떨지 않고 3분을 말했다.'], ['"음… 어…"가 많았다.'], ['말하다 머리가 하얘졌다.']) },
  { id: 's_school_press', icon: '📰', name: '학교 신문·방송반', desc: '매력↑ · 미디어 관심', stages: T, stat: 'cha', interest: 'media', marks: { network: 1 }, hap: [7, 4, 1, -2],
    lines: L(['쓴 기사가 교육청 신문에 실렸다!'], ['점심 방송 진행을 맡았다.'], ['원고 교정만 했다.'], ['방송 사고를 냈다. 전교생이 들었다.']) },
  { id: 's_cooking', icon: '🍳', name: '요리 연습', desc: '매력↑ · 서비스·요식 관심 · 가족 행복', stages: ET, stat: 'cha', interest: 'service', hap: [6, 4, 1, -2],
    lines: L(['직접 만든 파스타에 가족이 박수를 쳤다.'], ['계란말이가 예쁘게 말렸다.'], ['간이 좀 셌다.'], ['냄비를 태웠다.']) },
  { id: 's_fix', icon: '🔧', name: '만들기·고장 난 물건 고치기', desc: '근력·지능↑ · 기술·생산 관심', stages: ET, stat: 'str', interest: 'trade', hap: [6, 3, 0, -3],
    lines: L(['고장 난 선풍기를 살려 냈다!'], ['나무 필통을 만들었다.'], ['나사가 하나 남았다.'], ['드라이버에 손을 찍혔다.']) },
  { id: 's_drone', icon: '🛩', name: '드론·모형 비행기', desc: '지능↑ · 운송 관심', stages: ET, cost: 5, stat: 'int', interest: 'transport', hap: [7, 4, 0, -3],
    lines: L(['드론 레이싱 대회 입상!'], ['8자 비행에 성공했다.'], ['바람에 휘청였다.'], ['나무에 걸렸다. 결국 못 꺼냈다.']) },
  { id: 's_garden', icon: '🌱', name: '베란다 텃밭·곤충 기르기', desc: '도덕성↑ · 농림어업 관심', stages: ET, stat: 'mor', interest: 'farm', hap: [6, 4, 1, -2],
    lines: L(['방울토마토를 한 바구니 수확했다.'], ['새싹이 올라왔다.'], ['물 주는 걸 자꾸 잊는다.'], ['다 시들었다.']) },
  { id: 's_flea', icon: '🏷', cat: '재산', name: '중고거래로 용돈 벌기', desc: '매력↑ · 사업 관심 · 용돈', stages: T, stat: 'cha', interest: 'biz', cash: [15, 8, 3, 0],
    lines: L(['안 쓰는 게임기를 좋은 값에 팔았다. 흥정의 맛!'], ['헌책을 팔았다.'], ['아무도 안 산다.'], ['약속 장소에 아무도 안 왔다.']) },
  { id: 's_tutor_sibling', icon: '🧑‍🏫', cat: '가족', name: '동생·친구 공부 봐 주기', desc: '매력·도덕성↑ · 교육 관심', stages: T, stat: 'cha', interest: 'edu', marks: { warmth: 1 }, study: [2, 1, 0, 0],
    lines: L(['가르쳐 준 친구가 수학 100점을 맞았다!'], ['가르치다 보니 나도 정리가 됐다.'], ['설명이 잘 안 됐다.'], ['싸우고 끝났다.']) },
  { id: 's_youth_council', icon: '🏛', cat: '사회', name: '청소년 의회·봉사단', desc: '매력·도덕성↑ · 공공 관심', stages: T, stat: 'mor', interest: 'public', marks: { network: 1 }, hap: [6, 3, 0, -2],
    lines: L(['제안한 안건이 구청 정책에 반영됐다!'], ['동네 벽화 봉사를 했다.'], ['회의만 길었다.'], ['의견이 무시당했다.']) },
  { id: 's_webtoon', icon: '🎨', name: '웹툰·영상 만들기', desc: '매력↑ · 미디어 관심', stages: ET, stat: 'cha', interest: 'media', hap: [8, 4, 1, -2],
    lines: L(['올린 영상이 조회수 1만!'], ['4컷 만화를 완성했다.'], ['그리다 말았다.'], ['악플이 달렸다.']) },
  { id: 's_career_books', icon: '📚', name: '진로 책·직업 인터뷰 읽기', desc: '지능↑ · 성향에 맞는 분야 관심', stages: ET, stat: 'int', study: [1, 1, 0, 0],
    lines: L(['"나 이거 하고 싶어!" 책을 들고 뛰어왔다.'], ['직업 인터뷰집을 다 읽었다.'], ['재미없어서 덮었다.'], ['펴 놓고 잤다.']),
    extra: (s, p, t) => {
      const cats = [...topInterests(p, 1, 1), ...fitCats(p, 2)];
      const c = cats.length ? pick(s, cats) : undefined;
      if (!c || !ok(t)) return '';
      mark(p, 'i:' + c, 2);
      return `\n(${JOB_CATS[c]} 쪽 책에 빠졌다)`;
    } },
  { id: 's_fitness', icon: '🏋', name: '체력 단련·줄넘기', desc: '근력·건강↑ · 스포츠·공공 관심', stages: ET, stat: 'str', interest: 'sport', hap: [5, 3, 0, -3],
    lines: L(['팔굽혀펴기 50개! 체력장 1등급.'], ['줄넘기 2단 뛰기 성공.'], ['땀만 났다.'], ['발목을 삐끗했다.']),
    extra: (_s, p, t) => (ok(t) ? ((p.actual.hp = clamp(p.actual.hp + 1, 0, 100)), '') : '') },
  { id: 's_mock_invest', icon: '📈', cat: '재산', name: '모의투자·경제 신문', desc: '지능↑ · 사무·금융 관심', stages: T, stat: 'int', interest: 'office', marks: { thrift: 1 },
    lines: L(['모의투자 수익률 반 1등!'], ['경제 기사를 스크랩했다.'], ['용어가 어렵다.'], ['가상 계좌가 반토막.']) },
  { id: 's_friend_talk', icon: '🤝', cat: '가족', name: '친구 고민 들어주기', desc: '도덕성·매력↑ · 우정', stages: ET, stat: 'mor', marks: { network: 1, kind: 1 }, hap: [6, 4, 1, -2],
    lines: L(['"네 덕분에 살았어." 친구가 울며 안겼다.'], ['밤늦게까지 문자를 주고받았다.'], ['무슨 말을 해야 할지 몰랐다.'], ['말실수로 친구가 서운해했다.']),
    extra: (s, p, t) => (ok(t) && chance(s, 0.3) ? (mark(p, 'i:edu', 1), '\n(사람 마음을 돌보는 일이 적성일지도)') : '') },
  { id: 's_chores', icon: '🧹', cat: '가족', name: '집안일 돕고 용돈 받기', desc: '도덕성↑ · 용돈 · 부모님과 가까워진다', stages: ET, stat: 'mor', cash: [5, 3, 2, 0],
    lines: L(['화장실 청소까지 완벽. 엄마가 보너스를 줬다.'], ['설거지를 도맡았다.'], ['대충 했다.'], ['접시를 깼다.']),
    extra: (s, p, t) => {
      if (!ok(t)) return '';
      for (const id of [p.fatherId, p.motherId]) {
        const q = id ? s.people[id] : undefined;
        if (q) q.affinity = clamp(q.affinity + 2, -100, 100);
      }
      p.affinity = clamp(p.affinity + 2, -100, 100);
      return '';
    } },
  { id: 's_mbti_talk', icon: '🔠', cat: '가족', name: '친구들과 MBTI 수다', desc: '매력↑ 행복↑ · 나를 알아간다', stages: T, stat: 'cha', hap: [7, 5, 2, -1],
    lines: L(['"너 완전 그거다!" 반 전체가 유형 맞히기에 빠졌다.'], ['궁합표를 만들어 돌렸다.'], ['나랑 안 맞는 유형 얘기에 살짝 서운.'], ['유형으로 편 가르다 싸웠다.']),
    extra: (_s, p) => `\n(${p.name}: ${mbtiLabel(p)})` },
];

export const STUDENT_ACTIONS: ActionDef[] = SPECS.map(build);
