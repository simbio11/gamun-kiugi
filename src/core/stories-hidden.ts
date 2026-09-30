// 히든 직업: 아무에게나 오지 않는 제의. 성인(20세 이상)에게만.
import type { Story } from './stories';


export const HIDDEN_STORIES: Story[] = [
  { id: 'av_exposed', title: '📱 정체가 알려졌다', age: [20, 60], w: 0.25, cooldown: 4, cond: (_s, p) => p.job === 'hj_av', text: '온라인 커뮤니티에 {n}의 실명과 가족 사진이 올라왔다. 친척들 단톡방이 발칵 뒤집혔다.', choices: [
    { label: '당당하게 인터뷰한다', text: '', roll: ['cha', 60, [{ fame: 3, hap: 4 }, '"내 선택이었다." 팬이 더 늘었다. 가족 몇은 등을 돌렸다.'], [{ hap: -8, aff: -10 }, '악플이 쏟아졌다. 어머니가 몸져누웠다.']] },
    { label: '은퇴하고 새 삶을 찾는다', text: '마지막 작품을 끝으로 은퇴했다. 과거는 사라지지 않지만, 앞으로는 내가 정한다.', eff: { flag: 'av_quit', hap: 2, aff: 3 } },
  ] },
];
