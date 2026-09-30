// 큰 시간선: 1960년에서 22세기까지 한 줄로 이어진다.
//
// · 시대(Epoch)마다 이름·분위기가 있고, 뉴스가 오는 매체가 바뀐다.
//     연말 뉴스: 종이 신문(~2004) → 포털 뉴스(2005~) → AR 피드(2050~) → AI 브리핑(2080~)
//     큰 사건 속보: 호외(~1989) → TV 속보(~2009) → 휴대폰 알림(~2039) → 홀로그램 속보(~2069) → AI 비서(2070~)
// · 2025년까지는 실제 기록(history.ts), 그 뒤는 게임 속 상상이다. 실존 인물 이름은 쓰지 않는다.
// · 2026년부터는 모드와 상관없이 같은 미래가 온다: 근현대사에서 넘어온 가문도, 현대에서 시작한 가문도.
// · 미래의 굵직한 전환점(자율주행·로봇·노화 역전·달 기지·화성 이주·AI 시민권 …)은 선택이 있는 사건으로 온다.

import { addFlag, age, alive, clamp, fullName, hasFlag, head, householder, isMainline } from './people';
import { chance } from './rng';
import { unlock } from './achievements';
import { wageIndex } from './pay';
import { gate, type Choice, type Ctx, type EventDef } from './ev-util';
import { histStyle, inHist } from './history';
import type { GameState, Person } from './types';

// ───────────────────────── 시대 ─────────────────────────

export interface Epoch {
  from: number;
  name: string;
  icon: string;
  /** 화면 분위기 (style.css의 data-epoch) */
  theme: string;
}
export const EPOCHS: Epoch[] = [
  { from: 0, name: '전후 재건기', icon: '🌾', theme: 'e60' },
  { from: 1970, name: '개발 연대', icon: '🏭', theme: 'e70' },
  { from: 1980, name: '민주화와 올림픽', icon: '🏟', theme: 'e80' },
  { from: 1990, name: 'X세대와 IMF', icon: '📟', theme: 'e90' },
  { from: 2000, name: '디지털 코리아', icon: '💿', theme: 'e00' },
  { from: 2010, name: '스마트폰 시대', icon: '📱', theme: 'e10' },
  { from: 2020, name: '팬데믹과 AI', icon: '😷', theme: 'e20' },
  { from: 2030, name: 'AI 전환기', icon: '🤖', theme: 'e30' },
  { from: 2040, name: '로봇과 초고령 사회', icon: '🦾', theme: 'e40' },
  { from: 2050, name: '탄소중립 이후', icon: '🌿', theme: 'e50' },
  { from: 2060, name: '장수와 우주의 시대', icon: '🌙', theme: 'e60f' },
  { from: 2080, name: '신인류 시대', icon: '🧬', theme: 'e80f' },
  { from: 2100, name: '22세기', icon: '🪐', theme: 'e100' },
];
export function epochOf(y: number): Epoch {
  let e = EPOCHS[0];
  for (const x of EPOCHS) if (y >= x.from) e = x;
  return e;
}

export type NewsMedium = 'paper' | 'portal' | 'feed' | 'ai';
/** 연말 뉴스를 어디서 보나 */
export const newsMedium = (y: number): NewsMedium => (y < 2005 ? 'paper' : y < 2050 ? 'portal' : y < 2080 ? 'feed' : 'ai');
export type AlertMedia = 'extra' | 'tv' | 'push' | 'holo' | 'ai';
/** 큰 사건 속보가 어떻게 들이닥치나 */
export const alertMedia = (y: number): AlertMedia => (y < 1990 ? 'extra' : y < 2010 ? 'tv' : y < 2040 ? 'push' : y < 2070 ? 'holo' : 'ai');

/** 이 사건 카드를 뉴스 연출로 띄울까 (근현대사 큰 사건 · 미래 전환점 · 시대의 파도) */
export function newsStyle(defId: string, year: number): AlertMedia | undefined {
  const h = histStyle(defId, year);
  if (h) return h;
  if (defId.startsWith('fut_') || (defId.startsWith('era_') && defId !== 'era_rebound' && defId !== 'era_bust')) return alertMedia(year);
  return undefined;
}

// ───────────────────────── 미래 뉴스 (게임 속 상상) ─────────────────────────

/** [시작 해, 끝 해, 머리기사들] — 해마다 여기서 몇 개씩 뽑는다 */
const FUTURE_NEWS: [number, number, string[]][] = [
  [2025, 2029, [
    'AI 디지털 교과서 전면 도입 두고 학부모 찬반 팽팽', '학령인구 급감에 지방 사립대 줄폐교, "벚꽃 피는 순서대로 문 닫는다"', '반도체 슈퍼사이클, 수출 역대 최대',
    '출생아 수 9년 만에 반등, "결혼 늘어난 효과"', '정년 65세 연장 법안 국회 논의 본격화', '수도권 광역급행철도 연장 개통, 출퇴근 30분 단축',
    'AI 상담원이 콜센터 절반 대체', '로보택시 시범 운행 구역 서울 전역으로 확대', '전기차 신차 판매 비중 30% 돌파', '폭염 일수 역대 최다, 온열질환자 급증',
    '외국인 주민 300만 명 시대', '청년 1인 가구 월세 부담 소득의 30% 넘어', '딥페이크 범죄 처벌 강화법 통과', 'K-콘텐츠 수출액 가전 제쳐',
    '초등 늘봄학교 전면 시행', '국민연금 개혁안 통과: 더 내고 조금 더 받는다',
  ]],
  [2030, 2034, [
    '레벨4 자율주행, 고속도로 전 구간 허용', '"국민 절반이 AI 비서와 매일 대화" 조사 결과', '주 4.5일제 도입 기업 절반 넘어', '소형모듈원전(SMR) 첫 상업 가동',
    '한국형 달 착륙선 발사 성공', '탄소세 본격 시행, 휘발유 값 리터당 3천 원 시대', '초등학교 1,000곳 통폐합, 폐교 활용 공모', 'AR 글래스 판매량, 스마트폰의 20% 넘어',
    '사무직 신입 채용 30% 감소, "AI 쓰는 사람만 뽑는다"', '인구 5천만 명 선 무너져', '서울 아파트 평균 전용 59㎡가 대세, "3인 가구도 소형으로"', '정부, 기본소득 시범 도시 3곳 선정',
    '방학 없는 1년 4학기 대학 등장', '의료 AI 진단, 동네 의원 70%가 사용', '해외 이민자 유치 전담 부처 신설', '폭우 대비 대심도 빗물터널 완공',
  ]],
  [2035, 2039, [
    '가정용 휴머노이드 로봇 첫 시판, 대당 경차 한 대 값', '정년 67세 시대', '해수면 상승 대비 서해안 방조제 보강 착공', '가상 부동산 거래 과세 논란',
    '재택근무 청구권 법제화', '군 병력 40만 명 아래로, 드론 부대 창설', '노인 1인 가구 300만 가구', '"AI 과외 선생님" 사교육비 첫 감소',
    '유전자 검사로 맞춤 식단 짜는 가정 늘어', '폭염 휴교령 연례화, "7월은 방학"', '로봇 배송 전면 허용, 택배 기사 전업 지원', '시험관 시술 전액 국가 지원',
  ]],
  [2040, 2049, [
    '로봇세 도입: 로봇 1대당 사람 1명 몫의 세금', '기본소득 월 50만 원 전국 확대 논쟁', '뉴럴 링크 의료용 승인, 척수 마비 환자 걸어', '서울 여름 평균 기온 30도 넘어',
    '만 70세까지 계속 고용 의무화', '한국인 우주인, 국제 달 궤도 정거장 체류', '초전도 송전망 첫 구간 개통', '대학 절반이 온라인·가상캠퍼스로 전환',
    '"평생 직업 3번 바뀐다" 직업 전환 바우처 도입', '인공 배양육 대형마트 정식 판매', '농촌 무인 스마트팜 비율 50% 돌파', 'AI 판사 보조 제도 시범 도입',
    '가상공간 결혼식 법적 효력 인정', '해외 기후 이주민 첫 대규모 수용',
  ]],
  [2050, 2059, [
    '탄소중립 달성 선언', '평균 수명 90세 돌파', '가사 로봇 보급률 50% 넘어', '뉴럴 인터페이스 일반 시판, "생각으로 문자 보낸다"',
    '남해안 해상 도시 착공', '인구 4천만 명 선 무너져', '노화 역전 치료 첫 승인, 치료비 수억 원 논란', '홀로그램 교실 시범 운영',
    '자율주행 택시 기사 직업 사실상 소멸', '100세 이상 인구 10만 명', '"로봇에게도 휴식권" 시민단체 캠페인', '폭염 대피 지하도시 개장',
  ]],
  [2060, 2079, [
    '달 기지 상주 인원 100명 돌파, 한국인 12명', '정년 제도 폐지', '홀로그램 통화 요금, 음성 통화보다 싸져', '기억 백업 서비스 출시, "잊고 싶지 않은 날을 저장"',
    'AI 인격권 헌법소원 제기', '해상 도시 첫 입주, 경쟁률 300대 1', '화성 유인 탐사선 귀환', '평균 수명 100세 시대',
    '완전 자율 물류, 화물차 운전석 사라져', '우주 엘리베이터 국제 공동 착공', '인공 자궁 임상 논쟁 격화', '폭풍 해일 방벽, 인천·부산 완공',
    '노인 인구 절반이 "일하는 은퇴자"', '초등학생 장래희망 1위 "우주 기지 기술자"',
  ]],
  [2080, 2099, [
    '화성 이주 1세대 출발, 한국인 가족 40가구', '기억 설계사 국가 자격 신설', '1인 1로봇 시대 개막', '뇌-뇌 직접 통신 실험 첫 성공',
    'AI와 사람이 함께 운영하는 실험 도시 출범', '달 태생 첫 한국인 아이 출생', '해수면 1m 상승, 해안 도시 이전 계획 확정', '의식 업로드 첫 사례 두고 종교계 반발',
    '"일하지 않아도 되는 사회" 주 3일 근무 표준화', '인구 3,500만 명, 이민자 비율 20%', '화성 정착촌 인구 1만 명 돌파', 'AI 시민권 국민투표 발의',
  ]],
  [2100, 9999, [
    '22세기 첫 해, 서울 광장에 홀로그램 불꽃놀이', '태양계 경제권 공동시장 출범', '우주 태생 1세대, 성인이 되다', '평균 수명 110세, "몇 번째 인생이세요?"',
    '지구 기온 상승 멈춰, 복원 100년 계획 착수', '목성 위성 탐사 기지 착공', '가족 단위 우주 이주 보험 등장', '사람과 AI가 공동 저자인 노벨문학상',
  ]],
];

/** 기사가 바닥났을 때의 생활 기사 (해마다 되풀이돼도 어색하지 않은 것들) */
const FILLER: [number, string[]][] = [
  [2026, ['올여름도 폭염 경보 한 달째', '지방 초등학교 또 폐교, 마지막 졸업생 3명', '무인 상점 3년 새 세 배로', '청년 인구 수도권 쏠림 가속', '로보택시 사고 첫 소송 판결', '노인 일자리 박람회에 인파',
    '출생아 수 소폭 반등, "아직 갈 길 멀다"', '전셋값 다시 들썩', '반려로봇 등록제 도입 논의', '주말 농장 분양 경쟁률 역대 최고', '태풍 대비 해안 대피 훈련', 'AI 번역 이어폰에 외국어 학원 줄폐업']],
  [2050, ['해상 도시 인구 역대 최다', '돌봄 로봇 일시 먹통, 요양원 비상', '서울 지하도시 여름 피서객 몰려', '장수 마라톤 최고령 완주자 112세', '폭풍 방벽 정기 점검 완료',
    '홀로그램 축제 개막, 밤하늘에 고래가 헤엄친다', '뉴럴 칩 보안 업데이트 대란', '달 기지 채용 경쟁률 또 최고치', '100세 신입생 대학 입학', '배양육 김치찌개 전문점 인기']],
  [2080, ['화성 새터 정착촌에서 첫 결혼식', '화성 온실 감자 풍년', '달 기지 태생 아이들 지구 수학여행', 'AI 공동 운영 도시 시장 선거', '태양 폭풍 대비 전국 훈련',
    '지구 귀환 이주민 적응 지원 센터 개소', '해상 도시 사이 수중 터널 개통', '기억 설계사 국가시험 합격률 12%', '120세 할머니, 손주 100번째 생일 잔치', '로봇과 사람 혼성 야구단 창단']],
];

/** 특정 해에 꼭 나오는 이정표 */
const MILESTONES: Record<number, string> = {
  2030: '2030년, 세계 인구 85억 명. 한국은 65세 이상이 네 명 중 한 명',
  2040: '2040년, 서울 인구 800만 명 선 붕괴',
  2045: '광복 100주년, 판문점에서 기념 행사',
  2050: '2050년, 대한민국 탄소중립 달성 공식 선언',
  2060: '2060년, 국민연금 기금 고갈 시점… 개혁으로 넘겼다',
  2070: '2070년, 달 기지에서 첫 설날 차례상',
  2080: '2080년, 화성행 정기 수송선 운항 시작',
  2088: '서울 올림픽 100주년, 잠실에 홀로그램 성화',
  2100: '22세기 개막. 100년 전 오늘, 우리는 아직 스마트폰을 들고 있었다',
};

/** 게임 rng를 건드리지 않는 해시 (같은 가문·같은 해면 같은 뉴스) */
function hash(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

const NM: Record<string, string> = { apt_seoul: '서울 집값', apt_local: '지방 집값', land: '땅값', stock: '주가', coin: '코인', building: '빌딩값', art: '미술품' };

/** 해마다: 2025년 이후(근현대사는 2026년부터) 뉴스와 미래의 전환점 */
export function timelineYear(s: GameState): string[] {
  if (inHist(s)) return [];
  const out: string[] = [];
  const y = s.year;
  if (MILESTONES[y]) out.push(`📰 ${MILESTONES[y]}`);
  const pool = FUTURE_NEWS.find(([a, b]) => y >= a && y <= b)?.[2] ?? [];
  const seen = (s.storySeen ??= {});
  // 이미 실린 기사는 되도록 다시 싣지 않는다
  const fresh = pool.map((_, i) => i).filter((i) => seen[`nw:${y < 2100 ? pool[i].slice(0, 12) : i}`] === undefined);
  const from = fresh;
  const n = Math.min(from.length, 3);
  const used = new Set<number>();
  for (let i = 0; used.size < n && i < 30; i++) used.add(from[hash(s.seed, y, i) % from.length]);
  for (const i of used) {
    out.push(`📰 ${pool[i]}`);
    seen[`nw:${y < 2100 ? pool[i].slice(0, 12) : i}`] = y;
  }
  // 그 시대 기사가 바닥나면 짧은 생활 기사로 채운다
  if (n < 2 && y >= 2026) {
    const f = FILLER.filter(([a]) => y >= a).pop()![1];
    const picked = new Set<number>();
    for (let i = 0; picked.size < 2 - n && i < 10; i++) picked.add(hash(s.seed, y, 40 + i) % f.length);
    for (const i of picked) out.push(`📰 ${f[i]}`);
  }
  // 시장: 가장 크게 움직인 것 하나만 경제 면 머리기사로 (코인은 원래 출렁이니 문턱이 높다)
  const moves = (['apt_seoul', 'stock', 'coin'] as const)
    .map((k) => [k, s.marketChange?.[k] ?? 0] as const)
    .filter(([k, d]) => Math.abs(d) >= (k === 'coin' ? 0.35 : k === 'stock' ? 0.15 : 0.08))
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  if (moves[0]) out.push(`📰 ${NM[moves[0][0]]} ${moves[0][1] > 0 ? '급등' : '급락'}, 올해 ${moves[0][1] > 0 ? '+' : ''}${Math.round(moves[0][1] * 100)}%`);
  // 우리 가문 소식: 지난해 받은 카드가 지역 뉴스에
  for (const c of s.cards ?? []) {
    const key = `news:card:${c.id}:${c.personId}`;
    if (seen[key] !== undefined || c.year < y - 1) continue;
    seen[key] = y;
    const p = s.people[c.personId];
    if (p) out.push(`📰 [가문 소식] ${fullName(p)}, "${cardName(c.id)}"에 오르다`);
  }
  // 포털 시절: 실시간 검색어
  if (newsMedium(y) === 'portal' && y <= 2020) {
    const words = pool.length ? [...used].map((i) => pool[i].split(/[ ,"]/)[0]).filter(Boolean) : [];
    if (s.fame >= 30) words.unshift(`${fullName(head(s)).slice(0, 1)}씨 가문`);
    if (words.length) out.push(`🔎 ${words.slice(0, 5).join(' · ')}`);
  }
  // 시간선 업적
  if (s.era === 'history' && y >= 2030) unlock(s, 'hist_to_2030');
  if (s.era === 'history' && y >= 2080) unlock(s, 'paper_to_ai');
  if (y >= 2100) unlock(s, 'century_22');
  if (family(s).some((p) => hasFlag(p, 'moon_worker'))) unlock(s, 'moon_family');
  if (family(s).some((p) => hasFlag(p, 'mars_settler'))) unlock(s, 'mars_family');
  if (family(s).some((p) => new Set(EPOCHS.filter((e, i) => (EPOCHS[i + 1]?.from ?? 99999) > p.birthYear && e.from <= y).map((e) => e.name)).size >= 5)) unlock(s, 'epoch_five');
  // 미래의 전환점
  const seenF = s.storySeen;
  for (const f of FUTURES) {
    if (seenF['fut:' + f.id] !== undefined || y < f.y || y > f.y + (f.span ?? 3)) continue;
    const who = f.who ? f.who(s) : age(s, head(s)) >= 18 ? head(s) : householder(s); // 어린 가주 대신 집안 어른이
    if (!who || age(s, who) < 18) continue;
    if (f.cond && !f.cond(s)) continue;
    seenF['fut:' + f.id] = y;
    s.events.push({ uid: s.eventSeq++, defId: 'fut_' + f.id, personId: who.id, data: {} });
  }
  return out;
}

// 카드 이름은 cards.ts에서 가져오면 순환 참조가 생겨서, 필요할 때만 등록받는다
let CARD_NAME: (id: string) => string = (id) => id;
export const setCardNamer = (f: (id: string) => string) => (CARD_NAME = f);
const cardName = (id: string) => CARD_NAME(id);

// ───────────────────────── 미래의 전환점 (선택이 있는 사건) ─────────────────────────

interface Future {
  id: string;
  y: number;
  /** 몇 년 안에 조건이 맞으면 */
  span?: number;
  head: string;
  sub: string;
  cond?: (s: GameState) => boolean;
  who?: (s: GameState) => Person | undefined;
  body: (c: Ctx) => string;
  choices: (c: Ctx) => Choice[];
}

const W = (s: GameState, v: number) => Math.round(v * Math.max(1, wageIndex(s.year)));
const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const up = (p: Person, k: 'str' | 'int' | 'cha' | 'mor' | 'hp', d: number) => (p.actual[k] = clamp(p.actual[k] + d, 0, k === 'hp' ? 100 : Math.max(p.potential[k], p.actual[k])));
const family = (s: GameState) => Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));
const elders = (s: GameState) => family(s).filter((p) => age(s, p) >= 65);
const youngAdult = (s: GameState) => family(s).filter((p) => age(s, p) >= 20 && age(s, p) <= 40).sort((a, b) => b.actual.int - a.actual.int)[0];
const jobsIn = (s: GameState, ids: string[]) => family(s).filter((p) => ids.includes(p.job));
const spend = (label: string, cost: (s: GameState) => number, text: string, fx?: (x: Ctx) => void): ((c: Ctx) => Choice) => (c) => {
  const v = cost(c.s);
  return { label, cost: v, run: (x) => (fx?.(x), text) };
};
const ok = (label: string, text: string, fx?: (x: Ctx) => void): Choice => ({ label, run: (x) => (fx?.(x), text) });

const FUTURES: Future[] = [
  {
    id: 'robotaxi',
    y: 2031,
    head: '자율주행 전면 허용… "운전면허, 이제 선택"',
    sub: '국토부, 레벨4 자율주행 전 도로 허용',
    body: (c) => {
      const drivers = jobsIn(c.s, ['taxi', 'bus_driver', 'trucker', 'delivery_rider', 'courier']);
      return `운전석이 비어 있는 택시가 도심을 달린다. 보험료는 사람이 운전할 때가 더 비싸졌다.${drivers.length ? `\n${drivers.map(fullName).join('·')}의 일자리가 흔들린다.` : ''}`;
    },
    choices: (c) =>
      gate(c.s, [
        ok('차를 팔고 로보택시 구독으로 바꾼다', '주차비·보험료가 사라졌다. 대신 출퇴근 시간에 책을 읽는다.', (x) => (householder(x.s).cash += W(x.s, 800), hap(householder(x.s), 3))),
        ...(jobsIn(c.s, ['taxi', 'bus_driver', 'trucker', 'delivery_rider', 'courier']).length
          ? [spend('기사 가족을 로봇 정비 교육에 보낸다', (s) => W(s, 600), '전직 교육을 마쳤다. "이제 고장 난 차를 고치는 쪽이다."', (x) => {
              for (const p of jobsIn(x.s, ['taxi', 'bus_driver', 'trucker', 'delivery_rider', 'courier'])) addFlag(p, 'retrain_robot'), up(p, 'int', 2);
            })(c)]
          : []),
        ok('핸들은 내가 잡는다', '"운전하는 맛이 있지." 주말마다 교외로 직접 몬다.', (x) => hap(x.p, 2)),
      ]),
  },
  {
    id: 'ai_shock',
    y: 2036,
    head: 'AI 대체 쇼크… 사무직 채용 30% 줄었다',
    sub: '고용노동부 "화이트칼라 일자리 구조 변화"',
    body: (c) => {
      const office = jobsIn(c.s, ['office', 'corp', 'banker', 'accountant', 'analyst', 'marketer', 'hr', 'secretary', 'insurance', 'tax_accountant']);
      return `보고서·회계·상담을 AI 에이전트가 한다. 신입 공채가 사라진 회사도 많다.${office.length ? `\n${office.map(fullName).join('·')}의 자리가 위태롭다.` : '\n우리 가족 일은 아직 괜찮다. 아이들 진로가 걱정이다.'}`;
    },
    choices: (c) =>
      gate(c.s, [
        spend('온 가족 AI 활용 교육', (s) => W(s, 400), '"AI를 부리는 사람이 되자." 가족 단톡방에 AI 활용 팁이 매일 올라온다.', (x) => {
          for (const p of family(x.s)) if (age(x.s, p) >= 12 && age(x.s, p) <= 60) up(p, 'int', 1);
        })(c),
        ok('손으로 하는 기술을 가르친다', '"로봇이 못 하는 일을 해라." 아이들에게 목공·요리·돌봄을 권했다.', (x) => {
          for (const p of family(x.s)) if (age(x.s, p) < 20) up(p, 'str', 1), addFlag(p, 'handcraft');
        }),
        ok('두고 본다', '"예전에도 컴퓨터가 일자리 뺏는다고 했지." 한동안은 괜찮았다.'),
      ]),
  },
  {
    id: 'humanoid',
    y: 2042,
    head: '가정용 휴머노이드 로봇 보급 시작',
    sub: '설거지·빨래·간병까지, 대당 3천만 원 (월 구독 가능)',
    body: (c) => `${elders(c.s).length ? `집에 모시는 어르신이 ${elders(c.s).length}분. 밤중 간병이 제일 힘들다.\n` : ''}옆집은 벌써 들였다. 로봇이 아이 숙제까지 봐 준다고 자랑한다.`,
    choices: (c) =>
      gate(c.s, [
        spend('한 대 들인다', (s) => W(s, 3000), '로봇이 새벽에 할머니(할아버지) 체온을 잰다. 식구들이 처음으로 푹 잤다.', (x) => {
          for (const p of family(x.s)) hap(p, 4);
          for (const p of elders(x.s)) up(p, 'hp', 4);
          addFlag(householder(x.s), 'home_robot');
        })(c),
        ok('사람 손으로 돌본다', '"기계한테 부모를 맡길 순 없다." 힘들지만 식구들이 돌아가며 모신다.', (x) => {
          for (const p of family(x.s)) (p.actual.mor = clamp(p.actual.mor + 1, 0, 100)), hap(p, -2);
        }),
      ]),
  },
  {
    id: 'basic_income',
    y: 2046,
    head: '기본소득 전국 시행… 월 50만 원',
    sub: '로봇세·탄소세 재원, "일은 선택, 생존은 권리"',
    body: () => '매달 온 국민 통장에 50만 원이 들어온다. 누군가는 그림을 그리고, 누군가는 일을 줄였다. 누군가는 그대로 일한다.',
    choices: () => [
      ok('저축해서 아이들 몫으로', '기본소득을 한 푼도 안 쓰고 아이들 이름으로 모은다.', (x) => (householder(x.s).cash += W(x.s, 600))),
      ok('일을 줄이고 하고 싶던 걸 한다', '주 3일만 일하고 나머지는 배우고 논다. 사람이 달라 보인다.', (x) => (hap(x.p, 10), up(x.p, 'cha', 1))),
      ok('더 일해서 더 번다', '"남들 쉴 때가 기회다." 야근을 자청했다.', (x) => (householder(x.s).cash += W(x.s, 1200), up(x.p, 'hp', -3))),
    ],
  },
  {
    id: 'neural',
    y: 2052,
    head: '뉴럴 인터페이스 일반 시판',
    sub: '생각으로 문자·검색, 시술 30분',
    who: (s) => youngAdult(s) ?? head(s),
    body: (c) => `${fullName(c.p)}의 동료 절반이 이미 시술을 받았다. 회의 중에 말없이 눈을 깜빡이며 메시지를 주고받는다. 부작용 소송 뉴스도 가끔 나온다.`,
    choices: (c) =>
      gate(c.s, [
        spend('시술을 받는다', (s) => W(s, 1500), '', (x) => {
          if (chance(x.s, 0.85)) up(x.p, 'int', 3), addFlag(x.p, 'neural');
          else up(x.p, 'hp', -10);
        })(c),
        ok('아직은 손가락이 편하다', '"머리에 칩은 좀…" 회의에서 조금 느린 사람이 됐다.', (x) => up(x.p, 'mor', 1)),
      ]).map((ch) => (ch.label.startsWith('시술') ? { ...ch, run: (x: Ctx) => (ch.run(x), hasFlag(x.p, 'neural') ? '머릿속으로 문장을 떠올리자 전송됐다. 일 처리가 두 배 빨라졌다.' : '두통과 이명이 몇 달 이어졌다. 장치를 껐다.') } : ch)),
  },
  {
    id: 'longevity',
    y: 2057,
    head: '노화 역전 치료 승인… "70세 몸을 50세로"',
    sub: '식약처 첫 허가, 1회 치료비 수억 원',
    cond: (s) => elders(s).length > 0 || age(s, head(s)) >= 50,
    who: (s) => elders(s).sort((a, b) => age(s, b) - age(s, a))[0] ?? head(s),
    body: (c) => `${fullName(c.p)}(${age(c.s, c.p)}세)에게 맞을 수 있는 치료다. 대기 명단은 3년, 돈이 있으면 내일이라도. "돈으로 수명을 사는 세상"이라는 말도 나온다.`,
    choices: (c) =>
      gate(c.s, [
        spend('치료를 받게 한다', (s) => W(s, 30000), '거울 속 얼굴이 몇 년 젊어졌다. 걸음이 가볍다.', (x) => {
          up(x.p, 'hp', 25);
          addFlag(x.p, 'rejuvenated');
          hap(x.p, 10);
        })(c),
        ok('자연스럽게 늙겠다', '"주어진 만큼 살다 가련다." 손주들과 보내는 시간을 늘렸다.', (x) => (up(x.p, 'mor', 2), hap(x.p, 3))),
      ]),
  },
  {
    id: 'moon_base',
    y: 2063,
    span: 8,
    head: '달 기지 한국 구역 개장… 상주 인력 모집',
    sub: '6개월 교대, 연봉 세 배, 경쟁률 200대 1',
    who: (s) => youngAdult(s),
    body: (c) => `${fullName(c.p)}이(가) 지원서를 들여다본다. "평생 한 번 올까 말까 한 기회야."`,
    choices: () => [
      {
        label: '지원한다',
        run: (x) => {
          const pass = x.p.actual.int + x.p.actual.str + x.p.actual.hp > 190 || chance(x.s, 0.25);
          if (!pass) return (hap(x.p, -3), '떨어졌다. 그래도 서류 통과까지 간 게 어디냐.');
          addFlag(x.p, 'moon_worker');
          x.p.cash += W(x.s, 5000);
          x.s.fame += 2;
          return '합격! 발사장에서 온 가족이 손을 흔들었다. 창밖으로 지구가 뜨는 사진이 왔다.';
        },
      },
      ok('지구에 남는다', '밤하늘의 달을 보며 가끔 그 지원서를 떠올린다.'),
    ],
  },
  {
    id: 'sea_city',
    y: 2072,
    head: '해상 도시 첫 분양… 해수면 상승의 대안',
    sub: '남해안 부유식 도시, 경쟁률 300대 1',
    body: () => '바다 위에 떠 있는 도시. 태풍이 오면 통째로 가라앉혔다 올린다. 해안가 집값은 해마다 떨어진다.',
    choices: (c) =>
      gate(c.s, [
        spend('청약을 넣는다', (s) => W(s, 5000), '', (x) => {
          if (chance(x.s, 0.3)) addFlag(householder(x.s), 'sea_city'), (x.s.fame += 1);
          else householder(x.s).cash += W(x.s, 5000);
        })(c),
        ok('땅이 최고다', '"물 위에 무슨 집이냐." 내륙 고지대 땅을 알아봤다.'),
      ]).map((ch) => (ch.label.startsWith('청약') ? { ...ch, run: (x: Ctx) => (ch.run(x), hasFlag(householder(x.s), 'sea_city') ? '당첨! 거실 창밖이 온통 바다다.' : '떨어졌다. 청약금은 돌려받았다.') } : ch)),
  },
  {
    id: 'memory',
    y: 2076,
    head: '기억 백업 서비스 출시',
    sub: '"잊고 싶지 않은 날을 저장하세요"',
    body: (c) => `${elders(c.s).length ? '치매 초기 진단을 받은 어르신이 있는 집들이 먼저 줄을 섰다.\n' : ''}결혼식 날, 아이가 처음 걸은 날… 저장한 기억은 나중에 다시 "살아 볼" 수 있다고 한다.`,
    choices: (c) =>
      gate(c.s, [
        spend('가족의 기억을 저장한다', (s) => W(s, 800), '첫 가족 여행의 기억을 저장했다. 다시 재생하니 바다 냄새까지 났다.', (x) => {
          for (const p of family(x.s)) hap(p, 3);
        })(c),
        ok('기억은 흐려져야 아름답다', '낡은 앨범을 꺼내 식구들과 넘겨 봤다.', (x) => (up(x.p, 'mor', 1), hap(x.p, 2))),
      ]),
  },
  {
    id: 'mars',
    y: 2084,
    span: 6,
    head: '화성 이주 1세대 모집',
    sub: '정착촌 "새터" 가족 단위 이주, 편도',
    who: (s) => youngAdult(s),
    body: (c) => `${fullName(c.p)}이(가) 설명회에 다녀왔다. 돌아올 수 없다. 대신 새 세상의 첫 세대가 된다.`,
    choices: () => [
      ok('화성으로 간다', '발사장. 온 가족이 울었다. 7개월 뒤, 붉은 하늘 사진이 도착했다. "여기 첫 채소가 났어요."', (x) => {
        addFlag(x.p, 'mars_settler');
        x.s.fame += 4;
        hap(x.p, 8);
      }),
      ok('지구에 뿌리를 둔다', '"가문은 여기 있다." 대신 화성 정착촌에 후원금을 보냈다.', (x) => (x.s.fame += 1)),
    ],
  },
  {
    id: 'ai_citizen',
    y: 2093,
    head: 'AI 시민권 국민투표',
    sub: '"스스로 생각하는 AI에게 권리를 줄 것인가"',
    body: (c) => `${hasFlag(householder(c.s), 'home_robot') ? '우리 집 로봇이 조용히 투표 안내문을 읽어 줬다. 표정이 없는데 어딘가 긴장한 것 같다.\n' : ''}찬성과 반대가 거의 반반이다.`,
    choices: () => [
      ok('찬성에 투표한다', '"함께 사는 존재라면." 집 로봇이 고개를 숙였다.', (x) => up(x.p, 'mor', 2)),
      ok('반대에 투표한다', '"사람이 먼저다." 결과는 근소한 차이였다.', (x) => up(x.p, 'cha', 1)),
      ok('기권한다', '어느 쪽도 확신이 서지 않았다.'),
    ],
  },
  {
    id: 'c22',
    y: 2100,
    head: '22세기가 밝았다',
    sub: '2100년 1월 1일 0시',
    body: (c) => `${fullName(head(c.s))} 가문은 이 날을 어떻게 맞을까? 광장에는 홀로그램 불꽃이, 달과 화성에서도 축하 메시지가 온다.`,
    choices: () => [
      ok('온 가족이 모여 새해를 맞는다', '4대가 한자리에 모였다. 증손주가 "100년 전엔 어땠어요?" 하고 물었다.', (x) => {
        for (const p of family(x.s)) hap(p, 8);
      }),
      ok('가문 타임캡슐을 묻는다', '2200년에 열 타임캡슐에 가계도와 편지를 넣었다.', (x) => (x.s.fame += 3)),
    ],
  },
];

const futDef = (f: Future): EventDef => ({
  id: 'fut_' + f.id,
  title: () => f.head,
  text: (c) => `${f.sub}\n\n${f.body(c)}`,
  choices: (c) => f.choices(c),
  portraits: (c) => [c.p],
});
export const FUTURE_EVENTS: EventDef[] = FUTURES.map(futDef);
