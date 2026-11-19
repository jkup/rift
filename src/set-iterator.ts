import type { Realm } from "./realm.js";
import type { GuestSet } from "./set-object.js";
import type { CollectionCursor } from "./keyed-collection.js";
import { GuestObject, UNDEFINED, type OperationContext, type ValueCompletion } from "./runtime.js";
import { iteratorResult } from "./iterator-result.js";
import { arrayFromList } from "./array-create.js";
import type { Location } from "./syntax.js";

export type SetIterationKind = "value" | "key+value";

export class GuestSetIterator extends GuestObject {
    private cursor: CollectionCursor | null = null;

    constructor(
        private collection: GuestSet | null,
        private readonly kind: SetIterationKind,
        private readonly creationRealm: Realm,
        proto: GuestObject,
    ) {
        super(proto);
    }

    next(context: OperationContext, loc: Location): ValueCompletion {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        if (this.collection === null) {
            return iteratorResult(UNDEFINED, true, context, loc);
        }
        if (this.cursor === null) {
            this.cursor = this.collection.data.cursor();
        }
        const step = this.cursor.next(context, loc);
        if (step.type === "throw") {
            return step;
        }
        if (step.entry === null) {
            this.collection = null;
            this.cursor = null;
            return iteratorResult(UNDEFINED, true, context, loc);
        }
        if (this.kind === "value") {
            return iteratorResult(step.entry.key, false, context, loc, this.creationRealm);
        }
        const pair = arrayFromList(
            [step.entry.key, step.entry.key],
            context,
            loc,
            this.creationRealm,
        );
        return pair.type === "throw"
            ? pair
            : iteratorResult(pair.value, false, context, loc, this.creationRealm);
    }
}
