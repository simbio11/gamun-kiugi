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
import { PAY, incomeTax } from '../src/core/pay';
import { pensionOf, settlePension, severance } from '../src/core/economy';
import { divorce } from '../src/core/life';
import { reverseMortgageRate } from '../src/core/welfare';
import { acqTax, buyListing, gainsTax, isPrimary, rentable, rollListings } from '../src/core/realty';
import { recommendSusiType, standing } from '../src/core/school';
import { hoodOf } from '../src/core/housing';
import { homeOf, moveTo, settleHome } from '../src/core/housing';
import { debtRate, goBankrupt, walletNet } from '../src/core/debt';
import { awardHonor, buyPerk, grant, retireHonor } from '../src/core/rewards';
import { profScore } from '../src/core/career';
import { awardCard, cardYear, CARDS, SUMMITS, SYNERGIES, activeSynergies } from '../src/core/cards';
import { familyScore, lifeReport } from '../src/core/score';
import { WORK_STORIES } from '../src/core/stories-work';
import { obeys, willOf } from '../src/core/autonomy';

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
    for (let i = 0; i < 20 && !house(); i++) rollListings(s);
    let l = house();
    expect(acqTax(s, h, l).rate).toBeLessThanOrEqual(0.03);
    expect(buyListing(s, l.id)).toContain('매수!');
    rollListings(s);
    const first = s.assets.find((a) => a.name === l.name)!;
    expect(isPrimary(s, first)).toBe(true);
    expect(rentable(s, first)).toBe(false);
    for (let i = 0; i < 20 && !house(); i++) rollListings(s);
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
    const keys = new Set(recommendSusiType(s, h, 'hak', 70).map((p) => p.key));
    expect([...keys].some((k) => ['edu', 'edu_elem', 'welfare', 'nurse', 'kinder', 'pt'].includes(k))).toBe(true);
  });

  it('수시: 과외 없이 내신만 좋은 저소득층 학생도 기회균형·교과로 인서울에 갈 길이 있다', () => {
    const s = newGame({ seed: 53, familyName: '최', sex: 'F', origin: 'poor' });
    const h = head(s);
    h.study = 80;
    h.eduSpent = 0;
    s.year += 14;
    const opp = recommendSusiType(s, h, 'opp', 45);
    const gyo = recommendSusiType(s, h, 'gyo', 45);
    expect(opp.some((p) => ['S', 'A', 'B'].includes(p.tier))).toBe(true);
    expect(gyo.length).toBeGreaterThan(0);
    // 부유한 집 아이는 기회균형 자격이 없다
    const r = newGame({ seed: 54, familyName: '최', sex: 'F', origin: 'rich' });
    expect(recommendSusiType(r, head(r), 'opp', 45).length).toBe(0);
  });

  it('세금·퇴직금·연금: 누진세, 근속만큼 퇴직금, 공무원연금 > 국민연금', () => {
    const r = (x: number) => { const t = incomeTax(x, 2025); return (t.tax + t.social) / x; };
    expect(r(3000)).toBeGreaterThan(0.09);
    expect(r(3000)).toBeLessThan(0.15);
    expect(r(10000)).toBeGreaterThan(r(5000));
    expect(r(30000)).toBeGreaterThan(r(10000));
    const s = newGame({ seed: 61, familyName: '최', sex: 'M' });
    const h = head(s);
    h.job = 'corp';
    h.jobLevel = 3;
    h.jobYears = 20;
    const before = h.cash;
    const sev = severance(s, h);
    expect(sev).toBeGreaterThan(10000); // 20년 × 월급
    expect(h.cash).toBe(before + sev);
    mark(h, 'npy', 30);
    mark(h, 'npsum', 30 * 6000);
    settlePension(h);
    const nps = pensionOf(h, 2025);
    h.job = 'civil';
    h.jobLevel = 4;
    h.jobYears = 30;
    settlePension(h);
    expect(pensionOf(h, 2025)).toBeGreaterThan(nps);
    expect(nps).toBeGreaterThan(1000);
    expect(nps).toBeLessThan(2600);
  });

  it('이혼 재산분할: 오래 살수록 재산이 적은 쪽 몫이 커진다 (최대 50%)', () => {
    const run = (years: number) => {
      const s = newGame({ seed: 71, familyName: '최', sex: 'M' });
      const h = head(s);
      s.year = h.birthYear + 50;
      const sp = createPersonLike(s, h);
      h.spouseId = sp.id;
      sp.spouseId = h.id;
      h.flags.push('wed:' + (s.year - years));
      h.cash = 100000;
      sp.cash = 0;
      divorce(s, h);
      return sp.cash / 100000;
    };
    expect(run(3)).toBeCloseTo(0.3, 1);
    expect(run(25)).toBeCloseTo(0.5, 1);
  });

  it('주택연금: 나이가 많을수록 받는 비율이 크다', () => {
    expect(reverseMortgageRate(70)).toBeGreaterThan(reverseMortgageRate(60));
    expect(Math.round(30000 * reverseMortgageRate(70) / 12)).toBeGreaterThan(80); // 3억 70세 ≈ 월 92만
  });
});

function createPersonLike(s: any, h: any) {
  const sp = { ...h, id: 'sp_test', name: '배우자', sex: 'F', flags: [], childIds: [], marks: {}, spouseId: undefined, home: undefined };
  s.people[sp.id] = sp;
  return sp;
}

describe('탈것', () => {
  it('차는 행동력 +1, 요트는 +1 더 · 유지비가 가계부에 · 감가 후 폐차', async () => {
    const { buyVehicle, vehicleYear, VEHICLES } = await import('../src/core/vehicle');
    const s = newGame({ seed: 9, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    s.year = h.birthYear + 40;
    h.flags.push('indep');
    h.cash = 300000;
    const base = apMax(s);
    expect(buyVehicle(s, 'mid').ok).toBe(false); // 면허 없음
    h.flags.push('license');
    expect(buyVehicle(s, 'mid').ok).toBe(true);
    expect(apMax(s)).toBe(base + 1);
    expect(buyVehicle(s, 'compact').ok).toBe(true);
    expect(apMax(s)).toBe(base + 1); // 차 두 대여도 +1
    expect(buyVehicle(s, 'sail').ok).toBe(true);
    expect(apMax(s)).toBe(base + 2);
    expect(forecast(s).expense.some(([l]) => l.startsWith('차량 유지비 (3대)'))).toBe(true);
    const car = s.assets.find((a) => a.tags?.[0] === 'mid')!;
    const v0 = car.value;
    vehicleYear(s);
    expect(car.value).toBeLessThan(v0);
    s.year += VEHICLES.find((m) => m.id === 'mid')!.life;
    vehicleYear(s);
    expect(s.assets.includes(car)).toBe(false);
    const kid = newGame({ seed: 3, familyName: '최', sex: 'F' });
    expect(buyVehicle(kid, 'kei').ok).toBe(false);
  });
});

describe('빚내서 사기', () => {
  it('통장이 마이너스면 주식·코인을 못 사고, 신용융자는 증거금 60%까지 · 반대매매', async () => {
    const { buyAsset, canBuy } = await import('../src/core/sim');
    const { leverageYear, buyPower } = await import('../src/core/leverage');
    const s = newGame({ seed: 9, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    s.year = h.birthYear + 35;
    h.flags.push('indep');
    h.spouseId = undefined;
    s.familyCash = 0;
    h.cash = -3000;
    expect(buyPower(s)).toBe(0);
    expect(canBuy(s, 'stock', 1000)).toBe(false);
    expect(canBuy(s, 'coin', 1000)).toBe(false);
    h.cash = 7000;
    h.credit = 750;
    expect(canBuy(s, 'coin', 10000)).toBe(false);
    expect(canBuy(s, 'stock', 10000)).toBe(true); // 70% 있음 → 신용
    buyAsset(s, 'stock', 10000);
    expect(h.cash).toBeGreaterThanOrEqual(0);
    const acc = s.assets.find((a) => a.kind === 'stock' && a.ownerId === h.id)!;
    expect(acc.loan).toBeGreaterThan(2900);
    acc.value = Math.round(acc.loan! * 1.2); // 폭락
    leverageYear(s);
    const ev = s.events.find((e) => e.defId === 'margin_call');
    expect(ev).toBeTruthy();
    s.events = [ev!];
    const txt = resolveChoice(s, currentEvent(s)!.choices.length - 1);
    expect(txt).toContain('반대매매');
  });
});

describe('살면서 드는 큰돈', () => {
  it('가주 부부 출산 → 산후조리, 가주 부모 사망 → 장례', async () => {
    const { deliver } = await import('../src/core/life');
    const s = newGame({ seed: 4, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    const mom = parentsOf(s, h).find((p) => p.sex === 'F')!;
    const dad = parentsOf(s, h).find((p) => p.sex === 'M')!;
    deliver(s, dad, mom, dad.surname, 0);
    expect(s.events.some((e) => e.defId === 'postnatal')).toBe(false); // 가주 부부가 아니면 없음
    const { queueFuneral } = await import('../src/core/lifecost');
    s.year = h.birthYear + 45;
    h.flags.push('indep');
    queueFuneral(s, dad);
    const ev = s.events.find((e) => e.defId === 'funeral')!;
    s.events = [ev];
    const cur = currentEvent(s)!;
    expect(cur.choices.length).toBe(4);
    const before = h.cash;
    resolveChoice(s, 0);
    expect(h.cash).not.toBe(before);
  });
});

describe('내 집 입주', () => {
  it('세 준 집에 들어가면 세입자 보증금을 돌려주고 실거주가 된다 · 부모님 댁에서면 독립', async () => {
    const { moveIntoOwned, ownedHomes } = await import('../src/core/housing');
    const { addAsset } = await import('../src/core/economy');
    const s = newGame({ seed: 7, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    s.year = h.birthYear + 30;
    expect(householder(s).id).not.toBe(h.id); // 부모님 댁
    const a = addAsset(s, 'apt_local', h.id, 30000, '수원 아파트');
    a.deposit = 18000;
    h.cash = 10000;
    expect(ownedHomes(s, h).map((x) => x.id)).toContain(a.id);
    expect(moveIntoOwned(s, h, a.id).ok).toBe(false); // 보증금 1.8억을 돌려줄 돈이 없다
    h.cash = 20000;
    const r = moveIntoOwned(s, h, a.id);
    expect(r.ok).toBe(true);
    expect(a.deposit).toBeUndefined();
    expect(householder(s).id).toBe(h.id);
    expect(h.home?.assetId).toBe(a.id);
    expect(isPrimary(s, a)).toBe(true);
    expect(h.cash).toBeGreaterThanOrEqual(0);
  });
});

describe('이직', () => {
  it('경력 2년 미만이거나 3년 안에 시도했으면 막히고, 시도하면 3년 쿨다운', () => {
    const s = newGame({ seed: 5, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    s.year = h.birthYear + 32;
    h.flags.push('indep');
    h.job = 'corp';
    h.jobLevel = 1;
    h.jobYears = 1;
    const hop = ACTIONS.find((a) => a.id === 'job_hop')!;
    expect(hop.blocked!(s, h)).toContain('2년');
    h.jobYears = 5;
    expect(hop.blocked!(s, h)).toBeUndefined();
    hop.run(s, h);
    expect(hop.blocked!(s, h)).toContain('3년');
  });
});

describe('진짜일까 가짜일까', () => {
  it('수상한 연락: 같은 선택도 진짜/가짜에 따라 결과가 다르다 · 지인 제안은 캐물은 뒤 다시 고른다', () => {
    const s = newGame({ seed: 3, familyName: '최', sex: 'M' });
    const h = head(s);
    s.year = h.birthYear + 40;
    h.flags.push('indep');
    h.cash = 50000;
    for (const real of [true, false]) {
      s.events = [{ uid: s.eventSeq++, defId: 'call_bank_fds', personId: h.id, data: { real, v: 0 } }];
      const before = h.cash;
      const t = resolveChoice(s, 0);
      expect(t).toContain(real ? '진짜였다' : '사기였다');
      if (real) expect(h.cash).toBe(before);
      else expect(h.cash).toBeLessThan(before);
    }
    s.events = [{ uid: s.eventSeq++, defId: 'pitch_unlisted', personId: h.id, data: { legit: false, friend: '김철수', probed: false } }];
    const probe = currentEvent(s)!.choices.findIndex((c) => c.label.startsWith('꼬치꼬치'));
    resolveChoice(s, probe);
    expect(s.events[0]?.data.probed).toBe(true); // 창은 그대로, 단서가 붙는다
    expect(currentEvent(s)!.choices.some((c) => c.label.startsWith('꼬치꼬치'))).toBe(false);
  });
});

describe('관심사와 지정 상속', () => {
  it('취미를 고르면 관심 분야가 쌓이고, 첫 직장에 "어릴 때부터 키운 꿈" 분류가 생긴다', async () => {
    const { topInterests } = await import('../src/core/interests');
    const s = newGame({ seed: 8, familyName: '최', sex: 'F' });
    const h = head(s);
    s.events = [{ uid: s.eventSeq++, defId: 'hobby', personId: h.id }];
    for (let i = 0; i < 3; i++) {
      s.events = [{ uid: s.eventSeq++, defId: 'hobby', personId: h.id }];
      currentEvent(s);
      resolveChoice(s, 0);
    }
    expect(topInterests(h, 1).length).toBe(1);
    s.year = h.birthYear + 24;
    s.events = [{ uid: s.eventSeq++, defId: 'first_job', personId: h.id }];
    expect(currentEvent(s)!.choices.some((c) => c.label.includes('어릴 때부터 키운 꿈'))).toBe(true);
  });
  it('유언장에 적은 집은 지정한 자녀에게 간다', async () => {
    const { settleEstate } = await import('../src/core/estate');
    const { addAsset } = await import('../src/core/economy');
    const s = newGame({ seed: 8, familyName: '최', sex: 'F' });
    const dad = parentsOf(s, head(s)).find((p) => p.sex === 'M')!;
    const kids = dad.childIds.map((id) => s.people[id]);
    s.headId = dad.id;
    s.willWritten = true;
    const house = addAsset(s, 'apt_local', dad.id, 40000, '고향 집');
    const heir = kids[kids.length - 1];
    house.heir = heir.id;
    dad.cash = 100000; // 상속세는 현금으로 낸다
    settleEstate(s, dad, kids[0].id);
    expect(house.ownerId).toBe(heir.id);
  });
});

describe('MBTI', () => {
  it('사람마다 16가지 유형이 고르게 나온다', async () => {
    const { mbtiOf } = await import('../src/core/interests');
    const seen = new Map<string, number>();
    for (let seed = 1; seed <= 60; seed++) {
      const s = newGame({ seed, familyName: '김', sex: seed % 2 ? 'M' : 'F' });
      for (const p of Object.values(s.people)) seen.set(mbtiOf(p), (seen.get(mbtiOf(p)) ?? 0) + 1);
    }
    expect(seen.size).toBe(16);
  });
});

describe('부모님 유산', () => {
  it('재산이 집 위주여도 법정 몫만큼 자녀에게 간다 (한 사람이 실물을 다 가져가지 않는다)', async () => {
    const { settleEstate } = await import('../src/core/estate');
    const { addAsset, personWorth } = await import('../src/core/economy');
    const s = newGame({ seed: 12, familyName: '최', sex: 'M' });
    s.events = [];
    const h = head(s);
    s.year = h.birthYear + 45;
    const dad = parentsOf(s, h).find((p) => p.sex === 'M')!;
    const mom = parentsOf(s, h).find((p) => p.sex === 'F')!;
    s.assets = s.assets.filter((a) => a.ownerId !== dad.id);
    addAsset(s, 'apt_seoul', dad.id, 200000, '반포 아파트');
    addAsset(s, 'land', dad.id, 60000, '고향 땅');
    dad.cash = 30000;
    const kids = dad.childIds.map((id) => s.people[id]).filter((k) => k.deathYear === undefined);
    const before = new Map(kids.map((k) => [k.id, personWorth(s, k)]));
    const momBefore = personWorth(s, mom);
    const shares = new Map<string, number>([[mom.id, 1.5], ...kids.map((k) => [k.id, 1] as [string, number])]);
    dad.deathYear = s.year;
    settleEstate(s, dad, undefined, shares);
    const total = 1.5 + kids.length;
    const momGot = personWorth(s, mom) - momBefore;
    for (const k of kids) {
      const got = personWorth(s, k) - before.get(k.id)!;
      expect(got).toBeGreaterThan(momGot / 1.5 * 0.5); // 자녀 몫이 0에 가깝지 않다
    }
    expect(momGot).toBeLessThan((290000 * 1.5) / total * 1.6);
  });

  it('교수의 길: 박사 학위 → 연구원으로 버티며 임용 공고가 온다, 논문이 많을수록 유리', () => {
    const s = newGame({ seed: 71, familyName: '최', sex: 'M' });
    const h = head(s);
    s.year += 30;
    h.flags.push('student', 'track:grad_school', 'grad:' + s.year);
    h.papers = 8;
    s.events = [];
    simulateYear(s);
    expect(h.flags).toContain('phd');
    expect(h.job).toBe('researcher');
    expect(s.events.some((e) => e.defId === 'prof_hire')).toBe(true);
    const low = profScore(h);
    h.papers = 20;
    expect(profScore(h)).toBeGreaterThan(low + 20);
  });

  it('훈장·명예: 25년 넘게 봉직한 교사는 근정훈장, 명예로 상점에서 행동력을 산다', () => {
    const s = newGame({ seed: 72, familyName: '최', sex: 'F' });
    const h = head(s);
    h.job = 'teacher';
    h.jobYears = 31;
    const fame = s.fame;
    retireHonor(s, h);
    expect(s.honors?.[0]?.id).toBe('hongjo');
    expect(s.fame).toBeGreaterThan(fame);
    awardHonor(s, h, 'hongjo', '중복');
    expect(s.honors?.length).toBe(1); // 같은 훈장은 한 번만
    grant(s, '🏆', '테스트', '', 'legend');
    const ap = apMax(s);
    expect(buyPerk(s, 'ap').ok).toBe(true);
    expect(apMax(s)).toBe(ap + 1);
    expect((s.rewards ?? []).length).toBeGreaterThan(0);
  });

  it('명예의 전당 카드: 얻으면 팝업·효과, 인생 성적표가 가문 총점에 쌓인다', () => {
    const s = newGame({ seed: 73, familyName: '최', sex: 'F' });
    const h = head(s);
    s.year += 30;
    h.job = 'entertainer';
    h.jobLevel = 5;
    const fame = s.fame;
    s.events = [];
    cardYear(s); // 월드 스타 자동 카드
    expect(s.cards?.some((c) => c.id === 'world_star')).toBe(true);
    expect(s.rewards?.some((r) => r.card === 'world_star')).toBe(true);
    expect(s.fame).toBeGreaterThan(fame);
    awardCard(s, h, 'world_star');
    expect(s.cards?.filter((c) => c.id === 'world_star').length).toBe(1); // 같은 사람 같은 카드는 한 번
    const before = familyScore(s).total;
    const dad = parentsOf(s, h)[0];
    dad.deathYear = s.year;
    lifeReport(s, dad);
    expect(dad.lifeScore).toBeGreaterThan(0);
    expect(familyScore(s).total).toBeGreaterThan(before);
  });

  it('직장 생활: 모든 직업마다 그 직업다운 직장 이야기가 2개 이상 있다', () => {
    const s = newGame({ seed: 74, familyName: '최', sex: 'M' });
    const h = head(s);
    s.year += 35;
    const thin: string[] = [];
    for (const id of JOB_IDS) {
      if (['none', 'parttime', 'pension', 'politician', 'minister', 'president', 'landlord', 'professor'].includes(id)) continue; // 정치·교수는 career.ts, 건물주는 부동산
      h.job = id;
      h.jobLevel = 2;
      h.jobYears = 20;
      const n = WORK_STORIES.filter((st) => !st.id.startsWith('wk_any') && (!st.cond || st.cond(s, h))).length;
      if (n < 2) thin.push(`${id}:${n}`);
    }
    expect(thin).toEqual([]);
  });

  it('모든 명예의 전당 카드는 실제 플레이로 얻을 수 있다 (자동 조건 또는 정점 이벤트, 2단계까지 끝까지)', () => {
    const fail: string[] = [];
    for (const d of CARDS) {
      const sm = SUMMITS.find((x) => x.card === d.id);
      if (!d.auto && !sm) { fail.push(d.id + ': 얻는 길 없음'); continue; }
      const s = newGame({ seed: 90, familyName: '최', sex: 'M' });
      const h = head(s);
      s.year += 45;
      s.events = [];
      for (const k of ['str', 'int', 'cha', 'mor', 'hp'] as const) h.potential[k] = h.actual[k] = 100;
      let ok = false;
      if (d.auto) {
        // 자동 카드: 직업·직급으로 되는지, 아니면 플래그가 게임 어딘가에서 실제로 붙는지
        for (const id of JOB_IDS) for (let lv = JOBS[id].maxLevel; lv >= 0 && !ok; lv--) {
          h.job = id; h.jobLevel = lv; h.jobYears = 30;
          if (d.auto(s, h)) ok = true;
        }
        if (!ok) {
          const flags = ['president', 'was_minister', 'was_politician', 'nobel', 'olympic_gold']; // 모두 이벤트에서 실제로 붙는 플래그 (대선·청문회·총선·노벨상·올림픽)
          for (const f of flags) {
            h.flags.push(f);
            if (d.auto(s, h)) ok = true;
            h.flags.pop();
          }
          h.donated = 50000;
          if (d.auto(s, h)) ok = true;
          // 나이·자녀가 조건인 가족 카드 (장한 어버이·백세 어르신)
          h.birthYear = s.year - 96;
          h.childIds = [...h.childIds, 'x1', 'x2', 'x3'];
          if (d.auto(s, h)) ok = true;
        }
      }
      if (!ok && sm) {
        if (sm.pre) awardCard(s, h, sm.pre);
        if (sm.setup) {
          sm.setup(s, h);
          ok = sm.ok(s, h) && !!JOBS[h.job];
        } else {
          h.papers = 50; s.fame = 200; h.flags.push('was_politician');
          for (const id of JOB_IDS) for (let lv = JOBS[id].maxLevel; lv >= 0 && !ok; lv--) {
            h.job = id; h.jobLevel = lv; h.jobYears = 30;
            if (sm.ok(s, h)) ok = true;
          }
        }
        if (ok) {
          // 이벤트를 끝까지 실제로 치른다 (능력치 100이면 이긴다)
          for (let stage = 1; stage <= (sm.stages ?? 1); stage++) {
            s.events = [{ uid: s.eventSeq++, defId: 'summit_' + d.id, personId: h.id, data: { stage } }];
            resolveChoice(s, 0);
          }
          if (!(s.cards ?? []).some((c) => c.id === d.id && c.personId === h.id)) { ok = false; fail.push(d.id + ': 이벤트를 이겼는데 카드가 없다'); continue; }
        }
      }
      if (!ok) fail.push(d.id + ': 조건을 만족하는 상태가 없다');
    }
    expect(fail).toEqual([]);
    // 시너지는 실제 카드 id로만 이루어진다
    const ids = new Set(CARDS.map((c) => c.id));
    for (const sy of SYNERGIES) for (const g of sy.groups) for (const id of g) expect(ids.has(id)).toBe(true);
  });

  it('가문 시너지: 장군과 재계 거물이 함께 살아 있으면 "군수 재벌"이 발동한다', () => {
    const s = newGame({ seed: 91, familyName: '최', sex: 'M' });
    const h = head(s);
    const dad = parentsOf(s, h)[0];
    s.year += 30;
    awardCard(s, h, 'general');
    awardCard(s, dad, 'chaebol');
    expect(activeSynergies(s).some((x) => x.id === 'military_industrial')).toBe(true);
    s.events = [];
    cardYear(s);
    expect(s.rewards?.some((r) => r.title.includes('군수 재벌'))).toBe(true);
  });

  it('어떤 직업이든 그 직업으로 딸 수 있는 명예의 전당 카드가 하나 이상 있다', () => {
    const s = newGame({ seed: 92, familyName: '최', sex: 'M' });
    const h = head(s);
    s.year += 40;
    for (const k of ['str', 'int', 'cha', 'mor', 'hp'] as const) h.actual[k] = 80;
    const none: string[] = [];
    for (const id of JOB_IDS) {
      if (['none', 'parttime', 'pension', 'landlord'].includes(id)) continue;
      let ok = false;
      for (let lv = 0; lv <= JOBS[id].maxLevel && !ok; lv++) {
        h.job = id; h.jobLevel = lv; h.jobYears = 20;
        ok = CARDS.some((d) => d.auto?.(s, h)) || SUMMITS.some((sm) => !sm.pre && sm.ok(s, h));
      }
      if (!ok) none.push(id);
    }
    expect(none).toEqual([]);
  });

  it('자율성: 충성도 높은 자식은 대체로 따르고, 반항적인 자식은 자주 거역한다', () => {
    const s = newGame({ seed: 93, familyName: '최', sex: 'M' });
    const k = head(s);
    k.traits = ['filial'];
    k.affinity = 80;
    let yes = 0;
    for (let i = 0; i < 200; i++) if (obeys(s, k)) yes++;
    k.traits = ['rebel'];
    k.affinity = -60;
    let yes2 = 0;
    for (let i = 0; i < 200; i++) if (obeys(s, k)) yes2++;
    expect(yes).toBeGreaterThan(130);
    expect(yes2).toBeLessThan(70);
    expect(willOf(k).loyalty).toBeLessThan(40);
  });

  it('정략결혼: 따르는 자식은 혼례로, 명문가는 명성·신흥 부자는 돈', () => {
    const s = newGame({ seed: 94, familyName: '최', sex: 'M' });
    const h = head(s);
    s.year += 30;
    h.traits = ['filial'];
    h.affinity = 100;
    s.events = [{ uid: s.eventSeq++, defId: 'arranged_offer', personId: h.id }];
    const fame = s.fame;
    let tries = 0;
    while (!h.partnerId && tries++ < 20) {
      s.events = [{ uid: s.eventSeq++, defId: 'arranged_offer', personId: h.id }];
      resolveChoice(s, 0);
    }
    expect(h.partnerId).toBeTruthy();
    expect(s.fame).toBeGreaterThan(fame);
    expect(s.events.some((e) => e.defId === 'kid_wedding')).toBe(true);
  });

  it('명예 vs 실리: 사채·투기는 스캔들 위험을 쌓고, 폭로되면 명예 직업 가족이 다친다', () => {
    const s = newGame({ seed: 95, familyName: '최', sex: 'M' });
    const h = head(s);
    s.year += 35;
    s.events = [];
    h.cash = 100000;
    h.job = 'judge';
    h.jobLevel = 3;
    s.ap = 5;
    const r = doAction(s, 'm_loanshark');
    expect(r).toBeTruthy();
    expect(s.scandal ?? 0).toBeGreaterThanOrEqual(12);
    s.scandal = 80;
    s.fame = 50;
    s.events = [{ uid: s.eventSeq++, defId: 'scandal_break', personId: h.id }];
    resolveChoice(s, 2); // 모르쇠
    expect(s.fame).toBeLessThan(50);
  });
});
