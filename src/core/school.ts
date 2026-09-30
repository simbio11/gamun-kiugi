// 학창 시절 → 수능 → 정시 원서 3장 → 합격 발표 → 등록 or 재수.
// 매년 어떻게 보낼지(학원·과외·인강·동아리·놀기…) 고르면 성적(study)과 사교육비(eduSpent)가 쌓이고,
// 수능 백분위 = 성적·지능·사교육비·컨디션. 대학·학과마다 합격선과 경쟁률이 있고, 학과가 진로를 연다.

import { chance, int, next, normal, pick } from './rng';
import { SURNAMES, TALENTS } from './data';
import { formatMoney } from './economy';
import {
  applyDesire,
  gate,
  iga,
  ok,
  req,
  schedule,
  setJob,
  setStudy,
  tr,
  who,
  type Choice,
  type Ctx,
  type EventDef,
} from './ev-util';
import { addFlag, age, check, clamp, discoverTalent, hasFlag, hasTalent, hasTrait, mark, markOf, randomName } from './people';
import type { CareerTag, Focus, GameState, Person } from './types';
import { studyBoost, suneungBonus } from './marks';
import { bonusStudy } from './rewards';
import { hoodOf } from './housing';
import { spendable } from './ev-util';
import { planLine, specialChoices, yearMood } from './school-flavor';
import { bindKin, fitCats, temperamentLine, topInterests } from './interests';
import { JOB_CATS } from './jobs';

// ───────────────────────── 대학·학과 ─────────────────────────

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'X';
export const TIERS: Record<Tier, { name: string; flag: string; tuition: number }> = {
  S: { name: '서울대', flag: 'univ_top', tuition: 600 },
  A: { name: '연고대', flag: 'univ_top', tuition: 950 },
  B: { name: '인서울', flag: 'univ_seoul', tuition: 900 },
  C: { name: '지방 거점국립대', flag: 'univ_local', tuition: 450 },
  D: { name: '지방 사립대', flag: 'univ_local', tuition: 850 },
  E: { name: '전문대', flag: 'college', tuition: 700 },
  X: { name: '특수대학', flag: 'univ_top', tuition: 0 },
};

export interface Program {
  id: string;
  tier: Tier;
  /** 표시용 학교 이름 (없으면 등급 이름) */
  school?: string;
  major: string;
  /** 전공 키: 졸업 후 추천 직업 */
  key: string;
  /** 정시 합격선 (수능 백분위) */
  cut: number;
  years: number;
  /** 특수 트랙 (졸업하면 국가고시·임관 등). 없으면 일반 졸업 → 진로 선택 */
  track?: string;
  tuition?: number;
  /** 예체능 실기: 실기 능력치와 비중 */
  practical?: { stat: 'cha' | 'str'; need: number };
  /** 추가 조건 (사관학교 체력 등) */
  need?: { stat: 'str' | 'hp'; min: number };
  tag: CareerTag;
  /** 특별 전형으로만 (sci: 과학고·영재 특별전형, abroad: 해외 대학, military: 사관학교·경찰대 1차 시험, voc: 해외 요리·디자인·예술 전문학교) */
  special?: 'sci' | 'abroad' | 'military' | 'voc';
  /** 한 줄 소개 (선택지 뱃지) */
  note?: string;
  /** 명문 전문학교 졸업장: 그 분야 취업에 크게 유리 (직업 분야) */
  elite?: string;
  /** 여대: 여학생만 */
  sex?: 'F';
}

const P: Program[] = [];
function prog(tier: Tier, major: string, key: string, cut: number, o: Partial<Program> = {}) {
  P.push({ id: `${tier}_${key}_${P.length}`, tier, major, key, cut, years: 4, tag: 'study', ...o });
}
// 의약
prog('S', '의예과', 'med', 99.8, { years: 6, track: 'med_school', tuition: 1200 });
prog('C', '의예과', 'med', 99.1, { school: '경북대', years: 6, track: 'med_school', tuition: 1100 });
prog('A', '치의예과', 'dent', 99.2, { school: '연세대', years: 6, track: 'dent_school', tuition: 1300 });
prog('C', '치의예과', 'dent', 98.7, { school: '전남대', years: 6, track: 'dent_school', tuition: 1000 });
prog('D', '한의예과', 'kmd', 98.0, { school: '대구한의대', years: 6, track: 'kmd_school', tuition: 1100 });
prog('S', '수의예과', 'vet', 98.5, { years: 6, track: 'vet_school' });
prog('C', '수의예과', 'vet', 97.0, { school: '충남대', years: 6, track: 'vet_school' });
prog('A', '약학과', 'pharm', 98.8, { school: '연세대', years: 6, track: 'pharm_school', tuition: 1100 });
prog('C', '약학부', 'pharm', 98.3, { school: '부산대', years: 6, track: 'pharm_school' });
prog('B', '간호학과', 'nurse', 90, { track: 'nurse_school', tag: 'public' });
prog('D', '간호학과', 'nurse', 72, { track: 'nurse_school', tag: 'public' });
prog('D', '물리치료학과', 'pt', 62, { track: 'health_pt', tag: 'public' });
prog('E', '물리치료과', 'pt', 45, { years: 3, track: 'health_pt', tag: 'public' });
prog('D', '방사선학과', 'radio', 58, { track: 'health_radio', tag: 'public' });
prog('E', '임상병리과', 'clinical', 42, { years: 3, track: 'health_clinical', tag: 'public' });
prog('E', '응급구조과', 'emt', 40, { years: 3, track: 'health_emt', tag: 'public' });
// 교육
prog('X', '초등교육과', 'edu_elem', 91, { school: '교육대학교', track: 'edu_elem', tuition: 350, tag: 'public' });
prog('S', '사범대 (수학교육)', 'edu', 97.5, { track: 'edu_school', tag: 'public' });
prog('B', '사범대 (국어교육)', 'edu', 88, { track: 'edu_school', tag: 'public' });
prog('C', '사범대 (영어교육)', 'edu', 80, { track: 'edu_school', tag: 'public' });
prog('E', '유아교육과', 'kinder', 40, { years: 3, track: 'kinder_edu', tag: 'public' });
// 특수대학
prog('X', '치안학과 (4년 · 경위 임관)', 'police', 97, { school: '경찰대학', special: 'military', track: 'police_univ', need: { stat: 'str', min: 35 }, tag: 'public', note: '학비 국비 · 졸업 즉시 경위' });
prog('X', '생도 (4년 · 소위 임관)', 'army', 93.5, { school: '육군사관학교', special: 'military', track: 'academy', need: { stat: 'hp', min: 45 }, tag: 'public', note: '경쟁률 약 30:1 · 학비 전액 국비' });
prog('X', '항해학부', 'marine', 72, { school: '한국해양대', track: 'maritime', tuition: 400, tag: 'free' });
prog('X', '항공운항학과', 'flight', 91, { school: '항공대', track: 'flight_univ', tuition: 1100, need: { stat: 'hp', min: 45 } });
// 문과
prog('S', '경영학과', 'biz', 98.7, { tag: 'business' });
prog('A', '경영학과', 'biz', 96.5, { tag: 'business' });
prog('B', '경영학과', 'biz', 89, { tag: 'business' });
prog('C', '경영학과', 'biz', 76, { tag: 'business' });
prog('D', '경영학과', 'biz', 50, { tag: 'business' });
prog('S', '경제학부', 'econ', 98.5);
prog('A', '경제학과', 'econ', 96);
prog('C', '경제학과', 'econ', 74);
prog('A', '자유전공 (법학)', 'law', 96.8);
prog('B', '법학과', 'law', 88);
prog('B', '행정학과', 'admin', 86, { tag: 'public' });
prog('C', '행정학과', 'admin', 72, { tag: 'public' });
prog('D', '행정학과', 'admin', 48, { tag: 'public' });
prog('A', '미디어학부', 'media', 96, { tag: 'stage' });
prog('B', '신문방송학과', 'media', 87, { tag: 'stage' });
prog('D', '미디어콘텐츠학과', 'media', 52, { tag: 'stage' });
prog('A', '영어영문학과', 'lang', 95);
prog('B', '중어중문학과', 'lang', 84);
prog('D', '관광영어과', 'lang', 45, { tag: 'free' });
prog('C', '사회복지학과', 'welfare', 62, { tag: 'public' });
prog('D', '사회복지학과', 'welfare', 40, { tag: 'public' });
// 이공
prog('S', '컴퓨터공학부', 'cs', 98.9);
prog('A', '컴퓨터학과', 'cs', 96.5);
prog('B', '소프트웨어학과', 'cs', 89);
prog('C', '컴퓨터공학과', 'cs', 78);
prog('D', '컴퓨터공학과', 'cs', 52);
prog('S', '전기정보공학부', 'ee', 98.6);
prog('A', '반도체공학과 (계약학과)', 'ee', 97.2);
prog('C', '전자공학과', 'ee', 77);
prog('A', '기계공학부', 'mech', 95.5);
prog('B', '기계공학과', 'mech', 86);
prog('C', '기계공학과', 'mech', 74);
prog('D', '기계공학과', 'mech', 48);
prog('A', '건축학과 (5년제)', 'arch', 95, { years: 5, tag: 'stage' });
prog('B', '건축학과 (5년제)', 'arch', 86, { years: 5, tag: 'stage' });
prog('D', '건축학과 (5년제)', 'arch', 50, { years: 5, tag: 'stage' });
prog('S', '생명과학부', 'bio', 98);
prog('C', '생명과학과', 'bio', 73);
prog('C', '농생명과학대학', 'agri', 64, { tag: 'free' });
prog('D', '스마트팜학과', 'agri', 42, { tag: 'business' });
// 특별 전형 (정시 원서로는 못 간다)
prog('X', 'KAIST 새내기과정', 'cs', 98.5, { school: 'KAIST', special: 'sci', tuition: 0 });
prog('X', 'POSTECH 무학과', 'ee', 98.3, { school: 'POSTECH', special: 'sci', tuition: 0 });
prog('X', 'UNIST 이공계열', 'bio', 96, { school: 'UNIST', special: 'sci', tuition: 0 });
prog('X', '미국 명문대 경영학', 'biz', 95, { school: '해외 대학', special: 'abroad', tuition: 8000, tag: 'business' });
prog('X', '미국 명문대 컴퓨터과학', 'cs', 96, { school: '해외 대학', special: 'abroad', tuition: 8000 });
prog('X', '영국 대학 디자인', 'design', 85, { school: '해외 대학', special: 'abroad', tuition: 6000, tag: 'stage' });
// 전문대
prog('E', '호텔조리과', 'cook', 35, { years: 2, tag: 'free' });
prog('E', '뷰티디자인과', 'beauty', 30, { years: 2, tag: 'stage' });
prog('E', '항공서비스과', 'air', 50, { years: 2, tag: 'free' });
prog('E', '자동차과', 'auto', 25, { years: 2, tag: 'free' });
prog('E', 'IT소프트웨어과', 'itc', 38, { years: 2 });
// 예체능 (실기 70% + 수능 30%)
prog('S', '미술대학', 'art', 70, { track: 'art_school', practical: { stat: 'cha', need: 75 }, tag: 'stage' });
prog('B', '미술대학', 'art', 55, { school: '홍익대', track: 'art_school', practical: { stat: 'cha', need: 62 }, tag: 'stage' });
prog('D', '시각디자인과', 'design', 35, { practical: { stat: 'cha', need: 48 }, tag: 'stage' });
prog('S', '음악대학', 'music', 70, { track: 'music_school', practical: { stat: 'cha', need: 76 }, tag: 'stage' });
prog('D', '실용음악과', 'music', 30, { track: 'music_school', practical: { stat: 'cha', need: 52 }, tag: 'stage' });
prog('A', '연기예술학과', 'acting', 60, { school: '성균관대', practical: { stat: 'cha', need: 70 }, tag: 'stage' });
prog('D', '연기예술과', 'acting', 30, { practical: { stat: 'cha', need: 50 }, tag: 'stage' });
prog('S', '체육교육과', 'sport', 75, { practical: { stat: 'str', need: 72 }, tag: 'sport' });
prog('C', '체육학과', 'sport', 45, { practical: { stat: 'str', need: 58 }, tag: 'sport' });

// ── 선택지 보강: 같은 전공 키라도 학교·학과를 다양하게 ──
prog('B', '회계학과', 'biz', 85, { tag: 'business' });
prog('C', '무역학과', 'econ', 70, { tag: 'business' });
prog('D', '국제통상학과', 'econ', 46, { tag: 'business' });
prog('A', '정치외교학과', 'admin', 95.5, { tag: 'public' });
prog('B', '심리학과', 'welfare', 88, { tag: 'public' });
prog('C', '경찰행정학과', 'admin', 74, { tag: 'public' });
prog('D', '소방행정학과', 'admin', 44, { tag: 'public' });
prog('D', '군사학과', 'admin', 42, { tag: 'public' });
prog('B', '광고홍보학과', 'media', 86, { tag: 'stage' });
prog('C', '문예창작학과', 'media', 66, { tag: 'stage' });
prog('D', '웹툰·만화콘텐츠학과', 'media', 40, { tag: 'stage', practical: { stat: 'cha', need: 45 } });
prog('E', '방송영상과', 'media', 32, { years: 2, tag: 'stage' });
prog('C', '일어일문학과', 'lang', 64);
prog('B', '국어국문학과', 'lang', 85);
prog('C', '사학과', 'lang', 66);
prog('C', '철학과', 'lang', 64);
prog('B', '통계학과', 'cs', 88);
prog('A', '데이터사이언스학과', 'cs', 96);
prog('C', '정보보안학과', 'cs', 70);
prog('E', '게임콘텐츠과', 'itc', 34, { years: 2 });
prog('B', '화학공학과', 'bio', 89);
prog('C', '화학과', 'bio', 70);
prog('B', '신소재공학과', 'ee', 87);
prog('C', '전기공학과', 'ee', 72);
prog('D', '전자공학과', 'ee', 46);
prog('B', '항공우주공학과', 'mech', 88);
prog('C', '조선해양공학과', 'mech', 68);
prog('D', '자동차공학과', 'mech', 44);
prog('C', '도시공학과', 'arch', 66, { tag: 'stage' });
prog('C', '토목공학과', 'mech', 62);
prog('B', '식품영양학과', 'nurse', 80, { tag: 'public' });
prog('C', '산림환경학과', 'agri', 58, { tag: 'free' });
prog('C', '해양생명과학과', 'agri', 56, { tag: 'free' });
prog('D', '동물자원학과', 'agri', 40, { tag: 'free' });
prog('C', '외식조리학과', 'cook', 55, { tag: 'free' });
prog('D', '호텔관광경영학과', 'air', 45, { tag: 'free' });
prog('D', '반려동물학과', 'agri', 38, { tag: 'free' });
prog('E', '제과제빵과', 'cook', 28, { years: 2, tag: 'free' });
prog('E', '항공정비과', 'auto', 36, { years: 2, tag: 'free' });
prog('E', '전기과 (산업체 위탁)', 'auto', 22, { years: 2, tag: 'free' });
prog('E', '스포츠재활과', 'pt', 34, { years: 3, tag: 'sport' });
prog('E', '치위생과', 'clinical', 44, { years: 3, tag: 'public' });
prog('D', '작업치료학과', 'pt', 50, { tag: 'public' });
prog('B', '체육학과 (스포츠산업)', 'sport', 55, { practical: { stat: 'str', need: 64 }, tag: 'sport' });
prog('C', '무용학과', 'acting', 40, { practical: { stat: 'cha', need: 60 }, tag: 'stage' });
prog('D', 'e스포츠학과', 'sport', 30, { practical: { stat: 'str', need: 40 }, tag: 'sport' });


// ───────── 대학 선택지 대확장: 실제 학교 이름으로 (2025학년도 전후 입시 자료 참고, 게임용으로 단순화) ─────────
const NO_FEE = 0;
// 사관학교·국군 (1차 필기 → 2차 체력·면접 → 수능 반영. 수시·정시와 별도로 지원 가능)
const MIL = { special: 'military' as const, tuition: NO_FEE, tag: 'public' as const };
prog('X', '생도 (4년 · 해군 소위 임관)', 'army', 92.5, { ...MIL, school: '해군사관학교', track: 'academy', need: { stat: 'hp', min: 48 }, note: '경쟁률 약 26:1 · 원양 순항훈련' });
prog('X', '생도 (4년 · 공군 소위 임관)', 'army', 93, { ...MIL, school: '공군사관학교', track: 'academy_air', need: { stat: 'hp', min: 52 }, note: '조종 특기 · 신체검사 엄격' });
prog('X', '생도 (4년 · 간호장교)', 'nurse', 92, { ...MIL, school: '국군간호사관학교', track: 'academy_nurse', need: { stat: 'hp', min: 40 }, note: '간호사 면허 + 소위 임관' });
prog('X', '해양경찰학과 (특채)', 'police', 72, { ...MIL, school: '한국해양대', tuition: 400, track: 'coast_guard', need: { stat: 'hp', min: 45 }, note: '졸업 후 해경 간부후보' });
prog('X', '철도운전시스템 (2년)', 'rail', 70, { school: '한국교통대 철도대학', years: 2, tuition: 350, track: 'rail', tag: 'public', note: '기관사 면허로 직행' });
prog('X', '항해·기관학부', 'marine', 58, { school: '목포해양대', tuition: 350, track: 'maritime', tag: 'free', note: '승선 실습 · 해기사' });
prog('X', '항공운항학과', 'flight', 84, { school: '한서대', tuition: 1100, track: 'flight_univ', need: { stat: 'hp', min: 45 }, note: '자체 비행장 · 조종사' });
// 국립 특수대
prog('X', '초등교육과', 'edu_elem', 93, { school: '서울교육대학교', track: 'edu_elem', tuition: 350, tag: 'public', note: '임용 합격률 높음' });
prog('X', '초등교육과', 'edu_elem', 86, { school: '춘천교육대학교', track: 'edu_elem', tuition: 350, tag: 'public', note: '지역 교대' });
prog('X', '사범대 (교원 양성 특화)', 'edu', 90, { school: '한국교원대학교', track: 'edu_school', tuition: 350, tag: 'public', note: '전원 기숙사 · 임용 강세' });
prog('X', '스마트팜·축산 (3년)', 'agri', 48, { school: '한국농수산대학교', years: 3, tuition: NO_FEE, track: 'agri_univ', tag: 'business', note: '학비 전액 국비 · 졸업 후 영농' });
prog('X', '문화재보존과학과', 'heritage', 70, { school: '한국전통문화대학교', tuition: 350, tag: 'public', note: '국가유산 전문가' });
prog('X', '생활체육·경기지도', 'sport', 55, { school: '한국체육대학교', tuition: 400, practical: { stat: 'str', need: 76 }, tag: 'sport', note: '국가대표 산실' });
// 한국예술종합학교 (수능 없이 실기 위주)
prog('X', '미술원 조형예술과', 'art', 50, { school: '한국예술종합학교', tuition: 350, track: 'art_school', practical: { stat: 'cha', need: 80 }, tag: 'stage', note: '실기 100% 가까이' });
prog('X', '음악원 기악과', 'music', 50, { school: '한국예술종합학교', tuition: 350, track: 'music_school', practical: { stat: 'cha', need: 82 }, tag: 'stage', note: '콩쿠르 입상자 즐비' });
prog('X', '연극원 연기과', 'acting', 50, { school: '한국예술종합학교', tuition: 350, practical: { stat: 'cha', need: 80 }, tag: 'stage', note: '배우 사관학교' });
prog('X', '영상원 영화과', 'film', 55, { school: '한국예술종합학교', tuition: 350, practical: { stat: 'cha', need: 76 }, tag: 'stage', note: '감독·촬영' });
prog('X', '영상원 애니메이션과', 'anim', 55, { school: '한국예술종합학교', tuition: 350, practical: { stat: 'cha', need: 74 }, tag: 'stage' });
prog('X', '무용원 실기과', 'acting', 45, { school: '한국예술종합학교', tuition: 350, practical: { stat: 'cha', need: 78 }, tag: 'stage' });
// 이공 특성화 (영재·과학고 특별전형)
prog('X', '기초교육학부', 'bio', 95.5, { school: 'GIST', special: 'sci', tuition: 0, note: '전원 장학 · 광주' });
prog('X', '기초학부', 'ee', 95, { school: 'DGIST', special: 'sci', tuition: 0, note: '무학과 융복합' });
prog('X', '에너지공학부', 'ee', 94.5, { school: '한국에너지공대 (KENTECH)', special: 'sci', tuition: 0, note: '나주 · 에너지 특화' });
// 이름 있는 학과들 (정시)
prog('A', '반도체시스템공학과 (계약학과)', 'ee', 97.8, { school: '성균관대', note: '대기업 채용 연계' });
prog('A', '연극영화학과', 'acting', 60, { school: '중앙대', practical: { stat: 'cha', need: 72 }, tag: 'stage' });
prog('A', '통번역학과', 'lang', 94, { school: '한국외대', tag: 'free' });
prog('B', '조리과학과', 'cook', 82, { school: '경희대', tag: 'free', note: '호텔·외식 명문' });
prog('B', '호텔관광경영학과', 'hotel', 83, { school: '세종대', tag: 'free' });
prog('B', '공업디자인학과', 'design', 50, { school: '국민대 조형대', practical: { stat: 'cha', need: 64 }, tag: 'stage' });
prog('B', '패션디자인학과', 'fashion', 50, { school: '홍익대', practical: { stat: 'cha', need: 66 }, tag: 'stage' });
prog('B', '영상애니메이션학과', 'anim', 45, { school: '세종대', practical: { stat: 'cha', need: 60 }, tag: 'stage' });
prog('B', '게임소프트웨어학과', 'game', 84, { school: '인서울 게임학과', tag: 'study' });
prog('D', '글로벌외식조리 (영어 수업)', 'cook', 44, { school: '우송대 솔브릿지', tuition: 1100, tag: 'free', note: '해외 셰프 교수진' });
prog('D', '호텔외식조리학과', 'cook', 40, { tag: 'free' });
prog('D', '패션산업학과', 'fashion', 40, { tag: 'stage' });
prog('D', '항공정비학과', 'auto', 40, { tag: 'free' });
prog('D', '철도경영·운전학과', 'rail', 38, { tag: 'public' });
prog('D', '경찰경호학과', 'police', 38, { tag: 'public' });
prog('D', '문화재·관광학과', 'heritage', 36, { tag: 'free' });
prog('C', '해양경찰학과', 'police', 62, { tag: 'public' });
prog('C', '항공교통물류학과', 'marine', 58, { tag: 'free' });
// 전문대 (실무형)
prog('E', '자동화·전기·반도체장비 (2년)', 'auto', 12, { school: '한국폴리텍대학', years: 2, tuition: 250, tag: 'free', note: '학비 저렴 · 취업률 높음' });
prog('E', '컴퓨터정보계열 (주문식 교육)', 'itc', 40, { school: '영진전문대', years: 3, tag: 'study', note: '대기업 협약반' });
prog('E', '연기과', 'acting', 30, { school: '서울예술대학교', years: 3, practical: { stat: 'cha', need: 66 }, tag: 'stage', note: '방송·예능인 배출' });
prog('E', '실용음악과', 'music', 30, { school: '서울예술대학교', years: 3, track: 'music_school', practical: { stat: 'cha', need: 64 }, tag: 'stage' });
prog('E', '문예창작과', 'media', 34, { school: '서울예술대학교', years: 3, tag: 'stage' });
prog('E', '시각디자인과', 'design', 28, { school: '계원예술대학교', years: 3, practical: { stat: 'cha', need: 52 }, tag: 'stage' });
prog('E', '방송영상과', 'film', 26, { school: '동아방송예술대학교', years: 2, practical: { stat: 'cha', need: 48 }, tag: 'stage' });
prog('E', '만화·애니메이션·게임', 'anim', 24, { school: '청강문화산업대학교', years: 3, practical: { stat: 'cha', need: 46 }, tag: 'stage', note: '웹툰 작가 산실' });
prog('E', '조리과학과', 'cook', 22, { years: 2, tag: 'free' });
prog('E', '호텔관광과', 'hotel', 26, { years: 2, tag: 'free' });
prog('E', '패션디자인과', 'fashion', 24, { years: 2, tag: 'stage' });
prog('E', '반려동물보건과', 'agri', 24, { years: 3, tag: 'free' });
prog('E', '사회복지과', 'welfare', 20, { years: 2, tag: 'public' });
prog('E', '경호보안과', 'police', 20, { years: 2, tag: 'public' });
prog('E', '철도운전과', 'rail', 30, { years: 2, tag: 'public' });
prog('E', '세무회계과', 'biz', 24, { years: 2, tag: 'business' });
// 해외 대학 (영어·에세이·인터뷰. 학비·생활비 합쳐 연 만원 단위)
const AB = { special: 'abroad' as const };
prog('X', '경제학 (Harvard)', 'econ', 99, { ...AB, school: '미국 하버드대', tuition: 12000, tag: 'business', note: '합격률 3%대' });
prog('X', '컴퓨터과학 (Stanford)', 'cs', 98.5, { ...AB, school: '미국 스탠퍼드대', tuition: 12000, note: '실리콘밸리 한복판' });
prog('X', '전기·컴퓨터공학 (MIT)', 'ee', 98.5, { ...AB, school: '미국 MIT', tuition: 12000 });
prog('X', 'PPE (철학·정치·경제)', 'admin', 97, { ...AB, school: '영국 옥스퍼드대', years: 3, tuition: 9000, tag: 'public', note: '3년제 · 튜토리얼' });
prog('X', '자연과학 (Natural Sciences)', 'bio', 97, { ...AB, school: '영국 케임브리지대', years: 3, tuition: 9000 });
prog('X', '경제학부', 'econ', 94, { ...AB, school: '일본 도쿄대', tuition: 2500, note: '일본어 필수' });
prog('X', '컴퓨팅학부', 'cs', 93, { ...AB, school: '싱가포르국립대 (NUS)', tuition: 5000, note: '아시아 1위권' });
prog('X', '공학부', 'ee', 90, { ...AB, school: '중국 칭화대', tuition: 2500, note: '중국어 필수' });
prog('X', '기계공학', 'mech', 88, { ...AB, school: '독일 뮌헨공대 (TUM)', tuition: 3000, note: '독일어 · 학비 비교적 저렴' });
prog('X', '상경대 (Sauder)', 'biz', 85, { ...AB, school: '캐나다 UBC', tuition: 6000, tag: 'business' });
prog('X', '간호학', 'nurse', 78, { ...AB, school: '호주 시드니대', years: 3, tuition: 6000, tag: 'public', note: '현지 취업·이민 루트' });
prog('X', '2년 후 4년제 편입', 'biz', 50, { ...AB, school: '미국 커뮤니티 칼리지', years: 2, tuition: 3000, tag: 'business', note: '문턱 낮음 · 편입 루트' });
// 해외 전문학교 (요리·디자인·예술: 실력·관심·돈이 필요. 수능과 무관)
const VOC = { special: 'voc' as const };
prog('X', '그랑 디플로마 (요리·제과)', 'cook', 60, { ...VOC, school: '프랑스 르 꼬르동 블루 파리', years: 1, tuition: 9500, elite: 'service', track: 'culinary', tag: 'free', note: '학비 약 6만 유로' });
prog('X', '조리예술 학사', 'cook', 66, { ...VOC, school: '미국 CIA 요리학교', years: 4, tuition: 8000, elite: 'service', track: 'culinary', tag: 'free', note: '뉴욕 하이드파크' });
prog('X', '조리사 본과', 'cook', 50, { ...VOC, school: '일본 츠지조리사전문학교', years: 1, tuition: 2500, elite: 'service', track: 'culinary', tag: 'free', note: '오사카 · 일식·프렌치' });
prog('X', '이탈리아 요리 마스터', 'cook', 55, { ...VOC, school: '이탈리아 ICIF 요리학교', years: 1, tuition: 3500, elite: 'service', track: 'culinary', tag: 'free', note: '현지 레스토랑 인턴' });
prog('X', '호텔경영 학사', 'hotel', 70, { ...VOC, school: '스위스 EHL 로잔 호텔학교', years: 4, tuition: 9000, elite: 'service', track: 'hotel_school', tag: 'business', note: '세계 1위 호텔스쿨' });
prog('X', '커뮤니케이션 디자인', 'design', 72, { ...VOC, school: '미국 파슨스 디자인스쿨', tuition: 9000, elite: 'media', tag: 'stage', note: '학비 연 6만 달러' });
prog('X', '패션디자인', 'fashion', 74, { ...VOC, school: '영국 센트럴 세인트 마틴', years: 3, tuition: 6500, elite: 'media', tag: 'stage', note: '런던 · 맥퀸 모교' });
prog('X', '파인아트·일러스트', 'art', 74, { ...VOC, school: '미국 RISD', tuition: 9000, elite: 'media', track: 'art_school', tag: 'stage' });
prog('X', '패션머천다이징 (2년)', 'fashion', 58, { ...VOC, school: '미국 뉴욕 FIT', years: 2, tuition: 5000, elite: 'media', tag: 'stage' });
prog('X', '현대음악·작곡', 'music', 70, { ...VOC, school: '미국 버클리 음대', tuition: 9000, elite: 'media', track: 'music_school', tag: 'stage', note: 'K팝 작곡가 다수' });
prog('X', '피아노·성악', 'music', 86, { ...VOC, school: '미국 줄리어드', tuition: 9000, elite: 'media', track: 'music_school', tag: 'stage', note: '합격률 한 자릿수' });
prog('X', '애니메이션 (2년)', 'anim', 50, { ...VOC, school: '일본 도쿄 애니메이션 전문학교', years: 2, tuition: 2000, elite: 'media', tag: 'stage' });
prog('X', '영화 연출 (1년)', 'film', 55, { ...VOC, school: '미국 뉴욕 필름 아카데미', years: 1, tuition: 6000, elite: 'media', tag: 'stage' });
prog('X', '게임 디자인 (1년)', 'game', 55, { ...VOC, school: '캐나다 밴쿠버 필름스쿨', years: 1, tuition: 5000, elite: 'tech', tag: 'stage' });

// ───────── 실명 대학 확장 (수시·정시 공통. 합격선은 대략적인 입결 서열을 게임용으로 단순화) ─────────
type UniMajor = [string, string, number, Partial<Program>?];
function uni(tier: Tier, school: string, base: number, majors: UniMajor[], o: Partial<Program> = {}) {
  for (const [major, key, d, mo] of majors) prog(tier, major, key, Math.round((base + d) * 10) / 10, { school, ...o, ...mo });
}
const BIZ: Partial<Program> = { tag: 'business' };
const PUB: Partial<Program> = { tag: 'public' };
const STG: Partial<Program> = { tag: 'stage' };
// 상위권
uni('A', '연세대', 96.5, [['경영학과', 'biz', 0.5, BIZ], ['컴퓨터과학과', 'cs', 0.3], ['의예과', 'med', 3.2, { years: 6, track: 'med_school', tuition: 1300 }], ['언론홍보영상학부', 'media', -0.8, STG], ['간호학과', 'nurse', -4, { track: 'nurse_school', ...PUB }]]);
uni('A', '고려대', 96.3, [['경영학과', 'biz', 0.5, BIZ], ['전기전자공학부', 'ee', 0.2], ['행정학과', 'admin', -0.3, PUB], ['식품자원경제학과', 'agri', -3, { tag: 'free' }], ['보건정책관리학부', 'welfare', -3, PUB]]);
uni('A', '서강대', 95.3, [['경제학과', 'econ', 0], ['컴퓨터공학과', 'cs', 0.2], ['신문방송학과', 'media', -0.3, STG]]);
uni('A', '성균관대', 95.5, [['글로벌경영학과', 'biz', 0.3, BIZ], ['소프트웨어학과', 'cs', 0.6], ['약학과', 'pharm', 2.8, { years: 6, track: 'pharm_school', tuition: 1100 }]]);
uni('A', '한양대', 95.2, [['기계공학부', 'mech', 0], ['건축학부 (5년)', 'arch', 0, { years: 5, ...STG }], ['경영학부', 'biz', 0.2, BIZ], ['연극영화학과', 'acting', -35, { practical: { stat: 'cha', need: 72 }, ...STG }]]);
// 인서울 중상위
uni('B', '중앙대', 92, [['경영학부', 'biz', 0.5, BIZ], ['약학부', 'pharm', 6, { years: 6, track: 'pharm_school', tuition: 1100 }], ['공공인재학부', 'admin', 0, PUB], ['첨단소재공학과', 'ee', 0]]);
uni('B', '경희대', 91.5, [['한의예과', 'kmd', 7, { years: 6, track: 'kmd_school', tuition: 1100 }], ['호텔경영학과', 'hotel', -1, { tag: 'free' }], ['경영학과', 'biz', 0.3, BIZ], ['간호학과', 'nurse', -1, { track: 'nurse_school', ...PUB }]]);
uni('B', '한국외대', 91, [['LT학부 (통번역)', 'lang', 0.5, { tag: 'free' }], ['국제통상학과', 'econ', 0, BIZ], ['Language & Diplomacy', 'admin', 0.3, PUB]]);
uni('B', '서울시립대', 91.5, [['세무학과', 'biz', 0, BIZ], ['도시행정학과', 'admin', 0, PUB], ['전자전기컴퓨터공학부', 'ee', 0], ['조경학과', 'agri', -3, { tag: 'free' }]], { tuition: 250 });
uni('B', '이화여대', 91, [['경영학부', 'biz', 0, BIZ], ['초등교육과', 'edu_elem', 1, { track: 'edu_school', ...PUB }], ['간호학부', 'nurse', -1, { track: 'nurse_school', ...PUB }]], { sex: 'F' });
uni('B', '건국대', 88.5, [['수의예과', 'vet', 8, { years: 6, track: 'vet_school' }], ['부동산학과', 'econ', -0.5, BIZ], ['경영학과', 'biz', 0, BIZ], ['스마트ICT융합공학과', 'cs', 0]]);
uni('B', '동국대', 88, [['경찰행정학부', 'police', 1.5, PUB], ['연극학부', 'acting', -30, { practical: { stat: 'cha', need: 70 }, ...STG }], ['경영학과', 'biz', 0, BIZ], ['컴퓨터공학전공', 'cs', 0]]);
uni('B', '홍익대', 87.5, [['건축학부 (5년)', 'arch', 0, { years: 5, ...STG }], ['경영학부', 'biz', -0.5, BIZ], ['게임소프트웨어전공', 'game', 0]]);
uni('B', '숙명여대', 87, [['경영학부', 'biz', 0, BIZ], ['약학부', 'pharm', 9, { years: 6, track: 'pharm_school', tuition: 1100 }], ['미디어학부', 'media', 0, STG]], { sex: 'F' });
uni('B', '국민대', 85.5, [['자동차공학과', 'mech', 0], ['경영학부', 'biz', 0, BIZ], ['소프트웨어학부', 'cs', 0.5]]);
uni('B', '숭실대', 85, [['컴퓨터학부', 'cs', 0.5], ['AI융합학부', 'cs', 0], ['경영학부', 'biz', -0.5, BIZ], ['사회복지학부', 'welfare', -2, PUB]]);
uni('B', '세종대', 84.5, [['호텔관광외식경영', 'hotel', 0, { tag: 'free' }], ['항공시스템공학과', 'mech', 0], ['만화애니메이션텍', 'anim', -40, { practical: { stat: 'cha', need: 60 }, ...STG }]]);
uni('B', '광운대', 83.5, [['전자공학과', 'ee', 0], ['로봇학부', 'mech', 0], ['미디어커뮤니케이션학부', 'media', -1, STG]]);
uni('B', '명지대', 81.5, [['경영정보학과', 'biz', 0, BIZ], ['건축학부', 'arch', 0, STG], ['영화뮤지컬학부', 'film', -35, { practical: { stat: 'cha', need: 62 }, ...STG }]]);
uni('B', '서울과학기술대', 84, [['기계시스템디자인공학과', 'mech', 0], ['컴퓨터공학과', 'cs', 0.5], ['안경광학과', 'clinical', -3, PUB]], { tuition: 450 });
uni('B', '인하대', 85, [['항공우주공학과', 'mech', 1], ['물류학과', 'marine', 0, BIZ], ['의예과', 'med', 13.5, { years: 6, track: 'med_school', tuition: 1200 }]]);
uni('B', '아주대', 84.5, [['의예과', 'med', 14, { years: 6, track: 'med_school', tuition: 1200 }], ['소프트웨어학과', 'cs', 0], ['경영학과', 'biz', -0.5, BIZ]]);
// 지방 거점국립대 (지역인재·지역균형 전형이 강하다)
const LOC: Partial<Program> = { tuition: 450 };
uni('C', '부산대', 79, [['경영학과', 'biz', 1, BIZ], ['기계공학부', 'mech', 1], ['의예과', 'med', 20, { years: 6, track: 'med_school', tuition: 1100 }], ['간호학과', 'nurse', 3, { track: 'nurse_school', ...PUB }], ['사범대 (국어교육)', 'edu', 3, { track: 'edu_school', ...PUB }]], LOC);
uni('C', '경북대', 78, [['전자공학부', 'ee', 2], ['행정학부', 'admin', 0, PUB], ['수의예과', 'vet', 17, { years: 6, track: 'vet_school' }], ['간호학과', 'nurse', 3, { track: 'nurse_school', ...PUB }]], LOC);
uni('C', '전남대', 76, [['의예과', 'med', 22.5, { years: 6, track: 'med_school', tuition: 1100 }], ['경영학부', 'biz', 0, BIZ], ['농업생명과학대학', 'agri', -6, { tag: 'free' }]], LOC);
uni('C', '충남대', 76, [['약학과', 'pharm', 20, { years: 6, track: 'pharm_school' }], ['자율운항시스템공학과', 'mech', 0], ['행정학부', 'admin', 0, PUB]], LOC);
uni('C', '전북대', 74, [['간호학과', 'nurse', 4, { track: 'nurse_school', ...PUB }], ['IT지능정보공학과', 'cs', 0], ['동물생명공학과', 'agri', -5, { tag: 'free' }]], LOC);
uni('C', '강원대', 70, [['산림과학부', 'agri', -4, { tag: 'free' }], ['수의예과', 'vet', 25, { years: 6, track: 'vet_school' }], ['관광경영학과', 'hotel', -3, { tag: 'free' }]], LOC);
uni('C', '충북대', 71, [['수의예과', 'vet', 25, { years: 6, track: 'vet_school' }], ['소프트웨어학과', 'cs', 2], ['사회복지학과', 'welfare', -4, PUB]], LOC);
uni('C', '경상국립대', 68, [['항공우주공학부', 'mech', 2], ['농업경제학과', 'agri', -4, { tag: 'free' }], ['간호학과', 'nurse', 5, { track: 'nurse_school', ...PUB }]], LOC);
uni('C', '제주대', 64, [['해양생명과학과', 'agri', -2, { tag: 'free' }], ['관광경영학과', 'hotel', 0, { tag: 'free' }], ['초등교육과 (교대)', 'edu_elem', 18, { track: 'edu_elem', ...PUB }]], LOC);
uni('C', '부경대', 68, [['해양생산시스템관리학부', 'marine', -3, { tag: 'free' }], ['식품공학과', 'bio', 0], ['경영학부', 'biz', 0, BIZ]], LOC);
uni('C', '한국교통대', 58, [['항공운항학과', 'flight', 20, { track: 'flight_univ', tuition: 900, need: { stat: 'hp', min: 45 } }], ['철도경영물류학과', 'rail', 0, PUB]], LOC);
// 지방 사립·수도권 중위권
uni('D', '가천대', 62, [['의예과', 'med', 36, { years: 6, track: 'med_school', tuition: 1200 }], ['간호학과', 'nurse', 8, { track: 'nurse_school', ...PUB }], ['게임영상학과', 'game', 0], ['경찰안보학과', 'police', 2, PUB]]);
uni('D', '단국대', 60, [['치의예과', 'dent', 37, { years: 6, track: 'dent_school', tuition: 1300 }], ['공연영화학부', 'film', -30, { practical: { stat: 'cha', need: 60 }, ...STG }], ['경영학부', 'biz', 0, BIZ]]);
uni('D', '영남대', 55, [['약학부', 'pharm', 41, { years: 6, track: 'pharm_school', tuition: 1100 }], ['새마을국제개발학과', 'admin', -3, PUB], ['기계공학부', 'mech', 0]]);
uni('D', '계명대', 50, [['패션마케팅학과', 'fashion', 0, STG], ['의예과', 'med', 47, { years: 6, track: 'med_school', tuition: 1200 }], ['호텔경영학과', 'hotel', 0, { tag: 'free' }]]);
uni('D', '동아대', 48, [['경찰학과', 'police', 3, PUB], ['조경학과', 'agri', 0, { tag: 'free' }], ['경영학과', 'biz', 0, BIZ]]);
uni('D', '조선대', 46, [['치의예과', 'dent', 50, { years: 6, track: 'dent_school', tuition: 1200 }], ['간호학과', 'nurse', 16, { track: 'nurse_school', ...PUB }], ['항공우주공학과', 'mech', 0]]);
uni('D', '한림대', 45, [['의예과', 'med', 53, { years: 6, track: 'med_school', tuition: 1200 }], ['사회복지학부', 'welfare', 0, PUB], ['미디어스쿨', 'media', 0, STG]]);
uni('D', '순천향대', 44, [['의예과', 'med', 54, { years: 6, track: 'med_school', tuition: 1200 }], ['물리치료학과', 'pt', 6, { track: 'health_pt', ...PUB }], ['관광경영학과', 'hotel', 0, { tag: 'free' }]]);
uni('D', '원광대', 42, [['한의예과', 'kmd', 55, { years: 6, track: 'kmd_school', tuition: 1100 }], ['경찰행정학과', 'police', 4, PUB], ['원예산업학과', 'agri', 0, { tag: 'free' }]]);
uni('D', '인제대', 42, [['의예과', 'med', 55.5, { years: 6, track: 'med_school', tuition: 1200 }], ['임상병리학과', 'clinical', 4, { track: 'health_clinical', ...PUB }], ['물리치료학과', 'pt', 6, { track: 'health_pt', ...PUB }]]);
uni('D', '대구대', 38, [['특수교육과', 'edu', 10, { track: 'edu_school', ...PUB }], ['재활심리학과', 'welfare', 0, PUB], ['컴퓨터정보공학부', 'cs', 0]]);
uni('D', '한남대', 36, [['경영학과', 'biz', 0, BIZ], ['건축학과 (5년)', 'arch', 2, { years: 5, ...STG }], ['경찰학과', 'police', 3, PUB]]);
uni('D', '울산대', 50, [['조선해양공학부', 'mech', 3], ['의예과', 'med', 49, { years: 6, track: 'med_school', tuition: 1200 }], ['화학공학부', 'bio', 1]]);
// 전문대 (실무·취업 중심)
uni('E', '명지전문대', 28, [['사회복지과', 'welfare', 0, { years: 2, ...PUB }], ['유아교육과', 'kinder', 4, { years: 3, track: 'kinder_edu', ...PUB }], ['전자공학과', 'itc', 0, { years: 2 }]]);
uni('E', '인하공업전문대', 35, [['항공운항서비스과', 'air', 6, { years: 2, tag: 'free' }], ['항공기계과', 'auto', 0, { years: 2, tag: 'free' }], ['컴퓨터시스템과', 'itc', 0, { years: 3 }]]);
uni('E', '대림대', 22, [['자동차과', 'auto', 0, { years: 2, tag: 'free' }], ['보건의료행정과', 'welfare', 0, { years: 3, ...PUB }]]);
uni('E', '동양미래대', 30, [['로봇소프트웨어과', 'itc', 0, { years: 3 }], ['경영학과', 'biz', 0, { years: 2, ...BIZ }]]);
uni('E', '영남이공대', 25, [['간호학과', 'nurse', 20, { years: 4, track: 'nurse_school', ...PUB }], ['뷰티스타일리스트', 'beauty', -3, { years: 2, ...STG }], ['기계계열 (대기업 반)', 'auto', 0, { years: 2, tag: 'free' }]]);
uni('E', '경복대', 20, [['치위생과', 'clinical', 5, { years: 3, ...PUB }], ['호텔조리과', 'cook', 0, { years: 2, tag: 'free' }]]);
uni('E', '백석예술대', 22, [['실용음악과', 'music', 8, { years: 2, track: 'music_school', practical: { stat: 'cha', need: 55 }, ...STG }], ['외식산업학부', 'cook', 0, { years: 2, tag: 'free' }]]);


// ───────── 의·치·한·약·수의: 실제로 그 학과가 있는 대학만, 합격선은 대략적인 입결 서열 ─────────
// (서강대·국민대·홍익대 등은 의약계열이 없다. 성균관대는 의대·약대, 경희대는 의·치·한·약, 원광대는 의·치·한·약이 모두 있다)
const MD = { years: 6, track: 'med_school', tuition: 1200 };
const DD = { years: 6, track: 'dent_school', tuition: 1300 };
const KD = { years: 6, track: 'kmd_school', tuition: 1100 };
const PD = { years: 6, track: 'pharm_school', tuition: 1100 };
const VD = { years: 6, track: 'vet_school', tuition: 900 };
const REAL_MED: [Tier, string, string, string, number, Partial<Program>][] = [
  // 의예과
  ['A', '성균관대', '의예과', 'med', 99.7, MD], ['A', '가톨릭대', '의예과', 'med', 99.6, MD], ['A', '고려대', '의예과', 'med', 99.5, MD], ['A', '한양대', '의예과', 'med', 99.4, MD],
  ['B', '경희대', '의예과', 'med', 99.3, MD], ['B', '중앙대', '의예과', 'med', 99.3, MD], ['B', '이화여대', '의예과', 'med', 99.1, { ...MD, sex: 'F' }],
  ['C', '충남대', '의예과', 'med', 99.0, MD], ['C', '전북대', '의예과', 'med', 98.9, MD], ['C', '충북대', '의예과', 'med', 98.9, MD], ['C', '경상국립대', '의예과', 'med', 98.8, MD], ['C', '강원대', '의예과', 'med', 98.7, MD], ['C', '제주대', '의예과', 'med', 98.6, MD],
  ['D', '원광대', '의예과', 'med', 98.8, MD], ['D', '조선대', '의예과', 'med', 98.8, MD], ['D', '단국대', '의예과', 'med', 98.9, MD], ['D', '동아대', '의예과', 'med', 98.8, MD], ['D', '건양대', '의예과', 'med', 98.7, MD],
  ['D', '을지대', '의예과', 'med', 98.8, MD], ['D', '고신대', '의예과', 'med', 98.6, MD], ['D', '대구가톨릭대', '의예과', 'med', 98.7, MD], ['D', '연세대(미래)', '의예과', 'med', 98.9, MD], ['D', '건국대(글로컬)', '의예과', 'med', 98.8, MD],
  // 치의예과
  ['S', '서울대', '치의예과', 'dent', 99.3, DD], ['B', '경희대', '치의예과', 'dent', 98.9, DD], ['C', '경북대', '치의예과', 'dent', 98.9, DD], ['C', '부산대', '치의학과', 'dent', 98.9, DD], ['C', '강릉원주대', '치의예과', 'dent', 98.3, DD], ['D', '원광대', '치의예과', 'dent', 98.4, DD],
  // 한의예과
  ['B', '동국대(WISE)', '한의예과', 'kmd', 98.3, KD], ['D', '가천대', '한의예과', 'kmd', 98.3, KD], ['D', '동의대', '한의예과', 'kmd', 97.8, KD], ['D', '대전대', '한의예과', 'kmd', 97.8, KD],
  ['D', '상지대', '한의예과', 'kmd', 97.6, KD], ['D', '세명대', '한의예과', 'kmd', 97.5, KD], ['D', '우석대', '한의예과', 'kmd', 97.5, KD],
  // 약학
  ['S', '서울대', '약학계열', 'pharm', 99.0, PD], ['A', '고려대(세종)', '약학과', 'pharm', 98.2, PD], ['A', '가톨릭대', '약학과', 'pharm', 98.3, PD], ['B', '경희대', '약학과', 'pharm', 98.5, PD], ['B', '이화여대', '약학부', 'pharm', 98.6, { ...PD, sex: 'F' }],
  ['B', '동국대', '약학과', 'pharm', 98.0, PD], ['C', '경북대', '약학과', 'pharm', 98.2, PD], ['C', '전남대', '약학과', 'pharm', 98.0, PD], ['D', '원광대', '약학과', 'pharm', 97.5, PD], ['D', '조선대', '약학과', 'pharm', 97.4, PD],
  ['D', '계명대', '약학과', 'pharm', 97.4, PD], ['D', '인제대', '약학과', 'pharm', 97.3, PD],
  // 수의예과
  ['C', '전남대', '수의예과', 'vet', 96.8, VD], ['C', '전북대', '수의예과', 'vet', 96.8, VD], ['C', '경상국립대', '수의예과', 'vet', 96.5, VD], ['C', '제주대', '수의예과', 'vet', 96.3, VD],
];
for (const [tier, school, major, key, cut, o] of REAL_MED) prog(tier, major, key, cut, { school, ...o });
/** 앞서 만든 의약계열 합격선을 실제 서열에 맞춘다 */
const REAL_CUT: Record<string, number> = {
  '연세대 의예과': 99.7, '인하대 의예과': 99.2, '아주대 의예과': 99.3, '부산대 의예과': 99.2, '전남대 의예과': 99.0, '가천대 의예과': 99.1, '계명대 의예과': 98.9, '한림대 의예과': 99.0,
  '순천향대 의예과': 98.9, '인제대 의예과': 98.8, '울산대 의예과': 99.6, '단국대 치의예과': 98.5, '조선대 치의예과': 98.5, '경희대 한의예과': 99.0, '원광대 한의예과': 98.2,
  '성균관대 약학과': 98.8, '중앙대 약학부': 98.5, '숙명여대 약학부': 97.8, '충남대 약학과': 98.0, '영남대 약학부': 97.6, '건국대 수의예과': 97.5, '경북대 수의예과': 97.0, '강원대 수의예과': 96.5, '충북대 수의예과': 96.5,
};
for (const pr of P) {
  const nm = (pr.school ?? '') + ' ' + pr.major;
  if (REAL_CUT[nm] !== undefined) pr.cut = REAL_CUT[nm];
}

// ───────── 이름 없는 학과에 붙이는 가상의 학교 이름 (등급마다, 학과 순서대로 고정 배정) ─────────

// 이름 없던 상·중위권 학과마다 실제로 그 학과가 있는 대학을 직접 짝지었다 [학교, 실제 학과명]
const REAL_MAP: Record<string, [string, string?]> = {
  'B|간호학과': ['중앙대'], 'B|사범대 (국어교육)': ['동국대', '국어교육과'], 'C|사범대 (영어교육)': ['경북대', '영어교육과'],
  'A|경영학과': ['서강대', '경영학부'], 'B|경영학과': ['광운대', '경영학부'], 'C|경영학과': ['충남대', '경영학부'],
  'A|경제학과': ['성균관대'], 'C|경제학과': ['전남대', '경제학부'], 'A|자유전공 (법학)': ['고려대', '자유전공학부'], 'B|법학과': ['국민대', '법학부'],
  'B|행정학과': ['건국대'], 'C|행정학과': ['전북대'], 'A|미디어학부': ['고려대'], 'B|신문방송학과': ['중앙대', '미디어커뮤니케이션학부'],
  'A|영어영문학과': ['고려대'], 'B|중어중문학과': ['한국외대', '중국언어문화학부'], 'C|사회복지학과': ['전북대'],
  'A|컴퓨터학과': ['고려대'], 'B|소프트웨어학과': ['세종대'], 'C|컴퓨터공학과': ['부산대', '정보컴퓨터공학부'], 'A|반도체공학과 (계약학과)': ['고려대', '반도체공학과'],
  'C|전자공학과': ['충북대', '전자공학부'], 'A|기계공학부': ['연세대'], 'B|기계공학과': ['숭실대', '기계공학부'], 'C|기계공학과': ['경상국립대', '기계공학부'],
  'A|건축학과 (5년제)': ['고려대', '건축학과'], 'B|건축학과 (5년제)': ['세종대', '건축학과'], 'C|생명과학과': ['경북대', '생명과학부'], 'C|농생명과학대학': ['경북대', '농업생명과학대학'],
  'C|체육학과': ['충남대'], 'B|회계학과': ['숭실대'], 'C|무역학과': ['부산대', '무역학부'], 'A|정치외교학과': ['연세대'], 'B|심리학과': ['중앙대'],
  'C|경찰행정학과': ['동국대(WISE)', '경찰행정학부'], 'B|광고홍보학과': ['국민대', '미디어·광고학부'], 'C|문예창작학과': ['명지대'], 'C|일어일문학과': ['부산대'],
  'B|국어국문학과': ['동국대'], 'C|사학과': ['충남대'], 'C|철학과': ['경북대'], 'B|통계학과': ['동국대'], 'A|데이터사이언스학과': ['한양대', '데이터사이언스학부'],
  'C|정보보안학과': ['순천향대', '정보보호학과'], 'B|화학공학과': ['인하대'], 'C|화학과': ['부산대'], 'B|신소재공학과': ['인하대'], 'C|전기공학과': ['부산대'],
  'B|항공우주공학과': ['한국항공대', '항공우주및기계공학부'], 'C|조선해양공학과': ['부산대'], 'C|도시공학과': ['경상국립대'], 'C|토목공학과': ['충남대'],
  'B|식품영양학과': ['경희대'], 'C|산림환경학과': ['강원대', '산림환경과학대학'], 'C|해양생명과학과': ['부경대', '해양생물학과'], 'C|외식조리학과': ['전주대', '외식산업학과'],
  'B|체육학과 (스포츠산업)': ['국민대', '스포츠산업레저학과'], 'C|무용학과': ['부산대'], 'C|해양경찰학과': ['목포해양대', '해양경찰학부'], 'C|항공교통물류학과': ['한국항공대', '항공교통물류학부'],
};
for (const pr of P) {
  const m = !pr.school && REAL_MAP[pr.tier + '|' + pr.major];
  if (m) {
    pr.school = m[0];
    if (m[1]) pr.major = m[1];
  }
}
// 상위권·중위권·거점국립대는 실제 대학 (공학 계열이 없는 학교엔 공학을 붙이지 않는다), 하위권·전문대만 가상 이름
const ENG_KEYS = new Set(['cs', 'ee', 'mech', 'arch', 'bio']);
const NO_ENG = new Set(['한국외대']);
const LAW_UNDERGRAD = new Set(['국민대', '숭실대', '광운대', '명지대', '홍익대']);
const REAL_POOL: Partial<Record<Tier, string[]>> = {
  A: ['연세대', '고려대', '서강대', '성균관대', '한양대'],
  B: ['중앙대', '경희대', '한국외대', '서울시립대', '건국대', '동국대', '홍익대', '국민대', '숭실대', '세종대', '광운대', '명지대', '인하대', '아주대'],
  C: ['부산대', '경북대', '전남대', '충남대', '전북대', '강원대', '충북대', '경상국립대', '제주대'],
};
{
  const taken = new Set(P.map((pr) => (pr.school ?? '') + '|' + pr.major));
  const cursor: Partial<Record<Tier, number>> = {};
  for (const pr of P) {
    const pool = REAL_POOL[pr.tier];
    if (pr.school || !pool) continue;
    for (let k = 0; k < pool.length * 2; k++) {
      const i = (cursor[pr.tier] = ((cursor[pr.tier] ?? -1) + 1) % pool.length);
      const sc = pool[i];
      if (ENG_KEYS.has(pr.key) && NO_ENG.has(sc)) continue;
      // 로스쿨이 있는 대학은 학부 법학과가 없다
      if (pr.key === 'law' && pr.tier === 'B' && !LAW_UNDERGRAD.has(sc)) continue;
      if (taken.has(sc + '|' + pr.major)) continue;
      pr.school = sc;
      taken.add(sc + '|' + pr.major);
      break;
    }
  }
}
const FAKE_SCHOOLS: Partial<Record<Tier, string[]>> = {
  D: ['고라니대', '감자밭대', '벚꽃캠퍼스대', '한우마을대', '대나무숲대', '파도소리대', '사과나무대', '갈매기대', '느티나무대', '막차버스대', '기숙사천국대', '동네뒷산대'],
  E: ['내일바로취업전문대', '손기술폴리텍', '한우물전문대', '뚝딱이공대', '반짝예술전문대', '새벽별보건대', '출근길전문대', '장인정신전문대'],
};
{
  const used: Partial<Record<Tier, number>> = {};
  for (const pr of P) {
    const pool = FAKE_SCHOOLS[pr.tier];
    if (pr.school || !pool) continue;
    const i = used[pr.tier] ?? 0;
    used[pr.tier] = i + 1;
    pr.school = pool[i % pool.length];
  }
}

export const PROGRAMS: Record<string, Program> = Object.fromEntries(P.map((p) => [p.id, p]));

/** 전공 → 직업 분야 (관심·성향 추천용) */
export const KEY_CAT: Record<string, string> = {
  med: 'medical', dent: 'medical', kmd: 'medical', vet: 'medical', pharm: 'medical', nurse: 'medical', pt: 'medical', radio: 'medical', clinical: 'medical', emt: 'medical',
  edu: 'edu', edu_elem: 'edu', kinder: 'edu', police: 'public', army: 'public', admin: 'public', welfare: 'public',
  marine: 'transport', flight: 'transport', air: 'service', biz: 'biz', econ: 'office', law: 'legal',
  media: 'media', design: 'media', art: 'media', music: 'media', acting: 'media', lang: 'edu',
  cs: 'tech', ee: 'tech', mech: 'trade', bio: 'tech', arch: 'tech', agri: 'farm', cook: 'service', beauty: 'service',
  auto: 'trade', itc: 'tech', sport: 'sport',
  rail: 'transport', heritage: 'edu', film: 'media', anim: 'media', fashion: 'media', game: 'tech', hotel: 'service',
};
/** 이 학생의 관심·성향에 맞는 전공인가 */
/** 관심·성향 분야 집합 (학과마다 다시 계산하지 않게 한 번에) */
export const fitSet = (p: Person) => new Set<string>([...topInterests(p, 2, 2), ...fitCats(p, 2)]);
export const fitsMajor = (p: Person, pr: Program, set = fitSet(p)) => set.has(KEY_CAT[pr.key]);
export const programName = (p: Program) => `${p.school ?? TIERS[p.tier].name} ${p.major}`;

/** 전공별 추천 진로 (졸업 후 진로 선택의 '전공 추천' 탭) */
export const MAJOR_JOBS: Record<string, string[]> = {
  biz: ['corp', 'banker', 'analyst', 'accountant', 'marketer', 'trader', 'tax_accountant', 'founder'],
  econ: ['analyst', 'banker', 'public_corp', 'accountant', 'corp', 'appraiser'],
  law: ['civil', 'scrivener', 'labor_attorney', 'public_corp', 'corp'],
  admin: ['civil', 'tax_officer', 'public_corp', 'police', 'diplomat'],
  media: ['journalist', 'pd', 'announcer', 'marketer', 'youtuber', 'designer'],
  lang: ['trader', 'flight_attendant', 'diplomat', 'tour_guide', 'hotelier', 'corp'],
  welfare: ['social_worker', 'caregiver', 'civil'],
  cs: ['developer', 'data_scientist', 'security', 'game_dev', 'corp'],
  ee: ['chip_engineer', 'developer', 'patent_attorney', 'corp'],
  mech: ['mech_engineer', 'chip_engineer', 'patent_attorney', 'corp'],
  arch: ['architect', 'corp', 'appraiser'],
  bio: ['researcher', 'patent_attorney', 'corp'],
  agri: ['smart_farmer', 'farmer', 'rancher', 'civil'],
  cook: ['chef', 'hotelier', 'restaurant', 'cafe_owner'],
  beauty: ['hairdresser', 'nail_artist', 'online_shop'],
  air: ['flight_attendant', 'hotelier', 'tour_guide'],
  auto: ['mechanic', 'factory', 'trucker'],
  itc: ['developer', 'security', 'game_dev'],
  design: ['designer', 'game_dev', 'online_shop'],
  acting: ['actor', 'voice_actor', 'model', 'youtuber'],
  sport: ['trainer', 'police', 'firefighter', 'coach'],
  art: ['painter', 'designer'],
  music: ['musician'],
  army: ['officer', 'police', 'security', 'civil'],
  police: ['police', 'coast_guard', 'prison_guard', 'security', 'civil'],
  rail: ['train_driver', 'bus_driver', 'public_corp'],
  heritage: ['researcher', 'civil', 'tour_guide'],
  film: ['pd', 'photographer', 'youtuber', 'actor'],
  anim: ['writer', 'designer', 'game_dev'],
  fashion: ['designer', 'model', 'online_shop'],
  game: ['game_dev', 'developer', 'gamer'],
  hotel: ['hotelier', 'flight_attendant', 'tour_guide', 'restaurant'],
  marine: ['navigator', 'trucker', 'public_corp'],
  nurse: ['nurse', 'caregiver', 'social_worker'],
};

// ───────────────────────── 성적 ─────────────────────────

export function studyOf(p: Person): number {
  return p.study ?? Math.round(p.actual.int * 0.8);
}

/** 성적 올리기: 지능·재능·성격·학년에 따라 효율이 다르고, 위로 갈수록 오르기 어렵다 */
export function addStudy(s: GameState, p: Person, base: number) {
  const cur = studyOf(p);
  if (base < 0) {
    p.study = clamp(cur + base, 0, 100);
    return;
  }
  let g = base * (0.5 + p.actual.int / 70);
  if (hasTalent(p, 'genius')) g *= 1.3;
  if (hasTrait(p, 'diligent')) g *= 1.2;
  if (hasTrait(p, 'lazy')) g *= 0.75;
  if (age(s, p) >= 16) g *= 1.3;
  g *= studyBoost(p);
  g *= bonusStudy(s);
  g *= hoodOf(s, p).study; // 동네 학군: 반지하에선 같은 노력으로 덜 오른다
  // 위로 갈수록 한 점 올리기가 훨씬 어렵다
  p.study = clamp(cur + g * Math.pow(Math.max(0, 1 - cur / 105), 1.4), 0, 100);
}

/** 사교육비 누적이 수능에 주는 보너스 (돈이 많이 들수록 체감) */
const eduBonus = (p: Person) => Math.min(8, Math.sqrt((p.eduSpent ?? 0) / 1000) * 1.0);

/** 수능 원점수 → 백분위 곡선: 가운데(50%)와 기울기. 상위 1%는 재능과 노력이 모두 있어야 한다 */
const SUNEUNG_MID = 64;
const SUNEUNG_SCALE = 8.5;

/** 수능: 원점수 → 백분위 */
export function suneung(s: GameState, p: Person): number {
  const retakes = Number(p.flags.find((f) => f.startsWith('retake:'))?.slice(7) ?? 0);
  const raw =
    studyOf(p) * 0.6 +
    p.actual.int * 0.45 +
    eduBonus(p) +
    Math.min(3, p.flags.filter((f) => f === 'club').length * 0.6) +
    Math.min(4, retakes * 1.5) +
    (hasTrait(p, 'anxious') ? -2 : hasTrait(p, 'cheerful') ? 1 : 0) +
    suneungBonus(p) +
    hoodOf(s, p).sat +
    normal(s, 0, 4);
  return Math.round(clamp(100 / (1 + Math.exp(-(raw - SUNEUNG_MID) / SUNEUNG_SCALE)), 0.1, 99.99) * 100) / 100;
}

/** 백분위 → 9등급 (1등급 상위 4%, 2등급 11%, 3등급 23%, 4등급 40%, 5등급 60%, 6등급 77%, 7등급 89%, 8등급 96%) */
export function gradeOf(pct: number): number {
  const cuts = [96, 89, 77, 60, 40, 23, 11, 4];
  const i = cuts.findIndex((c) => pct >= c);
  return i < 0 ? 9 : i + 1;
}

/** 지금 실력으로 본 전국 위치 (시험 운 제외): 백분위·상위 %·등급 */
/** standing은 인자에 GameState가 없어 마지막으로 본 게임 상태로 동네를 본다 */
let lastState: GameState | undefined;
export const bindState = (s: GameState) => (bindKin(s), (lastState = s));

export function standing(p: Person): { pct: number; top: number; grade: number } {
  const raw = studyOf(p) * 0.6 + p.actual.int * 0.45 + eduBonus(p) + suneungBonus(p) + (hasTrait(p, 'anxious') ? -2 : hasTrait(p, 'cheerful') ? 1 : 0) + (lastState ? hoodOf(lastState, p).sat : 0);
  const pct = clamp(100 / (1 + Math.exp(-(raw - SUNEUNG_MID) / SUNEUNG_SCALE)), 0.1, 99.9);
  return { pct, top: Math.max(0.1, 100 - pct), grade: gradeOf(pct) };
}

export const topLabel = (top: number) => `상위 ${top < 1 ? top.toFixed(1) : top < 10 ? top.toFixed(1).replace(/\.0$/, '') : Math.round(top)}%`;
export const standingLabel = (p: Person) => {
  const r = standing(p);
  return `${r.grade}등급 (${topLabel(r.top)})`;
};

/** 성적 변화 한 줄: "3등급→2등급 ▲ (상위 9%)" / "상위 18%→15% ▲" */
export function standingChange(before: { top: number; grade: number }, p: Person): string {
  const a = standing(p);
  const d = before.top - a.top;
  const arrow = Math.abs(d) < 0.3 ? '' : d > 0 ? ' ▲' : ' ▼';
  if (a.grade !== before.grade) return `${before.grade}등급→${a.grade}등급${arrow} (${topLabel(a.top)})`;
  if (!arrow) return `${a.grade}등급 그대로 (${topLabel(a.top)})`;
  return `${a.grade}등급, ${topLabel(before.top)}→${topLabel(a.top).replace('상위 ', '')}${arrow}`;
}

/** 합격 확률 */
export function admitChance(p: Person, pr: Program, pct: number): number {
  if (pr.sex && p.sex !== pr.sex) return 0;
  if (pr.need && p.actual[pr.need.stat] < pr.need.min) return 0;
  if (pr.practical) {
    const v = p.actual[pr.practical.stat] * 0.7 + (pct / 100) * 30 + (hasFlag(p, 'high_art') || hasFlag(p, 'high_sport') ? 6 : 0);
    const need = pr.practical.need * 0.7 + (pr.cut / 100) * 30;
    return 1 / (1 + Math.exp(-(v - need) / 3));
  }
  const w = Math.max(0.35, (100 - pr.cut) * 0.3);
  // 저출생으로 학령인구가 줄면 지방대·전문대부터 정원이 비어 문턱이 낮아진다 (2030년부터 해마다)
  const year = lastState?.year ?? 2025;
  const easing = ['C', 'D', 'E'].includes(pr.tier) ? Math.min(pr.tier === 'C' ? 6 : 15, Math.max(0, year - 2030) * (pr.tier === 'C' ? 0.2 : 0.5)) : 0;
  return 1 / (1 + Math.exp(-(pct - (pr.cut - easing)) / w));
}

/** 경쟁률 (연도·학과별로 고정된 값) */
export function ratioOf(s: GameState, pr: Program): string {
  let h = s.year;
  for (const ch of pr.id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const r = { rng: h };
  const base = pr.track === 'med_school' || pr.key === 'dent' || pr.key === 'kmd' ? 6 : pr.practical ? 8 : pr.tier === 'E' ? 2 : 3.5;
  return (base + next(r) * 4).toFixed(1);
}

function band(c: number): string {
  return c >= 0.8 ? '안정' : c >= 0.4 ? '적정' : c >= 0.1 ? '소신' : '상향';
}

/** 성적에 맞는 대학·학과 추천: 상향·소신·적정·안정 골고루 */
export function recommend(p: Person, pct: number, practical: boolean): Program[] {
  const list = P.filter((pr) => !!pr.practical === practical && !pr.special)
    .map((pr) => [pr, admitChance(p, pr, pct)] as const)
    .filter(([pr, c]) => c > 0.02 && !(pr.need && p.actual[pr.need.stat] < pr.need.min));
  // 한 구간에 같은 전공은 하나만 (의대·경영만 줄줄이 나오지 않게)
  const uniqKey = (arr: (readonly [Program, number])[]) => {
    const seen = new Set<string>();
    return arr.filter(([pr]) => !seen.has(pr.key) && (seen.add(pr.key), true));
  };
  const pickBand = (lo: number, hi: number, n: number) =>
    uniqKey(list.filter(([, c]) => c >= lo && c < hi).sort((a, b) => b[0].cut - a[0].cut))
      .slice(0, n)
      .map(([pr]) => pr);
  // 관심·성향에 맞는 전공 몇 개는 꼭 보여 준다
  // 소신·적정·안정 구간에서 하나씩, 각 구간에서 가장 좋은 학교로
  const fitIn = (lo: number, hi: number, not: string[]) =>
    list.filter(([pr, c]) => c >= lo && c < hi && fitsMajor(p, pr, fs) && !not.includes(pr.key)).sort((a, b) => b[0].cut - a[0].cut)[0]?.[0];
  const fs = fitSet(p);
  const fits: Program[] = [];
  for (const [lo, hi] of [[0.12, 0.5], [0.5, 0.85], [0.85, 1.01]] as const) {
    const f = fitIn(lo, hi, fits.map((x) => x.key));
    if (f) fits.push(f);
  }
  const out = [...fits, ...pickBand(0.02, 0.1, 3), ...pickBand(0.1, 0.4, 4), ...pickBand(0.4, 0.8, 4), ...pickBand(0.8, 1.01, 4)];
  return out.filter((pr, i) => out.indexOf(pr) === i);
}

// ───────────────────────── 수시·특별 전형 ─────────────────────────

/** 학생부종합: 학교생활에서 쌓은 활동 */
export function activityOf(p: Person): number {
  const m = (k: string) => Math.max(0, markOf(p, k));
  return (
    m('study') + m('network') + m('kind') + m('art') + m('sport') + m('honest') * 0.5 +
    (hasFlag(p, 'class_pres') ? 3 : 0) + (hasFlag(p, 'club') ? 2 : 0) + (hasFlag(p, 'gifted_center') ? 4 : 0) + (hasFlag(p, 'mentored') ? 2 : 0) +
    (hasFlag(p, 'olympiad') ? 5 : 0) + (hasFlag(p, 'high_sci') || hasFlag(p, 'high_lang') ? 2 : 0)
  );
}

/** 활동이 쌓인 분야 → 어울리는 전공 */
const FIELD_KEYS: [string, string[]][] = [
  ['study', ['med', 'cs', 'ee', 'bio', 'econ', 'law', 'mech']],
  ['kind', ['edu', 'edu_elem', 'welfare', 'nurse', 'pt']],
  ['warmth', ['edu', 'edu_elem', 'kinder', 'welfare']],
  ['network', ['biz', 'media', 'admin', 'lang']],
  ['art', ['design', 'media', 'arch']],
  ['honest', ['law', 'admin', 'police']],
  ['thrift', ['biz', 'econ', 'agri']],
  ['sport', ['police', 'army', 'pt']],
];
const TAG_KEYS: Record<string, string[]> = { study: ['med', 'cs', 'bio'], public: ['admin', 'edu', 'police'], business: ['biz', 'econ'], stage: ['media', 'design'], sport: ['pt', 'police'], free: ['lang', 'agri'] };

export function susiFields(p: Person): string[] {
  const ranked = FIELD_KEYS.map(([k, keys]) => [markOf(p, k), keys] as const).sort((a, b) => b[0] - a[0]);
  const keys = new Set<string>([...ranked[0][1], ...(ranked[1][0] > 0 ? ranked[1][1] : []), ...(p.desire ? TAG_KEYS[p.desire] ?? [] : [])]);
  return [...keys];
}

/** 수시에서 보는 '실질 백분위': 성적 + 활동 + 기회균형(저소득) + 지역인재(지방 대학) */
export function susiPct(s: GameState, p: Person, pct: number, pr?: Program): number {
  const hood = hoodOf(s, p).hood;
  let v = pct + Math.min(6, activityOf(p) * 0.4);
  if (pr && pr.tier === 'C' && (hood === 'local' || hasFlag(p, 'local_talent'))) v += 4; // 지역인재 전형
  return clamp(v, 0, 99.99);
}


/** 특별 전형 합격 확률 */
export function specialChance(s: GameState, p: Person, pr: Program): number {
  const lg = (v: number, mid: number, w: number) => 1 / (1 + Math.exp(-(v - mid) / w));
  if (pr.special === 'sci') return lg(p.actual.int * 0.6 + studyOf(p) * 0.4 + (hasFlag(p, 'gifted_center') ? 6 : 0) + (hasFlag(p, 'high_sci') ? 6 : 0) + (hasFlag(p, 'olympiad') ? 8 : 0), pr.cut * 0.8, 4);
  if (pr.need && p.actual[pr.need.stat] < pr.need.min) return 0;
  // 사관학교·경찰대: 1차 필기(학력) + 체력 + 면접(도덕성) + 수능
  if (pr.special === 'military') return lg(studyOf(p) * 0.35 + p.actual.int * 0.25 + p.actual.str * 0.15 + p.actual.mor * 0.15 + (hasTrait(p, 'leader') ? 4 : 0) + markOf(p, 'sport') * 0.8, pr.cut * 0.62, 3);
  // 해외 전문학교: 포트폴리오(매력) + 그 분야 관심 + 어학
  if (pr.special === 'voc') {
    const cat = KEY_CAT[pr.key];
    return lg(p.actual.cha * 0.45 + p.actual.int * 0.2 + Math.min(20, markOf(p, 'i:' + cat) * 2.5) + (hasFlag(p, 'high_lang') || hasFlag(p, 'abroad') ? 6 : 0) + (hasFlag(p, 'high_art') ? 6 : 0), pr.cut * 0.62, 4);
  }
  return lg(p.actual.int * 0.5 + p.actual.cha * 0.3 + (hasFlag(p, 'abroad') ? 12 : 0) + (hasFlag(p, 'high_lang') ? 8 : 0), pr.cut * 0.65 + Math.max(0, pr.cut - 95) * 3, 5) * (hoodOf(s, p).hood === 'poor' ? 0.7 : 1);
}



// ───────────────────────── 수시 전형들 ─────────────────────────
// 수시는 6장. 과외 없이 학교생활을 성실히 한 학생, 형편이 어려운 학생, 지방·농어촌 학생에게 열린 길이 많다.

/** 내신: 학교 성적. 사교육보다 성실함이 크고, 학군지일수록 경쟁이 치열해 등급 받기 어렵다 */
const HOOD_NAESIN: Record<string, number> = { poor: 5, modest: 4, local: 4, middle: 0, rich: -3, elite: -6 };
export function naesin(s: GameState, p: Person): number {
  return clamp(studyOf(p) * 0.8 + p.actual.mor * 0.12 + (hasTrait(p, 'diligent') ? 5 : hasTrait(p, 'lazy') ? -4 : 0) + Math.min(6, Math.max(0, markOf(p, 'study')) * 0.6) + (HOOD_NAESIN[hoodOf(s, p).hood] ?? 0), 0, 100);
}
const naesinPct = (s: GameState, p: Person) => 100 / (1 + Math.exp(-(naesin(s, p) - 58) / 8));
export const naesinGrade = (s: GameState, p: Person) => gradeOf(naesinPct(s, p));
const parentGone = (s: GameState, p: Person) => [p.fatherId, p.motherId].some((id) => !id || !s.people[id] || s.people[id].deathYear !== undefined);

export type SusiType = 'gyo' | 'hak' | 'region' | 'opp' | 'rural' | 'essay' | 'talent' | 'equal';
interface SusiDef {
  icon: string;
  name: string;
  desc: string;
  tiers: Tier[];
  /** 지원 자격이 없으면 이유 */
  deny?: (s: GameState, p: Person) => string | undefined;
  /** 이 전형에서 보는 실질 백분위 */
  score: (s: GameState, p: Person, pct: number, pr: Program) => number;
  /** 운의 폭 (논술은 크다) */
  luck?: number;
  /** 수능 최저학력기준 (백분위) */
  min?: Partial<Record<Tier, number>>;
  keys?: string[];
}
export const SUSI: Record<SusiType, SusiDef> = {
  gyo: { icon: '📘', name: '학생부교과', desc: '내신 성적만 본다. 과외 없이 학교 수업에 충실했다면 가장 확실한 길', tiers: ['S', 'A', 'B', 'C', 'D', 'E'], score: (s, p) => naesinPct(s, p) + 1, min: { S: 75, A: 65, B: 45 } },
  hak: { icon: '📚', name: '학생부종합', desc: '동아리·봉사·반장 등 학교생활 전체와 전공 적합성', tiers: ['S', 'A', 'B', 'C', 'D', 'E'], score: (s, p, pct, pr) => susiPct(s, p, Math.max(pct, naesinPct(s, p) - 4), pr) },
  region: { icon: '🏫', name: '지역균형 (학교장 추천)', desc: '학교마다 추천받은 내신 최상위 몇 명만. 강남보다 일반고가 유리', tiers: ['S', 'A', 'B', 'C'], deny: (s, p) => (naesin(s, p) < 62 ? '내신 최상위만 학교장 추천' : undefined), score: (s, p) => naesinPct(s, p) + 5, min: { S: 70, A: 60 } },
  opp: { icon: '🤝', name: '기회균형 (저소득층)', desc: '기초생활수급·차상위 가정 학생을 정원 외로 뽑는다. 합격선이 크게 낮다', tiers: ['S', 'A', 'B', 'C', 'D', 'E'], deny: (s, p) => (['poor', 'modest'].includes(hoodOf(s, p).hood) || s.origin === 'poor' || hasFlag(p, 'welfare') ? undefined : '저소득 가정만'), score: (s, p, pct) => Math.max(pct, naesinPct(s, p)) + 13 },
  rural: { icon: '🌾', name: '농어촌 특별전형', desc: '읍·면 지역에서 6년 이상 다닌 학생. 정원 외 선발', tiers: ['S', 'A', 'B', 'C', 'D'], deny: (s, p) => (hoodOf(s, p).hood === 'local' || hasFlag(p, 'local_talent') || hasFlag(p, 'rural') ? undefined : '농어촌 거주자만'), score: (s, p, pct) => Math.max(pct, naesinPct(s, p)) + 9 },
  equal: { icon: '🕊', name: '고른기회 (한부모·자립준비청년 등)', desc: '부모를 잃었거나 한부모 가정, 보훈·다문화 가정 학생', tiers: ['S', 'A', 'B', 'C', 'D', 'E'], deny: (s, p) => (parentGone(s, p) || hasFlag(p, 'multicultural') ? undefined : '해당 가정만'), score: (s, p, pct) => Math.max(pct, naesinPct(s, p)) + 10 },
  essay: { icon: '✍️', name: '논술', desc: '내신·수능보다 글 한 편. 경쟁률 수십 대 1, 운도 크다. 역전의 기회', tiers: ['S', 'A', 'B', 'C'], luck: 2.6, score: (_s, p) => 100 / (1 + Math.exp(-(p.actual.int * 0.65 + studyOf(p) * 0.35 - 62) / 7)), min: { S: 65, A: 55 } },
  talent: { icon: '🏅', name: '특기자 (어학·SW·과학·체육)', desc: '올림피아드·어학 성적·수상 실적이 있는 학생', tiers: ['S', 'A', 'B', 'C'], keys: ['lang', 'cs', 'ee', 'bio', 'mech', 'sport', 'econ'], deny: (_s, p) => (['high_lang', 'olympiad', 'high_sci', 'gifted_center', 'high_sport'].some((f) => hasFlag(p, f)) || markOf(p, 'sport') >= 5 ? undefined : '수상·특기 실적 필요'), score: (_s, _p, pct) => pct + 14 },
};
export const SUSI_TYPES = Object.keys(SUSI) as SusiType[];

/** 수시 합격 확률 */
export function susiChance(s: GameState, p: Person, pr: Program, type: SusiType, pct: number): number {
  const d = SUSI[type];
  if (pr.special || pr.practical || !d.tiers.includes(pr.tier) || d.deny?.(s, p) || (pr.sex && p.sex !== pr.sex)) return 0;
  if (d.keys && !d.keys.includes(pr.key)) return 0;
  const v = d.score(s, p, pct, pr);
  const w = Math.max(0.35, (100 - pr.cut) * 0.3) * (d.luck ?? 1);
  let c = 1 / (1 + Math.exp(-(v - pr.cut) / w));
  if (d.luck) c = Math.min(c, 0.55); // 논술은 아무리 잘 써도 절반 운
  const need = d.min?.[pr.tier];
  if (need && pct < need) c *= 0.12; // 수능 최저 미달
  return c;
}

/** 이 전형으로 붙을 만한 곳 (적성 맞는 곳 먼저) */
export function recommendSusiType(s: GameState, p: Person, type: SusiType, pct: number): Program[] {
  const fs = fitSet(p);
  const keys = type === 'hak' ? susiFields(p) : undefined;
  const seen = new Set<string>();
  const all = P.filter((pr) => !keys || keys.includes(pr.key) || fitsMajor(p, pr, fs))
    .map((pr) => [pr, susiChance(s, p, pr, type, pct)] as const)
    .filter(([, c]) => c >= 0.06)
    .sort((a, b) => b[0].cut - a[0].cut)
    .filter(([pr]) => !seen.has(programName(pr)) && (seen.add(programName(pr)), true))
    .map(([pr]) => pr);
  // 적성 맞는 곳 5곳 + 나머지 좋은 곳 (같은 전공은 2곳까지)
  const fit = all.filter((pr) => fitsMajor(p, pr, fs)).slice(0, 6);
  const per = new Map<string, number>();
  const rest = all.filter((pr) => !fit.includes(pr) && (per.set(pr.key, (per.get(pr.key) ?? 0) + 1).get(pr.key)! <= 2)).slice(0, 16 - fit.length);
  return [...fit, ...rest];
}

// ───────────────────────── 원서: 종류별 공통 ─────────────────────────

/** 원서 기록 앞머리: j 정시·실기, s 수시, x 특별(과학·해외·전문학교), m 사관학교(별도 지원, 3장과 별개) */
const rawOf = (pr: Program) => (pr.special === 'military' ? 'm:' : pr.special ? 'x:' : '') + pr.id;
const sciOk = (p: Person) => hasFlag(p, 'high_sci') || hasFlag(p, 'gifted_center') || hasFlag(p, 'olympiad');
/** 이 학생이 이 학과에 붙을 확률 (전형에 맞게) */
export function chanceOf(s: GameState, p: Person, pr: Program, pct: number): number {
  if (pr.special === 'sci' && !sciOk(p)) return 0;
  return pr.special ? specialChance(s, p, pr) : admitChance(p, pr, pct);
}
const feeOf = (pr: Program) => pr.tuition ?? TIERS[pr.tier].tuition;
const kindLabel = (pr: Program) => (pr.special === 'military' ? '별도 지원' : pr.special === 'sci' ? '영재 특별' : pr.special === 'abroad' ? '해외 대학' : pr.special === 'voc' ? '해외 전문학교' : pr.practical ? '실기' : '정시');

/** 맞춤 추천: 성적·적성·형편을 함께 보고 붙을 만한 곳 중 좋은 곳 */
export function recommendFit(s: GameState, p: Person, pct: number): Program[] {
  const fs = fitSet(p);
  const all = P.map((pr) => [pr, chanceOf(s, p, pr, pct)] as const).filter(([pr, c]) => c >= 0.08 && (!pr.special || pr.special === 'military' || feeOf(pr) <= spendable(s)));
  const seen = new Set<string>();
  const take = (arr: (readonly [Program, number])[], n: number) =>
    arr
      .filter(([pr]) => !seen.has(pr.key + pr.tier) && (seen.add(pr.key + pr.tier), true))
      .slice(0, n)
      .map(([pr]) => pr);
  const fit = take(all.filter(([pr]) => fitsMajor(p, pr, fs)).sort((a, b) => b[0].cut * Math.min(1, b[1] * 2) - a[0].cut * Math.min(1, a[1] * 2)), 7);
  const reach = take(all.filter(([pr, c]) => !fitsMajor(p, pr, fs) && c >= 0.35).sort((a, b) => b[0].cut - a[0].cut), 4);
  const safe = take(all.filter(([pr, c]) => !fitsMajor(p, pr, fs) && c >= 0.8).sort((a, b) => b[0].cut - a[0].cut), 2);
  return [...fit, ...reach, ...safe];
}

/** 분야(직업 계열)별 전체 학교 목록 */
export function programsIn(s: GameState, p: Person, cat: string, pct: number): Program[] {
  return P.filter((pr) => KEY_CAT[pr.key] === cat)
    .map((pr) => [pr, chanceOf(s, p, pr, pct)] as const)
    .filter(([pr, c]) => c > 0.015 || (pr.special === 'sci' && sciOk(p)))
    .sort((a, b) => b[0].cut - a[0].cut)
    .slice(0, 18)
    .map(([pr]) => pr);
}

// ───────────────────────── 학년별 생활 ─────────────────────────

interface Plan {
  label: string;
  cost: number;
  budget: 0 | 1 | 2 | 3;
  focus: Focus;
  study: number;
  happy: number;
  minAge?: number;
  extra?: (x: Ctx) => string;
}
const PLANS: Plan[] = [
  { label: '학원 뺑뺑이', cost: 1200, budget: 2, focus: 'study', study: 6, happy: -4 },
  { label: '과외 + 학원 올인', cost: 3000, budget: 3, focus: 'study', study: 9, happy: -9 },
  { label: '인강으로 자기주도 학습', cost: 200, budget: 1, focus: 'study', study: 4, happy: -1 },
  {
    label: '운동부·체육 활동',
    cost: 600,
    budget: 2,
    focus: 'sport',
    study: 1,
    happy: 3,
    extra: (x) => (x.p.flags.push('club'), ''),
  },
  {
    label: '미술·음악·연기 학원',
    cost: 900,
    budget: 2,
    focus: 'art',
    study: 1,
    happy: 3,
    extra: (x) => (x.p.flags.push('club'), ''),
  },
  { label: '봉사·동아리 (인성)', cost: 100, budget: 1, focus: 'character', study: 2, happy: 2, extra: (x) => (x.p.flags.push('club'), '') },
  { label: '친구들과 실컷 놀기', cost: 0, budget: 0, focus: 'free', study: -3, happy: 9 },
  {
    label: '연애한다',
    cost: 0,
    budget: 0,
    focus: 'free',
    study: -4,
    happy: 10,
    minAge: 15,
    extra: (x) => {
      // 첫사랑: 수십 년 뒤 다시 나타날 수도
      if (!x.p.flags.includes('first_love') && chance(x.s, 0.35)) {
        x.p.flags.push('first_love');
        const name = pick(x.s, SURNAMES) + randomName(x.s, x.p.sex === 'M' ? 'F' : 'M', x.p.birthYear);
        schedule(x.s, int(x.s, 15, 30), 'first_love', x.p.id, { name });
        return ` 첫사랑 ${name}. 졸업하며 헤어졌지만 평생 잊지 못할 것 같다.`;
      }
      return chance(x.s, 0.3) ? ' 첫사랑과 헤어지고 한동안 방황했다.' : ' 설레는 한 해였다.';
    },
  },
  {
    label: '알바한다',
    cost: 0,
    budget: 0,
    focus: 'character',
    study: -3,
    happy: 0,
    minAge: 16,
    extra: (x) => ((x.p.cash += 400), (x.p.actual.mor = clamp(x.p.actual.mor + 2, 0, 100)), ' 번 돈 400만원은 자기 통장에.'),
  },
];

/** 학년 생활이 남기는 흔적: 학원·과외·인강·운동부·예체능·봉사·놀기·연애·알바 */
const PLAN_MARKS: Record<string, number>[] = [{ study: 1 }, { study: 1, hurt: 1 }, { study: 1 }, { sport: 1 }, { art: 1 }, { kind: 1 }, { warmth: 1 }, {}, { thrift: 1 }];

const GRADE = (a: number) => (a <= 13 ? `초등 ${a - 7}학년` : a <= 16 ? `중학교 ${a - 13}학년` : `고등학교 ${a - 16}학년`);

function runPlan(x: Ctx, i: number, paid?: number): string {
  const pl = PLANS[i];
  const p = x.p;
  x.s.policy.children[p.id] = { budget: pl.budget, focus: pl.focus };
  p.flags = p.flags.filter((f) => !f.startsWith('sy:'));
  p.flags.push('sy:' + i);
  p.eduSpent = (p.eduSpent ?? 0) + (paid ?? pl.cost);
  for (const [k, n] of Object.entries(PLAN_MARKS[i] ?? {})) mark(p, k, n);
  const before = standing(p);
  addStudy(x.s, p, pl.study);
  p.happiness = clamp(p.happiness + pl.happy, 0, 100);
  let msg = pl.extra?.(x) ?? '';
  // 투자한 분야에서 재능이 드러나기도
  const t = p.talents.find((t) => !t.discovered && TALENTS[t.id].stat === { study: 'int', sport: 'str', art: 'cha' }[pl.focus as 'study']);
  if (t && chance(x.s, 0.15)) {
    discoverTalent(p, t.id);
    msg += ` ✨ [${TALENTS[t.id].name}] 재능이 보인다!`;
  }
  if (pl.budget === 3 && p.happiness < 25 && chance(x.s, 0.3)) msg += ' 번아웃 직전이다. 표정이 어둡다.';
  const line = planLine(x.s, i, standing(p).grade <= before.grade && pl.study > 0 ? true : pl.study <= 0 ? p.happiness >= 50 : false);
  return `${line ? line + '\n' : ''}성적: ${standingChange(before, p)}.${msg}`;
}

const schoolYear: EventDef = {
  id: 'school_year',
  title: (c) => `${GRADE(age(c.s, c.p))}`,
  text: (c) => {
    const a = age(c.s, c.p);
    return (
      `${iga(who(c))} ${GRADE(a)}이 되었다. ${yearMood(c.s, c.p)}\n올해는 어떻게 보낼까?\n` +
      `🏘 ${hoodOf(c.s, c.p).name} (공부 효율 ×${hoodOf(c.s, c.p).study} · 학원비 ×${hoodOf(c.s, c.p).cost})\n` +
      `성적 ${standingLabel(c.p)} · 누적 사교육비 ${formatMoney(c.p.eduSpent ?? 0)}` +
      (a >= 17 ? '\n수능까지 얼마 안 남았다.' : '')
    );
  },
  choices: (c) => {
    const a = age(c.s, c.p);
    const last = Number(c.p.flags.find((f) => f.startsWith('sy:'))?.slice(3) ?? -1);
    // 학원비는 동네 따라 다르다 (대치동 ×1.8, 반지하 동네 ×0.7)
    const cm = hoodOf(c.s, c.p).cost;
    const costOf = (pl: Plan) => (pl.cost ? Math.round((pl.cost * (pl.budget >= 2 ? cm : 1)) / 10) * 10 : 0);
    const list: Choice[] = PLANS.flatMap((pl, i) =>
      (pl.minAge ?? 0) > a ? [] : [{ label: pl.label, cost: costOf(pl) || undefined, run: (x: Ctx) => runPlan(x, i, costOf(pl)) }],
    );
    if (last >= 0 && PLANS[last] && (PLANS[last].minAge ?? 0) <= a && ok(costOf(PLANS[last]), c.s))
      list.unshift({ label: `작년처럼 (${PLANS[last].label})`, cost: costOf(PLANS[last]) || undefined, run: (x) => runPlan(x, last, costOf(PLANS[last])) });
    // 학년·학교·성적·동네에 따라 올해만 열리는 선택지
    list.push(...specialChoices(c.s, c.p));
    return gate(c.s, list);
  },
};

// ───────────────────────── 수능과 입시 ─────────────────────────

const retakesOf = (p: Person) => Number(p.flags.find((f) => f.startsWith('retake:'))?.slice(7) ?? 0);

function enroll(x: Ctx, pr: Program): string {
  const p = x.p;
  p.flags = p.flags.filter((f) => f !== 'retaking' && !f.startsWith('tuition:'));
  const t = TIERS[pr.tier];
  addFlag(p, t.flag);
  addFlag(p, 'major:' + pr.key);
  setStudy(x.s, p, pr.years, pr.track ?? t.flag);
  // 명예로 가는 길(의·치·한·약·수의·교원)은 학비가 더 든다
  const honorTrack = ['med_school', 'dent_school', 'kmd_school', 'pharm_school', 'vet_school', 'edu_school', 'edu_elem'].includes(pr.track ?? '');
  p.flags.push('tuition:' + Math.round((pr.tuition ?? t.tuition) * (honorTrack ? 1.25 : 1)));
  p.flags.push('school:' + programName(pr));
  if (pr.elite) addFlag(p, 'elite:' + pr.elite);
  if (pr.special === 'abroad' || pr.special === 'voc') addFlag(p, 'abroad_grad');
  return `🎓 ${programName(pr)} 입학! (${pr.years}년 · 등록금 연 ${formatMoney(pr.tuition ?? t.tuition)})` + applyDesire(x, pr.tag);
}

function retake(x: Ctx, academy: boolean): string {
  const p = x.p;
  const n = retakesOf(p) + 1;
  p.flags = p.flags.filter((f) => !f.startsWith('retake:'));
  p.flags.push('retake:' + n);
  addFlag(p, 'retaking');
  if (academy) {
    p.eduSpent = (p.eduSpent ?? 0) + 2000;
    addStudy(x.s, p, 9);
  } else addStudy(x.s, p, 5);
  p.happiness = clamp(p.happiness - 8, 0, 100);
  return `${n + 1}수 결정. ${academy ? '재수종합반에 등록했다.' : '독서실에 자리를 잡았다.'} 내년 수능에 다시 도전한다.` + (n >= 2 ? ' 친구들은 벌써 대학 생활 중이다.' : '');
}

const path: EventDef = {
  id: 'path',
  title: (c) => (retakesOf(c.p) ? `${retakesOf(c.p) + 1}수생의 수능` : '수능과 진로'),
  text: (c) => {
    const d = (c.ev.data ??= {});
    if (d.pct === undefined) d.pct = suneung(c.s, c.p);
    const apps: string[] = d.apps ?? [];
    const used = apps.filter((a) => !a.startsWith('m:') && !a.startsWith('s:')).length;
    const susiN = apps.filter((a) => a.startsWith('s:')).length;
    const head =
      `${who(c)} 수능 성적표: 백분위 ${d.pct} (평균 ${gradeOf(d.pct)}등급)\n` +
      `누적 사교육비 ${formatMoney(c.p.eduSpent ?? 0)}` +
      (retakesOf(c.p) ? ` · ${retakesOf(c.p) + 1}수째` : '');
    if (d.stage === 'result') {
      return head + '\n\n📮 합격 발표\n' + (d.results as [string, boolean][]).map(([id, okk]) => `${okk ? '✅ 합격' : '❌ 불합격'} ${programName(PROGRAMS[id])}`).join('\n');
    }
    if (d.stage === 'susi')
      return head + `\n\n📚 수시 (6장 · 정시 3장과 별개)\n내신 ${naesinGrade(c.s, c.p)}등급 · 학교생활 활동 ${Math.round(activityOf(c.p))}점 · 강점 분야: ${susiFields(c.p).slice(0, 4).join(', ')}\n수능 성적이 아쉬워도 내신·형편·지역·특기로 갈 수 있는 길이 있다.\n수시 원서 ${6 - susiN}장 남음`;
    if (typeof d.stage === 'string' && d.stage.startsWith('susi:')) {
      const sd = SUSI[d.stage.slice(5) as SusiType];
      return head + `\n\n${sd.icon} ${sd.name}\n${sd.desc}${sd.min ? '\n⚠ 상위권 대학은 수능 최저학력기준이 있다' : ''}\n내신 ${naesinGrade(c.s, c.p)}등급 · 수시 원서 ${6 - susiN}장 남음`;
    }
    if (d.stage === 'special') return head + `\n\n🧪🌏 특별 전형 (영재·해외 대학·해외 요리/디자인/음악 전문학교) · 원서 ${3 - used}장 남음\n해외는 학비·생활비가 크다. 첫해 학비가 없으면 지원할 수 없다.`;
    if (d.stage === 'mil') return head + `\n\n🎖 사관학교·경찰대 · 1차 필기 → 2차 체력·면접 → 수능 반영\n수시·정시 원서 3장과 별개로 2곳까지 지원할 수 있다. (지원 ${apps.filter((a) => a.startsWith('m:')).length}/2)\n2025학년도 경쟁률: 육사 29.8:1 · 해사 25.7:1`;
    if (d.stage === 'fit') return head + `\n\n🧭 맞춤 추천 · 원서 ${3 - used}장 남음\n성향·적성: ${temperamentLine(c.p)}\n💡 = 관심·성향에 맞는 전공. 성적으로 붙을 만한 곳 중 좋은 곳부터.`;
    if (d.stage === 'field') return head + '\n\n🗂 어느 분야의 학교를 볼까?';
    if (typeof d.stage === 'string' && d.stage.startsWith('field:')) return head + `\n\n🗂 ${JOB_CATS[d.stage.slice(6) as keyof typeof JOB_CATS]} 계열 학교 · 원서 ${3 - used}장 남음\n(합격선 높은 순)`;
    if (d.stage === 'apply' || d.stage === 'art')
      return (
        head +
        `\n\n정시 원서 ${3 - used}장 남음 · 수시 ${susiN}/6` +
        (apps.length ? `\n지원: ${apps.map((raw) => (raw.startsWith('s:') ? `[${SUSI[(raw.split(':').length > 2 ? raw.split(':')[1] : 'hak') as SusiType].name}] ` : raw.startsWith('x:') ? '[특별] ' : raw.startsWith('m:') ? '[사관] ' : '') + programName(PROGRAMS[raw.split(':').pop()!])).join(', ')}` : '') +
        `\n(상향 < 소신 < 적정 < 안정 순으로 붙기 쉽다)`
      );
    if (d.stage === 'work') return head + '\n\n대학 대신 어떤 길로?';
    return head + '\n\n어떻게 할까?';
  },
  choices: (c) => {
    const d = c.ev.data;
    const p = c.p;
    const apps: string[] = d.apps ?? [];
    const used = apps.filter((a) => !a.startsWith('m:') && !a.startsWith('s:')).length;
    const susiN = apps.filter((a) => a.startsWith('s:')).length;
    const mil = apps.filter((a) => a.startsWith('m:')).length;
    const fs = fitSet(p);
    const back: Choice = { label: '← 뒤로', run: (x) => ((x.ev.data.stage = undefined), { text: '', keep: true }) };
    const finish: Choice = {
      label: `📮 원서 마감 · 결과 보기 (${apps.length}곳)`,
      disabled: !apps.length,
      run: (x) => {
        x.ev.data.results = apps.map((raw) => {
          const parts = raw.includes(':') ? raw.split(':') : ['j', raw];
          const kind = parts[0];
          const id = parts[parts.length - 1];
          const pr = PROGRAMS[id];
          const c = kind === 's' ? susiChance(x.s, x.p, pr, (parts.length > 2 ? parts[1] : 'hak') as SusiType, x.ev.data.pct) : kind === 'x' || kind === 'm' ? specialChance(x.s, x.p, pr) : admitChance(x.p, pr, x.ev.data.pct);
          return [id, chance(x.s, c)];
        });
        x.ev.data.stage = 'result';
        return { text: '', keep: true };
      },
    };
    const retakeChoices: Choice[] = gate(c.s, [
      { label: '재수한다 (재수종합반 2,000만)', cost: 2000, run: (x) => retake(x, true) },
      { label: '독학 재수', run: (x) => retake(x, false) },
    ]);

    if (d.stage === 'result') {
      const passed = (d.results as [string, boolean][]).filter(([, o]) => o).map(([id]) => PROGRAMS[id]);
      const out: Choice[] = passed.map((pr) => ({ label: `등록: ${programName(pr)}`, run: (x: Ctx) => enroll(x, pr) }));
      if (!passed.length) {
        const extra = P.filter((pr) => !pr.practical && (pr.tier === 'D' || pr.tier === 'E') && admitChance(p, pr, d.pct) > 0.5)
          .sort((a, b) => b.cut - a.cut)
          .slice(0, 2);
        for (const pr of extra) out.push({ label: `추가모집: ${programName(pr)}`, run: (x) => enroll(x, pr) });
      }
      out.push(...retakeChoices);
      out.push({ label: '대학은 접고 사회로', run: (x) => ((x.ev.data.stage = 'work'), { text: '', keep: true }) });
      return out;
    }

    if (d.stage === 'apply' || d.stage === 'art') {
      const recs = recommend(p, d.pct, d.stage === 'art').filter((pr) => !apps.includes(pr.id));
      const out: Choice[] = recs.map((pr) => {
        const ch = admitChance(p, pr, d.pct);
        const tuition = pr.tuition ?? TIERS[pr.tier].tuition;
        return {
          label: (fitsMajor(p, pr, fs) ? '💡 ' : '') + programName(pr),
          req: [...(fitsMajor(p, pr, fs) ? ['관심·성향'] : []), `경쟁률 ${ratioOf(c.s, pr)}:1`, band(ch), `${pr.years}년`, ...(tuition ? [`등록금 ${formatMoney(tuition)}/년`] : ['학비 면제']), ...(pr.practical ? ['실기'] : [])],
          disabled: used >= 3,
          run: (x: Ctx) => {
            x.ev.data.apps = [...(x.ev.data.apps ?? []), pr.id];
            return { text: '', keep: true };
          },
        };
      });
      if (!out.length) out.push({ label: '(지원 가능한 곳이 없다)', disabled: true, run: () => '' });
      return [finish, ...out, back];
    }

    if (d.stage === 'work') return workChoices(c);

    /** 어떤 전형이든 한 학교를 원서에 올린다 */
    const appChoice = (pr: Program): Choice => {
      const raw = rawOf(pr);
      const ch = chanceOf(c.s, p, pr, d.pct);
      const fee = feeOf(pr);
      const poor = !!pr.special && pr.special !== 'military' && fee > spendable(c.s);
      const full = pr.special === 'military' ? mil >= 2 : used >= 3;
      return {
        label: (fitsMajor(p, pr, fs) ? '💡 ' : '') + programName(pr),
        req: [...(fitsMajor(p, pr, fs) ? ['관심·성향'] : []), kindLabel(pr), band(ch), `${pr.years}년`, fee ? `연 ${formatMoney(fee)}` : '학비 면제', ...(pr.note ? [pr.note] : []), ...(poor ? ['학비 부족'] : [])],
        disabled: full || poor || apps.includes(raw),
        run: (x: Ctx) => {
          x.ev.data.apps = [...(x.ev.data.apps ?? []), raw];
          return { text: '', keep: true };
        },
      };
    };
    if (d.stage === 'fit') {
      const out = recommendFit(c.s, p, d.pct).filter((pr) => !apps.includes(rawOf(pr))).map(appChoice);
      if (!out.length) out.push({ label: '(추천할 곳이 없다)', disabled: true, run: () => '' });
      return [finish, ...out, back];
    }
    if (d.stage === 'mil') {
      const out = P.filter((pr) => pr.special === 'military' && !apps.includes(rawOf(pr))).map((pr) => {
        const ch = appChoice(pr);
        if (pr.need && p.actual[pr.need.stat] < pr.need.min) return { ...ch, disabled: true, req: [...(ch.req ?? []), pr.need.stat === 'hp' ? '신체검사 미달' : '체력 미달'] };
        return ch;
      });
      return [finish, ...out, back];
    }
    if (d.stage === 'field') {
      const cats = [...new Set(P.map((pr) => KEY_CAT[pr.key]))].filter(Boolean);
      const mine = new Set<string>([...topInterests(p, 2, 2), ...fitCats(p, 2)]);
      return [
        ...cats
          .sort((a, b) => Number(mine.has(b)) - Number(mine.has(a)))
          .map((cat) => ({ label: `${mine.has(cat) ? '💡 ' : ''}${JOB_CATS[cat as keyof typeof JOB_CATS]} (${P.filter((pr) => KEY_CAT[pr.key] === cat).length}곳)`, run: (x: Ctx) => ((x.ev.data.stage = 'field:' + cat), { text: '', keep: true as const }) })),
        back,
      ];
    }
    if (typeof d.stage === 'string' && d.stage.startsWith('field:')) {
      const out = programsIn(c.s, p, d.stage.slice(6), d.pct).filter((pr) => !apps.includes(rawOf(pr))).map(appChoice);
      if (!out.length) out.push({ label: '(이 분야엔 붙을 만한 곳이 없다)', disabled: true, run: () => '' });
      return [finish, ...out, { label: '← 분야 다시 고르기', run: (x) => ((x.ev.data.stage = 'field'), { text: '', keep: true }) }, back];
    }
    if (d.stage === 'susi') {
      const menu: Choice[] = SUSI_TYPES.map((ty) => {
        const sd = SUSI[ty];
        const no = sd.deny?.(c.s, p);
        const n = no ? 0 : recommendSusiType(c.s, p, ty, d.pct).length;
        return { label: `${sd.icon} ${sd.name}`, req: no ? [no] : [n ? `추천 ${n}곳` : '붙을 만한 곳 없음'], disabled: !!no || !n, run: (x: Ctx) => ((x.ev.data.stage = 'susi:' + ty), { text: '', keep: true as const }) };
      });
      return [finish, ...menu.sort((a, b) => Number(!!a.disabled) - Number(!!b.disabled)), back];
    }
    if (typeof d.stage === 'string' && d.stage.startsWith('susi:')) {
      const ty = d.stage.slice(5) as SusiType;
      const out = recommendSusiType(c.s, p, ty, d.pct)
        .filter((pr) => !apps.includes(`s:${ty}:${pr.id}`))
        .map((pr): Choice => {
          const ch = susiChance(c.s, p, pr, ty, d.pct);
          const fee = feeOf(pr);
          const need = SUSI[ty].min?.[pr.tier];
          return {
            label: (fitsMajor(p, pr, fs) ? '💡 ' : '') + programName(pr),
            req: [...(fitsMajor(p, pr, fs) ? ['관심·성향'] : []), band(ch), `${pr.years}년`, fee ? `연 ${formatMoney(fee)}` : '학비 면제', ...(need ? [d.pct >= need ? '수능최저 충족' : '수능최저 미달'] : []), ...(ty === 'essay' ? [`경쟁률 ${30 + Math.round(pr.cut / 2)}:1`] : [])],
            disabled: susiN >= 6,
            run: (x: Ctx) => {
              x.ev.data.apps = [...(x.ev.data.apps ?? []), `s:${ty}:${pr.id}`];
              return { text: '', keep: true };
            },
          };
        });
      if (!out.length) out.push({ label: '(이 전형으로 붙을 만한 곳이 없다)', disabled: true, run: () => '' });
      return [finish, ...out, { label: '← 다른 전형 보기', run: (x) => ((x.ev.data.stage = 'susi'), { text: '', keep: true }) }, back];
    }
    if (d.stage === 'special') {
      const out = P.filter((pr) => pr.special && pr.special !== 'military' && !apps.includes(rawOf(pr)) && (pr.special !== 'sci' || sciOk(p)))
        .sort((a, b) => Number(fitsMajor(p, b, fs)) - Number(fitsMajor(p, a, fs)) || specialChance(c.s, p, b) - specialChance(c.s, p, a))
        .map(appChoice);
      return [finish, ...out, back];
    }

    return [
      { label: '🧭 맞춤 추천 (성적·적성·형편 종합)', run: (x) => ((x.ev.data.stage = 'fit'), { text: '', keep: true }) },
      { label: `🗂 분야별로 전체 보기 (${P.length}개 학과)`, run: (x) => ((x.ev.data.stage = 'field'), { text: '', keep: true }) },
      { label: '📝 정시 원서 쓰기 (가·나·다군 3장)', run: (x) => ((x.ev.data.stage = 'apply'), { text: '', keep: true }) },
      { label: `📚 수시 6장 (교과·종합·지역균형·기회균형·농어촌·논술·특기자) ${susiN}/6`, run: (x) => ((x.ev.data.stage = 'susi'), { text: '', keep: true }) },
      ...(hasFlag(p, 'high_sci') || hasFlag(p, 'gifted_center') || hasFlag(p, 'olympiad') || hasFlag(p, 'abroad') || hasFlag(p, 'high_lang') || spendable(c.s) >= 40000
        ? [{ label: '🧪🌏 특별 전형 (KAIST·GIST / 해외 대학·요리·디자인 학교)', run: (x: Ctx) => ((x.ev.data.stage = 'special'), { text: '', keep: true as const }) }]
        : [{ label: '🌏 해외 요리·디자인·음악 전문학교', run: (x: Ctx) => ((x.ev.data.stage = 'special'), { text: '', keep: true as const }) }]),
      { label: `🎖 사관학교·경찰대 (별도 지원 ${mil}/2)`, run: (x) => ((x.ev.data.stage = 'mil'), { text: '', keep: true }) },
      { label: '🎨 예체능 실기 전형', run: (x) => ((x.ev.data.stage = 'art'), { text: '', keep: true }) },
      ...retakeChoices,
      { label: '💼 대학 대신 사회로', run: (x) => ((x.ev.data.stage = 'work'), { text: '', keep: true }) },
    ];
  },
};

/** 대학에 안 가는 길 */
function workChoices(c: Ctx): Choice[] {
  const p = c.p;
  const clearRetake = (x: Ctx) => (x.p.flags = x.p.flags.filter((f) => f !== 'retaking'));
  const trained = hasFlag(p, 'high_sport') || hasFlag(p, 'mid_sport') || hasFlag(p, 'sports_team');
  return gate(c.s, [
    {
      label: '바로 취업 (중소기업)',
      req: hasFlag(p, 'high_voc') ? ['특성화고 우대'] : [],
      run: (x) => (clearRetake(x), setJob(x.p, 'office', hasFlag(x.p, 'high_voc') ? 1 : 0), '일찍 사회생활을 시작했다.' + applyDesire(x, 'free')),
    },
    {
      label: '고졸 공무원 시험 준비',
      run: (x) => {
        clearRetake(x);
        x.p.flags.push('prep:civil', 'tries:0');
        return '공시생이 되었다. 내년부터 매년 시험을 본다.' + applyDesire(x, 'public');
      },
    },
    { label: '생산직 취업', run: (x) => (clearRetake(x), setJob(x.p, 'factory'), '3교대 공장에 들어갔다. 월급은 생각보다 괜찮다.') },
    {
      label: '🏭 대기업 고졸 공채 (생산·기술직)',
      req: ['마이스터고·특성화고 우대', req('int', 45)],
      disabled: !(hasFlag(p, 'high_meister') || hasFlag(p, 'high_voc')),
      run: (x) => {
        clearRetake(x);
        if (check(x.s, x.p.actual.int * 0.6 + x.p.actual.str * 0.4 + (hasFlag(x.p, 'high_meister') ? 12 : 0), 50, 6)) {
          setJob(x.p, 'big_factory');
          return '대기업 생산기술직 합격! 스무 살에 연봉 5천을 받는다. 동창들이 부러워한다.' + applyDesire(x, 'free');
        }
        setJob(x.p, 'factory');
        return '떨어졌다. 협력업체 생산직으로 들어갔다.';
      },
    },
    {
      label: '🏛 공기업 고졸 채용',
      req: ['마이스터고·특성화고', req('int', 55)],
      disabled: !(hasFlag(p, 'high_meister') || hasFlag(p, 'high_voc')),
      run: (x) => {
        clearRetake(x);
        if (check(x.s, x.p.actual.int + (hasFlag(x.p, 'high_meister') ? 8 : 0), 58, 6)) {
          setJob(x.p, 'public_corp');
          return '공기업 고졸 채용 합격! 신의 직장에 일찍 들어갔다.' + applyDesire(x, 'public');
        }
        return { text: '불합격. 다른 길을 찾아보자.', keep: true };
      },
    },
    { label: '알바하며 지낸다', run: (x) => (clearRetake(x), setJob(x.p, 'parttime'), '편의점 야간 알바를 시작했다.' + applyDesire(x, 'free')) },
    {
      label: '프로 입단 테스트',
      req: ['체고·운동부 출신'],
      tag: 'sport',
      disabled: !trained,
      run: (x) => {
        clearRetake(x);
        if (check(x.s, x.p.actual.str + (hasTalent(x.p, 'athlete') ? 15 : 0) + (hasFlag(x.p, 'high_sport') ? 5 : 0), 55, 6)) {
          setJob(x.p, 'athlete');
          return '프로 구단 입단! 연봉 계약서에 사인했다.' + applyDesire(x, 'sport');
        }
        setJob(x.p, 'none');
        addFlag(x.p, 'failed_pro');
        return '입단 테스트 탈락. 앞길이 막막하다.';
      },
    },
    {
      label: '연예기획사 데뷔',
      req: ['연습생·예고 출신'],
      tag: 'stage',
      disabled: !(hasFlag(p, 'trainee') || hasFlag(p, 'high_art')),
      run: (x) => {
        clearRetake(x);
        const star = hasTalent(x.p, 'star');
        if (star) discoverTalent(x.p, 'star');
        if (check(x.s, x.p.actual.cha + (star ? 15 : 0) + (hasFlag(x.p, 'high_art') ? 5 : 0), 62, 7)) {
          setJob(x.p, 'entertainer', 0);
          return '🎤 데뷔 확정! 하지만 아직은 무명이다.' + applyDesire(x, 'stage');
        }
        setJob(x.p, 'none');
        addFlag(x.p, 'failed_pro');
        return '데뷔조에서 탈락했다.';
      },
    },
    {
      label: '프로게임단 입단 테스트',
      tag: 'sport',
      run: (x) => {
        clearRetake(x);
        if (check(x.s, x.p.actual.int * 0.6 + x.p.actual.str * 0.4, 58, 6)) {
          setJob(x.p, 'gamer', 1);
          return '🎮 프로게임단 2군 합류!' + applyDesire(x, 'sport');
        }
        setJob(x.p, 'none');
        addFlag(x.p, 'failed_pro');
        return '테스트에서 떨어졌다.';
      },
    },
    {
      label: '유튜브 채널 개설',
      tag: 'stage',
      run: (x) => (clearRetake(x), setJob(x.p, 'youtuber', 0), '채널을 열었다. 조회수 12. 그중 10은 가족이다.' + applyDesire(x, 'stage')),
    },
    {
      label: '당분간 쉰다',
      run: (x) => {
        clearRetake(x);
        setJob(x.p, 'none');
        x.p.happiness = clamp(x.p.happiness + 10, 0, 100);
        return `${who(x)}${tr(who(x), '은', '는')} 방에서 나오지 않는다.` + applyDesire(x, 'free');
      },
    },
    { label: '← 뒤로', run: (x) => ((x.ev.data.stage = x.ev.data.results ? 'result' : undefined), { text: '', keep: true }) },
  ]);
}

export const SCHOOL_EVENTS: EventDef[] = [schoolYear, path];
