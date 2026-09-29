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
import { ACTIONS, apLeft, apMax, doAction, forHead, stageOf } from '../src/core/actions';
import { SEED_EVENTS } from '../src/core/seeds';
import { householder, mark, markOf } from '../src/core/people';
import { nestOf } from '../src/core/nest';
import { forecast, payOf } from '../src/core/economy';
import { PAY } from '../src/core/pay';
import { acqTax, buyListing, gainsTax, isPrimary, rentable, rollListings } from '../src/core/realty';
import { recommendSusi, standing } from '../src/core/school';
import { hoodOf } from '../src/core/housing';
import { homeOf, moveTo, settleHome } from '../src/core/housing';
import { debtRate, goBankrupt, walletNet } from '../src/core/debt';

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
    // 연봉표는 직급 수와 같아야 하고, 월급 직업은 모두 연봉표가 있다
    for (const [id, d] of Object.entries(PAY)) {
      expect(JOBS[id], `pay ${id}`).toBeDefined();
      expect(d.pay.length, `pay ${id}`).toBe(JOBS[id].maxLevel + 1);
    }
    for (const id of JOB_IDS) if (JOBS[id].kind === 'salary') expect(PAY[id], `연봉표 없음: ${id}`).toBeDefined();
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
    // 결과는 들쭉날쭉하지만, 몇 번 하면 흔적이 쌓인다
    for (let i = 0; i < 5 && !markOf(h, 'warmth'); i++) ((s.ap = 3), doAction(s, 'kid_help'));
    expect(markOf(h, 'warmth')).toBeGreaterThanOrEqual(1);
    // 어른이 된 뒤
    s.year = h.birthYear + 40;
    h.cash = 100000;
    s.ap = 3;
    expect(doAction(s, 'volunteer').ok).toBe(true);
    for (let i = 0; i < 5 && !markOf(h, 'kind'); i++) ((s.ap = 3), doAction(s, 'volunteer'));
    expect(markOf(h, 'kind')).toBeGreaterThanOrEqual(1);
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

  it('독립: 취직하면 독립 이벤트가 오고, 그 전엔 부모님 지갑, 그 뒤엔 내 지갑', () => {
    let offered = 0;
    for (let seed = 1; seed <= 15; seed++) {
      const s = newGame({ seed, familyName: '최', sex: 'M' });
      s.events = [];
      const h = head(s);
      s.year = h.birthYear + 26;
      h.flags = h.flags.filter((f) => f !== 'student');
      h.job = 'office';
      expect(householder(s).id).not.toBe(h.id);
      for (const p of parentsOf(s, h)) p.cash = 60000;
      simulateYear(s);
      let cur = currentEvent(s);
      while (cur && cur.def.id !== 'leave_home') {
        resolveChoice(s, cur.choices.findIndex((c) => !c.disabled));
        cur = currentEvent(s);
      }
      if (!cur) continue;
      const take = cur.choices.findIndex((c) => c.label.startsWith('감사히'));
      if (take >= 0) {
        offered++;
        resolveChoice(s, take);
        expect(nestOf(h)).toBeGreaterThan(0);
      } else resolveChoice(s, cur.choices.findIndex((c) => c.label.includes('내 힘으로')));
      expect(h.flags).toContain('indep');
      expect(householder(s).id).toBe(h.id);
      expect(Number.isFinite(forecast(s).net)).toBe(true);
    }
    expect(offered).toBeGreaterThan(3);
  });

  it('행동 결과는 매번 다르다: 같은 연습도 오르는 능력치와 대사가 들쭉날쭉', () => {
    const texts = new Set<string>();
    const gains = new Set<number>();
    for (let seed = 1; seed <= 30; seed++) {
      const s = newGame({ seed, familyName: '최', sex: 'M' });
      s.events = [];
      const h = head(s);
      const before = h.actual.cha;
      const r = doAction(s, 'kid_art');
      texts.add(r.text.replace(/ \(.*\)$/, ''));
      gains.add(h.actual.cha - before);
    }
    expect(texts.size).toBeGreaterThan(5);
    expect(gains.size).toBeGreaterThan(2);
  });

  it('부동산: 첫 집은 실거주(월세 없음), 두 번째부터 취득세 중과, 1주택 2년 보유 비과세', () => {
    const s = newGame({ seed: 9, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    s.year = h.birthYear + 40;
    h.flags.push('indep');
    h.job = 'doctor';
    h.jobYears = 10;
    h.cash = 800000;
    rollListings(s);
    const house = () => s.listings!.find((l) => l.house && !l.deposit)!;
    let l = house();
    expect(acqTax(s, h, l).rate).toBeLessThanOrEqual(0.03);
    expect(buyListing(s, l.id)).toContain('매수!');
    const first = s.assets.find((a) => a.name === l.name)!;
    expect(isPrimary(s, first)).toBe(true);
    expect(rentable(s, first)).toBe(false);
    rollListings(s);
    l = house();
    expect(acqTax(s, h, l).rate).toBe(0.08);
    buyListing(s, l.id);
    const second = s.assets.find((a) => a.name === l.name && a.id !== first.id)!;
    expect(rentable(s, second) || !!second.deposit || isPrimary(s, second)).toBe(true);
    // 3년 뒤 1주택만 남기고 팔면 비과세
    s.assets = s.assets.filter((a) => a.id !== second.id || isPrimary(s, a));
    const only = s.assets.find((a) => a.ownerId === h.id && (a.kind === 'apt_seoul' || a.kind === 'apt_local'))!;
    only.cost = Math.round(only.value * 0.8);
    only.bought = s.year - 3;
    if (s.assets.filter((a) => a.ownerId === h.id && (a.kind === 'apt_seoul' || a.kind === 'apt_local')).length === 1 && only.value <= 120000) expect(gainsTax(s, only).tax).toBe(0);
  });

  it('성적은 등급으로: 공부할수록 등급 숫자가 작아진다 (1등급이 최고)', () => {
    const s = newGame({ seed: 1, familyName: '최', sex: 'M' });
    const p = head(s);
    p.study = 20;
    const low = standing(p);
    p.study = 95;
    const high = standing(p);
    expect(high.grade).toBeLessThan(low.grade);
    expect(high.top).toBeLessThan(low.top);
  });

  it('집: 독립하면 집을 구하고, 전세·월세로 이사할 수 있다', () => {
    const s = newGame({ seed: 12, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    s.year = h.birthYear + 30;
    h.flags.push('indep');
    h.job = 'office';
    h.cash = 30000;
    settleHome(s, h);
    expect(homeOf(s, h)).toBeDefined();
    const r = moveTo(s, h, 'oneroom', 'wolse');
    expect(r).toContain('이사');
    expect(homeOf(s, h)!.type).toBe('wolse');
    const before = walletNet(s, h);
    moveTo(s, h, 'villa', 'jeonse');
    expect(homeOf(s, h)!.type).toBe('jeonse');
    expect(walletNet(s, h)).toBeLessThan(before); // 보증금이 묶인다
  });

  it('빚: 신용이 나쁠수록 금리가 높고, 통장이 바닥나면 위기 이벤트, 파산하면 면책', () => {
    const s = newGame({ seed: 13, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    s.year = h.birthYear + 35;
    h.flags.push('indep');
    settleHome(s, h);
    h.credit = 850;
    const good = debtRate(h);
    h.credit = 450;
    expect(debtRate(h)).toBeGreaterThan(good);
    h.cash = -8000;
    simulateYear(s);
    expect(s.events.some((e) => e.defId === 'money_crisis' || e.defId === 'debt_collection')).toBe(true);
    goBankrupt(s, h);
    expect(h.cash).toBeGreaterThanOrEqual(0);
    expect(h.flags).toContain('bankrupt');
  });

  it('행동은 인생 단계에 맞게: 대학생에겐 전공 공부, 의대생에겐 인턴 대신 의학 공부', () => {
    const s = newGame({ seed: 21, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    const ids = () => ACTIONS.filter((a) => forHead(s, a)).map((a) => a.id);
    expect(stageOf(s, h)).toBe('little');
    expect(ids()).not.toContain('kid_study');
    s.year = h.birthYear + 21;
    h.flags.push('student', 'major:biz', 'grad:' + (s.year + 2));
    expect(stageOf(s, h)).toBe('univ');
    expect(ids()).toContain('u_major');
    expect(ids()).toContain('u_intern');
    expect(ids()).not.toContain('kid_art');
    expect(ids()).not.toContain('extra_class'); // 자녀가 없으면 안 보인다
    h.flags = h.flags.filter((f) => f !== 'major:biz');
    h.flags.push('track:med_school', 'major:med');
    expect(ids()).toContain('u_med');
    expect(ids()).not.toContain('u_intern');
    // 생활 수준에 따라 행동력
    s.policy.living = 'lux';
    expect(apMax(s)).toBe(4);
    s.policy.living = 'frugal';
    expect(apMax(s)).toBe(2);
  });

  it('이야기는 길에 맞게: 한의대생에게 대기업 공모전은 오지 않는다', () => {
    const s = newGame({ seed: 22, familyName: '최', sex: 'F' });
    const h = head(s);
    s.year = h.birthYear + 22;
    h.flags.push('student', 'major:kmd', 'track:kmd_school');
    const w = (id: string) => (EVENTS[id] as any).weight(s, h);
    expect(w('st_contest')).toBe(0);
    expect(w('st_acupuncture')).toBeGreaterThan(0);
    expect(w('st_cadaver')).toBe(0);
  });

  it('병역: 의사 면허가 있으면 공중보건의사·군의관, 학생은 연기할 수 있다', () => {
    const s = newGame({ seed: 23, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    s.year = h.birthYear + 20;
    h.actual.hp = 70;
    h.flags.push('student');
    s.events.push({ uid: 900, defId: 'military', personId: h.id });
    let labels = currentEvent(s)!.choices.map((c) => c.label).join('|');
    expect(labels).toContain('연기');
    s.events = [];
    h.flags = h.flags.filter((f) => f !== 'student');
    h.job = 'doctor';
    s.events.push({ uid: 901, defId: 'military', personId: h.id });
    labels = currentEvent(s)!.choices.map((c) => c.label).join('|');
    expect(labels).toContain('공중보건의사');
  });

  it('연봉: 의사는 인턴→레지던트→전문의로 오르고, 같은 직급에서도 연차가 쌓이면 오른다', () => {
    const s = newGame({ seed: 31, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    s.year = h.birthYear + 26;
    h.flags.push('indep');
    h.job = 'doctor';
    h.jobLevel = 0;
    h.jobYears = 0;
    const seen: string[] = [];
    const pays: number[] = [];
    for (let y = 0; y < 8; y++) {
      s.events = [];
      simulateYear(s);
      seen.push(String(h.jobLevel));
      pays.push(payOf(s, h, true)!);
    }
    expect(seen[0]).toBe('0'); // 인턴 1년
    expect(seen).toContain('1'); // 레지던트
    expect(seen[seen.length - 1]).toBe('2'); // 전문의
    expect(pays[pays.length - 1]).toBeGreaterThan(pays[1] * 2);
    // 공무원 호봉: 같은 9급이라도 해마다 오른다
    h.job = 'civil';
    h.jobLevel = 0;
    h.flags = h.flags.filter((f) => !f.startsWith('lv:'));
    const first = payOf(s, h)!;
    s.year += 5;
    expect(payOf(s, h, true)!).toBeGreaterThan(first * 1.1);
  });

  it('길마다 행동이 다르다: 경찰 준비생·로스쿨생·사장님·농부', () => {
    const s = newGame({ seed: 41, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    s.year = h.birthYear + 25;
    h.flags.push('indep');
    const ids = () => ACTIONS.filter((a) => forHead(s, a)).map((a) => a.id);
    h.flags.push('prep:police', 'tries:0');
    expect(ids()).toContain('x_uniform_fit');
    expect(ids()).not.toContain('x_civil_nory');
    h.flags = h.flags.filter((f) => !f.startsWith('prep:'));
    h.flags.push('student', 'major:law');
    expect(ids()).toContain('u_law_moot');
    expect(ids()).not.toContain('u_eng_project');
    h.flags = h.flags.filter((f) => f !== 'student' && !f.startsWith('major:'));
    h.job = 'restaurant';
    expect(ids()).toContain('w_owner_marketing');
    h.job = 'farmer';
    expect(ids()).toContain('w_farm_crop');
    expect(ids()).not.toContain('w_owner_marketing');
  });

  it('전문직 최고 직급·개원이라도 연 5억을 넘기기 어렵다 (수십억은 연예인·사업가 몫)', () => {
    const s = newGame({ seed: 42, familyName: '최', sex: 'M' });
    const h = head(s);
    s.year = 2025;
    h.actual.int = 90;
    h.actual.cha = 90;
    h.actual.mor = 90;
    for (const job of ['dentist', 'kmd', 'pharmacist', 'vet', 'lawyer', 'accountant', 'tax_accountant']) {
      h.job = job;
      h.jobLevel = PAY[job].pay.length - 1;
      h.flags = h.flags.filter((f) => !f.startsWith('lv:'));
      let max = 0;
      for (let i = 0; i < 200; i++) max = Math.max(max, payOf(s, h)!);
      expect(max, job).toBeLessThan(90000);
      expect(payOf(s, h, true)!, job).toBeLessThanOrEqual(55000);
    }
  });

  it('난이도: 쉬움은 부유층·좋은 유전자·재능, 어려움은 서민·불리한 유전자', () => {
    const avg = (d: 'easy' | 'hard') => {
      let t = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const s = newGame({ seed, familyName: '최', sex: 'M', difficulty: d });
        const h = head(s);
        expect(s.origin).toBe(d === 'easy' ? 'rich' : 'poor');
        if (d === 'easy') expect(h.talents.length).toBeGreaterThan(0);
        else expect(h.talents.length).toBe(0);
        t += Object.values(h.potential).reduce((a, b) => a + b, 0);
      }
      return t / 20;
    };
    expect(avg('easy')).toBeGreaterThan(avg('hard') + 60);
  });

  it('동네: 반지하 동네는 공부 효율이 낮고 학원비가 싸다, 대치동은 반대', () => {
    const s = newGame({ seed: 51, familyName: '최', sex: 'M' });
    const h = head(s);
    const hh = Object.values(s.people).find((p) => p.home)!;
    hh.home!.tier = 'room';
    const poor = hoodOf(s, h);
    hh.home!.tier = 'gangnam';
    const elite = hoodOf(s, h);
    expect(poor.hood).toBe('poor');
    expect(elite.hood).toBe('elite');
    expect(poor.study).toBeLessThan(elite.study);
    expect(poor.cost).toBeLessThan(elite.cost);
  });

  it('수시 학생부종합: 봉사·배려가 쌓인 아이에겐 교육·복지·간호 쪽이 열린다', () => {
    const s = newGame({ seed: 52, familyName: '최', sex: 'F' });
    const h = head(s);
    mark(h, 'kind', 6);
    mark(h, 'warmth', 4);
    const keys = new Set(recommendSusi(s, h, 70).map((p) => p.key));
    expect([...keys].some((k) => ['edu', 'edu_elem', 'welfare', 'nurse', 'kinder', 'pt'].includes(k))).toBe(true);
  });
});
