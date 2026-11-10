import { GuestObject } from "./runtime.js";

export class GuestTemporalInstant extends GuestObject {
    constructor(readonly epochNanoseconds: bigint, proto: GuestObject | null) {
        super(proto);
    }
}
