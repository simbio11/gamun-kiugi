// 🗞 인생 신문 1면: 세상을 떠난 사람의 일생을 한 줄 헤드라인으로.
//   연대기(s.log)에서 그 사람 이름이 나온 굵직한 순간을 골라 "고생 → 성취 → 영면" 순서로 엮는다.
//   예) [사회면] 향년 74세로 별세한 3대 가주 김철수… 의대 4수 끝에 개원했으나 코인 폭락·전세사기 딛고 건물주로 영면
import { JOBS } from './data';
import { fullName } from './people';
import { jobTitle } from './economy';
import { fixJosa } from './ev-util';
import type { GameState, Person } from './types';

interface Beat {
  re: RegExp;
  kind: 'up' | 'down';
  say: string | ((m: RegExpMatchArray) => string);
}
/** 연대기 문장 → 신문체 조각 (앞에 있는 것이 우선) */
const BEATS: Beat[] = [
  { re: /대통령 (당선|취임)|거사 성공/, kind: 'up', say: '대통령에 올랐고' },
  { re: /국무총리|부총리|장관 (임명|취임)/, kind: 'up', say: '장관급에 올랐고' },
  { re: /국회의원 당선|당선!/, kind: 'up', say: '금배지를 달았고' },
  { re: /의사 면허|개원/, kind: 'up', say: '개원했고' },
  { re: /사법시험 합격|판사 임관|검사 임용|변호사시험/, kind: 'up', say: '법복을 입었고' },
  { re: /창업|상장|시리즈 A|대기업 총수/, kind: 'up', say: '회사를 일으켰고' },
  { re: /건물주|빌딩/, kind: 'up', say: '건물주가 됐고' },
  { re: /교수 임용|정교수/, kind: 'up', say: '교단에 섰고' },
  { re: /\[([^\]]{2,14}(?:시험|공채|고시|임용|채용))\][^→]*→ 🎉/, kind: 'up', say: (m) => `${m[1].replace(/ 준비$/, '')}에 붙었고` },
  { re: /([0-9가-힣 ]{2,14}(?:시험|공채|고시|임용|채용)) 합격/, kind: 'up', say: (m) => `${m[1].trim()}에 붙었고` },
  { re: /합격/, kind: 'up', say: '시험에 붙었고' },
  { re: /파산|부도|폐업/, kind: 'down', say: '부도' },
  { re: /전세 ?사기/, kind: 'down', say: '전세사기' },
  { re: /코인|폭락|상장폐지/, kind: 'down', say: '코인 폭락' },
  { re: /구속|징역|수감/, kind: 'down', say: '옥살이' },
  { re: /이혼/, kind: 'down', say: '이혼' },
  { re: /암 진단|암 완치/, kind: 'down', say: '암 투병' },
  { re: /해고|구조조정|명예퇴직/, kind: 'down', say: '실직' },
  { re: /사기/, kind: 'down', say: '사기' },
];

function section(p: Person): string {
  const peakId = p.flags.find((f) => f.startsWith('peakjob:'))?.split(':')[1];
  const j = JOBS[peakId ?? p.job];
  if (p.flags.includes('president') || p.flags.includes('was_minister') || p.flags.includes('was_politician')) return '정치면';
  if (['founder', 'landlord', 'sme_ceo', 'franchise_ceo', 'developer_re'].includes(peakId ?? p.job) || p.job === 'landlord' || p.flags.includes('party_leader')) return '경제면';
  if (j?.kind === 'creator' || j?.cat === 'media') return '문화면';
  if (j?.kind === 'athlete' || j?.cat === 'sport') return '스포츠면';
  return '사회면';
}

/** 가장 높았던 자리를 "~로" 형태로 (은퇴했으면 "~로 은퇴해") */
function finalRole(p: Person): string {
  if (p.flags.includes('ex_president') || p.flags.includes('president')) return '전직 대통령으로';
  if (p.job === 'landlord') return '건물주로';
  const peak = p.flags.find((f) => f.startsWith('peakjob:'))?.split(':').slice(2).join(':');
  const retired = p.job === 'pension' || p.job === 'none';
  if (peak) return retired ? `${peak}(으)로 은퇴해` : `${peak}(으)로`;
  const j = JOBS[p.job];
  return !retired && j ? `${j.titles ? jobTitle(p) : j.name}(으)로` : '';
}

export interface Obit {
  section: string;
  headline: string;
  sub: string;
  epitaph: string;
}

export function obituary(s: GameState, p: Person): Obit {
  const name = fullName(p);
  const a = (p.deathYear ?? s.year) - p.birthYear;
  const isHeadLine = !p.inLaw;
  const gen = p.flags.find((f) => f.startsWith('gen:'))?.slice(4);
  const who = `${gen ? `${gen}대 가주 ` : isHeadLine ? `${s.familyName}씨 가문 ` : ''}${name}`;
  // 연대기에서 이 사람의 굵직한 순간
  const mine = s.log.filter((l) => l.text.includes(name) && !l.text.startsWith('──'));
  const ups: string[] = [];
  const downs: string[] = [];
  for (const l of mine) {
    const b = BEATS.find((x) => x.re.test(l.text));
    if (!b) continue;
    const m = l.text.match(b.re)!;
    const say = typeof b.say === 'string' ? b.say : b.say(m);
    if (b.kind === 'up' && !ups.includes(say)) ups.push(say);
    if (b.kind === 'down' && !downs.includes(say)) downs.push(say);
  }
  const tries = p.flags.includes('long_prep') ? '다섯 수 넘게 버틴 끝에 ' : '';
  const role = finalRole(p);
  const mid = downs.length ? `${downs.slice(0, 2).join('·')} 딛고 ` : '';
  // 성취가 있으면 "~했으나(고생이 있었을 때) / ~했고", 없으면 고생과 영면만
  const first = ups[0] ? tries + (downs.length ? ups[0].replace(/고$/, '으나') : ups[0]) + ' ' : '';
  const body = `${first}${mid}${role ? `${role} ` : ''}영면`;
  const headline = fixJosa(`[${section(p)}] 향년 ${a}세로 별세한 ${who}… ${body}`.replace(/\s+/g, ' '));
  const sub = `${p.birthYear}~${p.deathYear ?? s.year} · ${p.childIds.length ? `자녀 ${p.childIds.length}명` : '자녀 없음'}${p.lifeScore !== undefined ? ` · 인생 점수 ${p.lifeScore}` : ''}`;
  const t = p.traits ?? [];
  const epitaph = t.includes('diligent') ? '"하루도 허투루 살지 않았다"' : t.includes('cheerful') ? '"웃으며 왔다가 웃으며 간다"' : t.includes('filial') ? '"부모에게 받은 사랑을 자식에게 돌려주고"' : t.includes('ambitious') ? '"더 높이, 끝까지"' : t.includes('frugal') ? '"아껴서 남긴 것은 사랑이었다"' : downs.length >= 2 ? '"넘어진 만큼 일어났다"' : '"여기, 한 가문의 뿌리가 잠들다"';
  return { section: section(p), headline, sub, epitaph };
}
