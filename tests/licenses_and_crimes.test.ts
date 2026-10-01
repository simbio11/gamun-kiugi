import { describe, it, expect } from 'vitest';
import { createPerson, hasFlag } from '../src/core/people';
import { hasLicense, grantLicense, revokeLicense, savePreviousLevel, calculateReturnLevel, hasAnyLicense, getLicenses } from '../src/core/licenses';
import { imprison } from '../src/core/crimes';
import { stageOf } from '../src/core/actions';
import type { GameState } from '../src/core/types';

function mockState(): GameState {
  const s = {
    year: 2020,
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
  } as unknown as GameState;

  const p = createPerson(s, { surname: '김', birthYear: 1980, sex: 'M' });
  p.id = 'p1';
  p.actual = { int: 80, str: 50, cha: 60, mor: 70, hp: 80 };
  s.headId = 'p1';
  s.people.p1 = p;
  return s;
}

describe('의사 및 전문직 면허 시스템', () => {
  it('의사 직업을 가지면 면허가 자동 인식되고 평생 보존된다', () => {
    const s = mockState();
    const p = s.people.p1;
    p.job = 'doctor';
    p.jobLevel = 3; // 봉직 과장

    expect(hasLicense(p, 'doctor')).toBe(true);
    expect(hasAnyLicense(p)).toBe(true);
    expect(getLicenses(p)).toContain('doctor');

    // 실직하더라도 면허는 유지된다
    savePreviousLevel(p, 'doctor', 3);
    p.job = 'none';
    p.jobLevel = 0;

    expect(hasLicense(p, 'doctor')).toBe(true);
    // 무직이어도 면허가 있으면 취준생(prep)이 아니라 성인(adult)으로 인정
    expect(stageOf(s, p)).toBe('adult');

    // 복직 시 과거 과장 경력 인정 (최소 2 이상)
    const retLvl = calculateReturnLevel(p, 'doctor', false);
    expect(retLvl).toBeGreaterThanOrEqual(2);

    // 개원 시 원장 직급(4)
    const openLvl = calculateReturnLevel(p, 'doctor', true);
    expect(openLvl).toBe(4);
  });

  it('중범죄로 면허가 박탈될 때만 revokeLicense로 취소된다', () => {
    const s = mockState();
    const p = s.people.p1;
    p.job = 'doctor';
    grantLicense(p, 'doctor');

    expect(hasLicense(p, 'doctor')).toBe(true);

    revokeLicense(p, 'doctor');
    expect(hasLicense(p, 'doctor')).toBe(false);
    expect(p.job).toBe('none');
  });
});

describe('범죄 및 수감 시스템', () => {
  it('구속 시 징역형, 명성 하락, 직업 박탈이 정상 반영된다', () => {
    const s = mockState();
    const p = s.people.p1;
    p.job = 'doctor';
    p.jobLevel = 2;

    const msg = imprison(s, p, 2, 30, '음주운전 뺑소니');
    expect(msg).toContain('징역 2년');
    expect(hasFlag(p, 'in_prison')).toBe(true);
    expect(hasFlag(p, 'prison_term:2')).toBe(true);
    expect(p.job).toBe('none');
    expect(s.fame).toBe(70); // 100 - 30
  });
});
