import { languageFailure, normal, type GuestObject, type OperationContext, type ThrowCompletion, type ValueCompletion } from "./runtime.js";
import type { StringCompletion } from "./conversion.js";
import type { Location } from "./syntax.js";

type JSONFrame = { object: GuestObject; array: boolean; state: "first" | "key" | "value" | "separator"; key: string; index: number };

function digit(char: string): boolean { return char >= "0" && char <= "9"; }
function hex(char: string): number {
    const code = char.charCodeAt(0);
    if (code >= 48 && code <= 57) return code - 48;
    if (code >= 65 && code <= 70) return code - 55;
    if (code >= 97 && code <= 102) return code - 87;
    return -1;
}

// Containers use an explicit stack: guest nesting never recurses on the host.
export class JSONParser {
    private position = 0;
    private frames: JSONFrame[] = [];
    constructor(private text: string, private context: OperationContext, private loc: Location) {}

    private invalid(): ThrowCompletion {
        return languageFailure(this.context.realm, "SyntaxError", "invalid JSON at offset " + this.position, this.loc);
    }
    private space(): ValueCompletion {
        while (this.position < this.text.length) {
            const char = this.text.charAt(this.position);
            if (char !== " " && char !== "\t" && char !== "\r" && char !== "\n") break;
            const tick = this.context.tick(this.loc);
            if (tick.type === "throw") return tick;
            this.position++;
        }
        return normal();
    }
    private digits(): ValueCompletion {
        if (!digit(this.text.charAt(this.position))) return this.invalid();
        while (digit(this.text.charAt(this.position))) {
            const tick = this.context.tick(this.loc);
            if (tick.type === "throw") return tick;
            this.position++;
        }
        return normal();
    }
    private number(): ValueCompletion {
        const start = this.position;
        if (this.text.charAt(this.position) === "-") this.position++;
        if (this.text.charAt(this.position) === "0") this.position++;
        else {
            const integer = this.digits();
            if (integer.type === "throw") return integer;
        }
        if (this.text.charAt(this.position) === ".") {
            this.position++;
            const fraction = this.digits();
            if (fraction.type === "throw") return fraction;
        }
        const exponent = this.text.charAt(this.position);
        if (exponent === "e" || exponent === "E") {
            this.position++;
            const sign = this.text.charAt(this.position);
            if (sign === "+" || sign === "-") this.position++;
            const digits = this.digits();
            if (digits.type === "throw") return digits;
        }
        return normal({ kind: "number", value: Number(this.text.slice(start, this.position)) });
    }
    private string(): StringCompletion {
        if (this.text.charAt(this.position) !== '"') return this.invalid();
        this.position++;
        let result = "";
        while (this.position < this.text.length) {
            const tick = this.context.tick(this.loc);
            if (tick.type === "throw") return tick;
            const char = this.text.charAt(this.position++);
            if (char === '"') return { type: "normal", value: result };
            if (char.charCodeAt(0) < 32) return this.invalid();
            if (char !== "\\") { result += char; continue; }
            const escape = this.text.charAt(this.position++);
            if (escape === '"' || escape === "\\" || escape === "/") result += escape;
            else if (escape === "b") result += "\b";
            else if (escape === "f") result += "\f";
            else if (escape === "n") result += "\n";
            else if (escape === "r") result += "\r";
            else if (escape === "t") result += "\t";
            else if (escape === "u") {
                let unit = 0;
                for (let i = 0; i < 4; i++) {
                    const value = hex(this.text.charAt(this.position++));
                    if (value < 0) return this.invalid();
                    unit = unit * 16 + value;
                }
                result += String.fromCharCode(unit);
            } else return this.invalid();
        }
        return this.invalid();
    }
    private value(): ValueCompletion {
        const tick = this.context.tick(this.loc);
        if (tick.type === "throw") return tick;
        const char = this.text.charAt(this.position);
        if (char === "{" || char === "[") {
            this.position++;
            const array = char === "[";
            const object = array ? this.context.realm.createArray() : this.context.realm.createObject();
            this.frames.push({ object, array, state: "first", key: "", index: 0 });
            return normal({ kind: "object", object });
        }
        if (char === '"') {
            const string = this.string();
            return string.type === "throw" ? string : normal({ kind: "string", value: string.value });
        }
        if (char === "-" || digit(char)) return this.number();
        if (this.text.slice(this.position, this.position + 4) === "null") {
            this.position += 4; return normal({ kind: "null" });
        }
        if (this.text.slice(this.position, this.position + 4) === "true") {
            this.position += 4; return normal({ kind: "boolean", value: true });
        }
        if (this.text.slice(this.position, this.position + 5) === "false") {
            this.position += 5; return normal({ kind: "boolean", value: false });
        }
        return this.invalid();
    }
    parse(): ValueCompletion {
        const leading = this.space();
        if (leading.type === "throw") return leading;
        const root = this.value();
        if (root.type === "throw") return root;
        while (this.frames.length > 0) {
            const tick = this.context.tick(this.loc);
            if (tick.type === "throw") return tick;
            const space = this.space();
            if (space.type === "throw") return space;
            const frame = this.frames[this.frames.length - 1];
            const char = this.text.charAt(this.position);
            const close = frame.array ? "]" : "}";
            if (frame.state === "first" && char === close) {
                this.position++; this.frames.pop(); continue;
            }
            if (frame.state === "separator") {
                if (char === close) { this.position++; this.frames.pop(); continue; }
                if (char !== ",") return this.invalid();
                this.position++;
                frame.state = frame.array ? "value" : "key";
                continue;
            }
            if (!frame.array && (frame.state === "first" || frame.state === "key")) {
                const key = this.string();
                if (key.type === "throw") return key;
                frame.key = key.value;
                const gap = this.space();
                if (gap.type === "throw") return gap;
                if (this.text.charAt(this.position) !== ":") return this.invalid();
                this.position++;
                frame.state = "value";
                continue;
            }
            const value = this.value();
            if (value.type === "throw") return value;
            const key = frame.array ? String(frame.index++) : frame.key;
            // Define data directly, including __proto__ and duplicate keys.
            const defined = frame.object.defineOwnProperty(key, { value: value.value, writable: true, enumerable: true, configurable: true }, this.context, this.loc);
            if (defined.type === "throw") return defined;
            if (!defined.value) throw new Error("fresh JSON property invariant");
            frame.state = "separator";
        }
        const trailing = this.space();
        if (trailing.type === "throw") return trailing;
        return this.position === this.text.length ? root : this.invalid();
    }
}
