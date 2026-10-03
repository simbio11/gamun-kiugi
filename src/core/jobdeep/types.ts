// 직업 고증 팩: 직업 하나를 "그 일을 해 본 사람이 봐도 고개를 끄덕일" 만큼 깊게.
//   · 단계별 이야기: 신참(new) · 중견(mid) · 정점(top) · 언제나(any) · 사건사고(risk) · 50대 이후 현역(old) · 은퇴 뒤(ret)
//   · 직업 전용 행동 추가(acts) · 직급 이름/승진 햇수/정년 바로잡기 · 개연성 없는 기존 이야기·행동 빼기(cut)
//   · src: 자료 출처 (법령·통계·협회·기관 자료). 숫자와 제도는 여기서 확인한 것만 쓴다.
import type { Eff } from '../stories';
import type { JA } from '../job-acts';
import type { StatKey } from '../types';

export type Stage = 'new' | 'mid' | 'top' | 'any' | 'risk' | 'old' | 'ret';

export interface DSOpt {
  /** 이 해들에만 (시대를 타는 제도·기술) */
  years?: [number, number];
  /** 평생 한 번 */
  once?: boolean;
  /** 가중치 (기본 0.55, 사건사고 0.4) */
  w?: number;
  /** 성별 한정 */
  sex?: 'M' | 'F';
}

/**
 * [단계, 제목, 상황, 안전한 선택, 결과, 효과, 도전 선택, 판정 능력치, 기준(40~70), 성공 효과, 성공 글, 실패 효과, 실패 글, 옵션?]
 * 글 안의 {n} 은 그 사람 이름으로 바뀐다.
 */
export type DS = [Stage, string, string, string, string, Eff, string, StatKey | 'luck', number, Eff, string, Eff, string, DSOpt?];

export interface JobDeep {
  job: string;
  /** 자료 출처 (예: '경찰공무원임용령 제26조(근속승진)', '통계청 2023 지역별고용조사', '대한간호협회 2022 간호사 근무환경 실태조사') */
  src: string[];
  /** 직급 이름 바로잡기 — 기존과 같은 개수여야 한다 (세이브 호환) */
  titles?: string[];
  /** 직급마다 다음으로 오르기까지 최소 햇수 (rank.ts STEPS 덮어쓰기) */
  steps?: number[];
  /** 정년·은퇴 나이 바로잡기 */
  retireAge?: number;
  /** 직업 전용 행동 추가 (job-acts.ts 의 JA 형식: [아이콘, 이름, 설명, 능력치, 종류, '대박|보람|제자리|역효과', 'lo'|'hi'|'opp'?]) */
  acts?: JA[];
  /** 단계별 이야기 */
  stories: DS[];
  /** 개연성이 없어 빼는 기존 이야기 id (stories*.ts 의 id) */
  cutStories?: string[];
  /** 개연성이 없어 빼는 기존 직업 행동 (이름) */
  cutActs?: string[];
}
