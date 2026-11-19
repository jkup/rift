import { GuestObject } from "./runtime.js";

export class GuestWeakSet extends GuestObject {
    readonly data = new WeakMap<GuestObject, boolean>();
}
