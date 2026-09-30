// 윗사람이 없는 일: 선출직·사장님·개원의·창작자·농어민·성직자.
// 이런 사람에겐 상사 갑질·회식·동기 승진·이직 같은 "회사원" 이야기와 행동이 맞지 않는다.
import { PAY } from './pay';
import type { Person } from './types';

const OWN = new Set([
  'politician', 'president', 'minister', 'mayor',
  'founder', 'shopkeeper', 'cafe_owner', 'cvs_owner', 'online_shop', 'restaurant', 'realtor', 'landlord', 'ceo',
  'farmer', 'smart_farmer', 'fisher', 'rancher', 'sea_farmer',
  'youtuber', 'hj_av', 'writer', 'novelist', 'painter', 'musician', 'photographer', 'entertainer', 'gamer',
  'clergy', 'tutor', 'scrivener', 'labor_attorney', 'tax_accountant', 'patent_attorney', 'customs_broker', 'appraiser',
]);
/** 선출직: 승진이 아니라 선거로 오르내린다 */
export const ELECTED = new Set(['politician', 'president', 'mayor']);

/** 개원·개업을 했다 (의사·치과의사·한의사·수의사·약사) */
export const ownsPractice = (p: Person) => PAY[p.job]?.open !== undefined && p.jobLevel >= PAY[p.job]!.open!;

export const selfBoss = (p: Person) => OWN.has(p.job) || p.job.startsWith('hj_') || ownsPractice(p);

/** 회사·조직에 다니는 사람을 전제로 한 이야기 */
export const BOSS_STORIES = new Set(['gapjil', 'hoesik', 'office_romance', 'm_promotion_party', 'x_quiet_quit', 'fx_mid_robot_boss', 'x_promotion_dinner']);
