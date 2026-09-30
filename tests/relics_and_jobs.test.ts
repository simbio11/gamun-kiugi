import { describe, expect, it } from 'vitest';
import { JOB_ACTS } from '../src/core/job-acts';
import { head } from '../src/core/people';
import { newGame, resolveChoice } from '../src/core/sim';
import { grantRelic, hasRelic, relicYear } from '../src/core/relics';
import { WORK5_STORIES } from '../src/core/stories-work5';
import { HIDDEN_WORK_STORIES } from '../src/core/stories-work-hidden';

describe('직업 전용 콘텐츠 밸런스 및 가보 연계 시스템 검증', () => {
  it('정계 직업군 및 건물주: 전용 행동 6종 및 사연 최소 3종 완비', () => {
    const targetJobs = ['landlord', 'politician', 'mayor', 'minister', 'president'];

    for (const jid of targetJobs) {
      // 1. 행동 6종 존재 확인
      expect(JOB_ACTS[jid], `직업 ${jid}의 전용 행동`).toBeDefined();
      expect(JOB_ACTS[jid].length, `직업 ${jid}의 행동 개수`).toBe(6);

      // 2. 직장 이야기 최소 3종 존재 확인
      const stories = WORK5_STORIES.filter((st) => st.cond?.({} as any, { job: jid, jobLevel: 1 } as any));
      expect(stories.length, `직업 ${jid}의 이야기 개수`).toBeGreaterThanOrEqual(3);
    }
  });

  it('가보 시스템: 가보 획득 시 보물함에 영구 보존되고, 연간 패시브 혜택이 적용된다', () => {
    const s = newGame({ seed: 101, familyName: '김', sex: 'M' });
    const h = head(s);
    h.job = 'president';

    expect(s.relics).toBeUndefined();

    // 1. 대통령 훈장 수여
    const logMsg = grantRelic(s, h, 'relic_presidential_medal');
    expect(hasRelic(s, 'relic_presidential_medal')).toBe(true);
    expect(s.relics?.length).toBe(1);
    expect(logMsg).toContain('[[relic:relic_presidential_medal]]');
    expect(s.relics![0].name).toBe('대통령 무궁화 대훈장');

    // 2. 연간 혜택 적용 확인
    const beforeFame = s.fame;
    relicYear(s);
    expect(s.fame).toBeGreaterThan(beforeFame);
  });

  it('가보 연계 후속 루트: 가보를 소유한 상태에서 자녀가 성장하면 고유 연계 이벤트가 발생한다', () => {
    const s = newGame({ seed: 202, familyName: '최', sex: 'F' });
    const h = head(s);
    h.birthYear = s.year - 45;

    // 가보 등록 (체스판)
    grantRelic(s, h, 'relic_chess_board');
    expect(hasRelic(s, 'relic_chess_board')).toBe(true);

    // 8세 자녀 생성
    const kidId = `kid_${s.idSeq++}`;
    s.people[kidId] = {
      id: kidId,
      surname: '최',
      name: '영재',
      birthYear: s.year - 8,
      sex: 'F',
      motherId: h.id,
      childIds: [],
      potential: { str: 50, int: 60, cha: 50, mor: 50, hp: 50 },
      actual: { str: 40, int: 55, cha: 40, mor: 50, hp: 50 },
      talents: [],
      genes: { hairStyle: 1, hairColor: 1, skin: 1, eyes: 1, face: 1, brows: 1, mouth: 1, mark: 0 },
      job: 'none',
      jobYears: 0,
      jobLevel: 0,
      flags: [],
      affinity: 80,
      happiness: 80,
      desireKnown: false,
      potentialKnown: false,
      cash: 0,
      inLaw: false,
    };
    h.childIds.push(kidId);

    // 연간 시뮬레이션에서 가보 연계 이벤트 발생
    s.events = [];
    relicYear(s);

    const chessEvent = s.events.find((e) => e.defId === 'ev_relic_chess_legacy');
    expect(chessEvent).toBeDefined();

    // 선택지 실행: 체스 신동으로 육성
    const initialInt = s.people[kidId].actual.int;
    resolveChoice(s, 0);
    expect(s.people[kidId].traits).toContain('chess_prodigy');
    expect(s.people[kidId].actual.int).toBeGreaterThan(initialInt);
  });

  it('히든 직업 전설 사연: 히든 직업 전용 사연이 풍부하게 보강되었다', () => {
    // 히든 작업 사연이 대폭 확장됨
    expect(HIDDEN_WORK_STORIES.length).toBeGreaterThanOrEqual(114);

    // 모험가, 해커, 위조범, 퇴마사 등 전설 사연이 실제로 포함되어 있음
    const advStory = HIDDEN_WORK_STORIES.find((st) => st.cond?.({} as any, { job: 'hj_adventurer' } as any) && st.title.includes('황금 해도'));
    expect(advStory).toBeDefined();

    const hackerStory = HIDDEN_WORK_STORIES.find((st) => st.cond?.({} as any, { job: 'hj_hacker' } as any) && st.title.includes('제네시스 블록'));
    expect(hackerStory).toBeDefined();
  });
});
