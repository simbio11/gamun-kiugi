import { describe, expect, it } from 'vitest';
import { createPerson } from '../src/core/people';
import { newGame } from '../src/core/sim';
import {
  krInheritanceDispute,
  krInheritanceVerdict,
  krHousingCrossroads,
  krJeonseFraud,
  krExOfficioOffer,
  krExOfficioProbe,
  krDaechiFrenzy,
  krAdmissionAudit,
} from '../src/core/k-reality';
import type { Ctx } from '../src/core/ev-util';
import type { GameState, Person } from '../src/core/types';

function makeCtx(s: GameState, p: Person, defId: string, data?: any): Ctx {
  return {
    s,
    p,
    ev: { uid: 1, defId, personId: p.id, data },
  };
}

function makeState(): GameState {
  return newGame({ seed: 12345, familyName: '김', sex: 'M' });
}

describe('K-현실 라이프 서사 (k-reality)', () => {
  it('상속 분쟁: 40세 이상, 부모 사망, 형제 생존, 자산 보유 시 가중치 발생 및 맞소송/기여분 스케줄링', () => {
    const s = makeState();
    s.familyCash = 50000;
    const h = s.people[s.headId];
    h.birthYear = s.year - 45; // 45세

    // 부모 생성 (사망 상태)
    const father = createPerson(s, { surname: '김', sex: 'M', birthYear: s.year - 75 });
    father.deathYear = s.year - 2;
    s.people[father.id] = father;
    h.fatherId = father.id;
    h.motherId = undefined;

    // 형제 생성 (생존)
    const sibling = createPerson(s, { surname: '김', sex: 'F', birthYear: s.year - 42 });
    sibling.fatherId = father.id;
    s.people[sibling.id] = sibling;
    father.childIds = [h.id, sibling.id];

    // 가중치 검증
    const w = krInheritanceDispute.weight!(s, h);
    expect(w).toBeGreaterThan(0);

    // 이벤트 실행
    const ctx = makeCtx(s, h, 'kr_inheritance_dispute');
    const title = krInheritanceDispute.title(ctx);
    expect(title).toContain('상속 분쟁');

    const choices = krInheritanceDispute.choices(ctx);
    expect(choices.length).toBe(3);

    // 2번째 맞소송 선택지
    const res = choices[1].run(ctx);
    expect(res).toContain('대형 로펌');
    expect(s.scheduled?.some((sc) => sc.defId === 'kr_inheritance_verdict')).toBe(true);

    // 후속 판결 실행
    const vCtx = makeCtx(s, h, 'kr_inheritance_verdict', { mode: 'care_defense', cared: true });
    expect(krInheritanceVerdict.text(vCtx)).toContain('특별기여분');
    const vChoices = krInheritanceVerdict.choices(vCtx);
    expect(vChoices.length).toBe(1);
    vChoices[0].run(vCtx);
    expect(s.fame).toBeGreaterThanOrEqual(10);
  });

  it('청약 vs 영끌 vs 깡통전세: 전세 선택 시 2년 뒤 전세사기 후폭풍 예약', () => {
    const s = makeState();
    s.year = 2026;
    const p = s.people[s.headId];
    p.birthYear = 1996; // 30세

    const w = krHousingCrossroads.weight!(s, p);
    expect(w).toBeGreaterThan(0);

    const ctx = makeCtx(s, p, 'kr_housing_crossroads');
    const choices = krHousingCrossroads.choices(ctx);
    expect(choices.length).toBe(3);

    // 전세 선택
    choices[2].run(ctx);
    expect(s.scheduled?.some((sc) => sc.defId === 'kr_jeonse_fraud')).toBe(true);

    // 전세사기 이벤트 도착
    const fraudCtx = makeCtx(s, p, 'kr_jeonse_fraud');
    const fraudChoices = krJeonseFraud.choices(fraudCtx);
    expect(fraudChoices.length).toBe(3);

    // 가문 대위변제
    fraudChoices[0].run(fraudCtx);
    expect(p.happiness).toBeGreaterThan(50);
  });

  it('전관예우: 판검사 고위직 퇴직 후 스카우트 제의 및 특검 수사 연계', () => {
    const s = makeState();
    const p = s.people[s.headId];
    p.birthYear = s.year - 56;
    p.job = 'judge';
    p.jobLevel = 4;

    const w = krExOfficioOffer.weight!(s, p);
    expect(w).toBeGreaterThan(0);

    const ctx = makeCtx(s, p, 'kr_ex_officio_offer');
    const choices = krExOfficioOffer.choices(ctx);
    expect(choices.length).toBe(3);

    // 전관 수락: 10억 지급 및 2~3년 뒤 특검 예약
    const prevMoney = s.familyCash;
    choices[0].run(ctx);
    expect(s.familyCash).toBe(prevMoney + 100000);
    expect(s.scheduled?.some((sc) => sc.defId === 'kr_ex_officio_probe')).toBe(true);

    // 특검 수사
    const probeCtx = makeCtx(s, p, 'kr_ex_officio_probe');
    const probeChoices = krExOfficioProbe.choices(probeCtx);
    expect(probeChoices.length).toBe(2);
  });

  it('대치동 사교육 열풍: 13~18세 자녀 둔 부모에게 발동 및 스펙 품앗이 후 감사 연계', () => {
    const s = makeState();
    s.year = 2026;
    s.familyCash = 20000;
    const parent = s.people[s.headId];
    parent.birthYear = 1980; // 46세

    const kid = createPerson(s, { surname: '김', sex: 'F', birthYear: 2011 }); // 15세 중3
    s.people[kid.id] = kid;
    parent.childIds = [kid.id];

    const w = krDaechiFrenzy.weight!(s, parent);
    expect(w).toBeGreaterThan(0);

    const ctx = makeCtx(s, parent, 'kr_daechi_frenzy');
    const choices = krDaechiFrenzy.choices(ctx);
    expect(choices.length).toBe(3);

    // 대치동 풀코스 선택 시
    choices[0].run(ctx);
    expect(kid.eduSpent).toBe(3600);
    expect(kid.actual.int).toBeGreaterThanOrEqual(15);

    // 스펙 품앗이 선택 시 2년 뒤 입시비리 감사 예약 검증
    choices[1].run(ctx);
    expect(s.scheduled?.some((sc) => sc.defId === 'kr_admission_audit')).toBe(true);

    // 감사 이벤트
    const auditCtx = makeCtx(s, kid, 'kr_admission_audit');
    const auditChoices = krAdmissionAudit.choices(auditCtx);
    expect(auditChoices.length).toBe(2);
  });
});
