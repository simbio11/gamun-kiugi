// 근현대사 모드 콘텐츠 팩: 현대 모드는 건드리지 않고, 1960~2025년에는
//  1) 그 시절에 없던 물건·제도·말이 들어간 이야기와 선택지를 걸러내고 (ANACHRO)
//  2) 시대에 맞는 말로 바꾸고 (초등학교 → 국민학교, 소개팅 → 맞선, 편의점 → 구멍가게 …)
//  3) 유치원·입학·학년·진학 같은 뼈대 사건은 그 시절 판으로 갈아 끼우고 (HIST_OVERRIDES)
//  4) 그 시절의 삶(연탄·통금·채변 봉투·계모임·다방·삐삐 …)을 이야기와 행동으로 채운다.

import { chance, pick } from './rng';
import { gate, iga, type Choice, type Ctx, type EventDef } from './ev-util';
import { addFlag, age, alive, check, clamp, fullName, hasFlag, householder, mark, parentsOf } from './people';
import { wageIndex } from './pay';
import { homeOf } from './housing';
import { formatWon, isNominal, setMoneyYear } from './economy';
import type { GameState, Person } from './types';
import type { Story } from './stories';
import type { ActionDef } from './actions';

export const inHistory = (s: GameState) => s.era === 'history' && s.year <= 2025;
/** 인자로 게임 상태를 못 받는 곳(성향 문구 등)을 위해 지금 게임을 기억해 둔다 */
let CUR: GameState | undefined;
export const setHistCur = (s: GameState) => (CUR = s);
export const histCur = () => (CUR && inHistory(CUR) ? CUR : undefined);
const wi = (s: GameState) => wageIndex(s.year);

// ───────────────────────── 1) 없던 것들 (등장 연도) ─────────────────────────

/** [낱말, 처음 등장·보급된 해] — 이 해 전에는 이 말이 들어간 이야기·선택지를 띄우지 않는다 */
const ANACHRO: [string, number][] = [
  ['스마트폰', 2009], ['휴대폰', 1997], ['핸드폰', 1997], ['카톡', 2010], ['카카오', 2010], ['단톡', 2012], ['유튜브', 2008], ['유튜버', 2008],
  ['인스타', 2012], ['페이스북', 2009], ['SNS', 2009], ['틱톡', 2018], ['넷플릭스', 2016], ['OTT', 2016], ['인터넷', 1995], ['온라인', 1997],
  ['이메일', 1997], ['블로그', 2004], ['싸이월드', 2001], ['PC방', 1998], ['컴퓨터', 1985], ['노트북', 1995], ['태블릿', 2011], ['코딩', 2015],
  ['인강', 2003], ['배달앱', 2012], [' 앱', 2010], ['코인', 2014], ['비트코인', 2014], ['가상화폐', 2014], ['로또', 2002], ['네이버', 1999],
  ['AI', 2016], ['인공지능', 2016], ['메타버스', 2021], ['전기차', 2017], ['내비', 2003], ['블랙박스', 2010], ['KTX', 2004], ['해외여행', 1989],
  ['발리', 1995], ['몰디브', 2005], ['괌', 1995], ['어학연수', 1990], ['워킹홀리데이', 1995], ['스타벅스', 1999], ['브런치', 2005], ['마라탕', 2017],
  ['노래방', 1991], ['찜질방', 1995], ['필라테스', 2005], ['요가', 1995], ['명품', 1990], ['영끌', 2020], ['갭투자', 2015], ['대치동', 1985],
  ['영어유치원', 2000], ['국제학교', 1998], ['대안학교', 1997], ['특목고', 1984], ['외고', 1984], ['과학고', 1983], ['영재고', 2003], ['자사고', 2002],
  ['국제중', 2009], ['마이스터고', 2010], ['특성화고', 1998], ['자유학년', 2016], ['자유학기', 2016], ['수시', 1996], ['학종', 2014], ['생기부', 1996],
  ['세특', 2011], ['내신', 1981], ['선행', 1990], ['EBS', 1990], ['토익', 1982], ['벤처', 1996], ['스타트업', 2000], ['워라밸', 2015],
  ['육아휴직', 2001], ['경단녀', 2010], ['맘카페', 2005], ['딩크', 1995], ['데이팅', 2014], ['결혼정보회사', 1990], ['스드메', 2005], ['웨딩플래너', 1995],
  ['아이돌', 1996], ['K팝', 2000], ['연습생', 1996], ['웹툰', 2003], ['웹소설', 2013], ['코로나', 2020], ['비대면', 2020], ['재택', 2020],
  ['메르스', 2015], ['미세먼지', 2013], ['미투', 2018], ['갑질', 2013], ['꼰대', 2015], ['MZ', 2021], ['중2병', 2010], ['헬조선', 2015],
  ['흙수저', 2015], ['금수저', 2015], ['오디션', 2009], ['크리에이터', 2015], ['인플루언서', 2016], ['구독자', 2010], ['라이브 방송', 2010],
  ['쇼핑몰', 1998], ['쿠팡', 2014], ['당근', 2016], ['전동킥보드', 2018], ['라이더', 2012], ['게임', 1983], ['영재원', 2002], ['청약', 1977],
  ['신용카드', 1985], ['카드값', 1985], ['오피스텔', 1985], ['신도시', 1989], ['주담대', 1995], ['전세대출', 1990], ['헬스', 1985], ['프랜차이즈', 1990],
  ['스마트팜', 2015], ['로봇', 1985], ['반도체', 1983], ['프로게이머', 2000], ['우주 정거장', 1998], ['데이터', 2012], ['NCS', 2015], ['주택청약종합저축', 2009], ['계약갱신청구권', 2020], ['다이렉트', 2005], ['모발이식', 2000], ['탈모약', 1998], ['공기청정기', 2005],
  ['키오스크', 2015], ['파워포인트', 1995], ['탈색', 1995], ['패딩', 2010], ['타투', 2005], ['레모네이드', 2005], ['주말농장', 1995], ['캐릭터', 1990],
  ['키즈', 2005], ['룸메이트', 1995], ['번아웃', 2010], ['조용한 퇴사', 2022], ['전세보증보험', 2013], ['동호회', 1990], ['배낭여행', 1989], ['국토대장정', 1998],
  ['이석증', 2000], ['MRI', 1990], ['실손', 2003], ['헌혈의 집', 1990], ['구립 도서관', 1990], ['독서실', 1978], ['13월의 월급', 2000], ['슈퍼', 1971],
  ['공시생', 2000], ['취준', 2000], ['스펙', 2005], ['펫', 2005], ['반려', 2010], ['캠핑카', 2010], ['골프', 1975], ['미국 주식', 2019], ['ETF', 2002],
  ['세종', 2012], ['판교', 2008], ['송도', 2009], ['동탄', 2008], ['분당', 1991], ['일산', 1992], ['목동', 1986], ['강남', 1975], ['잠실', 1976],
  ['지하철', 1974], ['고속도로', 1970], ['아파트', 1962], ['콘도', 1981], ['렌터카', 1990], ['수입차', 1988], ['대형마트', 1996], ['백화점 VIP', 1990],
  ['로스쿨', 2009], ['의전원', 2005], ['공무원 시험', 1960], ['코스닥', 1996], ['펀드', 1998], ['연금저축', 1994], ['국민연금', 1988], ['기초연금', 2014],
  ['박물관 야간', 2008], ['어린이 은행', 2000], ['스포츠 캠프', 2000], ['원데이', 2010], ['바리스타', 2000], ['드론', 2014], ['베란다 텃밭', 2005],
  ['중고거래', 2005], ['청소년 의회', 2005], ['MBTI', 2018], ['적성 검사', 1985], ['연구실 탐방', 2005], ['서포터즈', 2005], ['박람회', 1995],
  ['인턴', 1998], ['청년도약', 2023], ['전산세무', 1997], ['해외 봉사', 1995], ['집중 과정', 1995], ['경진대회', 2000], ['아트페어', 1995],
  ['자소서', 1995], ['걷기 대회', 2000], ['대부업', 2002], ['탐구 보고서', 2000], ['스피치', 2000], ['모의투자', 2000], ['스터디', 1995],
  ['문화센터', 1985], ['직업 인터뷰', 2005], ['공인중개사', 1985], ['버킷리스트', 2008], ['유학원', 1990], ['봉사단', 1995], ['캠프', 1995],
  ['포트폴리오', 1995], ['네트워킹', 2000], ['멘토', 2000], ['창업', 1995], ['플랫폼', 2010], ['구독', 2010], ['리모델링', 1995],
  ['층간소음', 2005], ['CJ대한통운', 2011], ['링크', 2010], ['han.gl', 2012], ['택배', 1992], ['배달', 1990], ['치킨', 1980], ['피자', 1985], ['햄버거', 1979], ['편의점 알바', 1989],
];

/** 이 글에 그 해에 없던 것이 들어 있나 */
export function anachronistic(s: GameState, text: string): boolean {
  if (!inHistory(s)) return false;
  for (const [k, y] of ANACHRO) if (s.year < y && text.includes(k)) return true;
  return false;
}

/**
 * 2000년 전에는 어느 시대에나 있을 법한 이야기만 쓴다 (나머지 현대 이야기는 2000년부터).
 * 소나기·첫눈·곤충 채집·김장·동창회·명절 잔소리·부모님 입원·가족사진·훈련소 …
 */
export const TIMELESS = new Set([
  'm_bug', 'm_nightmare', 'm_drawing_wall', 'm_bike', 'm_lie', 'm_pet_fish', 'm_snow', 'm_friend_moved', 'm_dentist', 'm_school_play', 'm_stray_cat',
  'm_grades_hidden', 'm_first_love_kid', 'm_lost_item', 'm_voice_change', 'lost_tooth', 'rain_umbrella', 'field_trip', 'class_pet', 'sleepover',
  's_new_student', 's_flu_wave', 's_bike_stolen', 's_rich_friend', 'l3_birthday_gift', 'l3_homework_help', 'l2_sibling_fight', 'l2_piggy_bank',
  'l2_first_sleepover', 'hand_me_down', 't_shy_present', 't_leader_team', 't_rebel_rules', 't_diligent_burnout', 't_lazy_dream', 't_anxious_exam',
  't_cheerful_fail', 't_filial_care', 't_frugal_saver', 't_tough_energy', 't_frail_hobby', 't_ambitious_goal', 't_devoted_pet', 't_flirt_popular',
  't_dream_return', 't_kid_same_path', 't_second_career', 'x_grandparents_farm', 'x_lost_wallet', 'm_lost_wallet_self', 'm_stranger_help', 'm_rainbow',
  'school_trip', 'teen_love', 'rebel_night', 's_caught_drinking', 's_runaway_friend', 's_confession', 's_exam_leak', 'm_school_festival', 's_motorbike',
  'hospital_night', 'reunion', 'parents_nag', 'parent_hospital', 'neighbor_kimchi', 'kid_graduation', 'anniv_forget', 'inlaw_holiday', 'power_outage',
  'old_classmate_money', 'friend_repay', 'm_kid_sick_night', 'm_parents_day', 'm_couple_fight', 'm_family_photo', 'm_reading_glasses', 'm_hiking_club',
  'm_old_photos', 'm_senior_romance', 's_old_teacher', 's_parent_collapse', 's_flood', 's_old_flame', 's_fall', 's_late_love', 's_hidden_cash', 's_lonely',
  's_burglary', 's_company_bankrupt', 's_whistle', 's_land_compensation', 's_found_wallet_mid', 'l2_inlaw_holiday', 'l2_inlaw_money', 'l2_inlaw_repay',
  'l2_second_child', 'l2_sibling_inherit', 'l2_midlife', 'l2_old_friend_death', 'l2_grandkid_care', 'l2_will_talk', 'l2_dementia_scare', 'l3_inlaw_visit',
  'l3_parents_move', 'l3_grandkid_name', 'l3_lost_child', 'l3_election_help', 'l3_kid_bully_victim', 'old_friend_dies', 'grandkid_visit', 'thank_letter',
  'student_letter', 'boot_camp', 'army_vacation', 'senior_bully', 'l2_military_reserve', 'sp_ancestor_land', 'sp_hero', 'sp_genealogy', 'sp_family_motto',
  'sp_relic', 'sp_survivor', 'sg_hidden1', 'sg_hidden2', 'sg_hidden3', 'sg_redev1', 'sg_redev2', 'sg_redev3', 'sg_redev_done', 'sg_farm1', 'sg_farm2', 'sg_farm3',
  'sg_pat1', 'sg_pat2', 'sg_pat3', 'c_med_repeat', 'c_trade_accident', 'c_trade_union', 'c_public_complaint', 'c_farm_weather', 'c_uniform_rescue', 'cadaver',
  'med_fail', 'med_volunteer', 'specialty', 'night_duty', 'malpractice', 'open_clinic', 'acupuncture', 'herb_garden', 'kmd_clinic', 'moot_court', 'first_case',
  'bribe', 'teaching_practice', 'national_team', 'sports_injury', 'civil_complaint', 'disaster_call', 'rural_clinic', 'sport_scout', 'academy_discipline',
  'public_transfer', 'fire_trauma', 'owner_rent', 'owner_staff', 'farm_weather', 'farm_direct', 'transport_accident', 'service_customer', 'reading_award',
  'santa', 'errand', 'smoking', 'hero', 'blood_donation', 'm_science_kit', 'x_volunteer_briquette', 'x_typhoon', 'x_heatwave', 'heat_wave', 'x_election_volunteer',
]);

// ───────────────────────── 2) 시대말로 바꾸기 ─────────────────────────

/** [현대말, 그 시절 말, 이 해 전까지] */
const WORDS: [string, string, number][] = [
  ['초등학교', '국민학교', 1996], ['초등학생', '국민학생', 1996], ['초등', '국민학교 ', 1996], ['초1', '국민학교 1학년', 1996],
  ['어린이집', '탁아소', 1991], ['편의점', '구멍가게', 1989], ['카페', '다방', 1995], ['원룸', '셋방', 1990], ['빌라', '연립주택', 1988],
  ['휴대폰에 전 애인의 메시지가 왔다', '집 전화가 울렸다. 전 애인이다', 1997], ['투표하고 인증샷', '투표하고 온다', 2010],
  ['손등에 도장 인증샷을 올렸다', '손등에 찍힌 도장을 보며 뿌듯해했다', 2010], ['인증샷이 SNS에 올라왔다', '두고두고 자랑했다', 2010],
  ['공항에서 인증샷을 올렸', '기념사진을 잔뜩 찍었', 2010], ['인증샷', '기념사진', 2010], ['투룸', '방 두 칸', 2000],
  ['미성년 자녀는 10년간 2,000만 원까지 증여세가 없다.', '통장은 아이 이름으로 만들어 둔다.', 2014], ['마이너스 통장', '급전', 1995],
  ['소개팅 앱에서', '미팅에서', 2012], ['만나면 휴대폰만 본다', '만나도 딴생각만 한다', 1997],
  ['의 휴대폰에 낯선 이름이 자주 뜬다', '의 옷에서 낯선 다방 성냥갑이 자꾸 나온다', 1997], ['의 휴대폰에서 낯선 이름의 메시지가 발견됐다', '의 양복 주머니에서 낯선 사람의 편지가 발견됐다', 1997],
  ['사과 문자를 보냈다', '사과 편지를 썼다', 1998], ['SNS에 뜬 사진 한 장.', '동창회에서 들은 소식.', 2009], ['휴대폰을 뺏고', '용돈을 끊고', 1997],
  ['대치동 학원가', '종로 학원가', 1985], ['지방 아파트 단지', '지방 주택가', 1985], ['수도권 아파트 단지', '수도권 주택가', 1985], ['반지하 동네', '달동네', 1985],
  ['에어컨', '선풍기', 1988], ['대박이야', '떼돈 번다', 2000], ['체당금 신청하고', '노동청에 진정 넣고', 1998], ['모둠 과제', '분단 숙제', 1995],
  ['초등학생', '국민학생', 1996], ['사립초', '사립 국민학교', 1996], ['적립식 ETF', '적립식 주식', 2002], ['지수 ETF', '우량주', 2002], ['명의 ETF', '명의 주식', 2002],
  ['비과세 한도 2,000만 원을 한 번에 넣어 둔다', '목돈을 아이 이름으로 한 번에 넣어 둔다', 2014], [' (10년 뒤 또 2,000만 원까지 비과세)', '', 2014], ['청약통장과 적금', '적금 통장', 1977], ['청약통장 + 적금', '적금 통장', 1977], ['웹툰·웹소설 작가', '만화가', 2003], ['스몰 웨딩', '조촐한 예식', 2005], ['소개팅', '맞선', 1985], ['치킨집', '통닭집', 1985], ['알바', '아르바이트', 1995], ['마트', '시장', 1993], ['반려견', '강아지', 2010],
  ['반려동물', '애완동물', 2010], ['워킹맘', '맞벌이 엄마', 2000], ['비혼', '독신', 2010], ['헬스장', '체육관', 1990], ['학원 셔틀', '학원 봉고차', 2000],
  ['단톡방', '반상회', 2012], ['키즈카페', '놀이방', 2005], ['요양원', '양로원', 2008], ['요양보호사', '간병인', 2008], ['동아리', '서클', 1985], ['택시 앱', '택시', 2015], ['문자', '편지', 1997], ['전화해', '편지해', 1975], ['사교육', '과외', 1990], ['공무원 시험', '공무원 채용 시험', 1990],
];
/** 바꾼 낱말 뒤의 조사를 받침에 맞춘다 (다방가 → 다방이, 예비고사과 → 예비고사와) */
function josa(t: string, word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return t;
  const bat = code % 28 !== 0;
  const rieul = code % 28 === 8;
  const pairs: [string, string][] = [['이', '가'], ['을', '를'], ['은', '는'], ['과', '와']];
  let out = t;
  for (const [a, b] of pairs) {
    const want = bat ? a : b;
    const wrong = bat ? b : a;
    out = out.replace(new RegExp(word + wrong + '(?![가-힣])', 'g'), word + want);
  }
  out = out.replace(new RegExp(word + (bat && !rieul ? '로(?![가-힣])' : '으로'), 'g'), word + (bat && !rieul ? '으로' : '로'));
  return out;
}
/** 먼 미래의 말: [지금 말, 그때 말, 이 해부터] — 2040년 이후 이야기 속 물건이 그 시대 것으로 바뀐다 (게임 속 상상) */
const FUTURE_WORDS: [string, string, number][] = [
  ['스마트폰', 'AR 글래스', 2050], ['PC방', 'VR방', 2040], ['유튜버', '홀로 크리에이터', 2060], ['유튜브', '홀로튜브', 2060], ['인스타', '피드', 2050],
  ['카톡', '메신저', 2045], ['단톡방', '가족 채널', 2045], ['인강', 'AI 과외', 2045], ['노트북', '공간 컴퓨터', 2055], ['배달 라이더', '배달 드론', 2050],
  ['택시', '로보택시', 2050], ['운전면허', '수동 운전 면허', 2055], ['편의점 알바', '무인점포 관리', 2055], ['키오스크', '홀로 안내원', 2060],
  ['휴대폰', '글래스', 2055], ['대치동 학원가', 'AI 학습 특구', 2070], ['반지하 동네', '저지대 동네', 2060], ['수능', '국가 역량 평가', 2070], ['수능까지', '역량 평가까지', 2070], ['문자', '뉴럴 메시지', 2070], ['영상통화', '홀로그램 통화', 2060], ['TV', '벽 스크린', 2045], ['넷플릭스', '몰입형 드라마', 2055],
];
function futurize(year: number, text: string): string {
  let t = text;
  for (const [a, b, y] of FUTURE_WORDS)
    if (year >= y && t.includes(a)) {
      t = t.split(a).join(b);
      t = josa(t, b);
    }
  return t;
}

/** 글 속 "50만 원" 같은 금액은 2025년 돈으로 쓰였으니 그해 물가로 바꿔 보여 준다.
 *  k: 그 사건 비용에 곱해지는 배율(근현대사 이야기는 그 시절 소득 수준) · 0이면 그 시절 돈으로 이미 쓴 글 */
function inflate(text: string, k: number): string {
  if (!isNominal() || k === 0) return text;
  return text.replace(/(\d[\d,]*(?:\.\d+)?)(천만|만|억) ?원/g, (_m, n: string, u: string) => {
    const v = parseFloat(n.replace(/,/g, '')) * (u === '억' ? 10000 : u === '천만' ? 1000 : 1);
    return formatWon(v * k);
  });
}

export function periodize(s: GameState, text: string, k = 1): string {
  if (!text) return text;
  setMoneyYear(s.year);
  if (s.year > 2025) text = inflate(text, k === 0 ? 1 : k);
  if (s.year >= 2040) return futurize(s.year, text);
  if (!inHistory(s)) return text;
  let t = text;
  for (const [a, b, y] of WORDS)
    if (s.year < y && t.includes(a)) {
      t = t.split(a).join(b);
      t = josa(t, b.trim());
    }
  if (s.year < 2025) t = inflate(t, k);
  // 개인 신용점수(CB)는 2002년 신용평가사가 생기고 나서야 매겨졌다
  if (s.year < 2002) t = t.replace(/신용점수 \d+ \([^)]*\) · /g, '').replace(/ ?\(신용점수 \d+\)/g, '').replace(/\n?신용점수 \d+[^\n]*/g, '');
  if (s.year < 1994 && t.includes('수능')) {
    const exam = s.year < 1969 ? '본고사' : s.year < 1982 ? '예비고사' : '학력고사';
    t = josa(t.split('수능').join(exam), exam);
  }
  return t;
}

// ───────────────────────── 3) 뼈대 사건의 그 시절 판 ─────────────────────────

const up = (p: Person, k: 'str' | 'int' | 'cha' | 'mor' | 'hp', n: number) => (p.actual[k] = clamp(p.actual[k] + n, 0, Math.max(p.potential[k], p.actual[k])));
const hap = (p: Person, n: number) => (p.happiness = clamp(p.happiness + n, 0, 100));
const poor = (s: GameState) => s.origin === 'poor';
const rich = (s: GameState) => s.origin === 'rich';
const rural = (s: GameState, p: Person) => parentsOf(s, p).some((q) => q.job === 'farmer' || q.job === 'fisher');

/** 다섯 살: 1960~70년대엔 유치원이 귀했다 (1970년 취원율 2%대, 1980년대 들어 크게 는다) */
const kinder: EventDef = {
  id: 'kinder',
  title: (c) => (c.s.year < 1980 ? '다섯 살의 하루' : '유치원'),
  text: (c) =>
    c.s.year < 1980
      ? `${iga(fullName(c.p))} 다섯 살. 동네 아이들은 대부분 골목에서 해가 질 때까지 논다. 유치원은 잘사는 집 아이들이나 가는 곳이다 (유치원 취원율 2%대).`
      : `${iga(fullName(c.p))} 다섯 살. 요즘은 동네마다 유치원과 속셈학원이 생겼다.`,
  choices: (c) =>
    gate(
      c.s,
      c.s.year < 1980
        ? [
            { label: '골목대장으로 키운다 (딱지·구슬·자치기)', run: (x) => (up(x.p, 'str', 3), hap(x.p, 8), mark(x.p, 'network'), '해 질 녘 "밥 먹어라!" 소리가 날 때까지 뛰어논다. 무릎이 성할 날이 없다.') },
            ...(rural(c.s, c.p) ? [{ label: '서당 훈장님께 천자문을 배운다', cost: Math.round(40 * wi(c.s)), run: (x: Ctx) => (up(x.p, 'int', 3), up(x.p, 'mor', 2), '"하늘 천, 따 지…" 목청껏 따라 읽는다. 동네 어른들이 신동이라 한다.') }] : []),
            { label: '교회 부속 유치원에 보낸다', cost: Math.round(300 * wi(c.s)), run: (x) => (addFlag(x.p, 'kinder_church'), up(x.p, 'cha', 3), '노란 원복을 입고 율동을 배운다. 동네에서 드문 일이라 사진관에서 사진도 찍었다.') },
            { label: '엄마가 한글을 가르친다', run: (x) => (up(x.p, 'int', 2), (x.p.affinity = clamp(x.p.affinity + 10, -100, 100)), '밥상머리에서 신문 제목을 더듬더듬 읽는다. "가, 갸, 거, 겨…"') },
          ]
        : [
            { label: '동네 유치원', cost: Math.round(400 * wi(c.s)), run: (x) => (up(x.p, 'cha', 2), '재롱잔치에서 부채춤을 췄다.') },
            { label: '속셈·피아노 학원까지', cost: Math.round(900 * wi(c.s)), run: (x) => (up(x.p, 'int', 3), hap(x.p, -3), '체르니 100번을 친다. 손가락에 굳은살이 박였다.') },
            { label: '집에서 키운다', run: (x) => ((x.p.affinity = clamp(x.p.affinity + 10, -100, 100)), hap(x.p, 8), '엄마 곁에서 뽀뽀뽀를 보며 자란다.') },
          ],
    ),
};

/** 여덟 살: 국민학교 입학 (1960~70년대 콩나물 교실·2부제 수업) */
const elementary: EventDef = {
  id: 'elementary',
  title: () => '국민학교 입학',
  text: (c) =>
    `${iga(fullName(c.p))} 여덟 살. 가슴에 손수건을 달고 국민학교에 들어간다.` +
    (c.s.year < 1980 ? '\n한 반에 70~80명, 교실이 모자라 오전·오후반으로 나눠 수업한다 (콩나물 교실).' : '\n한 반에 50명 남짓. 교실마다 태극기와 급훈이 걸려 있다.'),
  choices: (c) =>
    gate(c.s, [
      { label: '동네 국민학교', run: (x) => (addFlag(x.p, 'elem_public'), '책보를 허리에 매고 학교에 간다. 입학식 날 짜장면을 먹었다.') },
      {
        label: '사립 국민학교',
        cost: Math.round(2500 * wi(c.s)),
        req: ['집안 형편'],
        disabled: poor(c.s),
        run: (x) => (addFlag(x.p, 'elem_private'), '빳빳한 교복에 모자까지 쓴 모습이 제법 의젓하다. 동네 아이들이 부러워한다.'),
      },
      ...(rural(c.s, c.p) ? [{ label: '시골 분교 (한 학년 한 반)', run: (x: Ctx) => (addFlag(x.p, 'elem_public'), up(x.p, 'str', 2), hap(x.p, 6), '산 넘어 십 리 길을 걸어 다닌다. 선생님이 온 학년을 다 가르친다.') }] : []),
    ]),
};

/** 중학교: 1968년까지 입학시험 (경기중·서울중·경복중 …), 1969년부터 추첨 배정 */
const middle: EventDef = {
  id: 'middle',
  title: (c) => (c.s.year < 1969 ? '중학교 입학시험' : '중학교 진학'),
  text: (c) =>
    c.s.year < 1969
      ? `${iga(fullName(c.p))} 국민학교 6학년. 명문 중학교 입시가 코앞이다. "무즙 파동"(1964) 이후로 한 문제에 당락이 갈린다며 학부모들이 난리다.\n가난한 집 아이들은 중학교 대신 공장이나 가게 점원으로 간다 (중학교 진학률 60% 안팎).`
      : `${iga(fullName(c.p))} 중학생이 된다. 1969년부터 중학교는 추첨("뺑뺑이")으로 간다. 까까머리에 검정 교복.`,
  choices: (c) => {
    if (c.s.year >= 1969)
      return gate(c.s, [
        { label: '추첨으로 배정받은 중학교', run: () => '은행알 추첨기가 돌았다. 집에서 버스로 30분 거리 학교가 나왔다.' },
        ...(poor(c.s) ? [{ label: '중학교 대신 공장에 취직한다', run: (x: Ctx) => (addFlag(x.p, 'no_middle'), (householder(x.s).cash += Math.round(300 * wi(x.s))), up(x.p, 'str', 2), '구로공단 봉제 공장. 월급은 고스란히 집에 보낸다. 야간 학교라도 다니고 싶다.') }] : []),
      ]);
    return gate(c.s, [
      {
        label: '명문 중학교 입시에 도전한다',
        req: ['공부'],
        tag: 'study',
        run: (x) => {
          if (check(x.s, (x.p.study ?? x.p.actual.int) * 0.9 + x.p.actual.int * 0.3, 70, 8)) return addFlag(x.p, 'mid_intl'), mark(x.p, 'study', 2), '합격! 교복 모자에 명문 중학교 휘장을 달았다. 동네 잔치가 벌어졌다.';
          return '떨어졌다. 2차 중학교로 간다. 한동안 방에서 나오지 않았다.';
        },
      },
      { label: '동네 중학교', run: () => '집 근처 중학교에 들어갔다.' },
      ...(poor(c.s) ? [{ label: '중학교 대신 가게 점원으로 일한다', run: (x: Ctx) => (addFlag(x.p, 'no_middle'), (householder(x.s).cash += Math.round(250 * wi(x.s))), '시장 포목점 점원이 됐다. 밤에는 강의록으로 혼자 공부한다.') }] : []),
    ]);
  },
};

/** 고등학교: 평준화 전(서울 1974, 광역시 1975~79)엔 명문고 입시 · 상고·공고 · 과학고(1983)·외고(1984) */
const high: EventDef = {
  id: 'high',
  title: (c) => (c.s.year < 1974 ? '고등학교 입학시험' : '고등학교 진학'),
  text: (c) =>
    c.s.year < 1974
      ? `${iga(fullName(c.p))} 중학교 3학년. 경기고·서울고·경복고 같은 명문고에 붙으면 서울대가 보인다. 시험 한 번에 인생이 갈린다는 말이 있다.\n형편이 어려운 집 아이들은 상고·공고에 가서 일찍 은행이나 공장에 들어간다.`
      : `${iga(fullName(c.p))} 고등학교에 간다. 1974년 서울부터 고교 평준화로 추첨 배정이다.${c.s.year >= 1983 ? ' 과학고가 새로 생겼다.' : ''}`,
  choices: (c) => {
    const s = c.s;
    const out: Choice[] = [];
    if (s.year < 1974)
      out.push({
        label: '명문고 입시에 도전한다',
        req: ['공부'],
        tag: 'study',
        run: (x) => {
          if (check(x.s, (x.p.study ?? x.p.actual.int) * 0.9 + x.p.actual.int * 0.3, 75, 8)) return addFlag(x.p, 'high_elite'), mark(x.p, 'study', 2), x.s.fame += 1, '합격! 교복 깃에 명문고 배지를 달았다. 친척들이 앞다퉈 축하 전화를 했다.';
          return '떨어져서 후기 고등학교로 갔다.';
        },
      });
    else out.push({ label: '추첨으로 배정받은 인문계 고등학교', run: () => '추첨 배정. 까만 교복에 명찰을 달았다.' });
    if (s.year >= 1983)
      out.push({
        label: '과학고',
        req: ['수학·과학'],
        tag: 'study',
        run: (x) => (check(x.s, x.p.actual.int, 62, 6) ? (addFlag(x.p, 'high_sci'), addFlag(x.p, 'high_elite'), '과학고 합격! 기숙사 생활이 시작됐다.') : '떨어져서 인문계로 갔다.'),
      });
    if (s.year >= 1984)
      out.push({
        label: '외국어고',
        req: ['어학'],
        tag: 'study',
        run: (x) => (check(x.s, x.p.actual.int * 0.7 + x.p.actual.cha * 0.3, 58, 6) ? (addFlag(x.p, 'high_lang'), addFlag(x.p, 'high_elite'), '외고 합격! 영어 원서를 끼고 다닌다.') : '떨어져서 인문계로 갔다.'),
      });
    out.push({ label: '상업고등학교 (은행·회사 취업)', run: (x) => (addFlag(x.p, 'high_voc'), '주산·부기를 배운다. 졸업하면 은행에 들어가는 게 꿈이다. 상고 출신 행원은 이 시절 선망의 직업이었다.') });
    out.push({ label: '공업고등학교 (기능공)', run: (x) => (addFlag(x.p, 'high_meister'), up(x.p, 'str', 2), '선반 앞에서 쇳가루를 뒤집어쓴다. 기능올림픽 금메달이 꿈이다 (한국은 1977년 첫 종합 우승).') });
    out.push({ label: '예고·체고', req: ['재능'], run: (x) => (x.p.actual.cha >= x.p.actual.str ? addFlag(x.p, 'high_art') : addFlag(x.p, 'high_sport'), '실기 연습에 하루가 다 간다.') });
    if (poor(s)) out.push({ label: '진학 대신 돈을 번다 (야간 학교)', run: (x) => (addFlag(x.p, 'high_voc'), (householder(x.s).cash += Math.round(400 * wi(x.s))), mark(x.p, 'selfmade', 2), '낮엔 공장, 밤엔 야간 고등학교. 코피를 쏟아도 책을 놓지 않았다.') });
    return gate(s, out);
  },
};

export const HIST_OVERRIDES: Record<string, (s: GameState) => EventDef | undefined> = {
  kinder: (s) => (s.year < 2000 ? kinder : undefined),
  elementary: (s) => (s.year < 1996 ? elementary : undefined),
  middle: (s) => (s.year < 2000 ? middle : undefined),
  high: (s) => (s.year < 1998 ? high : undefined),
};

// ───────────────────────── 학년마다의 선택 (PLANS 자리) ─────────────────────────

/** 학년 선택지 이름·비용을 시대에 맞게. 없으면 그 시절엔 없던 방법이다 (undefined) */
export function histPlan(s: GameState, i: number, a: number): { label: string; cost: number } | null | undefined {
  if (!inHistory(s)) return undefined;
  const y = s.year;
  const w = wi(s);
  const d = y < 1980 ? 0 : y < 1990 ? 1 : y < 2000 ? 2 : 3;
  if (d === 3) return undefined; // 2000년 이후는 현대판 그대로 (인강 등)
  const T: [string, number][][] = [
    // 0 학원 뺑뺑이
    [['전과·수련장 사서 밤공부', 150], ['학교 보충수업·야간자율학습', 150], ['단과·종합반 학원', 900]],
    // 1 과외+학원 올인
    [[rich(s) ? '입주 가정교사를 들인다' : '대학생 가정교사 과외', 2200], ['몰래 비밀 과외 (적발되면 큰일)', 2600], ['족집게 고액 과외', 3000]],
    // 2 인강 → 그 시절 독학
    [['라디오 강좌·통신 강의록', 60], ['독서실 끊고 혼자 공부', 150], ['EBS 교육방송 + 독서실', 150]],
    // 3 운동부
    [['태권도 도장·학교 운동부', 300], ['태권도·유도 도장', 400], ['운동부·체육 활동', 500]],
    // 4 예체능 학원
    [[a < 13 ? '주산·웅변·붓글씨 학원' : '미술·음악 학원', 450], ['피아노·미술 학원', 700], ['미술·음악·연기 학원', 900]],
    // 5 봉사·동아리
    [['보이스카우트·걸스카우트', 80], ['문예반·교회 학생회', 60], [y >= 1996 ? '봉사활동 (1996년 의무화)' : '문예반·동아리', 80]],
    // 6 놀기
    [['딱지치기·구슬치기·자치기', 0], ['오락실·롤러장', 0], ['노래방·PC통신', 0]],
    // 7 연애
    [['펜팔·연애편지', 0], ['롤러장에서 만난 첫사랑', 0], ['삐삐 음성사서함 연애', 0]],
  ];
  const row = T[i]?.[d];
  if (!row) return null;
  return { label: row[0], cost: Math.round(row[1] * w) };
}

/** 학년마다 그 시절 풍경 한 줄 */
export function histMood(s: GameState, p: Person): string | undefined {
  if (!inHistory(s)) return undefined;
  const a = age(s, p);
  const y = s.year;
  const L: string[] = [];
  if (y < 1980) {
    if (a <= 13) L.push('도시락 뚜껑을 열면 선생님이 보리 섞였나 혼분식 검사를 한다.', '채변 봉투를 깜빡해서 친구 것을 나눠 냈다.', '교실 난로 위에 도시락을 층층이 쌓아 데운다.', '국민교육헌장을 못 외워 나머지 공부를 했다.', '반공 포스터 그리기 대회에서 상을 탔다.', '월요일 아침 운동장 조회. 교장 선생님 훈화가 끝나지 않는다.');
    else L.push('까까머리에 검정 교복, 모자에 학교 배지.', '교련 시간에 목총을 메고 제식훈련을 한다.', '장발 단속에 걸려 교문 앞에서 머리를 깎였다.', '빵집에서 친구들과 단팥빵에 우유를 나눠 먹었다.', '라디오 심야방송에 엽서를 보냈다.');
  } else if (y < 1990) {
    if (a <= 13) L.push('교실 뒤에 "올림픽 성공 기원" 표어가 붙었다.', '호돌이 필통이 유행이다.', '오락실에서 갤러그 최고 점수를 세웠다.', '만화방에서 "공포의 외인구단"을 빌려 봤다.');
    else L.push('교복 자율화로 사복을 입고 등교한다 (1983~).', '밤 10시까지 야간자율학습. 도시락을 두 개 싸 간다.', '학력고사 D-100 달력이 교실에 걸렸다.', '워크맨으로 이문세 테이프를 듣는다.', '과외 금지라 다들 독서실로 간다.');
  } else if (y < 2000) {
    if (a <= 13) L.push('다마고치를 몰래 학교에 가져왔다.', '포켓몬 스티커를 모으려고 빵만 산다.', 'H.O.T. 브로마이드를 책상에 붙였다.');
    else L.push('삐삐에 "8282"가 찍혔다.', '서태지 새 앨범 발매일에 레코드 가게 앞에 줄을 섰다.', '수능 세대. 모의고사 성적표가 쌓인다.', 'IMF 이후 아버지 회사 얘기가 집에서 사라졌다.');
  } else return undefined;
  if (poor(s)) L.push(y < 1980 ? '육성회비를 못 내서 교무실에 불려 갔다.' : '급식비 봉투를 늦게 냈다.');
  if (rich(s)) L.push(y < 1980 ? '반에서 유일하게 운동화를 신고 온다.' : '생일 파티에 반 친구들을 초대했다.');
  return L[Math.abs(p.id.length * 31 + y * 7) % L.length];
}

// ───────────────────────── 4) 그 시절 이야기 ─────────────────────────

export const HIST_STORIES: Story[] = [
  // ── 1960~70년대 ──
  { id: 'h_briquet', title: '연탄가스', age: [5, 80], w: 0.05, era: [1960, 1988], cooldown: 12, text: '새벽, {n이} 머리가 깨질 듯 아프다며 일어나지 못한다. 방바닥 틈새로 연탄가스가 샜다.', choices: [
    { label: '동치미 국물을 먹이고 창문을 연다', text: '', roll: ['luck', 70, [{ hp: -3 }, '한참 토하고 정신을 차렸다. 온 가족이 가슴을 쓸어내렸다.'], [{ hp: -12 }, '병원에 업고 뛰었다. 고압산소 치료를 받고 살아났다.']] },
    { label: '방구들을 다시 놓는다', cost: 60, text: '구들장을 새로 놓았다. 올겨울은 안심이다.', eff: { hp: 1 } },
  ] },
  { id: 'h_curfew', title: '통금 사이렌', age: [18, 60], w: 0.04, era: [1960, 1981], text: '자정 사이렌이 울렸는데 {n이} 아직 귀가하지 못했다. 통행금지 위반이면 파출소에서 밤을 새야 한다.', choices: [
    { label: '여관에 들어간다', cost: 5, text: '근처 여관에서 새우잠을 잤다.' },
    { label: '골목길로 뛴다', text: '', roll: ['luck', 60, [{ hap: 3 }, '방범대원을 피해 집까지 뛰었다. 심장이 터질 것 같았다.'], [{ hap: -5 }, '방범대원에게 걸려 파출소에서 밤을 새웠다. 즉결심판에 넘겨졌다.']] },
  ] },
  { id: 'h_barley', title: '보릿고개', age: [5, 18], w: 0.05, era: [1960, 1970], cond: (s) => s.origin === 'poor', text: '쌀독이 비었다. 햇보리가 나기까지 한 달. 어머니가 소나무 껍질을 벗겨 오셨다.', choices: [
    { label: '구호 밀가루로 수제비를 끓인다', text: '미국 원조 밀가루 포대에 악수하는 두 손이 그려져 있다. 멀건 수제비로 버텼다.', eff: { hp: -2 } },
    { label: '부잣집 잔칫집 일을 돕고 음식을 얻는다', text: '잔칫상 치우고 떡 몇 조각을 얻어 왔다. 동생들이 환하게 웃었다.', eff: { str: 1, mor: 1 } },
  ] },
  { id: 'h_tv', title: '흑백 TV 들어오는 날', age: [5, 70], w: 0.05, once: true, era: [1966, 1978], head: true, text: '동네에 TV가 있는 집은 몇 집 안 된다. 김일 박치기 경기가 있는 날이면 온 동네가 TV 있는 집 마당에 모인다.', choices: [
    { label: '월부로 금성 흑백 TV를 들인다', cost: 250, text: '안테나를 지붕에 세웠다. 우리 집 마루가 동네 극장이 됐다.', eff: { hap: 8, fame: 1 } },
    { label: '만화방 TV로 본다', cost: 1, text: '10원 내고 만화방에서 레슬링을 봤다. 김일이 박치기로 이겼다!', eff: { hap: 4 } },
  ] },
  { id: 'h_phone', title: '백색전화', age: [25, 70], w: 0.03, once: true, era: [1970, 1985], head: true, text: '전화 한 대 놓으려면 몇 년을 기다려야 한다. 바로 쓸 수 있는 "백색전화"는 집 한 채 값에 거래된다는 말도 있다.', choices: [
    { label: '청색전화를 신청하고 기다린다', text: '3년 뒤에야 전화가 개통됐다. 동네 사람들이 우리 집 전화를 빌리러 온다.', eff: { fame: 1 } },
    { label: '웃돈 주고 백색전화를 산다', cost: 600, text: '거실에 까만 다이얼 전화기가 놓였다. 쓸 일은 별로 없는데 뿌듯하다.', eff: { hap: 5, fame: 2, gear: 'phone' } },
  ] },
  { id: 'h_ration', title: '혼분식 검사', age: [8, 13], w: 0.04, era: [1963, 1976], text: '점심시간, 선생님이 도시락을 검사한다. 쌀밥만 싸 오면 혼난다. {n}의 도시락은 하얀 쌀밥뿐이다.', choices: [
    { label: '친구 보리밥과 섞는다', text: '짝꿍과 반씩 섞어서 무사히 넘어갔다. 우정이 깊어졌다.', eff: { cha: 1, hap: 2 } },
    { label: '솔직히 말한다', text: '손바닥 세 대. 그래도 거짓말은 안 했다.', eff: { mor: 2, hap: -2 } },
  ] },
  { id: 'h_worm', title: '채변 봉투', age: [7, 12], w: 0.04, era: [1960, 1985], text: '내일까지 채변 봉투를 내야 한다. {n}은(는) 까맣게 잊고 있었다.', choices: [
    { label: '강아지 것을 넣는다', text: '회충 대신 개회충이 나왔다고 선생님이 불렀다. 반 전체가 웃었다.', eff: { hap: 3, mor: -1 } },
    { label: '솔직히 말하고 내일 낸다', text: '다음 날 제대로 냈다. 회충약을 받았다.', eff: { hp: 1 } },
  ] },
  { id: 'h_long_hair', title: '장발 단속', age: [17, 30], w: 0.04, era: [1970, 1980], text: '명동 거리. 경찰이 자를 들고 머리 길이를 잰다. {n}의 머리가 귀를 덮었다.', choices: [
    { label: '골목으로 도망친다', text: '', roll: ['str', 45, [{ hap: 4 }, '골목을 이리저리 빠져나갔다. 통기타 치는 친구들에게 무용담을 늘어놨다.'], [{ hap: -4 }, '붙잡혀서 파출소에서 바리캉으로 머리를 밀렸다.']] },
    { label: '순순히 이발소에 간다', cost: 1, text: '까까머리가 됐다. 여자친구가 한참 웃었다.' },
  ] },
  { id: 'h_dabang', title: '다방에서', age: [20, 40], w: 0.04, era: [1960, 1990], cond: (_s, p) => !p.spouseId, text: '중매쟁이 아주머니가 {n}에게 맞선 자리를 잡아 왔다. 명동 다방, 쌍화차에 달걀노른자가 동동 떠 있다.', choices: [
    { label: '성실하게 집안 이야기를 한다', text: '', roll: ['mor', 45, [{ hap: 5, flag: 'matsun_ok' }, '상대 부모님이 마음에 들어 하신다는 연락이 왔다.'], [{ hap: -3 }, '"인연이 아닌가 봅니다." 연락이 끊겼다.']] },
    { label: 'DJ에게 신청곡을 적어 보낸다', text: '"사랑해 당신을" 이 흘러나왔다. 분위기가 한결 부드러워졌다.', eff: { cha: 1, hap: 4 } },
  ] },
  { id: 'h_gye', title: '곗돈', age: [28, 70], w: 0.05, era: [1960, 1995], text: '동네 아주머니들 번호계. {n}의 순번이 곧 돌아온다. 그런데 계주가 요즘 연락이 뜸하다는 소문이 돈다.', choices: [
    { label: '끝까지 믿고 기다린다', text: '', roll: ['luck', 65, [{ cash: 500, hap: 6 }, '곗돈을 탔다! 목돈으로 전세금을 보탰다.'], [{ cash: -300, hap: -10 }, '계주가 야반도주했다. 몇 년 부은 돈이 날아갔다.']] },
    { label: '먼저 곗돈을 타고 빠진다', text: '이자를 떼고 받았다. 계원들 눈총이 따가웠다.', eff: { cash: 350, mark: { thrift: 1 } } },
  ] },
  { id: 'h_holiday_train', title: '귀성 전쟁', age: [18, 60], w: 0.04, era: [1965, 1995], text: '추석 기차표를 사러 서울역 광장에 밤새 줄을 섰다. 수만 명이 신문지를 깔고 누웠다.', choices: [
    { label: '밤새 버틴다', text: '', roll: ['str', 40, [{ hap: 6, aff: 5 }, '입석표를 겨우 샀다. 고향 가는 완행열차 통로에 서서 여덟 시간.'], [{ hap: -5 }, '표가 매진됐다. 이번 추석은 전화로 인사드렸다.']] },
    { label: '고속버스로 간다', cost: 8, text: '경부고속도로가 주차장 같았다. 열두 시간 만에 도착했다.', eff: { aff: 4 } },
  ] },
  { id: 'h_family_plan', title: '둘만 낳아 잘 기르자', age: [25, 40], w: 0.05, once: true, era: [1970, 1989], cond: (_s, p) => !!p.spouseId, text: '보건소 가족계획 요원이 찾아왔다. "딸 아들 구별 말고 둘만 낳아 잘 기르자." 예비군 훈련장에서 정관수술을 받으면 훈련을 면제해 준다는 말도 돈다.', choices: [
    { label: '가족계획에 따른다', text: '아이는 둘로 끝내기로 했다.', eff: { flag: 'family_plan' } },
    { label: '"아들은 있어야지"', text: '어른들 등쌀에 아이를 더 갖기로 했다.', eff: { aff: 3 } },
  ] },
  { id: 'h_ditch', title: '달동네 철거', age: [20, 60], w: 0.04, era: [1965, 1990], cond: (s) => s.origin === 'poor', head: true, text: '"도시 미관을 해친다"며 무허가 판자촌 철거 통보가 왔다. 용역들이 포클레인을 끌고 온다.', choices: [
    { label: '철거민 대책위에 나간다', text: '', roll: ['mor', 50, [{ cash: 300, fame: 1 }, '끝까지 버텨 이주 보상금과 임대아파트 입주권을 받았다.'], [{ hp: -6, hap: -8 }, '끌려 나왔다. 짐 보따리만 들고 거리에 섰다.']] },
    { label: '보상금 받고 떠난다', text: '얼마 안 되는 보상금으로 경기도 변두리 셋방을 얻었다.', eff: { cash: 150, hap: -4 } },
  ] },
  { id: 'h_night_school', title: '야학', age: [15, 25], w: 0.05, era: [1965, 1990], cond: (_s, p) => hasFlag(p, 'no_middle') || hasFlag(p, 'high_voc'), text: '공장 기숙사 벽에 "노동자 야학 — 검정고시 무료 강의" 전단이 붙었다. 대학생 선생님들이 가르친다.', choices: [
    { label: '야학에 다닌다', text: '', roll: ['int', 45, [{ int: 3, study: 8, flag: 'geomjeong' }, '검정고시에 합격했다! 공장 동료들이 박수를 쳐 줬다.'], [{ int: 1, hap: -2 }, '야근이 겹쳐 자꾸 빠졌다. 그래도 한글 소설은 술술 읽게 됐다.']] },
    { label: '잠이 더 급하다', text: '하루 14시간 미싱 앞. 쓰러지듯 잠들었다.', eff: { hp: -1 } },
  ] },
  // ── 1980년대 ──
  { id: 'h_arcade', title: '오락실', age: [10, 18], w: 0.05, era: [1980, 1995], text: '학교 끝나고 오락실. 100원짜리 동전 몇 개로 갤러그·보글보글을 한다. 선도부 선생님이 순찰을 돈다는 소문이 있다.', choices: [
    { label: '한 판만 더!', text: '', roll: ['luck', 55, [{ hap: 6 }, '최고 점수에 이름 세 글자를 새겼다.'], [{ hap: -4, aff: -3 }, '선도부에 걸려 부모님이 학교에 불려 왔다.']] },
    { label: '독서실로 간다', text: '독서실 칸막이 책상에 앉았다. 친구들이 부러워한다.', eff: { study: 2 } },
  ] },
  { id: 'h_video', title: '비디오 대여점', age: [12, 40], w: 0.04, era: [1985, 2002], text: '동네 비디오 가게에 홍콩 영화 신작이 들어왔다. 영웅본색, 천녀유혼… 주윤발 흉내를 내며 성냥개비를 문다.', choices: [
    { label: '친구들과 밤새 본다', cost: 1, text: '비디오 세 편을 연달아 봤다. 다음 날 수업 내내 졸았다.', eff: { hap: 6, study: -1 } },
    { label: '공부를 먼저 한다', text: '비디오는 주말로 미뤘다.', eff: { study: 1 } },
  ] },
  { id: 'h_demo', title: '최루탄 냄새', age: [19, 26], w: 0.05, era: [1980, 1992], student: true, text: '캠퍼스에 최루탄 연기가 자욱하다. 선배들이 "독재 타도"를 외치며 스크럼을 짠다.', choices: [
    { label: '학생 운동에 뛰어든다', text: '', roll: ['luck', 70, [{ mor: 3, fame: 1, mark: { honest: 1 } }, '구호를 외치며 교문을 나섰다. 뭔가 역사에 참여한다는 느낌.'], [{ hp: -8, hap: -8, flag: 'arrested80' }, '백골단에게 끌려갔다. 며칠 뒤 풀려났지만 강제 징집 명단에 올랐다.']] },
    { label: '도서관으로 간다', text: '최루탄 냄새를 피해 도서관으로 갔다. 마음 한구석이 무겁다.', eff: { study: 3, mor: -1 } },
  ] },
  { id: 'h_olympic_apt', title: '올림픽선수촌 아파트', age: [30, 55], w: 0.04, once: true, era: [1987, 1989], head: true, text: '올림픽이 끝나면 선수촌을 아파트로 분양한다고 한다. 청약 경쟁이 치열하다.', choices: [
    { label: '청약 통장을 넣는다', text: '', roll: ['luck', 20, [{ hap: 10, flag: 'olympic_apt' }, '당첨! 둔촌동 올림픽선수촌 아파트. 동네 사람들이 부러워한다.'], [{ hap: -2 }, '떨어졌다. 경쟁률이 수십 대 1이었다.']] },
    { label: '관심 없다', text: '그냥 지나쳤다.' },
  ] },
  // ── 1990년대 ──
  { id: 'h_beeper', title: '삐삐', age: [16, 40], w: 0.05, era: [1991, 2001], text: '{n}의 삐삐에 "1004"가 찍혔다. 공중전화 앞에 줄이 길다.', choices: [
    { label: '공중전화로 달려간다', cost: 1, text: '음성사서함에 떨리는 목소리가 남겨져 있었다.', eff: { hap: 6, cha: 1 } },
    { label: '모른 척한다', text: '삐삐를 서랍에 넣었다.' },
  ] },
  { id: 'h_imf_layoff', title: '명예퇴직 명단', age: [40, 58], w: 0.08, once: true, era: [1998, 1999], cond: (_s, p) => ['office', 'corp', 'banker', 'trader', 'sales', 'hr', 'marketer'].includes(p.job), text: '회사 게시판에 "명예퇴직 신청 안내"가 붙었다. 부서장이 {n}을(를) 조용히 불렀다.', choices: [
    { label: '위로금 받고 나간다', text: '위로금으로 치킨집을 차렸다. 퇴직 동기 셋이 같은 골목에 치킨집을 냈다.', eff: { cash: 2000, hap: -8, flag: 'imf_out' } },
    { label: '버틴다', text: '', roll: ['luck', 50, [{ hap: -3 }, '버텼다. 옆자리 동료들이 하나둘 짐을 쌌다.'], [{ hap: -12, promo: -1 }, '한직으로 밀려났다. 창가 자리에 앉아 신문만 본다.']] },
  ] },
  { id: 'h_ham', title: '함 사세요', age: [24, 36], w: 0.06, once: true, era: [1960, 1999], cond: (_s, p) => !!p.spouseId, text: '결혼 전날 밤, 신랑 친구들이 오징어 가면을 쓰고 함을 지고 왔다. "함 사세요~ 함!" 골목이 떠들썩하다.', choices: [
    { label: '봉투를 두둑이 찔러 준다', cost: 10, text: '함진아비가 못 이기는 척 대문을 넘었다. 떡시루 위에 함이 올려졌다.', eff: { hap: 6, aff: 3 } },
    { label: '끝까지 흥정한다', text: '', roll: ['cha', 50, [{ hap: 5, fame: 1 }, '밀고 당기다 온 동네 사람이 구경 나왔다. 두고두고 이야깃거리가 됐다.'], [{ hap: -3 }, '함진아비들이 삐져서 동네 한 바퀴를 더 돌았다. 이웃이 시끄럽다고 항의했다.']] },
  ] },
  { id: 'h_newlywed_jeju', title: '제주도 신혼여행', age: [24, 36], w: 0.05, once: true, era: [1970, 1989], cond: (_s, p) => !!p.spouseId, text: '신혼부부라면 다들 제주도로 간다. 조랑말 앞에서 한복 입고 찍는 사진이 필수다.', choices: [
    { label: '비행기 타고 제주도에 간다', cost: 60, text: '용두암 앞에서 사진사 아저씨가 "자, 신부 어깨에 손!" 하고 외쳤다.', eff: { hap: 8, aff: 5 } },
    { label: '온양온천으로 간다', cost: 15, text: '기차 타고 온양온천. 소박하지만 행복했다.', eff: { hap: 5, aff: 3 } },
  ] },
  { id: 'h_manhwa', title: '만화방', age: [8, 16], w: 0.05, era: [1960, 1995], text: '골목 만화방. 한 권에 몇 원이면 하루 종일 볼 수 있다. 오늘 새로 들어온 만화가 있다.', choices: [
    { label: '해 질 때까지 읽는다', cost: 1, text: '까치와 엄지의 야구 만화에 푹 빠졌다. 저녁 먹으라는 소리에 뛰어 들어갔다.', eff: { hap: 5, study: -1 } },
    { label: '숙제부터 한다', text: '만화방 앞을 꾹 참고 지나쳤다.', eff: { study: 1, mor: 1 } },
  ] },
  { id: 'h_dalgona', title: '뽑기 아저씨', age: [6, 12], w: 0.05, era: [1960, 1995], text: '학교 앞에 국자를 든 뽑기 아저씨가 왔다. 별 모양을 모양대로 떼어 내면 하나 더 준다.', choices: [
    { label: '바늘로 조심조심 뗀다', cost: 1, text: '', roll: ['luck', 40, [{ hap: 6 }, '별 모양이 온전히 떨어졌다! 하나 더 받았다.'], [{ hap: 2 }, '마지막에 뚝 부러졌다. 그래도 달콤했다.']] },
    { label: '구경만 한다', text: '친구가 뽑기에 성공하는 걸 부럽게 봤다.' },
  ] },
  { id: 'h_sports_day', title: '가을 운동회', age: [7, 12], w: 0.05, era: [1960, 1995], text: '청군 백군 운동회. 만국기가 운동장을 덮었다. 어머니가 김밥과 삶은 달걀, 사이다를 싸 오셨다.', choices: [
    { label: '계주 선수로 뛴다', text: '', roll: ['str', 45, [{ hap: 8, str: 1, fame: 1 }, '마지막 주자로 역전승! 공책 세 권을 상품으로 받았다.'], [{ hap: -2 }, '코너에서 넘어졌다. 무릎에 빨간약을 발랐다.']] },
    { label: '박 터뜨리기에 힘을 보탠다', text: '콩주머니를 던져 박이 터졌다. "축 우승" 현수막이 늘어졌다.', eff: { hap: 5, aff: 2 } },
  ] },
  { id: 'h_ramen', title: '라면이 나왔다', age: [5, 60], w: 0.04, once: true, era: [1963, 1970], text: '삼양라면이 처음 나왔다. 한 봉지 10원. 꿀꿀이죽보다 싸고 배부르다는 소문이 돈다.', choices: [
    { label: '끓여 먹어 본다', cost: 1, text: '꼬불꼬불한 면에 닭 육수 맛. 온 식구가 한 냄비를 나눠 먹었다.', eff: { hap: 5 } },
    { label: '쌀밥이 최고다', text: '"밀가루 국수가 무슨 밥이냐." 할아버지가 손을 저으셨다.' },
  ] },
  { id: 'h_taekwonv', title: '로보트 태권 V', age: [6, 14], w: 0.05, once: true, era: [1976, 1985], text: '극장에서 "로보트 태권 V"를 한다. 반 친구들이 전부 본 모양이다.', choices: [
    { label: '엄마를 졸라 극장에 간다', cost: 2, text: '"달려라 달려 로보트야~" 극장이 떠나가라 따라 불렀다.', eff: { hap: 7 } },
    { label: '친구 얘기로 대신한다', text: '친구가 줄거리를 다 말해 줬다. 조금 서운했다.', eff: { hap: -1 } },
  ] },
  { id: 'h_polio', title: '불주사', age: [6, 10], w: 0.04, once: true, era: [1960, 1990], text: '오늘은 학교에서 BCG 불주사를 맞는 날. 줄 선 아이들 사이로 울음소리가 번진다.', choices: [
    { label: '씩씩하게 맞는다', text: '눈을 질끈 감았다. 팔뚝에 동그란 흉터가 남았다.', eff: { hp: 2, mor: 1 } },
    { label: '화장실에 숨는다', text: '', roll: ['luck', 30, [{ hap: 2 }, '들키지 않았다… 하지만 다음 주에 결국 맞았다.'], [{ hap: -3 }, '선생님께 붙잡혀 맨 앞에서 맞았다.']] },
  ] },
  { id: 'h_uniform_hand', title: '교복 물려받기', age: [12, 17], w: 0.05, era: [1960, 1982], cond: (s) => s.origin !== 'rich', text: '검정 교복과 까만 모자. 새 교복은 비싸서 형(언니)이 입던 걸 줄여 입어야 한다.', choices: [
    { label: '물려 입는다', text: '소매가 반들반들하다. 어머니가 단추를 새로 달아 주셨다.', eff: { mark: { thrift: 1 } } },
    { label: '새 교복을 맞춘다', cost: 15, text: '빳빳한 새 교복에 교모까지 반듯하게 썼다.', eff: { hap: 5 } },
  ] },
  { id: 'h_radio', title: '라디오 심야 방송', age: [13, 25], w: 0.05, era: [1965, 1995], text: '밤 12시, 라디오에서 별이 빛나는 밤에가 흘러나온다. 엽서에 사연을 적어 보낼까?', choices: [
    { label: '사연 엽서를 보낸다', text: '', roll: ['cha', 35, [{ hap: 8, cha: 1 }, 'DJ가 내 사연을 읽어 줬다! 이불 속에서 소리를 질렀다.'], [{ hap: 1 }, '끝내 소개되지 않았다. 그래도 음악은 좋았다.']] },
    { label: '공테이프에 녹음한다', text: '좋아하는 노래가 나오자 녹음 버튼을 눌렀다. DJ 멘트까지 같이 녹음됐다.', eff: { hap: 4 } },
  ] },
  { id: 'h_guitar', title: '통기타와 청바지', age: [16, 26], w: 0.05, era: [1970, 1985], text: '송창식·김민기의 노래가 캠퍼스와 다방을 휩쓴다. 친구가 통기타를 가르쳐 준다고 한다.', choices: [
    { label: '통기타를 배운다', cost: 5, text: '코드 세 개로 "아침 이슬"을 쳤다. 손끝에 굳은살이 박였다.', eff: { cha: 2, hap: 4 } },
    { label: '공부나 하자', text: '기타 소리를 등지고 책을 폈다.', eff: { study: 1 } },
  ] },
  { id: 'h_exam_hell', title: '입시 지옥', age: [17, 18], w: 0.06, era: [1960, 1993], student: true, text: '"4당 5락" — 4시간 자면 붙고 5시간 자면 떨어진다. 책상 앞에 붙인 문구다.', choices: [
    { label: '잠을 줄이고 파고든다', text: '', roll: ['str', 50, [{ study: 4, int: 1 }, '새벽까지 버텼다. 문제집이 너덜너덜해졌다.'], [{ hp: -6, study: 1 }, '코피를 쏟고 쓰러졌다. 어머니가 보약을 지어 오셨다.']] },
    { label: '제때 잔다', text: '잘 자야 머리가 돈다. 컨디션을 지켰다.', eff: { hp: 2 } },
  ] },
  { id: 'h_bread_meeting', title: '빵집 미팅', age: [16, 19], w: 0.04, era: [1970, 1995], text: '옆 학교 학생과 빵집에서 만나기로 했다. 선도부에 걸리면 정학이다.', choices: [
    { label: '몰래 나간다', cost: 1, text: '', roll: ['luck', 60, [{ hap: 7, cha: 1 }, '단팥빵과 우유를 사이에 두고 한참 웃었다.'], [{ hap: -5, mor: -1 }, '학생부 선생님이 빵집 문을 열고 들어왔다.']] },
    { label: '편지만 주고받는다', text: '편지지에 정성껏 글씨를 썼다. 향수까지 뿌렸다.', eff: { hap: 3 } },
  ] },
  { id: 'h_mt', title: '대성리 엠티', age: [19, 24], w: 0.05, era: [1975, 1999], student: true, text: '경춘선 타고 대성리로 과 엠티. 버너에 코펠, 기타 한 대, 소주 몇 병.', choices: [
    { label: '밤새 노래 부른다', cost: 3, text: '모닥불 앞에서 선후배가 어깨동무를 했다. 평생 친구가 생겼다.', eff: { hap: 6, cha: 1 } },
    { label: '일찍 잔다', text: '다음 날 아침 설거지를 도맡아 했다.', eff: { mor: 1 } },
  ] },
  { id: 'h_meeting_items', title: '소지품 미팅', age: [19, 24], w: 0.04, era: [1975, 1995], student: true, cond: (_s, p) => !p.spouseId, text: '과 미팅. 여학생들이 소지품을 하나씩 내놓았다. 손수건, 머리핀, 볼펜… 고른 물건의 주인이 짝이다.', choices: [
    { label: '손수건을 고른다', text: '', roll: ['cha', 45, [{ hap: 7 }, '마음이 잘 맞았다. 다음 주 음악감상실에서 또 만나기로 했다.'], [{ hap: -2 }, '어색한 침묵이 흘렀다. 애프터는 없었다.']] },
    { label: '과 대표에게 양보한다', text: '양보한 과 대표가 결혼까지 했다는 후문.', eff: { mor: 1 } },
  ] },
  { id: 'h_bus_girl', title: '버스 안내양', age: [15, 22], w: 0.04, era: [1961, 1985], cond: (s, p) => s.origin === 'poor' && p.sex === 'F', text: '"오라이~" 버스 안내양 자리가 났다. 새벽 4시부터 문에 매달려 차비를 받는다.', choices: [
    { label: '안내양으로 일한다', text: '만원 버스 문에 매달려 "탕탕" 차체를 두드렸다. 월급은 시골 동생 학비로 보냈다.', eff: { cash: 60, str: 1, hp: -2, mark: { selfmade: 1 } } },
    { label: '다른 일을 알아본다', text: '고민 끝에 다른 일자리를 찾기로 했다.' },
  ] },
  { id: 'h_factory_girl', title: '구로공단', age: [15, 24], w: 0.05, era: [1965, 1988], cond: (s) => s.origin === 'poor', text: '구로공단 봉제 공장. 시다로 들어가면 먹고 자는 건 해결된다. 하루 열몇 시간 미싱을 돌린다.', choices: [
    { label: '공장에 들어간다', text: '벌집 같은 쪽방에서 여섯이 함께 잔다. 월급날엔 고향에 송금부터 한다.', eff: { cash: 80, hp: -3, mark: { selfmade: 1 } } },
    { label: '기술을 배운다', text: '', roll: ['int', 45, [{ int: 1, cash: 40 }, '재단사 밑에서 가위질을 배웠다. 시다에서 미싱사로 올라갔다.'], [{ hap: -3 }, '반장이 기술을 안 가르쳐 준다. 잔심부름만 했다.']] },
  ] },
  { id: 'h_pay_envelope', title: '누런 월급봉투', age: [25, 58], w: 0.04, era: [1960, 1995], cond: (_s, p) => !!p.job && !!p.spouseId, text: '월급날. 누런 봉투에 현금이 두툼하다. 동료들이 "한잔 하고 가자"며 소매를 끈다.', choices: [
    { label: '봉투째 살림에 보탠다', text: '봉투를 받은 배우자가 활짝 웃었다. 가계부에 또박또박 적는다.', eff: { aff: 5, mor: 1 } },
    { label: '포장마차에 들른다', cost: 5, text: '닭똥집에 소주 한 병. 봉투가 조금 얇아졌다.', eff: { hap: 4, aff: -2 } },
  ] },
  { id: 'h_hoesik', title: '회식 2차', age: [25, 55], w: 0.04, era: [1965, 1999], cond: (_s, p) => !!p.job, text: '부장님이 "오늘은 끝까지 간다"고 선언했다. 1차 삼겹살, 2차는 룸살롱, 3차는 포장마차라고.', choices: [
    { label: '끝까지 따라간다', text: '새벽 3시에 택시를 탔다. 부장님이 어깨를 두드려 줬다.', eff: { hp: -3, cha: 1, promo: 1 } },
    { label: '1차만 하고 빠진다', text: '"요즘 젊은 사람들은…" 부장님 표정이 굳었다.', eff: { hap: 2 } },
  ] },
  { id: 'h_rented_room', title: '주인집 눈치', age: [20, 45], w: 0.05, era: [1960, 1995], cond: (s, p) => ['jeonse', 'wolse'].includes(homeOf(s, p)?.type ?? ''), head: true, text: '마당 딸린 집 문간방 셋방살이. 주인집 아주머니가 "애들 좀 조용히 시키라"며 눈을 흘긴다. 수도는 한 개, 화장실은 마당에 있다.', choices: [
    { label: '과일 한 봉지 들고 인사 간다', cost: 2, text: '"새댁이 싹싹하네." 아주머니 표정이 풀렸다.', eff: { cha: 1, hap: 2 } },
    { label: '이사 갈 날만 손꼽는다', text: '주택부금 통장을 다시 들여다봤다.', eff: { mark: { thrift: 1 } } },
  ] },
  { id: 'h_bokbuin', title: '복부인', age: [30, 60], w: 0.04, era: [1976, 1991], head: true, text: '밍크코트 입은 아주머니들이 봉고차를 타고 강남 분양 현장을 돈다. "복부인"이라 부른다. 아는 언니가 같이 가자고 한다.', choices: [
    { label: '따라가서 딱지를 산다', cost: 200, text: '', roll: ['luck', 55, [{ cash: 600, hap: 5 }, '웃돈이 붙었다! 몇 달 만에 되팔아 큰돈을 남겼다.'], [{ cash: 50, hap: -6 }, '투기 단속에 걸려 거래가 막혔다. 웃돈만 날렸다.']] },
    { label: '성실히 저축한다', text: '"그런 돈은 오래 못 간다." 적금 통장에 도장을 찍었다.', eff: { mor: 1, mark: { thrift: 1 } } },
  ] },
  { id: 'h_mycar', title: '마이카 시대', age: [30, 60], w: 0.04, once: true, era: [1985, 1996], head: true, text: '포니·프라이드·엑셀… 88올림픽 전후로 "마이카 시대"가 열렸다. 옆집이 새 차를 뽑았다.', choices: [
    { label: '할부로 차를 산다', cost: 400, text: '일요일마다 세차를 한다. 가족을 태우고 교외로 나갔다.', eff: { hap: 8, fame: 1 } },
    { label: '아직은 버스로 충분하다', text: '차 대신 적금을 들었다.', eff: { mark: { thrift: 1 } } },
  ] },
  { id: 'h_color_tv', title: '컬러 TV 방송 시작', age: [10, 70], w: 0.04, once: true, era: [1980, 1983], head: true, text: '1980년 12월, 컬러 방송이 시작됐다. 전파상 진열장 앞에 사람들이 모여 선다.', choices: [
    { label: '컬러 TV를 들인다', cost: 150, text: '처음 본 총천연색 화면. 식구들이 입을 벌렸다.', eff: { hap: 7 } },
    { label: '흑백으로 버틴다', text: '"화면만 보이면 됐지." 채널 돌리는 손잡이가 삐걱거린다.' },
  ] },
  { id: 'h_chonji', title: '월남 파병', age: [20, 30], w: 0.04, once: true, era: [1965, 1972], cond: (_s, p) => p.sex === 'M', text: '월남 파병 지원자를 모집한다. 전투 수당을 모으면 고향에 논을 살 수 있다고 한다.', choices: [
    { label: '지원한다', text: '', roll: ['luck', 75, [{ cash: 300, str: 2, fame: 1 }, '무사히 돌아왔다. 전투수당을 모아 부모님께 논 몇 마지기를 사 드렸다.'], [{ hp: -20, cash: 150, hap: -10 }, '정글에서 부상을 입었다. 고엽제 후유증이 평생 따라다녔다.']] },
    { label: '지원하지 않는다', text: '고향에 남아 농사를 도왔다.' },
  ] },
  { id: 'h_emigrate', title: '독일 광부·간호사', age: [20, 32], w: 0.03, once: true, era: [1963, 1977], cond: (s) => s.origin !== 'rich', text: '서독에서 광부와 간호사를 모집한다. 월급이 한국의 몇 배라고 한다. 경쟁률이 수십 대 1.', choices: [
    { label: '지원한다', text: '', roll: ['str', 55, [{ cash: 400, str: 1, hap: -3 }, '합격! 지하 1,000미터 막장(병동)에서 3년을 버텼다. 번 돈은 모두 고향에 부쳤다.'], [{ hap: -3 }, '체력 검사에서 떨어졌다.']] },
    { label: '고향에 남는다', text: '가족 곁에 있기로 했다.' },
  ] },
  { id: 'h_hwangap', title: '환갑 잔치', age: [58, 64], w: 0.06, once: true, era: [1960, 1999], head: true, text: '곧 {n}의 환갑이다. 예전엔 환갑까지 사는 것만도 큰 복이었다. 자식들이 잔치를 크게 열자고 한다.', choices: [
    { label: '마당에 큰 잔치를 연다', cost: 50, text: '동네 사람들이 모두 왔다. 자식들이 큰절을 올렸다.', eff: { hap: 10, fame: 1, aff: 5 } },
    { label: '식구끼리 조촐하게', text: '미역국에 떡 한 접시. 그래도 마음은 넉넉했다.', eff: { hap: 5 } },
  ] },
  { id: 'h_hyodo_tour', title: '효도 관광', age: [55, 75], w: 0.04, once: true, era: [1985, 1999], head: true, text: '노인정에서 관광버스를 대절해 효도 관광을 간다. 버스 안에서 뽕짝 메들리가 흘러나온다.', choices: [
    { label: '따라간다', cost: 10, text: '관광버스 통로에서 춤을 췄다. 설악산 흔들바위를 밀어 봤다.', eff: { hap: 8, hp: 1 } },
    { label: '손주를 본다', text: '집에서 손주와 놀았다.', eff: { aff: 3 } },
  ] },
  { id: 'h_hospital_line', title: '약국 먼저', age: [5, 80], w: 0.04, era: [1960, 1988], text: '{n}이(가) 열이 난다. 병원비가 비싸서 다들 약국부터 간다. 약사가 이것저것 섞어 지어 준다.', choices: [
    { label: '약국 약을 먹는다', cost: 1, text: '', roll: ['luck', 70, [{ hp: 2 }, '사흘 만에 털고 일어났다.'], [{ hp: -6 }, '열이 안 떨어져 결국 병원에 갔다. 큰돈이 들었다.']] },
    { label: '큰 병원에 간다', cost: 20, text: '의사 선생님이 청진기를 대 보셨다. 주사 한 대 맞고 나았다.', eff: { hp: 4 } },
  ] },
  { id: 'h_imf_bench', title: '양복 입고 산으로', age: [35, 58], w: 0.05, era: [1998, 2000], cond: (_s, p) => hasFlag(p, 'imf_out'), text: '실직한 걸 가족에게 말하지 못했다. 아침마다 양복을 입고 나가 산에 오른다.', choices: [
    { label: '가족에게 털어놓는다', text: '배우자가 손을 꼭 잡았다. "같이 버텨요."', eff: { aff: 8, hap: 3 } },
    { label: '혼자 삭인다', text: '공원 벤치에서 신문 구인란을 뒤적였다.', eff: { hap: -5, hp: -2 } },
  ] },
  { id: 'h_gold_ring', title: '금 모으기 운동', age: [20, 80], w: 0.06, once: true, era: [1998, 1998], head: true, text: '나라가 IMF 구제금융을 받았다. "금 모으기 운동"에 온 국민이 줄을 섰다. 장롱 속 돌반지가 떠오른다.', choices: [
    { label: '돌반지를 내놓는다', text: '아이 돌반지와 결혼반지를 내놓았다. 줄 선 사람들 눈시울이 붉었다.', eff: { mor: 3, fame: 1, hap: 3, mark: { honest: 1 }, flag: 'gold_ring' } },
    { label: '지금은 우리 집도 어렵다', text: '반지를 다시 장롱에 넣었다.', eff: { cash: 20 } },
  ] },
  { id: 'h_pc_comm', title: 'PC통신', age: [15, 35], w: 0.04, era: [1992, 1999], text: '밤 11시, 전화선을 연결하면 "삐— 치이익" 모뎀 소리. 하이텔 동호회에 새 글이 올라왔다.', choices: [
    { label: '밤새 채팅한다', text: '전화 요금 고지서를 보고 아버지가 기함하셨다.', eff: { hap: 5, cash: -10 } },
    { label: '정보를 모아 공부한다', text: '동호회 자료실에서 쓸 만한 정보를 모았다.', eff: { int: 2 } },
  ] },
];

// ───────────────────────── 5) 그 시절 행동 ─────────────────────────

export const HIST_ACTIONS: ActionDef[] = [
  {
    id: 'h_gye_join',
    cat: '재산',
    icon: '🪙',
    name: '계모임 들기',
    desc: '동네 번호계: 매달 붓고 순번이 오면 목돈. 계주가 도망가면 끝',
    ap: 1,
    show: (s) => inHistory(s) && s.year < 1996,
    run: (s) => {
      const h = householder(s);
      const v = Math.round(400 * wi(s));
      if (chance(s, 0.15)) return (h.cash -= Math.round(v * 0.6)), `😱 계주가 곗돈을 들고 사라졌다. ${formatWon(Math.round(v * 0.6))}이 날아갔다.`;
      h.cash += Math.round(v * 0.12);
      return `계모임에 들었다. 순번이 돌아와 목돈을 탔다. 이자까지 쳐서 ${formatWon(Math.round(v * 1.12))}.`;
    },
  },
  {
    id: 'h_bokdeok',
    cat: '재산',
    icon: '🏚',
    name: '복덕방 영감과 땅 보러 가기',
    desc: '변두리 논밭을 보러 다닌다. 개발 소문을 들을 수도 있다',
    ap: 1,
    show: (s) => inHistory(s) && s.year < 1990,
    run: (s) => {
      if (chance(s, 0.35)) {
        delete (s.storySeen ??= {})['hist:hgangnam'];
        return `복덕방 영감이 귓속말을 했다. "${pick(s, ['영동 쪽', '잠실 뽕밭', '반포 논밭', '목동 쪽'])}이 곧 개발된다는구먼." (내년 땅 사기 기회가 올 수 있다)`;
      }
      return pick(s, ['하루 종일 논두렁만 걸었다. 막걸리 한 사발 얻어먹고 왔다.', '"요즘 땅값이 너무 올랐어." 복덕방 영감이 혀를 찼다.']);
    },
  },
  {
    id: 'h_newspaper',
    cat: '재산',
    icon: '🗞',
    name: '신문 배달·구두닦이',
    desc: '새벽 신문 배달로 학비를 보탠다 (공부 시간 조금 줄어듦)',
    ap: 1,
    who: 'kid',
    show: (s) => inHistory(s) && s.year < 1990,
    run: (s) => {
      const h = s.people[s.headId];
      const v = Math.round(120 * wi(s));
      h.cash += v;
      if (typeof h.study === 'number') h.study = Math.max(0, h.study - 1);
      mark(h, 'selfmade');
      h.actual.str = clamp(h.actual.str + 1, 0, Math.max(h.potential.str, h.actual.str));
      return `새벽 4시, 자전거에 신문 뭉치를 싣고 달렸다. 한 달에 ${formatWon(Math.round(v / 12))} 남짓. 손이 얼어 터졌지만 뿌듯하다.`;
    },
  },
  {
    id: 'h_hanja',
    cat: '진로·자기계발',
    icon: '📜',
    name: '한문·붓글씨 배우기',
    desc: '할아버지께 천자문과 붓글씨를 배운다 (지능·성품)',
    ap: 1,
    who: 'kid',
    show: (s) => inHistory(s) && s.year < 1985,
    run: (s) => {
      const h = s.people[s.headId];
      h.actual.int = clamp(h.actual.int + 1, 0, Math.max(h.potential.int, h.actual.int));
      h.actual.mor = clamp(h.actual.mor + 1, 0, Math.max(h.potential.mor, h.actual.mor));
      return '먹을 갈고 "永" 자를 백 번 썼다. 손목이 시큰하다.';
    },
  },
  {
    id: 'h_saving',
    cat: '재산',
    icon: '🏦',
    name: '재형저축 가입',
    desc: '근로자 재산형성저축 (1976~1995): 연 20%대 고금리에 비과세',
    ap: 1,
    who: 'adult',
    show: (s) => inHistory(s) && s.year >= 1976 && s.year < 1996,
    run: (s) => {
      const h = householder(s);
      if (h.cash <= 0) return '넣을 돈이 없다.';
      const gain = Math.round(Math.min(h.cash, 2000 * wi(s)) * 0.08);
      h.cash += gain;
      return `월급날마다 은행 창구에 줄을 섰다. 비과세 고금리 이자 ${formatWon(gain)}이 붙었다.`;
    },
  },
  // ── 유튜브·인스타 대신: 그 시절 이름을 알리는 법 ──
  {
    id: 'h_song_contest',
    cat: '사회',
    icon: '🎤',
    name: '전국노래자랑 나가기',
    desc: '일요일 낮 KBS 전국노래자랑 예심에 나간다 (1980~). 잘하면 동네 스타 (매력·명성)',
    ap: 1,
    who: 'any',
    show: (s) => inHistory(s) && s.year >= 1980 && s.year < 2008,
    run: (s) => {
      const h = s.people[s.headId];
      const pass = h.actual.cha + (h.talents.some((t) => t.id === 'star') ? 25 : 0) > 55 || chance(s, 0.2);
      if (!pass) return (hap(h, 2), '예심에서 "땡!" 그래도 동네 사람들이 한참 놀렸다(칭찬이었다).');
      up(h, 'cha', 2);
      s.fame += chance(s, 0.25) ? 3 : 1;
      hap(h, 8);
      return chance(s, 0.25) ? '"딩동댕!" 최우수상! 사회자가 어깨를 두드렸다. 다음 날 시장에서 사람들이 알아본다.' : '"딩동댕~" 인기상을 받았다. 상품으로 냉장고를 탔다.';
    },
  },
  {
    id: 'h_radio_letter',
    cat: '사회',
    icon: '📻',
    name: '라디오에 사연 보내기',
    desc: '엽서 한 장에 우리 집 이야기를 적어 보낸다 (1964~2004). 읽히면 온 동네가 듣는다',
    ap: 1,
    who: 'any',
    show: (s) => inHistory(s) && s.year >= 1964 && s.year < 2005,
    run: (s) => {
      const h = s.people[s.headId];
      if (!chance(s, 0.3)) return (up(h, 'int', 1), '엽서를 정성껏 써서 부쳤다. 이번 주엔 소개되지 않았다. 글솜씨는 늘었다.');
      s.fame += 1;
      hap(h, 6);
      up(h, 'cha', 1);
      return 'DJ가 사연을 읽어 줬다! "○○동에 사는 청취자분이…" 식구들이 라디오 앞에서 소리를 질렀다. 선물로 카세트테이프를 받았다.';
    },
  },
  {
    id: 'h_penpal',
    cat: '진로·자기계발',
    icon: '✉',
    name: '펜팔 친구 사귀기',
    desc: '잡지 펜팔란에서 다른 도시·외국 친구와 편지를 주고받는다 (1965~1997, 매력·지능)',
    ap: 1,
    who: 'kid',
    show: (s) => inHistory(s) && s.year >= 1965 && s.year < 1998,
    run: (s) => {
      const h = s.people[s.headId];
      up(h, 'cha', 1);
      up(h, 'int', 1);
      return pick(s, ['부산 사는 친구와 편지를 주고받는다. 편지지에 향수를 뿌렸다.', '미국 오하이오의 펜팔 친구가 사진을 보내왔다. 사전을 뒤져 가며 답장을 썼다.', '군대 간 위문편지 상대와 펜팔을 시작했다. 우표가 쌓여 간다.']);
    },
  },
  {
    id: 'h_speech',
    cat: '진로·자기계발',
    icon: '📢',
    name: '웅변대회 나가기',
    desc: '"이 연사, 힘차게 외칩니다!" 반공·새마을 웅변대회 (1960~1990, 매력)',
    ap: 1,
    who: 'kid',
    show: (s) => inHistory(s) && s.year < 1991,
    run: (s) => {
      const h = s.people[s.headId];
      up(h, 'cha', 2);
      if (h.actual.cha >= 50 && chance(s, 0.4)) return (s.fame += 0.5), (hap(h, 6)), '"이 연사, 목 놓아 외칩니다!" 교육감상을 탔다. 조회 시간에 전교생 앞에서 상장을 받았다.';
      return '두 손을 번쩍 들고 외쳤다. 원고를 까먹어 잠깐 멈췄지만 박수를 받았다.';
    },
  },
  {
    id: 'h_abacus',
    cat: '자녀 교육',
    icon: '🧮',
    name: '주산 학원 보내기',
    desc: '"더하기 빼기~" 주산·암산은 은행·회사 취직의 무기 (1960~1990, 지능·성적)',
    ap: 1,
    who: 'any',
    show: (s) => inHistory(s) && s.year < 1991 && !!kidIn(s, 7, 15),
    run: (s) => {
      const kid = kidIn(s, 7, 15);
      if (!kid) return '주산 가르칠 아이가 없다.';
      householder(s).cash -= Math.round(15 * wi(s));
      up(kid, 'int', 1);
      kid.study = clamp((kid.study ?? 40) + 2, 0, 100);
      return `${fullName(kid)}이(가) 주판알을 튕긴다. 암산 급수 시험에서 3급을 땄다.`;
    },
  },
  {
    id: 'h_taekwondo',
    cat: '자녀 교육',
    icon: '🥋',
    name: '태권도장 보내기',
    desc: '동네 태권도장. 국기(國技)이자 방과 후 돌봄 (1970~, 근력·성품)',
    ap: 1,
    who: 'any',
    show: (s) => inHistory(s) && s.year >= 1970 && s.year < 2000 && !!kidIn(s, 6, 14),
    run: (s) => {
      const kid = kidIn(s, 6, 14);
      if (!kid) return '도장에 보낼 아이가 없다.';
      householder(s).cash -= Math.round(12 * wi(s));
      up(kid, 'str', 1);
      up(kid, 'mor', 1);
      return `${fullName(kid)}이(가) 노란 띠를 맸다. "태권!" 기합 소리가 우렁차다.`;
    },
  },
];

/** 학원 보낼 아이: 가주 본인이 그 나이면 본인, 아니면 그 나이의 자녀 */
function kidIn(s: GameState, lo: number, hi: number): Person | undefined {
  const h = s.people[s.headId];
  const ok = (p: Person) => alive(p) && age(s, p) >= lo && age(s, p) <= hi;
  if (ok(h)) return h;
  return Object.values(s.people).find((p) => ok(p) && parentsOf(s, p).some((q) => q.id === h.id));
}

/** 인생 사건 카드에서 쓸 시대 판 교체 (없으면 현대판) */
export function histOverride(s: GameState, defId: string): EventDef | undefined {
  if (!inHistory(s)) return undefined;
  return HIST_OVERRIDES[defId]?.(s);
}

