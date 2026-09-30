// 가족 사진: 그날 살아 있던 가족이 실제로 한 장에 모인다. 찍은 사진은 가문 앨범에 영원히 남는다.
//   행동: 가족사진 · 명절 단체사진 · 여행 기념사진 · 둘만의 사진(부부)
//   사건: 돌잔치 · 결혼식 · 졸업식 · 환갑/칠순 · 새 식구(아기) — 조건이 맞으면 "찍을까?" 하고 묻는다
// 그림은 render/photo.ts 가 그린다 (시대마다 흑백 → 누런 컬러 → 선명한 컬러).
import type { ActionDef } from './actions';
import type { EventDef } from './ev-util';
import { formatMoney } from './economy';
import { addFlag, age, alive, clamp, fullName, hasFlag, head, isMainline, parentsOf, spouseOf } from './people';
import type { GameState, Person } from './types';

export type PhotoKind = 'family' | 'clan' | 'trip' | 'couple' | 'dol' | 'wedding' | 'grad' | 'hwangap' | 'newborn';
export interface Photo {
  id: number;
  kind: PhotoKind;
  year: number;
  title: string;
  ids: string[];
  ages: number[];
}
export const PHOTO_NAME: Record<PhotoKind, string> = {
  family: '가족사진', clan: '명절 단체사진', trip: '여행 기념사진', couple: '둘만의 사진', dol: '돌잔치', wedding: '결혼사진', grad: '졸업사진', hwangap: '잔칫날 가족사진', newborn: '새 식구',
};

/** 사진을 찍어 앨범에 넣고, 결과 글에 붙일 표시를 돌려준다 (UI가 그 자리에 사진을 그린다) */
export function takePhoto(s: GameState, kind: PhotoKind, title: string, people: Person[]): string {
  const list = [...new Map(people.filter((p) => p && alive(p)).map((p) => [p.id, p])).values()].slice(0, 12);
  const photos = (s.photos ??= []);
  const id = (photos.at(-1)?.id ?? 0) + 1;
  photos.push({ id, kind, year: s.year, title, ids: list.map((p) => p.id), ages: list.map((p) => age(s, p)) });
  for (const p of list) p.happiness = clamp(p.happiness + 3, 0, 100);
  return `[[photo:${id}]]\n📷 가문 앨범에 한 장이 더해졌다. (${photos.length}장)`;
}

/** 집 식구: 가주·배우자·같이 사는(미혼) 자녀·가주의 부모 */
export function homeFolks(s: GameState): Person[] {
  const h = head(s);
  const sp = spouseOf(s, h);
  const kids = h.childIds.map((id) => s.people[id]).filter((k) => k && alive(k) && (!k.spouseId || age(s, k) < 30));
  return [...parentsOf(s, h).filter(alive), h, ...(sp && alive(sp) ? [sp] : []), ...kids];
}
/** 온 가문: 살아 있는 본가 사람과 그 배우자 전부 */
export function clanFolks(s: GameState): Person[] {
  const line = Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));
  const sps = line.map((p) => spouseOf(s, p)).filter((q): q is Person => !!q && alive(q));
  return [...line, ...sps].sort((a, b) => a.birthYear - b.birthYear);
}

const onceAYear = (key: string) => (s: GameState) => ((s.storySeen ?? {})[`${key}:${s.year}`] ? '올해 이미 찍었다' : undefined);
const mark = (s: GameState, key: string) => ((s.storySeen ??= {})[`${key}:${s.year}`] = 1);

export const PHOTO_ACTIONS: ActionDef[] = [
  {
    id: 'photo_family',
    cat: '가족',
    icon: '📸',
    name: '가족사진 찍기',
    desc: '사진관에서 온 식구가 한 장에 · 앨범에 남는다 · 모두 행복↑',
    ap: 1,
    cost: 30,
    who: 'adult',
    show: (s) => homeFolks(s).length >= 2,
    blocked: onceAYear('ph_family'),
    run: (s) => {
      mark(s, 'ph_family');
      const who = homeFolks(s);
      return `"자, 하나 둘 셋, 김치~!" ${who.length}명이 사진관 의자에 나란히 앉았다.\n` + takePhoto(s, 'family', `${s.year}년 가족사진`, who);
    },
  },
  {
    id: 'photo_clan',
    cat: '가족',
    icon: '🎎',
    name: '명절 단체사진',
    desc: '온 가문이 모인 날, 마당에서 한 장 · 친척 관계↑',
    ap: 1,
    who: 'adult',
    show: (s) => clanFolks(s).length >= 5,
    blocked: onceAYear('ph_clan'),
    run: (s) => {
      mark(s, 'ph_clan');
      const who = clanFolks(s);
      for (const p of who) p.affinity = clamp(p.affinity + 2, -100, 100);
      return `명절 아침, 마당에 ${who.length}명이 모였다. 막내가 삼각대를 세우고 뛰어 들어온다.\n` + takePhoto(s, 'clan', `${s.year}년 명절`, who);
    },
  },
  {
    id: 'photo_trip',
    cat: '가족',
    icon: '🏞',
    name: '가족 여행 기념사진',
    desc: '가까운 바다·산으로 1박 2일 · 행복↑↑',
    ap: 1,
    cost: 150,
    who: 'adult',
    show: (s) => homeFolks(s).length >= 2,
    blocked: onceAYear('ph_trip'),
    run: (s) => {
      mark(s, 'ph_trip');
      const who = homeFolks(s);
      for (const p of who) p.happiness = clamp(p.happiness + 5, 0, 100);
      return `${s.year < 1990 ? '관광버스를 타고' : s.year < 2040 ? '차를 몰고' : '자율주행 캡슐을 타고'} 바다에 다녀왔다. 모래사장에서 한 장.\n` + takePhoto(s, 'trip', `${s.year}년 가족 여행`, who);
    },
  },
  {
    id: 'photo_couple',
    cat: '가족',
    icon: '💑',
    name: '둘만의 사진',
    desc: '배우자와 단둘이 · 애정↑',
    ap: 1,
    cost: 20,
    who: 'adult',
    show: (s) => {
      const sp = spouseOf(s, head(s));
      return !!sp && alive(sp);
    },
    blocked: onceAYear('ph_couple'),
    run: (s) => {
      mark(s, 'ph_couple');
      const h = head(s);
      const sp = spouseOf(s, h)!;
      h.bond = clamp((h.bond ?? 50) + 5, 0, 100);
      return `"우리 둘이 찍은 게 언제였더라?" 오랜만에 둘이 나란히 섰다.\n` + takePhoto(s, 'couple', `${fullName(h)} ♥ ${fullName(sp)}`, [h, sp]);
    },
  },
];

// ───────────────────────── 기념일 사건 ─────────────────────────
const photoEvent = (id: string, kind: PhotoKind, title: string, text: (s: GameState, p: Person) => string, cost: number, folks: (s: GameState, p: Person) => Person[], yes = '📷 사진을 남긴다'): EventDef => ({
  id,
  title: () => title,
  valid: (c) => alive(c.p),
  text: (c) => text(c.s, c.p),
  choices: () => [
    {
      label: `${yes}${cost ? ` (${formatMoney(cost)})` : ''}`,
      cost,
      run: (x) => {
        x.p.cash -= cost;
        return takePhoto(x.s, kind, `${x.s.year}년 ${fullName(x.p)} ${PHOTO_NAME[kind]}`, folks(x.s, x.p));
      },
    },
    { label: '사진은 됐다', run: () => '마음속에만 담아 두기로 했다.' },
  ],
});
const withKin = (s: GameState, p: Person) => [...parentsOf(s, p).filter(alive), ...parentsOf(s, p).flatMap((q) => parentsOf(s, q)).filter(alive), p];

export const PHOTO_EVENTS: EventDef[] = [
  photoEvent('pho_dol', 'dol', '🎂 돌잔치', (s, p) => `${fullName(p)}의 첫 생일! 돌상 위에 실·연필·돈·마이크${s.year >= 2020 ? '·마우스' : ''}가 놓였다. 무엇을 잡을까?`, 50, (s, p) => withKin(s, p)),
  photoEvent('pho_wedding', 'wedding', '💒 결혼식', (s, p) => `${fullName(p)}의 결혼식. ${s.year < 1990 ? '예식장' : s.year < 2040 ? '웨딩홀' : '하늘 정원 예식장'}에 양가 가족이 모였다.`, 80, (s, p) => {
    const sp = spouseOf(s, p);
    return [...parentsOf(s, p).filter(alive), p, ...(sp ? [sp, ...parentsOf(s, sp).filter(alive)] : [])];
  }),
  photoEvent('pho_grad', 'grad', '🎓 졸업식', (s, p) => `${fullName(p)}의 ${age(s, p) >= 21 ? '대학' : '고등학교'} 졸업식. 꽃다발을 든 가족들이 운동장에 모였다.`, 20, (s, p) => [...parentsOf(s, p).filter(alive), p]),
  photoEvent('pho_hwangap', 'hwangap', '🎉 잔칫날', (s, p) => `${fullName(p)}의 ${age(s, p) >= 69 ? '칠순' : '환갑'} 잔치. 자식·손주들이 큰절을 올린다.`, 100, (s, p) => {
    const sp = spouseOf(s, p);
    const kids = p.childIds.map((id) => s.people[id]).filter((k) => k && alive(k));
    const kin = kids.flatMap((k) => [k, spouseOf(s, k), ...k.childIds.map((id) => s.people[id])]).filter((q): q is Person => !!q && alive(q));
    return [p, ...(sp && alive(sp) ? [sp] : []), ...kin];
  }),
  photoEvent('pho_newborn', 'newborn', '👶 새 식구', (_s, p) => `${fullName(p)}이(가) 태어났다! 병원에 온 가족이 모여 조그만 손을 들여다본다.`, 0, (s, p) => withKin(s, p)),
];

/** 해마다: 기념일이 된 가족에게 사진 권유 (가주 집안 위주) */
export function photoYear(s: GameState): void {
  const hd = head(s);
  const near = new Set(homeFolks(s).map((p) => p.id));
  for (const k of hd.childIds.flatMap((id) => [s.people[id], ...(s.people[id]?.childIds ?? []).map((x) => s.people[x])])) if (k) near.add(k.id);
  for (const p of Object.values(s.people)) {
    if (!alive(p) || !near.has(p.id)) continue;
    const a = age(s, p);
    const q = (id: string) => s.events.push({ uid: s.eventSeq++, defId: id, personId: p.id });
    if (a === 0 && !hasFlag(p, 'pho_born')) addFlag(p, 'pho_born'), q('pho_newborn');
    else if (a === 1 && !hasFlag(p, 'pho_dol')) addFlag(p, 'pho_dol'), q('pho_dol');
    else if ((a === 19 || (a === 23 && p.flags.some((f) => f.startsWith('school:')))) && !hasFlag(p, `pho_grad${a}`)) addFlag(p, `pho_grad${a}`), q('pho_grad');
    else if ((a === 60 || a === 70) && !hasFlag(p, `pho_${a}`)) addFlag(p, `pho_${a}`), q('pho_hwangap');
    else if (p.spouseId && !p.inLaw && p.flags.includes(`wed:${s.year - 1}`) && !hasFlag(p, 'pho_wed')) addFlag(p, 'pho_wed'), q('pho_wedding'); // 작년에 결혼
  }
}
