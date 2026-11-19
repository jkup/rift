import { GuestObject } from "./runtime.js";
import { KeyedCollection } from "./keyed-collection.js";

export class GuestMap extends GuestObject {
    readonly data = new KeyedCollection();
}
