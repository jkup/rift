import type { Realm } from "../realm.js";
import { normal, UNDEFINED, type ValueCompletion } from "../runtime.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString } from "../conversion.js";
import { stringCodeUnit, stringLength, stringSlice, stringJoin } from "../strings.js";
import { stringReceiver } from "./string.js";

function registerHTMLMethod(realm: Realm, name: string, tag: string, attribute: string): void {
    realm.registerBuiltin(
        realm.stringPrototype,
        name,
        attribute === "" ? 0 : 1,
        (receiver, args, context, loc): ValueCompletion => {
            const contents = stringReceiver(receiver, context, loc);
            if (contents.type === "throw") {
                return contents;
            }
            const parts = ["<", tag];
            if (attribute !== "") {
                const primitive = toPrimitive(args[0] ?? UNDEFINED, "string", context, loc);
                if (primitive.type === "throw") {
                    return primitive;
                }
                const converted = toString(primitive.value, loc, context.realm);
                if (converted.type === "throw") {
                    return converted;
                }
                parts.push(" ", attribute, '="');
                let start = 0;
                for (let i = 0; i < stringLength(converted.value); i++) {
                    const tick = context.tick(loc);
                    if (tick.type === "throw") {
                        return tick;
                    }
                    if (stringCodeUnit(converted.value, i) === 0x22) {
                        parts.push(stringSlice(converted.value, start, i), "&quot;");
                        start = i + 1;
                    }
                }
                parts.push(stringSlice(converted.value, start, stringLength(converted.value)), '"');
            }
            parts.push(">", contents.value, "</", tag, ">");
            return normal({ kind: "string", value: stringJoin(parts) });
        },
    );
}

export function registerStringHTML(realm: Realm): void {
    registerHTMLMethod(realm, "anchor", "a", "name");
    registerHTMLMethod(realm, "big", "big", "");
    registerHTMLMethod(realm, "blink", "blink", "");
    registerHTMLMethod(realm, "bold", "b", "");
    registerHTMLMethod(realm, "fixed", "tt", "");
    registerHTMLMethod(realm, "fontcolor", "font", "color");
    registerHTMLMethod(realm, "fontsize", "font", "size");
    registerHTMLMethod(realm, "italics", "i", "");
    registerHTMLMethod(realm, "link", "a", "href");
    registerHTMLMethod(realm, "small", "small", "");
    registerHTMLMethod(realm, "strike", "strike", "");
    registerHTMLMethod(realm, "sub", "sub", "");
    registerHTMLMethod(realm, "sup", "sup", "");
}
