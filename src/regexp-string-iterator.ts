import type { Realm } from "./realm.js";
import {
    GuestObject,
    UNDEFINED,
    normal,
    languageFailure,
    type OperationContext,
    type ValueCompletion,
} from "./runtime.js";
import { iteratorResult } from "./iterator-result.js";
import { toPrimitive } from "./primitive-conversion.js";
import { toLength } from "./conversion.js";
import { regExpExec } from "./builtins/regexp-execution.js";
import { regExpString } from "./builtins/regexp.js";
import { advanceStringIndex } from "./builtins/regexp-match-search.js";
import type { Location } from "./syntax.js";

export class GuestRegExpStringIterator extends GuestObject {
    private executing = false;

    constructor(
        private matcher: GuestObject | null,
        private text: string | null,
        private readonly global: boolean,
        private readonly fullUnicode: boolean,
        private readonly creationRealm: Realm,
    ) {
        super(creationRealm.regexpStringIteratorPrototype);
    }

    private complete(): void {
        this.matcher = null;
        this.text = null;
    }

    next(context: OperationContext, loc: Location): ValueCompletion {
        if (this.executing) {
            return languageFailure(
                context.realm,
                "TypeError",
                "RegExp iterator is already executing",
                loc,
            );
        }
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        if (this.matcher === null) {
            return iteratorResult(UNDEFINED, true, context, loc);
        }
        // Resume in the captured Realm, using this caller's dispatch and budget.
        const resumed: OperationContext = {
            realm: this.creationRealm,
            call: context.call,
            tick: context.tick,
            construct: context.construct,
            enqueueJob: context.enqueueJob,
        };
        this.executing = true;
        try {
            const result = this.advance(resumed, loc);
            if (result.type === "throw") {
                this.complete();
                return result;
            }
            const done = result.value.kind === "undefined";
            const output = iteratorResult(
                result.value,
                done,
                context,
                loc,
                done ? context.realm : this.creationRealm,
            );
            if (output.type === "throw") {
                this.complete();
            }
            return output;
        } finally {
            this.executing = false;
        }
    }

    private advance(context: OperationContext, loc: Location): ValueCompletion {
        const matcher = this.matcher,
            text = this.text;
        if (matcher === null || text === null) {
            throw new Error("RegExp iterator resume invariant");
        }
        const result = regExpExec(matcher, text, context, loc);
        if (result.type === "throw") {
            return result;
        }
        if (result.value.kind === "null") {
            this.complete();
            return normal();
        }
        if (result.value.kind !== "object") {
            throw new Error("RegExpExec result invariant");
        }
        if (!this.global) {
            this.complete();
            return result;
        }
        const first = result.value.object.internalGet("0", result.value, context, loc);
        if (first.type === "throw") {
            return first;
        }
        const matched = regExpString(first.value, context, loc);
        if (matched.type === "throw") {
            return matched;
        }
        if (matched.value === "") {
            const property = matcher.internalGet(
                "lastIndex",
                { kind: "object", object: matcher },
                context,
                loc,
            );
            if (property.type === "throw") {
                return property;
            }
            const primitive = toPrimitive(property.value, "number", context, loc);
            if (primitive.type === "throw") {
                return primitive;
            }
            const index = toLength(primitive.value, loc, context.realm);
            if (index.type === "throw") {
                return index;
            }
            const set = matcher.set(
                "lastIndex",
                { kind: "number", value: advanceStringIndex(text, index.value, this.fullUnicode) },
                context,
                loc,
            );
            if (set.type === "throw") {
                return set;
            }
        }
        return result;
    }
}
