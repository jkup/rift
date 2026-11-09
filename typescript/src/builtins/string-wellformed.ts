import type { Realm } from "../realm.js";
import { normal, type Value, type ValueCompletion, type OperationContext } from "../runtime.js";
import type { Location } from "../syntax.js";
import { stringLength, stringCodeUnit, stringSlice, stringJoin } from "../strings.js";
import { stringReceiver } from "./string.js";

function wellFormed(receiver: Value, replace: boolean, context: OperationContext, loc: Location): ValueCompletion {
    const text = stringReceiver(receiver, context, loc);
    if (text.type === "throw") return text;
    const length = stringLength(text.value);
    const parts: string[] = [];
    let start = 0;
    for (let i = 0; i < length; i++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const unit = stringCodeUnit(text.value, i);
        if (unit < 0xd800 || unit > 0xdfff) continue;
        if (unit <= 0xdbff && i + 1 < length) {
            const next = stringCodeUnit(text.value, i + 1);
            if (next >= 0xdc00 && next <= 0xdfff) { i++; continue; }
        }
        if (!replace) return normal({ kind: "boolean", value: false });
        parts.push(stringSlice(text.value, start, i), "\ufffd");
        start = i + 1;
    }
    if (!replace) return normal({ kind: "boolean", value: true });
    if (parts.length === 0) return normal({ kind: "string", value: text.value });
    parts.push(stringSlice(text.value, start, length));
    return normal({ kind: "string", value: stringJoin(parts) });
}

export function registerStringWellFormed(realm: Realm): void {
    realm.registerBuiltin(realm.stringPrototype, "isWellFormed", 0, (receiver, _args, context, loc): ValueCompletion =>
        wellFormed(receiver, false, context, loc));
    realm.registerBuiltin(realm.stringPrototype, "toWellFormed", 0, (receiver, _args, context, loc): ValueCompletion =>
        wellFormed(receiver, true, context, loc));
}
