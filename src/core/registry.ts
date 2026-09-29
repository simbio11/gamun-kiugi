// 모든 이벤트 모음 (모듈 간 순환 참조를 피하려고 따로 둔다)
import { EVENTS as CORE, RANDOM_EVENTS } from './events';
import { SCHOOL_EVENTS } from './school';
import { FAMILY_EVENTS } from './family';
import { LIFE_EVENTS } from './life';
import { FATE_EVENTS, FATE_RANDOM } from './fate';
import { ROMANCE_EVENTS, ROMANCE_RANDOM } from './romance';
import { STORIES } from './stories';
import { SEED_EVENTS } from './seeds';
import { NEST_EVENTS } from './nest';
import { DEBT_EVENTS } from './debt';
import { LEVERAGE_EVENTS } from './leverage';
import { LIFECOST_EVENTS } from './lifecost';
import { DECEPTION_EVENTS } from './deception';
import { HOBBY_EVENT } from './interests';
import { WELFARE_EVENTS } from './welfare';
import type { EventDef } from './ev-util';

export const EVENTS: Record<string, EventDef> = { ...CORE, ...Object.fromEntries([...SCHOOL_EVENTS, ...FAMILY_EVENTS, ...LIFE_EVENTS, ...FATE_EVENTS, ...FATE_RANDOM, ...ROMANCE_EVENTS, ...ROMANCE_RANDOM, ...STORIES, ...SEED_EVENTS, ...NEST_EVENTS, ...DEBT_EVENTS, ...LEVERAGE_EVENTS, ...LIFECOST_EVENTS, ...DECEPTION_EVENTS, HOBBY_EVENT, ...WELFARE_EVENTS].map((e) => [e.id, e])) };
export { RANDOM_EVENTS };
