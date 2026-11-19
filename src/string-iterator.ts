import type { Realm } from "./realm.js";
import { GuestObject, UNDEFINED, type OperationContext, type ValueCompletion } from "./runtime.js";
import { stringCodeUnit, stringLength, stringSlice, type GuestString } from "./strings.js";
import { iteratorResult } from "./iterator-result.js";
import type { Location } from "./syntax.js";

export class GuestStringIterator extends GuestObject {
    private nextIndex = 0;

    constructor(private text: GuestString | null, private readonly creationRealm: Realm, proto: GuestObject) {
        super(proto);
    }

    next(context: OperationContext, loc: Location): ValueCompletion {
        const step = context.tick(loc);
        if (step.type === "throw") return step;
        const text = this.text, index = this.nextIndex;
        if (text === null) return iteratorResult(UNDEFINED, true, context, loc);
        const length = stringLength(text);
        if (index >= length) {
            this.text = null;
            return iteratorResult(UNDEFINED, true, context, loc);
        }
        let end = index + 1;
        const first = stringCodeUnit(text, index);
        if (first >= 0xd800 && first <= 0xdbff && end < length) {
            const second = stringCodeUnit(text, end);
            if (second >= 0xdc00 && second <= 0xdfff) end++;
        }
        this.nextIndex = end;
        // The specification yields in the captured generator Realm; completion
        // results above are created after restoring the next builtin's Realm.
        return iteratorResult({ kind: "string", value: stringSlice(text, index, end) }, false, context, loc, this.creationRealm);
    }
}
