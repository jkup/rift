import { GuestObject, type Value } from "./runtime.js";

export class GuestWeakMap extends GuestObject {
    readonly data = new WeakMap<GuestObject, Value>();
}
