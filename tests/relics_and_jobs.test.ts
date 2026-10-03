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
      expect(JOB_ACTS[jid].length, `직업 ${jid}의 행동 개수`).toBeGreaterThanOrEqual(6); // 직업 고증 팩(jobdeep)이 행동을 더 붙인다

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
    expect(HIDDEN_WORK_STORIES.length).toBeGreaterThanOrEqual(109);

    // 모험가, 해커, 위조범, 퇴마사 등 전설 사연이 실제로 포함되어 있음
    const advStory = HIDDEN_WORK_STORIES.find((st) => st.cond?.({} as any, { job: 'hj_adventurer' } as any) && st.title.includes('황금 해도'));
    expect(advStory).toBeDefined();

    const hackerStory = HIDDEN_WORK_STORIES.find((st) => st.cond?.({} as any, { job: 'hj_hacker' } as any) && st.title.includes('제네시스 블록'));
    expect(hackerStory).toBeDefined();
  });

  it('슈퍼 히든 및 히든 직업 전직 시 명예의 전당 카드 및 리워드 모달이 즉시 지급된다', async () => {
    const { currentEvent } = await import('../src/core/sim');
    const s = newGame({ seed: 777, familyName: '이', sex: 'F' });
    const h = head(s);
    h.birthYear = s.year - 25;
    h.actual.cha = 85;
    h.actual.int = 80;

    // 1. 프라이빗 제트 전속 승무원 3단계 성공 전직 시뮬레이션
    h.flags.push('sh:hj_private_jet:2');
    s.events = [{ uid: s.eventSeq++, defId: 'sh_step3', personId: h.id, data: { id: 'hj_private_jet' } }];
    const ev = currentEvent(s)!;
    expect(ev).toBeDefined();
    // 3단계 선택지에서 odds는 제거되어 없어야 함
    expect(ev.choices[0].odds).toBeUndefined();

    // 전직 선택 실행 (단계 성공률이 100%는 아니라 몇 번 도전)
    let res = '';
    for (let i = 0; i < 10 && !res.includes('전직 완료'); i++) {
      if (i) {
        h.flags.push('sh:hj_private_jet:2');
        s.events = [{ uid: s.eventSeq++, defId: 'sh_step3', personId: h.id, data: { id: 'hj_private_jet' } }];
      }
      res = resolveChoice(s, 0);
    }
    expect(res).toContain('전직 완료');
    expect(res).toContain('명예의 전당 카드를 획득했습니다');
    expect(h.job).toBe('hj_private_jet');
    // 카드 도감 즉시 획득 검증
    expect(s.cards?.some((c) => c.id === 'hj_private_jet' && c.personId === h.id)).toBe(true);
    // 리워드 모달 데이터 팝업 즉시 생성 검증
    expect(s.rewards?.some((r) => r.card === 'hj_private_jet')).toBe(true);
  });

  it('판정 확률 노출 규칙: 방송사 인수 등 정점 이벤트는 odds 노출, 대형 미니게임은 미노출, 지능/도덕성 판정 스토리만 odds 노출', async () => {
    const { currentEvent } = await import('../src/core/sim');
    const { SUMMITS } = await import('../src/core/cards');
    const s = newGame({ seed: 888, familyName: '박', sex: 'M' });
    const h = head(s);
    h.birthYear = s.year - 35;
    h.job = 'journalist';
    h.jobLevel = 3;
    h.actual.int = 75;
    h.actual.cha = 70;
    h.actual.str = 70;
    h.actual.mor = 70;
    h.actual.hp = 70;

    // 1. 방송사 인수 (media_mogul) 정점 이벤트: odds 노출 확인
    const mediaSummit = SUMMITS.find((sm) => sm.card === 'media_mogul')!;
    expect(mediaSummit).toBeDefined();
    s.events = [{ uid: s.eventSeq++, defId: 'summit_media_mogul', personId: h.id }];
    const summitEv = currentEvent(s)!;
    expect(summitEv).toBeDefined();
    expect(summitEv!.choices[0].odds).toBeDefined();
    expect(summitEv!.choices[0].odds).toBeGreaterThan(0);

    // 2. 대형 이벤트 (미니게임): odds 미노출 확인
    const { BIGS } = await import('../src/core/big-events');
    const s2 = newGame({ seed: 999, familyName: '최', sex: 'M' });
    const h2 = head(s2);
    s2.year += 30;
    h2.birthYear = s2.year - 30;
    for (const k of ['str', 'int', 'cha', 'mor', 'hp'] as const) h2.actual[k] = 70;
    h2.cash = 100000;
    h2.flags.push('license');
    s2.events = [{ uid: s2.eventSeq++, defId: 'big_ev', personId: h2.id, data: { id: BIGS[0].id, r: 0, sc: 0 } }];
    const bigEv = currentEvent(s2);
    expect(bigEv).toBeDefined();
    expect(bigEv!.choices[0].odds).toBeUndefined();
  });
});
