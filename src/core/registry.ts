// 모든 이벤트 모음 (모듈 간 순환 참조를 피하려고 따로 둔다)
import { EVENTS as CORE, RANDOM_EVENTS } from './events';
import { SCHOOL_EVENTS } from './school';
import { FAMILY_EVENTS } from './family';
import { LIFE_EVENTS } from './life';
import { FATE_EVENTS, FATE_RANDOM } from './fate';
import type { EventDef } from './ev-util';

export const EVENTS: Record<string, EventDef> = { ...CORE, ...Object.fromEntries([...SCHOOL_EVENTS, ...FAMILY_EVENTS, ...LIFE_EVENTS, ...FATE_EVENTS, ...FATE_RANDOM].map((e) => [e.id, e])) };
export { RANDOM_EVENTS };
