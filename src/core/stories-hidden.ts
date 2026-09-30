// 히든 직업: 아무에게나 오지 않는 제의. 성인(20세 이상)에게만.
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { age } from './people';

const scoutable = (s: GameState, p: Person) => age(s, p) >= 20 && p.actual.cha >= 60 && p.job !== 'av_actor' && !p.flags.includes('av_retired');

export const HIDDEN_STORIES: Story[] = [
  { id: 'av_scout', title: '📱 수상한 캐스팅 제의', age: [20, 32], w: 0.012, once: true, years: [2000, 2200], cond: scoutable, text: '"모델 에이전시입니다. {n}님 사진을 보고 연락드렸어요." 만나 보니 일본 성인 영상(AV) 업계 캐스팅이다. 계약금만 수천만 원. 한번 알려지면 되돌릴 수 없다.', choices: [
    { label: '계약한다 (히든 직업: AV 배우)', mark: { risk: 2 }, text: '도쿄행 비행기에 올랐다. 가족에게는 "해외 모델 일"이라고만 했다.', eff: { cash: 3000, flag: 'av_start', aff: -5 } },
    { label: '정중히 거절한다', text: '명함을 찢어 버렸다.', eff: { mor: 1 } },
    { label: '신고한다', text: '', roll: ['luck', 50, [{ mor: 2, fame: 1 }, '불법 촬영 조직이었다. 경찰이 일당을 붙잡았다.'], [{ hap: -2 }, '"합법 계약"이라며 수사가 흐지부지됐다.']] },
  ] },
  { id: 'av_exposed', title: '📱 정체가 알려졌다', age: [20, 60], w: 0.25, cooldown: 4, cond: (_s, p) => p.job === 'av_actor', text: '온라인 커뮤니티에 {n}의 실명과 가족 사진이 올라왔다. 친척들 단톡방이 발칵 뒤집혔다.', choices: [
    { label: '당당하게 인터뷰한다', text: '', roll: ['cha', 60, [{ fame: 3, hap: 4 }, '"내 선택이었다." 팬이 더 늘었다. 가족 몇은 등을 돌렸다.'], [{ hap: -8, aff: -10 }, '악플이 쏟아졌다. 어머니가 몸져누웠다.']] },
    { label: '은퇴하고 새 삶을 찾는다', text: '마지막 작품을 끝으로 은퇴했다. 과거는 사라지지 않지만, 앞으로는 내가 정한다.', eff: { flag: 'av_quit', hap: 2, aff: 3 } },
  ] },
];
