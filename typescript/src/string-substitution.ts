import type { GuestObject, OperationContext, ThrowCompletion, Value } from "./runtime.js";
import type { StringCompletion } from "./conversion.js";
import type { Location } from "./syntax.js";
import { regExpString } from "./builtins/regexp.js";

export class ReplacementText {
    private parts: string[] = [];
    constructor(private readonly context: OperationContext, private readonly loc: Location) {}
    append(text: string): ThrowCompletion | null {
        for (let i = 0; i < text.length; i++) {
            const tick = this.context.tick(this.loc);
            if (tick.type === "throw") return tick;
        }
        this.parts.push(text);
        return null;
    }
    finish(): string { return this.parts.join(""); }
}

function digit(char: string): boolean { return char !== "" && char >= "0" && char <= "9"; }

export function getSubstitution(matched: string, input: string, position: number, captures: Value[], named: GuestObject | null,
    template: string, context: OperationContext, loc: Location): StringCompletion {
    const result = new ReplacementText(context, loc);
    for (let i = 0; i < template.length; i++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        let text = template.charAt(i);
        if (text === "$") {
            const next = template.charAt(i + 1);
            if (next === "$") { text = "$"; i++; }
            else if (next === "&") { text = matched; i++; }
            else if (next === "`") { text = input.slice(0, position); i++; }
            else if (next === "'") { text = input.slice(Math.min(position + matched.length, input.length)); i++; }
            else if (digit(next)) {
                let count = digit(template.charAt(i + 2)) ? 2 : 1;
                let index = next.charCodeAt(0) - 48;
                if (count === 2) index = index * 10 + template.charCodeAt(i + 2) - 48;
                if (index > captures.length && count === 2) { count = 1; index = next.charCodeAt(0) - 48; }
                text = template.slice(i, i + count + 1);
                if (index >= 1 && index <= captures.length) {
                    const capture = captures[index - 1];
                    if (capture.kind !== "string" && capture.kind !== "undefined") throw new Error("capture string invariant");
                    text = capture.kind === "undefined" ? "" : capture.value;
                }
                i += count;
            } else if (next === "<") {
                text = "$<";
                if (named !== null) {
                    let end = i + 2;
                    while (end < template.length && template.charAt(end) !== ">") {
                        const scan = context.tick(loc);
                        if (scan.type === "throw") return scan;
                        end++;
                    }
                    if (end < template.length) {
                        const property = named.internalGet(template.slice(i + 2, end), { kind: "object", object: named }, context, loc);
                        if (property.type === "throw") return property;
                        if (property.value.kind === "undefined") text = "";
                        else {
                            const converted = regExpString(property.value, context, loc);
                            if (converted.type === "throw") return converted;
                            text = converted.value;
                        }
                        i = end - 1;
                    }
                }
                i++;
            }
        }
        const appended = result.append(text);
        if (appended !== null) return appended;
    }
    return { type: "normal", value: result.finish() };
}
