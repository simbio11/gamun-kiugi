import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, EXAMS, JOBS, JOB_IDS, TRAITS } from '../src/core/data';
import { MAJOR_JOBS, PROGRAMS, admitChance, recommend, suneung } from '../src/core/school';
import { MISSIONS } from '../src/core/missions';
import { deathChance } from '../src/core/growth';
import { age, head, parentsOf } from '../src/core/people';
import { currentEvent, newGame, resolveChoice, simulateYear } from '../src/core/sim';
import { EVENTS } from '../src/core/registry';
import { STORY_COUNT } from '../src/core/stories';
import { makeDate } from '../src/core/events';
import { breakUp, startDating } from '../src/core/romance';
import { chooseSuccessor } from '../src/core/estate';
import { apLeft, doAction } from '../src/core/actions';
import { SEED_EVENTS } from '../src/core/seeds';
import { mark, markOf } from '../src/core/people';

describe('콘텐츠 무결성', () => {
  it('직업 100개 이상, 모든 참조가 유효', () => {
    expect(JOB_IDS.length).toBeGreaterThanOrEqual(100);
    for (const id of JOB_IDS) {
      const j = JOBS[id];
      if (j.entry?.exam) expect(EXAMS[j.entry.exam], `${id} → ${j.entry.exam}`).toBeDefined();
      if (j.kind === 'creator') expect(j.creator, id).toBeDefined();
      if (j.titles) expect(j.titles.length, id).toBeGreaterThanOrEqual(j.maxLevel + 1);
    }
    for (const [id, e] of Object.entries(EXAMS)) expect(JOBS[e.job], `exam ${id}`).toBeDefined();
    for (const [m, list] of Object.entries(MAJOR_JOBS)) for (const id of list) expect(JOBS[id], `${m} → ${id}`).toBeDefined();
  });

  it('성격 짝·업적·미션·이벤트 정의', () => {
    for (const [id, t] of Object.entries(TRAITS)) if (t.opp) expect(TRAITS[t.opp].opp, id).toBe(id);
    expect(Object.keys(ACHIEVEMENTS).length).toBeGreaterThanOrEqual(60);
    expect(Object.keys(MISSIONS).length).toBeGreaterThanOrEqual(12);
    expect(STORY_COUNT).toBeGreaterThanOrEqual(80);
    for (const id of ['school_year', 'path', 'first_job', 'exam', 'blind_date', 'military', 'cancer', 'parent_estate', 'will', 'choose_heir', 'presidential', 'meet', 'dating_year', 'wedding', 'kid_wedding'])
      expect(EVENTS[id], id).toBeDefined();
  });
});

describe('인생 시스템', () => {
  it('다섯 살, 부모와 함께 시작', () => {
    const s = newGame({ seed: 5, familyName: '최', sex: 'F' });
    const h = head(s);
    expect(age(s, h)).toBe(5);
    expect(parentsOf(s, h)).toHaveLength(2);
    expect(s.missions?.length).toBe(3);
  });

  it('수능: 성적이 높을수록 백분위가 높고, 합격선이 높을수록 어렵다', () => {
    const s = newGame({ seed: 1, familyName: '최', sex: 'M' });
    const p = head(s);
    p.actual.int = 70;
    const avg = (study: number) => {
      p.study = study;
      let t = 0;
      for (let i = 0; i < 200; i++) t += suneung(s, p);
      return t / 200;
    };
    expect(avg(90)).toBeGreaterThan(avg(40) + 20);
    const progs = Object.values(PROGRAMS)
      .filter((x) => !x.practical && !x.need)
      .sort((a, b) => a.cut - b.cut);
    expect(admitChance(p, progs[0], 80)).toBeGreaterThan(admitChance(p, progs[progs.length - 1], 80));
    expect(recommend(p, 80, false).length).toBeGreaterThan(3);
  });

  it('후폭풍: 보증을 서면 몇 년 뒤 결과 이벤트가 도착한다', () => {
    let arrived = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = newGame({ seed, familyName: '최', sex: 'M' });
      s.events = [];
      const h = head(s);
      s.year = h.birthYear + 35;
      h.cash = 50000;
      s.events.push({ uid: 999, defId: 'r_guarantee', personId: h.id });
      resolveChoice(s, 0);
      const plan = s.scheduled?.find((x) => x.personId === h.id);
      if (!plan) continue; // 55% 확률로 조용히 끝나는 경우도 있다
      expect(plan.year).toBeGreaterThan(s.year);
      for (let y = 0; y < 9 && !s.gameOver; y++) {
        while (s.events.length) {
          const cur = currentEvent(s);
          if (!cur) break;
          if (['guarantee_default', 'friend_after'].includes(cur.def.id)) arrived++;
          resolveChoice(s, cur.choices.findIndex((c) => !c.disabled));
        }
        simulateYear(s);
      }
    }
    expect(arrived).toBeGreaterThan(3);
  });

  it('연애는 결혼 없이 끝날 수 있고, 헤어지면 상대는 가계에서 사라진다', () => {
    const s = newGame({ seed: 7, familyName: '최', sex: 'F' });
    const h = head(s);
    s.year = h.birthYear + 27;
    const q = makeDate(s, h);
    startDating(s, h, q, '소개팅');
    expect(h.partnerId).toBe(q.id);
    expect(s.people[q.id]).toBeDefined();
    breakUp(s, h, '테스트');
    expect(h.partnerId).toBeUndefined();
    expect(s.people[q.id]).toBeUndefined();
    expect(h.spouseId).toBeUndefined();
  });

  it('자손이 없으면 조카를 양자로 들인다', () => {
    const s = newGame({ seed: 11, familyName: '최', sex: 'M' });
    const h = head(s);
    const sib = Object.values(s.people).find((p) => p.fatherId === h.fatherId && p.id !== h.id);
    if (!sib) return;
    expect(chooseSuccessor(s, h)?.id).toBe(sib.id);
  });

  it('행동: 행동력이 줄고, 보이지 않는 흔적이 쌓이고, 떡밥이 회수될 조건이 된다', () => {
    const s = newGame({ seed: 3, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    // 어릴 땐 아이용 행동만
    expect(doAction(s, 'family_trip').ok).toBe(false);
    expect(doAction(s, 'kid_help').ok).toBe(true);
    expect(apLeft(s)).toBe(2);
    expect(markOf(h, 'warmth')).toBe(1);
    // 어른이 된 뒤
    s.year = h.birthYear + 40;
    h.cash = 100000;
    s.ap = 3;
    expect(doAction(s, 'volunteer').ok).toBe(true);
    expect(markOf(h, 'kind')).toBe(1);
    // 흔적이 쌓이면 회수 이벤트가 열린다
    mark(h, 'kind', 3);
    expect(SEED_EVENTS.find((e) => e.id === 'seed_kind')!.weight!(s, h)).toBeGreaterThan(0);
  });

  it('적립식 자동 증여: 해마다 설정한 만큼 보낸다', () => {
    const s = newGame({ seed: 4, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    const par = parentsOf(s, h)[0];
    s.headId = par.id; // 부모를 가주로 두고 자녀에게 보낸다
    par.cash = 100000;
    s.policy.autoGifts = { [h.id]: 1000 };
    simulateYear(s);
    expect(s.gifts.some((g) => g.toId === h.id && g.amount === 1000)).toBe(true);
  });

  it('유언장을 쓰면 수명이 줄어든다', () => {
    const s = newGame({ seed: 2, familyName: '최', sex: 'M' });
    const h = head(s);
    s.year = h.birthYear + 75;
    const without = deathChance(s, h);
    s.willWritten = true;
    expect(deathChance(s, h)).toBeGreaterThan(without);
  });
});
