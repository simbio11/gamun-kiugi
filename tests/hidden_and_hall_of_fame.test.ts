import { describe, it, expect } from 'vitest';
import { HIDDEN, HIDDEN_BY_ID, SUPER_HIDDEN_IDS } from '../src/core/hidden-data';
import { JOBS } from '../src/core/jobs';
import { CARDS, CARD, awardCard } from '../src/core/cards';
import { SUPER_ROUTES, SUPER_HIDDEN_EVENTS } from '../src/core/super-hidden';
import { hiddenCardHTML } from '../src/ui/hidden-card';
import { createPerson, addFlag, hasFlag } from '../src/core/people';
import type { GameState, Person } from '../src/core/types';

function createTestState(): { s: GameState; p: Person } {
  const s = {
    year: 2025,
    rng: 12345,
    idSeq: 1,
    fame: 100,
    assets: [],
    scandal: 0,
    events: [],
    eventSeq: 1,
    policy: { living: 'normal' },
    jobsSeen: [],
    storySeen: {},
    actUsed: {},
    people: {},
    cards: [],
    log: [],
    rewards: [],
  } as unknown as GameState;

  const p = createPerson(s, { surname: '이', birthYear: 1995, sex: 'F' });
  p.id = 'p1';
  p.actual = { int: 85, str: 80, cha: 85, mor: 85, hp: 85 };
  p.job = 'office';
  p.jobLevel = 1;
  p.jobYears = 3;
  p.cash = 10000;
  p.happiness = 80;

  s.headId = 'p1';
  s.people.p1 = p;
  return { s, p };
}

describe('히든 직업 & 슈퍼 히든 직업 데이터 무결성 검증', () => {
  it('HIDDEN에 등록된 모든 직업이 JOBS에 등록되어 있어야 한다', () => {
    expect(HIDDEN.length).toBeGreaterThanOrEqual(30);
    for (const h of HIDDEN) {
      expect(JOBS[h.id], `히든 직업 ${h.id} (${h.name})이 JOBS에 누락됨`).toBeDefined();
      expect(JOBS[h.id].name).toBe(h.name);
    }
  });

  it('모든 히든 직업이 CARDS 및 CARD에 카드로 1:1 매핑되어 있어야 한다', () => {
    for (const h of HIDDEN) {
      const card = CARD[h.id];
      expect(card, `히든 카드 ${h.id}가 CARD에 누락됨`).toBeDefined();
      expect(card.hidden).toBe(true);
      expect(card.name).toContain(h.name);
      expect(card.icon).toBe(h.icon);
    }
  });

  it('SUPER_HIDDEN_IDS의 모든 직업이 HIDDEN에 존재하고 SUPER_ROUTES에 라우트가 정의되어 있어야 한다', () => {
    const routeIds = new Set(SUPER_ROUTES.map((r) => r.id));
    for (const id of SUPER_HIDDEN_IDS) {
      expect(HIDDEN_BY_ID[id], `슈퍼 히든 ${id}가 HIDDEN_BY_ID에 누락됨`).toBeDefined();
      expect(routeIds.has(id), `슈퍼 히든 ${id}의 3단계 라우트가 SUPER_ROUTES에 누락됨`).toBe(true);
    }
  });

  it('SUPER_ROUTES의 각 3단계 퀘스트(step1, step2, step3)가 완결된 구성을 갖추어야 한다', () => {
    for (const r of SUPER_ROUTES) {
      expect(r.step1.title, `${r.id} step1 title`).toBeTruthy();
      expect(r.step1.text, `${r.id} step1 text`).toBeTruthy();
      expect(r.step2.title, `${r.id} step2 title`).toBeTruthy();
      expect(r.step2.text, `${r.id} step2 text`).toBeTruthy();
      expect(r.step3.title, `${r.id} step3 title`).toBeTruthy();
      expect(r.step3.text, `${r.id} step3 text`).toBeTruthy();
    }
  });
});

describe('명예의 전당 일반 카드 무결성 검증', () => {
  it('일반 명예의 전당 카드(대통령, 명의, 석학, 장군 등)가 올바르게 정의되어 있어야 한다', () => {
    const normalCards = CARDS.filter((c) => !c.hidden);
    expect(normalCards.length).toBeGreaterThan(25);

    const checkIds = ['president', 'minister', 'general', 'famed_doctor', 'scholar', 'best_actor', 'nobel', 'michelin'];
    for (const id of checkIds) {
      const c = CARD[id];
      expect(c, `명예의 전당 카드 ${id} 누락`).toBeDefined();
      expect(c.icon).toBeTruthy();
      expect(c.rarity).toMatch(/common|rare|epic|legend/);
    }
  });

  it('awardCard 호출 시 중복 없이 가문 카드 목록에 추가되어야 한다', () => {
    const { s, p } = createTestState();
    awardCard(s, p, 'famed_doctor', '명의 등극');
    expect(s.cards).toHaveLength(1);
    expect(s.cards![0].id).toBe('famed_doctor');
    expect(s.cards![0].personId).toBe(p.id);

    // 동일 카드 중복 지급 시 새로 추가되지 않음
    awardCard(s, p, 'famed_doctor', '명의 중복');
    expect(s.cards).toHaveLength(1);
  });
});

describe('슈퍼 히든 3단계 전직 및 카드 해금 라이프사이클', () => {
  const [step1Event, step2Event, step3Event] = SUPER_HIDDEN_EVENTS;

  it('신규 슈퍼 히든(예: 예술품 도난 수사관)이 1단계→2단계→3단계를 거쳐 전직 및 카드 해금된다', () => {
    const { s, p } = createTestState();
    const routeId = 'hj_art_investigator';

    // 1단계 실행
    const ctx1 = { s, p, ev: { uid: 1, defId: 'sh_step1', personId: p.id, data: { id: routeId } } } as any;
    expect(step1Event.valid!(ctx1)).toBe(true);
    const choices1 = step1Event.choices(ctx1);
    expect(choices1).toHaveLength(2);
    // 성공 시뮬레이션
    addFlag(p, `sh:${routeId}:1`);

    // 2단계 실행
    const ctx2 = { s, p, ev: { uid: 2, defId: 'sh_step2', personId: p.id, data: { id: routeId } } } as any;
    expect(step2Event.valid!(ctx2)).toBe(true);
    addFlag(p, `sh:${routeId}:2`);

    // 3단계 실행
    const ctx3 = { s, p, ev: { uid: 3, defId: 'sh_step3', personId: p.id, data: { id: routeId } } } as any;
    expect(step3Event.valid!(ctx3)).toBe(true);
    const choices3 = step3Event.choices(ctx3);
    const yesChoice = choices3[0];
    const msg = yesChoice.run(ctx3);

    // 전직 및 명예의 전당 카드 확인
    expect(p.job).toBe(routeId);
    expect(hasFlag(p, `hidden:${routeId}`)).toBe(true);
    expect(s.cards!.some((c) => c.id === routeId)).toBe(true);
    expect(msg).toContain('전직 완료');
  });

  it('슈퍼 히든 1단계 제안을 거절하면 refused 플래그가 기록되어 차단된다', () => {
    const { s, p } = createTestState();
    const routeId = 'hj_private_jet';

    const ctx = { s, p, ev: { uid: 1, defId: 'sh_step1', personId: p.id, data: { id: routeId } } } as any;
    const choices = step1Event.choices(ctx);
    const noChoice = choices[1]; // 거절 선택지
    noChoice.run(ctx);

    expect(hasFlag(p, `refused:${routeId}`)).toBe(true);
    expect(s.storySeen?.[`refused:${routeId}:${p.id}`]).toBe(1);
  });
});

describe('히든 카드 UI 렌더링 안전성 검증', () => {
  it('모든 히든 직업에 대해 hiddenCardHTML이 예외 없이 정상 HTML을 생성한다', () => {
    for (const h of HIDDEN) {
      const htmlF = hiddenCardHTML(h.id, { sex: 'F', locked: false });
      expect(htmlF).toContain('hid-card');

      const htmlM = hiddenCardHTML(h.id, { sex: 'M', locked: false });
      expect(htmlM).toContain('hid-card');

      const htmlLocked = hiddenCardHTML(h.id, { sex: 'F', locked: true });
      expect(htmlLocked).toContain('hid-card');
    }
  });
});
