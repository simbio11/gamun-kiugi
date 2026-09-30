// 엄마의 영향: 어머니의 지난날(mom_* 플래그)과 성격이 자식에게 남기는 것들.
// 어느 시대에나 있을 이야기라 id는 h_ 로 시작한다 (근현대사 2000년 전에도 나온다).
import type { Story } from './stories';
import type { GameState, Person } from './types';
import { age, alive } from './people';

const mom = (s: GameState, p: Person) => (p.motherId ? s.people[p.motherId] : undefined);
const withMom = (s: GameState, p: Person) => {
  const m = mom(s, p);
  return !!m && alive(m);
};
const momHas = (flag: string) => (s: GameState, p: Person) => withMom(s, p) && !!mom(s, p)!.flags.includes(flag);
const young = (lo: number, hi: number) => (s: GameState, p: Person) => withMom(s, p) && age(s, p) >= lo && age(s, p) <= hi;

export const MOM_STORIES: Story[] = [
  // ─── 어느 집 엄마든 ───
  { id: 'h_mom_lunchbox', title: '엄마의 도시락', age: [7, 18], w: 0.04, cooldown: 6, cond: young(7, 18), text: '점심시간, {n}의 도시락 뚜껑을 여니 계란말이 위에 케첩으로 하트가 그려져 있다. 친구들이 킥킥 웃는다.', choices: [
    { label: '자랑하며 나눠 먹는다', text: '"너네 엄마 최고다!" 반찬 통이 순식간에 비었다.', eff: { hap: 6, cha: 1 } },
    { label: '부끄러워 뚜껑을 덮는다', text: '집에 와서 "하트 그리지 마"라고 했다. 엄마가 조금 서운해했다.', eff: { hap: -1, aff: -2 } },
  ] },
  { id: 'h_mom_nag', title: '엄마의 잔소리', age: [12, 19], w: 0.05, cooldown: 4, cond: young(12, 19), text: '"공부는 언제 하니? 방 좀 치워라! 밥 먹고 바로 눕지 말고!" 엄마의 잔소리가 오늘따라 길다.', choices: [
    { label: '"알았어!" 하고 방문을 닫는다', text: '쾅. 문 닫는 소리가 컸다. 저녁 식탁이 조용했다.', eff: { aff: -3, hap: -1 } },
    { label: '못 이기는 척 책상에 앉는다', text: '엄마가 슬그머니 과일을 깎아 들여놨다.', eff: { study: 3, aff: 2 } },
    { label: '엄마 어깨를 주물러 드린다', text: '"얘가 왜 이래?" 하면서도 엄마 얼굴이 풀렸다.', eff: { aff: 5, mor: 1 } },
  ] },
  { id: 'h_mom_sick', title: '엄마가 아프다', age: [8, 30], w: 0.03, cooldown: 10, cond: young(8, 30), text: '늘 먼저 일어나던 엄마가 오늘은 일어나지 못한다. 이마가 뜨겁다.', choices: [
    { label: '죽을 끓이고 곁을 지킨다', text: '서툴게 끓인 죽을 엄마가 다 드셨다. "우리 {n} 다 컸네."', eff: { mor: 2, aff: 6 } },
    { label: '약을 사 오고 학교(일)에 간다', text: '저녁에 오니 엄마가 벌써 부엌에 서 있었다. 마음이 짠했다.', eff: { aff: 2 } },
  ] },
  { id: 'h_mom_birthday', title: '엄마 생신', age: [8, 25], w: 0.04, cooldown: 5, cond: young(8, 25), text: '내일이 엄마 생신이다. 모아 둔 용돈이 조금 있다.', choices: [
    { label: '용돈으로 선물을 산다', text: '엄마가 선물을 받고 한참 말이 없었다. 눈가가 촉촉했다.', eff: { cash: -3, aff: 7, hap: 3 } },
    { label: '손편지를 쓴다', text: '엄마는 그 편지를 장롱 깊숙이 넣어 두었다. 수십 년 뒤에도 거기 있었다.', eff: { aff: 6, mor: 1 } },
    { label: '깜빡 잊는다', text: '엄마는 아무 말도 안 했다. 그게 더 미안했다.', eff: { aff: -4, mor: -1 } },
  ] },
  { id: 'h_mom_secret_bank', title: '엄마의 비밀 통장', age: [15, 25], w: 0.025, once: true, cond: young(15, 25), text: '이삿짐을 싸다 장롱 속에서 {n} 이름으로 된 통장을 발견했다. 태어난 해부터 매달 조금씩 넣은 흔적이 빼곡하다.', choices: [
    { label: '엄마께 여쭤본다', text: '"너 대학 갈 때 주려고…" 엄마가 멋쩍게 웃었다.', eff: { cash: 300, aff: 8, hap: 5 } },
    { label: '모른 척 제자리에 둔다', text: '그날 밤 {n}은(는) 오래 잠들지 못했다. 더 잘해야겠다고 생각했다.', eff: { mor: 2, study: 4 } },
  ] },
  { id: 'h_mom_fight', title: '엄마와 크게 다퉜다', age: [14, 24], w: 0.03, cooldown: 6, cond: young(14, 24), text: '진로 문제로 엄마와 목소리가 높아졌다. "엄마가 뭘 알아!" 말이 먼저 튀어나왔다.', choices: [
    { label: '먼저 사과한다', text: '엄마도 "엄마가 너무 몰아붙였다"며 손을 잡았다.', eff: { aff: 5, mor: 2 } },
    { label: '며칠 말을 안 한다', text: '냉전 사흘째, 식탁 위에 좋아하는 반찬만 올라와 있었다.', eff: { aff: -2, hap: -3 } },
  ] },
  { id: 'h_mom_market', title: '엄마 따라 시장에', age: [5, 10], w: 0.035, cooldown: 5, cond: young(5, 10), text: '엄마 손을 잡고 시장에 갔다. 떡볶이 냄새, 생선 비린내, 상인들 목소리.', choices: [
    { label: '엄마 옆에서 흥정을 구경한다', text: '"천 원만 깎아 주세요~" 엄마의 흥정 솜씨에 감탄했다.', eff: { cha: 1, hap: 4 } },
    { label: '떡볶이를 조른다', text: '길바닥 의자에 앉아 엄마랑 나눠 먹은 떡볶이. 제일 맛있었다.', eff: { hap: 6, aff: 3 } },
  ] },
  { id: 'h_mom_bedtime', title: '잠자리 옛날이야기', age: [4, 8], w: 0.04, cooldown: 4, cond: young(4, 8), text: '"옛날 옛적에 호랑이가 살았는데…" 엄마가 이불을 덮어 주며 이야기를 시작한다.', choices: [
    { label: '끝까지 듣는다', text: '떡 하나 주면 안 잡아먹지~ 엄마 목소리를 들으며 스르르 잠들었다.', eff: { int: 1, hap: 4 } },
    { label: '"다음 이야기!"를 외친다', text: '엄마가 먼저 잠들었다. 이야기는 곰이 호랑이가 되는 결말로 끝났다.', eff: { hap: 5, cha: 1 } },
  ] },
  { id: 'h_mom_report', title: '성적표와 엄마', age: [9, 18], w: 0.035, cooldown: 4, cond: young(9, 18), text: '성적표를 받은 날. 엄마가 안경을 쓰고 한 줄 한 줄 읽는다.', choices: [
    { label: '솔직하게 건넨다', text: '', roll: ['int', 50, [{ aff: 4, hap: 4 }, '"잘했네!" 저녁 반찬이 불고기였다.'], [{ study: 4, hap: -2 }, '"괜찮아, 다음에 잘하면 돼." 오히려 더 열심히 하게 됐다.']] },
    { label: '엄마 도장을 몰래 찍는다', text: '', roll: ['luck', 35, [{ hap: 2, mor: -2 }, '들키지 않았다. 마음 한구석이 찜찜하다.'], [{ aff: -8, mor: -1 }, '담임 선생님 전화로 들통났다. 엄마가 처음으로 울었다.']] },
  ] },
  { id: 'h_mom_letter', title: '엄마의 편지', age: [18, 30], w: 0.03, once: true, cond: young(18, 30), text: '집을 떠난 {n}에게 엄마의 편지가 왔다. 맞춤법이 서툰 글씨로 꾹꾹 눌러 썼다. "밥은 꼭 챙겨 먹어라."', choices: [
    { label: '답장을 쓴다', text: '엄마는 그 답장을 동네방네 자랑했다고 한다.', eff: { aff: 6, hap: 5 } },
    { label: '전화를 건다', text: '"목소리 들으니 됐다." 엄마 목소리가 떨렸다.', eff: { aff: 5, hap: 4 } },
  ] },
  { id: 'h_mom_wedding_talk', title: '엄마의 결혼 이야기', age: [20, 34], w: 0.025, cooldown: 8, cond: (s, p) => young(20, 34)(s, p) && !p.spouseId, text: '"너도 이제 짝을 만나야지. 엄마 아는 집 딸(아들)이 있는데…" 엄마가 사진 한 장을 내민다.', choices: [
    { label: '한 번 만나 본다', text: '엄마 체면을 세워 드렸다. 인연인지는 모르겠다.', eff: { aff: 4, cha: 1 } },
    { label: '"제가 알아서 할게요"', text: '엄마가 한숨을 쉬며 사진을 도로 넣었다.', eff: { aff: -2, hap: 1 } },
  ] },
  // ─── 어머니의 지난날이 남긴 것 (근현대사 가문) ───
  { id: 'h_mom_japanese_song', title: '엄마의 옛 노래', age: [6, 16], w: 0.05, once: true, cond: momHas('mom_japanese'), text: '엄마가 설거지를 하다 무심코 알 수 없는 노래를 흥얼거린다. "어릴 때 학교에서 억지로 배운 일본 노래야." 엄마가 급히 입을 다문다.', choices: [
    { label: '그 시절 이야기를 조른다', text: '창씨개명, 공출, 해방의 날… 엄마의 이야기는 교과서보다 생생했다.', eff: { int: 2, mor: 2 } },
    { label: '한글 동요를 같이 부른다', text: '"우리 {n}는 우리말 노래만 불러라." 엄마가 웃었다.', eff: { hap: 4, aff: 3 } },
  ] },
  { id: 'h_mom_refugee_story', title: '피난길 이야기', age: [8, 18], w: 0.05, once: true, cond: momHas('mom_refugee'), text: '정전이 된 밤, 촛불 아래서 엄마가 피난길 이야기를 꺼낸다. "그때 엄마는 네 나이였어. 동생을 업고 한강 다리를 건넜지."', choices: [
    { label: '끝까지 듣는다', text: '엄마가 잃어버린 외삼촌 이야기에서 목이 멨다. {n}은(는) 그날 조금 어른이 됐다.', eff: { mor: 3, aff: 5 } },
    { label: '이산가족 찾기를 알아본다', text: '신문 광고란을 한참 뒤졌다. 찾지는 못했지만 엄마가 {n}을 꼭 안았다.', eff: { mor: 2, aff: 7 } },
  ] },
  { id: 'h_mom_sewing', title: '엄마의 재봉틀', age: [7, 16], w: 0.05, cooldown: 6, cond: momHas('mom_seamstress'), text: '드르륵 드르륵. 엄마가 밤새 재봉틀을 돌려 {n}의 설빔을 만들었다. 가게 옷보다 더 멋지다.', choices: [
    { label: '재봉틀 쓰는 법을 배운다', text: '손끝이 야무져졌다. 가사 시간에 선생님이 깜짝 놀랐다.', eff: { int: 1, str: 1, hap: 3 } },
    { label: '새 옷을 입고 동네를 한 바퀴 돈다', text: '"어디서 샀어?" "우리 엄마가 만들었어!"', eff: { cha: 2, aff: 4 } },
  ] },
  { id: 'h_mom_merchant_lesson', title: '엄마의 장사 수업', age: [9, 18], w: 0.05, cooldown: 6, cond: momHas('mom_merchant'), text: '방학에 엄마 좌판을 도왔다. "손님 눈을 보고, 먼저 웃어라. 덤은 아끼지 말고."', choices: [
    { label: '직접 손님을 받아 본다', text: '', roll: ['cha', 40, [{ cha: 2, cash: 5, hap: 4 }, '첫 손님에게 콩나물을 팔았다! 엄마가 엉덩이를 두드려 줬다.'], [{ cha: 1, hap: -1 }, '말을 더듬다 손님을 놓쳤다. "처음엔 다 그래."']] },
    { label: '장부 정리를 돕는다', text: '엄마의 암산 속도를 따라가지 못했다. 셈이 부쩍 늘었다.', eff: { int: 2 } },
  ] },
  { id: 'h_mom_farm_dawn', title: '새벽 들판', age: [8, 17], w: 0.05, cooldown: 5, cond: momHas('mom_farm'), text: '새벽 안개 속, 엄마는 벌써 논에 나가 있다. 새참 광주리를 들고 논둑을 걸어간다.', choices: [
    { label: '모내기를 같이 한다', text: '허리가 끊어질 것 같았다. 엄마는 이걸 매일 한다.', eff: { str: 2, mor: 2, aff: 4 } },
    { label: '"나는 꼭 도시로 갈 거야"', text: '엄마가 웃었다. "그래, 너는 공부해서 편하게 살아라." 그날 밤 책을 폈다.', eff: { study: 5, int: 1 } },
  ] },
  { id: 'h_mom_factory_scar', title: '엄마 손의 흉터', age: [8, 18], w: 0.05, once: true, cond: momHas('mom_factory'), text: '엄마 손등의 흉터를 처음 자세히 봤다. "공장 다닐 때 기계에 긁힌 거야. 그 월급으로 외삼촌이 학교를 다녔지."', choices: [
    { label: '엄마 손을 꼭 잡는다', text: '거칠고 따뜻한 손이었다.', eff: { mor: 3, aff: 6 } },
    { label: '"내가 나중에 호강시켜 줄게"', text: '엄마가 "말이라도 고맙다" 하며 웃었다. {n}은(는) 그 말을 잊지 않았다.', eff: { study: 4, aff: 4 } },
  ] },
  { id: 'h_mom_teacher_study', title: '엄마표 공부', age: [6, 14], w: 0.06, cooldown: 3, cond: momHas('mom_teacher'), text: '저녁을 먹고 나면 엄마가 밥상을 펴고 공책을 꺼낸다. 선생님이었던 엄마의 수업이 시작된다.', choices: [
    { label: '열심히 따라간다', text: '받아쓰기 백 점. 엄마 수업은 학교보다 무섭고 재밌다.', eff: { int: 2, study: 5 } },
    { label: '꾀를 부린다', text: '엄마에겐 통하지 않는다. "선생님 속이던 애들 다 봤다, 얘."', eff: { study: 3, hap: -1 } },
  ] },
  { id: 'h_mom_newwoman_piano', title: '엄마의 피아노', age: [6, 15], w: 0.06, cooldown: 4, cond: momHas('mom_newwoman'), text: '엄마가 거실 피아노 앞에 앉아 쇼팽을 친다. 신여성이라 불리던 엄마의 젊은 날이 보인다.', choices: [
    { label: '피아노를 배운다', text: '손가락이 꼬였지만 엄마가 옆에서 박자를 세 줬다.', eff: { cha: 2, int: 1, hap: 3 } },
    { label: '엄마 서재의 책을 꺼내 읽는다', text: '문학전집의 첫 권을 폈다. 밤새 읽었다.', eff: { int: 3 } },
  ] },
  { id: 'h_mom_devout_prayer', title: '새벽 정화수', age: [7, 19], w: 0.05, cooldown: 6, cond: momHas('mom_devout'), text: '새벽에 깨 보니 엄마가 장독대 앞에서 정화수를 떠 놓고 두 손을 모으고 있다. "우리 {n} 무탈하게 해 주십시오…"', choices: [
    { label: '옆에서 같이 손을 모은다', text: '엄마가 놀라더니 {n}의 손을 꼭 잡았다.', eff: { mor: 3, aff: 4 } },
    { label: '조용히 이불 속으로 돌아간다', text: '그 모습이 오래 마음에 남았다.', eff: { mor: 1 } },
  ] },
  { id: 'h_mom_singer_stage', title: '엄마의 노래', age: [6, 16], w: 0.05, cooldown: 5, cond: momHas('mom_singer'), text: '동네 잔치에서 엄마가 마이크를 잡았다. 첫 소절에 잔치판이 조용해진다.', choices: [
    { label: '엄마 옆에서 같이 부른다', text: '박수가 쏟아졌다. {n}도 무대 체질인가 보다.', eff: { cha: 3, hap: 5 } },
    { label: '멀리서 자랑스럽게 본다', text: '"우리 엄마야!" 친구들에게 몇 번이고 말했다.', eff: { hap: 5, aff: 3 } },
  ] },
];
