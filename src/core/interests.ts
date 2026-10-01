// 관심사: 어릴 때 해 본 것들이 쌓여 "어떤 일을 하고 싶은지"가 된다. 직업 분야(JOB_CATS)마다 흔적 'i:분야'.
// 6·9·13·15세에 취미를 고르고 → 장래희망이 구체적인 직업이 되고 → 첫 직장에서 그 분야에 가산점.
import { anachronistic, histCur } from './histpack';
import type { Choice, Ctx, EventDef } from './ev-util';
import type { GameState, Person, StatKey } from './types';
import { chance, pick } from './rng';
import { age, clamp, discoverTalent, fullName, mark, markOf } from './people';
import { JOB_CATS, type JobCat } from './jobs';
import { JOBS, TALENTS } from './data';
import { grow } from './practice';

export type Interest = Exclude<JobCat, 'etc'>;
export const INTEREST_KEYS = Object.keys(JOB_CATS).filter((k) => k !== 'etc') as Interest[];

/** 부모를 찾으려고 지금 게임 상태를 붙잡아 둔다 (school.bindState에서 호출) */
let kin: GameState | undefined;
export const bindKin = (s: GameState) => (kin = s);

export const interestLevel = (p: Person, cat: string) => Math.max(0, markOf(p, 'i:' + cat));

/** 가장 크게 자란 관심사들 (높은 순) */
export function topInterests(p: Person, n = 2, min = 2): Interest[] {
  return INTEREST_KEYS.filter((k) => interestLevel(p, k) >= min)
    .sort((a, b) => interestLevel(p, b) - interestLevel(p, a))
    .slice(0, n);
}

// ───────────────────────── 성향 ─────────────────────────
// 타고난 성격(특성)·재능·능력치로 어떤 일이 잘 맞을지. 재능은 드러나지 않았어도 은근히 끌린다.

const TRAIT_FIT: Record<string, Interest[]> = {
  diligent: ['office', 'legal', 'public', 'trade'],
  lazy: ['farm', 'transport'],
  cheerful: ['sport', 'service', 'media'],
  anxious: ['tech', 'legal', 'office'],
  social: ['biz', 'service', 'public'],
  shy: ['tech', 'farm', 'trade', 'media'],
  filial: ['edu', 'medical', 'public'],
  rebel: ['sport', 'biz', 'transport'],
  frugal: ['office', 'farm'],
  spender: ['biz', 'media'],
  gambler: ['biz'],
  flirt: ['service', 'media'],
  devoted: ['medical', 'edu'],
  leader: ['public', 'biz', 'legal'],
  tough: ['sport', 'trade', 'transport', 'farm', 'public'],
  frail: ['tech', 'media', 'office'],
  ambitious: ['legal', 'biz', 'public', 'medical'],
  speed_demon: ['sport', 'transport'],
  hypnotic_eye: ['media', 'biz', 'service'],
  dark_artist: ['media', 'trade'],
};
const TALENT_FIT: Record<string, Interest[]> = {
  genius: ['tech', 'medical', 'legal'],
  athlete: ['sport', 'public', 'transport'],
  star: ['media', 'sport'],
  merchant: ['biz', 'office'],
  artist: ['media', 'trade'],
  orator: ['legal', 'office', 'media'],
  healer: ['medical', 'edu'],
  craft: ['trade', 'tech'],
  linguist: ['public', 'media', 'edu'],
  iron: ['sport', 'transport', 'public'],
  empath: ['edu', 'medical', 'service'],
  strategist: ['office', 'biz', 'tech'],
  pitch: ['media'],
  palate: ['service', 'farm'],
  justice: ['public', 'legal'],
  commander: ['public', 'biz', 'office'],
  navigator: ['transport', 'public'],
  greenthumb: ['farm', 'biz'],
  beauty: ['service', 'media'],
  scholar: ['tech', 'edu', 'medical'],
  animal: ['farm', 'medical', 'service'],
};
const STAT_FIT: Record<StatKey, Interest[]> = {
  str: ['sport', 'trade', 'transport', 'farm', 'public'],
  int: ['tech', 'medical', 'legal', 'office'],
  cha: ['media', 'biz', 'service', 'legal'],
  mor: ['public', 'medical', 'farm'],
  hp: ['sport', 'transport'],
};

// ───────────────────────── MBTI ─────────────────────────
// 16가지 성격 유형. 특성·능력치로 정하고, 애매한 축은 사람마다 고정된 해시로 (저장 없이 늘 같은 결과).

export const MBTI_INFO: Record<string, [string, Interest[]]> = {
  INTJ: ['전략가', ['tech', 'legal', 'biz']],
  INTP: ['논리술사', ['tech', 'legal', 'transport']],
  ENTJ: ['통솔자', ['biz', 'legal', 'public']],
  ENTP: ['변론가', ['biz', 'media', 'legal']],
  INFJ: ['옹호자', ['edu', 'medical', 'media']],
  INFP: ['중재자', ['media', 'farm', 'medical']],
  ENFJ: ['선도자', ['edu', 'public', 'medical']],
  ENFP: ['활동가', ['media', 'biz', 'service']],
  ISTJ: ['현실주의자', ['office', 'public', 'legal']],
  ISFJ: ['수호자', ['medical', 'edu', 'office']],
  ESTJ: ['경영자', ['office', 'public', 'biz']],
  ESFJ: ['집정관', ['service', 'medical', 'edu']],
  ISTP: ['장인', ['trade', 'transport', 'tech']],
  ISFP: ['모험가', ['media', 'farm', 'trade']],
  ESTP: ['사업가', ['sport', 'biz', 'transport']],
  ESFP: ['연예인', ['media', 'service', 'sport']],
};

/** 사람·축마다 고정된 0~1 난수 (잘 섞인 해시) */
function hashUnit(id: string, salt: string): number {
  let x = 2166136261;
  for (const ch of id + '|' + salt) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** 이 사람의 MBTI: 특성·잠재력은 기울기만 주고(±30%), 나머지는 사람마다 고정된 운 */
export function mbtiOf(p: Person): string {
  const tr = p.traits ?? [];
  const pot = p.potential;
  const tilt = (v: number) => Math.max(-0.3, Math.min(0.3, v));
  const pE = 0.5 + (tr.includes('social') || tr.includes('leader') ? 0.3 : 0) - (tr.includes('shy') ? 0.3 : 0);
  const pN = 0.5 + tilt((pot.int - pot.str) / 60);
  const pT = 0.5 + tilt((pot.int - Math.max(pot.cha, pot.mor)) / 60);
  const pJ = 0.5 + (tr.includes('diligent') || tr.includes('frugal') ? 0.3 : 0) - (tr.includes('lazy') || tr.includes('spender') || tr.includes('rebel') ? 0.3 : 0);
  const pick = (pr: number, axis: string) => hashUnit(p.id + ':' + p.birthYear, axis) < pr;
  return (pick(pE, 'EI') ? 'E' : 'I') + (pick(pN, 'SN') ? 'N' : 'S') + (pick(pT, 'TF') ? 'T' : 'F') + (pick(pJ, 'JP') ? 'J' : 'P');
}
export const mbtiLabel = (p: Person) => `${mbtiOf(p)}(${MBTI_INFO[mbtiOf(p)][0]})`;

/** 분야별 궁합 점수 */
export function fitScores(p: Person): Record<Interest, number> {
  const sc = Object.fromEntries(INTEREST_KEYS.map((k) => [k, 0])) as Record<Interest, number>;
  for (const tr of p.traits ?? []) for (const k of TRAIT_FIT[tr] ?? []) sc[k] += 2;
  for (const tl of p.talents ?? []) for (const k of TALENT_FIT[tl.id] ?? []) sc[k] += 3;
  // 가장 두드러진 능력치 두 개 (잠재력 기준)
  const stats = (Object.keys(STAT_FIT) as StatKey[]).sort((a, b) => p.potential[b] - p.potential[a]).slice(0, 2);
  for (const st of stats) for (const k of STAT_FIT[st]) sc[k] += 1.5;
  for (const k of MBTI_INFO[mbtiOf(p)][1]) sc[k] += 2.5;
  // 부모의 일과 성격이 대물림된다: 어깨너머로 보고 자란 일, 닮은 기질
  for (const id of [p.fatherId, p.motherId]) {
    const par = id ? kin?.people[id] : undefined;
    if (!par) continue;
    const cat = JOBS[par.job]?.cat as Interest | undefined;
    if (cat && cat in sc && !['none', 'parttime', 'pension'].includes(par.job)) sc[cat] += 3.5 + Math.min(2, par.jobLevel * 0.5);
    for (const tr of par.traits ?? []) for (const k of TRAIT_FIT[tr] ?? []) sc[k] += 0.6;
  }
  return sc;
}

/** 잘 맞을 것 같은 분야 (높은 순) */
export function fitCats(p: Person, n = 3): Interest[] {
  const sc = fitScores(p);
  return INTEREST_KEYS.filter((k) => sc[k] > 0).sort((a, b) => sc[b] - sc[a]).slice(0, n);
}

const TRAIT_LABEL: Record<string, string> = {
  diligent: '성실', lazy: '느긋함', cheerful: '낙천적', anxious: '꼼꼼·예민', social: '사교적', shy: '내성적', filial: '다정함',
  rebel: '자유로움', frugal: '알뜰함', spender: '통 큼', gambler: '모험심', flirt: '인기 많음', devoted: '한결같음',
  leader: '리더십', tough: '튼튼함', frail: '섬세함', ambitious: '야심',
  speed_demon: '질주본능', hypnotic_eye: '맑은 눈', dark_artist: '예술의 손',
};

/** "사교적·리더십 아이. 사람을 이끄는 일이 잘 맞을 것 같다" */
export function temperamentLine(p: Person): string {
  const tr = (p.traits ?? []).map((t) => TRAIT_LABEL[t]).filter(Boolean).slice(0, 3);
  const cats = fitCats(p, 2).map((k) => JOB_CATS[k]);
  // 근현대사 모드(2018년 전)엔 MBTI라는 말이 없었다
  const h = histCur();
  const mb = h && h.year < 2018 ? '' : mbtiLabel(p);
  return `성향: ${[mb, ...tr].filter(Boolean).join(' · ') || '아직 잘 모르겠다'}${cats.length ? ` → 잘 맞을 것 같은 분야: ${cats.join(', ')}` : ''}`;
}

interface Hobby {
  label: string;
  cat: Interest;
  stat: StatKey;
  age: [number, number];
  cost?: number;
  lines: string[];
}

const HOBBIES: Hobby[] = [
  // IT·과학·공학
  { label: '레고·로봇 교실', cat: 'tech', stat: 'int', age: [6, 12], cost: 30, lines: ['움직이는 로봇 팔을 만들었다. 설명서 없이.', '레고로 도시를 통째로 지었다.'] },
  { label: '코딩 교실 (스크래치·파이썬)', cat: 'tech', stat: 'int', age: [8, 16], cost: 30, lines: ['직접 만든 게임을 반 친구들에게 돌렸다.', '"버그 잡았다!" 소리를 지르며 방에서 뛰쳐나왔다.'] },
  { label: '과학 실험 키트', cat: 'tech', stat: 'int', age: [6, 13], cost: 10, lines: ['화산 폭발 실험으로 부엌이 난장판. 그래도 눈이 반짝였다.', '현미경으로 양파 세포를 보고 한참을 놀랐다.'] },
  { label: '천체 관측 동아리', cat: 'tech', stat: 'int', age: [10, 18], cost: 20, lines: ['망원경으로 목성의 위성을 찾았다.', '새벽 유성우를 보고 우주 비행사가 되겠단다.'] },
  // 의료
  { label: '동물 병원 체험', cat: 'medical', stat: 'mor', age: [6, 13], lines: ['수의사 선생님 옆에서 강아지 붕대를 감아 줬다.', '"아픈 동물을 고쳐 주고 싶어."'] },
  { label: '응급처치 교육 (심폐소생술)', cat: 'medical', stat: 'mor', age: [11, 18], lines: ['마네킹으로 심폐소생술을 배웠다. 수료증을 받았다.', '인체 구조에 푹 빠졌다.'] },
  { label: '인체 모형 조립', cat: 'medical', stat: 'int', age: [8, 14], cost: 10, lines: ['뼈 이름을 줄줄 외운다.', '심장 모형을 분해했다 다시 조립했다.'] },
  // 법·전문 자격
  { label: '토론 교실', cat: 'legal', stat: 'cha', age: [10, 18], cost: 20, lines: ['상대편을 논리로 눌렀다. 선생님이 변호사 해도 되겠다고 했다.', '말꼬리를 잡는 기술이 늘었다. 부모님이 긴장한다.'] },
  { label: '모의재판 체험', cat: 'legal', stat: 'int', age: [11, 18], lines: ['검사 역을 맡아 최종 변론을 했다.', '법원 견학에서 판사님 의자에 앉아 봤다.'] },
  { label: '용돈 기입장·경제 교실', cat: 'office', stat: 'int', age: [7, 14], lines: ['100원 단위까지 맞췄다. 회계사 소질이 보인다.', '은행 놀이를 하며 이자를 계산한다.'] },
  // 공공·안전
  { label: '소방서·경찰서 견학', cat: 'public', stat: 'str', age: [6, 12], lines: ['소방차에 올라탔다. "나 커서 소방관 될래!"', '경찰 아저씨와 경례를 했다.'] },
  { label: '보이스카우트·걸스카우트', cat: 'public', stat: 'mor', age: [8, 15], cost: 20, lines: ['텐트 치고 매듭 묶기를 배웠다.', '봉사 배지를 세 개 모았다.'] },
  { label: '어린이 국회 체험', cat: 'public', stat: 'cha', age: [10, 15], lines: ['어린이 국회의원으로 법안을 발의했다. "급식에 치킨을 매일!"', '민원 처리 역할극에서 공무원 역을 맡았다.'] },
  // 교육
  { label: '동생들 가르치기 (또래 튜터)', cat: 'edu', stat: 'cha', age: [9, 18], lines: ['동생이 구구단을 외웠다. "내가 가르쳤어!"', '공부방 아이들이 "선생님" 하고 따른다.'] },
  { label: '도서관 독서 동아리', cat: 'edu', stat: 'int', age: [7, 16], lines: ['한 달에 스무 권을 읽었다.', '직접 쓴 동화책을 도서관에 기증했다.'] },
  // 서비스·요식
  { label: '어린이 요리 교실', cat: 'service', stat: 'cha', age: [6, 14], cost: 20, lines: ['직접 만든 쿠키를 가족에게 대접했다.', '"셰프가 될 거야!" 앞치마를 벗지 않는다.'] },
  { label: '제과제빵 체험', cat: 'service', stat: 'cha', age: [9, 17], cost: 30, lines: ['케이크 시트가 폭신하게 부풀었다!', '빵집 사장님이 칭찬해 줬다.'] },
  { label: '헤어·메이크업 놀이', cat: 'service', stat: 'cha', age: [8, 17], cost: 10, lines: ['엄마 머리를 땋아 줬다. 제법이다.', '친구들 화장을 해 주며 인기 스타가 됐다.'] },
  { label: '여행 계획 짜기', cat: 'service', stat: 'int', age: [10, 17], lines: ['가족 여행 일정을 혼자 다 짰다. 가이드처럼 설명한다.', '세계 지도를 벽에 붙이고 가고 싶은 곳에 핀을 꽂는다.'] },
  // 기술·생산
  { label: '목공·만들기 공방', cat: 'trade', stat: 'str', age: [8, 17], cost: 30, lines: ['직접 만든 의자에 할머니가 앉으셨다.', '톱질이 제법이다. 손재주가 있다.'] },
  { label: '고장 난 가전 분해', cat: 'trade', stat: 'int', age: [9, 17], lines: ['고장 난 라디오를 고쳤다!', '드라이버 세트를 생일 선물로 받고 싶단다.'] },
  { label: '용접·전기 체험 (진로 캠프)', cat: 'trade', stat: 'str', age: [13, 18], lines: ['불꽃 튀는 용접이 멋있었단다.', '전기 회로를 연결해 전구를 켰다.'] },
  // 운송
  { label: '비행기 모형·드론', cat: 'transport', stat: 'int', age: [7, 16], cost: 30, lines: ['드론으로 동네를 찍었다. 파일럿이 꿈이 됐다.', '종이비행기 멀리 날리기 대회 1등.'] },
  { label: '기차·자동차 박물관', cat: 'transport', stat: 'int', age: [5, 12], lines: ['기관사 모자를 쓰고 사진을 찍었다.', '자동차 엔진 구조를 하루 종일 들여다봤다.'] },
  { label: '요트·카약 체험', cat: 'transport', stat: 'str', age: [10, 17], cost: 30, lines: ['바다가 좋아졌다. 선장이 되겠단다.', '노 젓는 팔이 단단해졌다.'] },
  // 미디어·예술
  { label: '유튜브 영상 만들기', cat: 'media', stat: 'cha', age: [9, 18], lines: ['편집한 브이로그가 조회수 1,000을 넘었다.', '자막 넣는 솜씨가 늘었다.'] },
  { label: '만화·웹툰 그리기', cat: 'media', stat: 'cha', age: [7, 17], cost: 10, lines: ['연습장이 만화로 가득하다. 친구들이 다음 편을 기다린다.', '웹툰 공모전에 냈다.'] },
  { label: '방송반·아나운서 놀이', cat: 'media', stat: 'cha', age: [10, 18], lines: ['교내 방송 진행을 맡았다. 목소리가 좋다는 말을 들었다.', '뉴스 앵커 흉내를 똑같이 낸다.'] },
  { label: '사진 동아리', cat: 'media', stat: 'cha', age: [11, 18], cost: 20, lines: ['찍은 사진이 학교 신문 표지에 실렸다.', '노을 사진을 찍으러 매일 옥상에 간다.'] },
  // 스포츠
  { label: '축구·야구 클럽', cat: 'sport', stat: 'str', age: [6, 16], cost: 20, lines: ['해트트릭! 코치가 눈여겨본다.', '매일 해 질 때까지 공을 찬다.'] },
  { label: '수영·태권도', cat: 'sport', stat: 'str', age: [5, 14], cost: 20, lines: ['자유형 25m 완주!', '품새 대회에서 메달을 땄다.'] },
  { label: 'e스포츠 동아리', cat: 'sport', stat: 'int', age: [12, 18], lines: ['학교 대표로 게임 대회에 나갔다.', '반응 속도가 남다르다는 말을 들었다.'] },
  // 장사·사업
  { label: '벼룩시장 장사', cat: 'biz', stat: 'cha', age: [7, 15], lines: ['안 쓰는 장난감을 팔아 3만 원을 벌었다. 흥정의 맛을 알았다.', '손님을 끄는 말솜씨가 있다.'] },
  { label: '어린이 창업 캠프', cat: 'biz', stat: 'int', age: [10, 17], cost: 20, lines: ['팀 아이템으로 "우산 대여 서비스"를 발표해 1등.', '사업계획서를 처음 써 봤다.'] },
  // 농림어업
  { label: '텃밭·곤충 기르기', cat: 'farm', stat: 'mor', age: [5, 12], lines: ['상추를 직접 길러 먹었다.', '장수풍뎅이 애벌레를 키워 성충으로 만들었다.'] },
  { label: '시골 농장 체험', cat: 'farm', stat: 'str', age: [7, 15], cost: 20, lines: ['소젖을 짰다! 흙냄새가 좋단다.', '딸기 수확 체험에서 한 바구니를 땄다.'] },
  { label: '낚시·바다 체험', cat: 'farm', stat: 'str', age: [8, 17], lines: ['우럭을 낚았다. 어부 할아버지가 칭찬했다.', '갯벌에서 조개를 한 바구니 캤다.'] },
  // ── 추가 취미 ──
  { label: '3D 프린터·메이커 교실', cat: 'tech', stat: 'int', age: [10, 18], cost: 30, lines: ['직접 설계한 폰 거치대를 뽑았다.', '고장 난 장난감 부품을 프린터로 만들어 끼웠다.'] },
  { label: '어린이 약사 체험', cat: 'medical', stat: 'int', age: [7, 12], lines: ['약봉투에 이름을 또박또박 썼다.', '"이 약은 식후 30분!" 제법 약사 같다.'] },
  { label: '치과 놀이·양치 교실', cat: 'medical', stat: 'mor', age: [5, 9], lines: ['인형 이빨을 하나하나 닦아 줬다.', '치과가 이제 안 무섭단다.'] },
  { label: '청소년 모의 법정', cat: 'legal', stat: 'cha', age: [13, 18], cost: 10, lines: ['판사 역을 맡아 판결문을 읽었다.', '반대 신문에서 증인을 흔들었다.'] },
  { label: '은행 견학·금융 교실', cat: 'office', stat: 'int', age: [8, 15], lines: ['금고 문이 이렇게 두꺼운 줄 몰랐다.', '복리 계산에 빠졌다.'] },
  { label: '어린이 기자단', cat: 'media', stat: 'cha', age: [10, 16], lines: ['구청장을 인터뷰했다! 기사가 소식지에 실렸다.', '취재 수첩이 빼곡하다.'] },
  { label: '우주소년단·군사 체험', cat: 'public', stat: 'str', age: [9, 15], cost: 20, lines: ['전투식량을 먹어 봤다. 맛있단다.', '제식 훈련에서 칭찬받았다.'] },
  { label: '어린이 사서 체험', cat: 'edu', stat: 'int', age: [8, 14], lines: ['도서관 책을 분류 번호대로 꽂았다.', '동생들에게 동화를 읽어 줬다.'] },
  { label: '꽃꽂이·플라워 클래스', cat: 'service', stat: 'cha', age: [8, 17], cost: 20, lines: ['엄마에게 꽃다발을 만들어 드렸다.', '색 조합 감각이 좋다는 칭찬.'] },
  { label: '반려동물 미용 체험', cat: 'service', stat: 'cha', age: [9, 17], cost: 20, lines: ['강아지 발톱을 떨지 않고 잘랐다.', '푸들 털을 곰돌이 모양으로 다듬었다.'] },
  { label: '자동차 정비 체험', cat: 'trade', stat: 'str', age: [11, 18], cost: 10, lines: ['타이어를 직접 갈아 봤다. 손에 기름때가 훈장 같다.', '엔진 소리만 듣고 차종을 맞힌다.'] },
  { label: '레고 테크닉 크레인', cat: 'trade', stat: 'int', age: [8, 14], cost: 30, lines: ['크레인이 진짜로 물건을 들어 올렸다.', '설명서보다 튼튼하게 개조했다.'] },
  { label: '해양소년단 (보트·항해)', cat: 'transport', stat: 'str', age: [10, 17], cost: 20, lines: ['돛을 올리고 직접 방향을 잡았다.', '매듭 스무 가지를 외웠다.'] },
  { label: '지하철 노선도 외우기', cat: 'transport', stat: 'int', age: [6, 12], lines: ['서울 지하철역을 전부 외웠다. 역무원이 놀랐다.', '버스 노선을 줄줄 꿴다.'] },
  { label: '연극·뮤지컬 교실', cat: 'media', stat: 'cha', age: [8, 17], cost: 30, lines: ['주인공을 맡았다! 커튼콜에서 울었다.', '무대 위에선 딴사람이 된다.'] },
  { label: '댄스 학원', cat: 'media', stat: 'str', age: [9, 18], cost: 30, lines: ['아이돌 안무를 완벽하게 땄다.', '학교 축제 무대에 섰다.'] },
  { label: '클라이밍·등산', cat: 'sport', stat: 'str', age: [8, 18], cost: 20, lines: ['벽 꼭대기 종을 쳤다!', '산 정상에서 "야호"를 외쳤다.'] },
  { label: '바둑·체스', cat: 'tech', stat: 'int', age: [6, 16], cost: 10, lines: ['급수를 따서 아마 3단이 됐다.', '어른을 이겼다. 수읽기가 깊다.'] },
  { label: '떡볶이 장사 체험 (알뜰 시장)', cat: 'biz', stat: 'cha', age: [10, 17], cost: 10, lines: ['원가 계산을 해 보니 이익이 남았다!', '줄이 길게 섰다. 장사 체질이다.'] },
  { label: '양봉·버섯 농장 체험', cat: 'farm', stat: 'mor', age: [8, 16], cost: 10, lines: ['벌에 한 방 쏘였지만 꿀맛은 최고였다.', '표고버섯이 자라는 걸 신기해했다.'] },
];

/** 이 나이에 해 볼 만한 취미 4가지 (이미 좋아하는 쪽이 조금 더 자주) */
function hobbyChoices(s: GameState, p: Person): Hobby[] {
  const a = age(s, p);
  const pool = HOBBIES.filter((h) => a >= h.age[0] && a <= h.age[1]);
  const tops = topInterests(p, 2, 1);
  const fits = fitCats(p, 3);
  const out: Hobby[] = [];
  const favored = pool.filter((h) => tops.includes(h.cat));
  if (favored.length && chance(s, 0.7)) out.push(pick(s, favored));
  // 성향에 맞는 것 두 개는 꼭 (다른 분야로)
  for (const cat of fits) {
    if (out.filter((h) => fits.includes(h.cat)).length >= 2) break;
    const c = pool.filter((h) => h.cat === cat && !out.some((o) => o.cat === cat));
    if (c.length) out.push(pick(s, c));
  }
  while (out.length < 4 && out.length < pool.length) {
    const h = pick(s, pool);
    if (!out.includes(h) && !out.some((o) => o.cat === h.cat)) out.push(h);
  }
  return out;
}

export const HOBBY_EVENT: EventDef = {
  id: 'hobby',
  title: (c) => `${c.p.name}의 관심사`,
  text: (c) => {
    c.ev.data ??= { opts: hobbyChoices(c.s, c.p).map((h) => HOBBIES.indexOf(h)) };
    const tops = topInterests(c.p, 2);
    return (
      `${fullName(c.p)}(${age(c.s, c.p)}세)이(가) 요즘 이것저것 해 보고 싶어 한다. 어떤 걸 시켜 볼까?` +
      `\n${temperamentLine(c.p)}` +
      (tops.length ? `\n지금까지 쌓인 관심: ${tops.map((k) => JOB_CATS[k]).join(', ')}` : '\n아직 뭘 좋아하는지 모르겠다. 이것저것 해 보면 알게 된다.') +
      '\n(★ 성향에 맞는 활동은 관심이 빨리 자라고 아이도 즐거워한다. 쌓인 관심이 나중에 그 분야 직업으로 가는 길이 된다)'
    );
  },
  choices: (c) => {
    const opts: number[] = c.ev.data?.opts ?? [];
    const fits = fitCats(c.p, 3);
    const out: Choice[] = opts.map((i) => {
      const h = HOBBIES[i];
      const fit = fits.includes(h.cat);
      return {
        label: `${fit ? '★ ' : ''}${h.label} ${JOB_CATS[h.cat].split(' ')[0]}`,
        cost: h.cost,
        run: (x: Ctx) => {
          // 성향에 맞으면 푹 빠지고, 안 맞으면 시큰둥
          mark(x.p, 'i:' + h.cat, fit ? 3 : 1);
          const d = grow(x.s, x.p, h.stat, fit ? (chance(x.s, 0.6) ? 'good' : 'meh') : 'meh');
          x.p.happiness = clamp(x.p.happiness + (fit ? 8 : 1), 0, 100);
          const t = x.p.talents.find((t) => !t.discovered && TALENTS[t.id].stat === h.stat);
          let tail = fit ? ' 시간 가는 줄 모른다. 딱 맞는 옷을 입은 것 같다.' : chance(x.s, 0.5) ? ' …그런데 영 재미없어한다. 억지로 다니는 눈치다.' : '';
          if (t && chance(x.s, fit ? 0.35 : 0.1)) {
            discoverTalent(x.p, t.id);
            tail = ` ✨ [${TALENTS[t.id].name}] 재능이 보인다!`;
          }
          const lvl = interestLevel(x.p, h.cat);
          return `${pick(x.s, h.lines)}${tail}\n(${JOB_CATS[h.cat]} 관심 ${'●'.repeat(Math.min(5, Math.ceil(lvl / 2)))}${d ? ` · 능력치 +${d}` : ''})`;
        },
      };
    });
    out.push({ label: '그냥 실컷 놀게 둔다', run: (x) => ((x.p.happiness = clamp(x.p.happiness + 8, 0, 100)), '놀이터에서 해가 질 때까지 놀았다. 이것도 다 크는 거다.') });
    return out;
  },
};

/** 관심사에 맞는 구체적인 장래희망 */
export const INTEREST_DREAMS: Record<Interest, string[]> = {
  tech: ['게임 개발자가 돼서 내가 만든 게임을 전 세계가 하게 할 거야!', '로봇 공학자가 될 거야!', '우주선을 만드는 엔지니어가 되고 싶어!', '반도체 박사가 될래!'],
  medical: ['수의사가 돼서 아픈 동물을 고쳐 줄 거야!', '간호사가 돼서 아픈 사람을 돌볼래!', '약사가 되고 싶어!', '응급구조사가 될 거야!'],
  legal: ['변호사가 돼서 억울한 사람을 도울 거야!', '회계사가 되고 싶어! 숫자가 좋아.', '변리사가 뭔지는 모르지만 멋있어!'],
  office: ['은행원이 될래!', '큰 회사에서 일하는 멋진 직장인이 될 거야!', '증권 분석가가 되고 싶어!'],
  public: ['소방관이 돼서 불을 끌 거야!', '경찰관이 될 거야!', '외교관이 돼서 세계를 다닐래!', '우체국에서 편지를 배달할래!'],
  edu: ['선생님이 될 거야!', '유치원 선생님이 되고 싶어!', '도서관 사서가 될래! 책이 좋아.'],
  service: ['요리사가 돼서 내 식당을 차릴 거야!', '파티시에가 될래!', '미용사가 되고 싶어!', '호텔리어가 될 거야!', '승무원이 돼서 하늘을 날래!'],
  trade: ['자동차 정비사가 될 거야!', '목수가 돼서 집을 지을래!', '전기 기사가 되고 싶어!', '배 만드는 사람이 될래!'],
  transport: ['비행기 조종사가 될 거야!', '기차 기관사가 되고 싶어!', '배 선장이 될래!', '버스 기사님이 멋있어!'],
  media: ['웹툰 작가가 될 거야!', '유튜버가 될래!', 'PD가 돼서 예능을 만들 거야!', '사진작가가 되고 싶어!', '아나운서가 될래!'],
  sport: ['축구 국가대표가 될 거야!', '프로게이머가 될래!', '수영 선수가 되고 싶어!', '헬스 트레이너가 될 거야!'],
  biz: ['사장님이 될 거야!', '카페 사장님이 되고 싶어!', '회사를 차려서 부자가 될래!', '쇼핑몰 대표가 될 거야!'],
  farm: ['스마트팜 농부가 될래!', '어부가 돼서 큰 물고기를 잡을 거야!', '목장 주인이 되고 싶어!'],
};

/** 장래희망 한마디: 관심사가 뚜렷하면 구체적인 직업으로 */
export function dreamQuote(s: GameState, p: Person): string | undefined {
  const [top] = topInterests(p, 1, 3);
  if (!top) return undefined;
  const list = INTEREST_DREAMS[top].filter((q) => !anachronistic(s, q));
  return list.length ? pick(s, list) : undefined;
}

/** 첫 직장 가산점: 어릴 때부터 키운 관심 분야면 (최대 +10) */
export const interestBonus = (p: Person, cat: string) => Math.min(10, interestLevel(p, cat) * 1.5);

/** 몇 살에 취미 고르기가 오나 */
export const HOBBY_AGES = [6, 9, 13, 15];

export const interestSummary = (p: Person) => topInterests(p, 3).map((k) => `${JOB_CATS[k]} ${'●'.repeat(Math.min(5, Math.ceil(interestLevel(p, k) / 2)))}`).join(' · ');
