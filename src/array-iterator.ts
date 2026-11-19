import { iteratorResult } from "./iterator-result.js";
import {
    GuestObject,
    UNDEFINED,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "./runtime.js";
import { lengthOfArrayLike } from "./array-like.js";
import { numberToString } from "./conversion.js";
import { arrayFromList } from "./array-create.js";
import type { Location } from "./syntax.js";

export type ArrayIterationKind = "key" | "value" | "key+value";

export class GuestArrayIterator extends GuestObject {
    private nextIndex = 0;

    constructor(
        private array: GuestObject | null,
        private readonly iterationKind: ArrayIterationKind,
        proto: GuestObject,
    ) {
        super(proto);
    }

    next(context: OperationContext, loc: Location): ValueCompletion {
        const step = context.tick(loc);
        if (step.type === "throw") {
            return step;
        }
        const array = this.array;
        if (array === null) {
            return iteratorResult(UNDEFINED, true, context, loc);
        }
        // Capture before length access: a getter can reenter this iterator.
        const index = this.nextIndex;
        const length = lengthOfArrayLike(array, context, loc);
        if (length.type === "throw") {
            return length;
        }
        if (index >= length.value) {
            this.array = null;
            return iteratorResult(UNDEFINED, true, context, loc);
        }
        this.nextIndex = index + 1;
        const key: Value = { kind: "number", value: index };
        if (this.iterationKind === "key") {
            return iteratorResult(key, false, context, loc);
        }
        const element = array.internalGet(
            numberToString(index),
            { kind: "object", object: array },
            context,
            loc,
        );
        if (element.type === "throw") {
            return element;
        }
        if (this.iterationKind === "value") {
            return iteratorResult(element.value, false, context, loc);
        }
        const pair = arrayFromList([key, element.value], context, loc);
        if (pair.type === "throw") {
            return pair;
        }
        return iteratorResult(pair.value, false, context, loc);
    }
}
