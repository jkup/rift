import type { Realm } from "./realm.js";
import { DATE_TIME_LIMIT } from "./date-time.js";

export function currentDateMilliseconds(realm: Realm): number {
    const value = realm.clockMilliseconds === null ? Date.now() : realm.clockMilliseconds();
    if (!Number.isInteger(value) || Math.abs(value) > DATE_TIME_LIMIT) throw new Error("host clock must return valid epoch milliseconds");
    return value === 0 ? 0 : value;
}
