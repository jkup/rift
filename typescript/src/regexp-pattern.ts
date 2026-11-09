import { resourceFailure, type OperationContext, type ThrowCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";

export type RegExpClassPart = { kind: "range"; from: number; to: number }
    | { kind: "builtin"; name: "digit" | "word" | "space"; inverted: boolean };
export type RegExpAtom = { kind: "character"; value: number } | { kind: "dot" }
    | { kind: "class"; parts: RegExpClassPart[]; inverted: boolean }
    | { kind: "assertion"; name: "start" | "end" | "word" | "notWord" }
    | { kind: "group"; index: number; body: RegExpDisjunction };
export type RegExpTerm = { atom: RegExpAtom; min: number; max: number | null; lazy: boolean; captureFrom: number; captureTo: number };
export type RegExpDisjunction = { alternatives: RegExpTerm[][] };
export type RegExpPattern = { source: string; body: RegExpDisjunction; captures: number };
export type RegExpParseFailure = { kind: "syntax-error" | "unsupported"; message: string; offset: number }
    | { kind: "abrupt"; completion: ThrowCompletion };
export type RegExpParseResult = { kind: "ready"; pattern: RegExpPattern } | RegExpParseFailure;
type Quantifier = { min: number; max: number | null; lazy: boolean };

function digit(text: string): boolean { return text !== "" && text >= "0" && text <= "9"; }
function hex(text: string): number {
    if (digit(text)) return text.charCodeAt(0) - 48;
    if (text >= "a" && text <= "f") return text.charCodeAt(0) - 87;
    if (text >= "A" && text <= "F") return text.charCodeAt(0) - 55;
    return -1;
}

class PatternParser {
    private offset = 0;
    private captures = 0;
    private depth = 0;
    private failure: RegExpParseFailure | null = null;
    constructor(private readonly source: string, private readonly context: OperationContext, private readonly loc: Location) {}

    parse(): RegExpParseResult {
        const body = this.disjunction();
        if (this.failure !== null) return this.failure;
        if (this.offset !== this.source.length) return { kind: "syntax-error", message: "unmatched closing parenthesis", offset: this.offset };
        return { kind: "ready", pattern: { source: this.source, body, captures: this.captures } };
    }
    private current(): string { return this.source.charAt(this.offset); }
    private take(): string {
        if (this.failure !== null) return "";
        const tick = this.context.tick(this.loc);
        if (tick.type === "throw") { this.failure = { kind: "abrupt", completion: tick }; return ""; }
        return this.source.charAt(this.offset++);
    }
    private reject(kind: "syntax-error" | "unsupported", message: string): null {
        if (this.failure === null) this.failure = { kind, message, offset: this.offset };
        return null;
    }
    private disjunction(): RegExpDisjunction {
        const alternatives: RegExpTerm[][] = [];
        let terms: RegExpTerm[] = [];
        while (this.failure === null && this.offset < this.source.length && this.current() !== ")") {
            if (this.current() === "|") { this.take(); alternatives.push(terms); terms = []; continue; }
            const captureFrom = this.captures + 1;
            const atom = this.atom();
            if (atom === null) break;
            const quantifier = this.quantifier();
            if (quantifier !== null && atom.kind === "assertion") {
                this.reject("syntax-error", "assertion cannot be quantified"); break;
            }
            terms.push({ atom, min: quantifier === null ? 1 : quantifier.min, max: quantifier === null ? 1 : quantifier.max,
                lazy: quantifier !== null && quantifier.lazy, captureFrom, captureTo: this.captures });
        }
        alternatives.push(terms);
        return { alternatives };
    }
    private atom(): RegExpAtom | null {
        const char = this.current();
        if (char === "*" || char === "+" || char === "?") return this.reject("syntax-error", "nothing to repeat");
        if (char === "{") {
            const quantifier = this.quantifier();
            if (this.failure !== null) return null;
            if (quantifier !== null) return this.reject("syntax-error", "nothing to repeat");
        }
        this.take();
        if (this.failure !== null) return null;
        if (char === ".") return { kind: "dot" };
        if (char === "^" || char === "$") return { kind: "assertion", name: char === "^" ? "start" : "end" };
        if (char === "\\") return this.escape(false);
        if (char === "[") return this.characterClass();
        if (char === "(") {
            if (++this.depth > 128) {
                this.failure = { kind: "abrupt", completion: resourceFailure("parse-depth", this.depth, 128, "RegExp nesting limit exceeded", this.loc) };
                return null;
            }
            let index = 0;
            if (this.current() === "?") {
                this.take();
                if (this.current() !== ":") return this.reject("unsupported", "lookaround, named and modifier groups are unsupported");
                this.take();
            } else index = ++this.captures;
            const body = this.disjunction();
            this.depth--;
            if (this.failure !== null) return null;
            if (this.current() !== ")") return this.reject("syntax-error", "unterminated group");
            this.take();
            return { kind: "group", index, body };
        }
        return { kind: "character", value: char.charCodeAt(0) };
    }
    private decimal(): number {
        let value = 0;
        while (this.failure === null && digit(this.current())) {
            value = value * 10 + this.take().charCodeAt(0) - 48;
            if (value > 9007199254740991) this.reject("unsupported", "quantifier bound exceeds the exact integer range");
        }
        return value;
    }
    private quantifier(): Quantifier | null {
        const char = this.current();
        let min = 0, max: number | null = null;
        if (char === "*" || char === "+" || char === "?") {
            this.take();
            min = char === "+" ? 1 : 0;
            max = char === "?" ? 1 : null;
        } else if (char === "{") {
            const start = this.offset;
            this.take();
            if (!digit(this.current())) { this.offset = start; return null; }
            min = this.decimal();
            max = min;
            if (this.current() === ",") { this.take(); max = digit(this.current()) ? this.decimal() : null; }
            if (this.failure !== null) return null;
            // In non-Unicode patterns an incomplete brace expression is literal.
            if (this.current() !== "}") { this.offset = start; return null; }
            this.take();
            if (max !== null && min > max) return this.reject("syntax-error", "quantifier range is reversed");
        } else return null;
        const lazy = this.current() === "?";
        if (lazy) this.take();
        return { min, max, lazy };
    }
    private escape(inClass: boolean): RegExpAtom | null {
        if (this.offset === this.source.length) return this.reject("syntax-error", "trailing backslash");
        const char = this.take();
        if (this.failure !== null) return null;
        if (char === "b") return inClass ? { kind: "character", value: 8 } : { kind: "assertion", name: "word" };
        if (char === "B" && !inClass) return { kind: "assertion", name: "notWord" };
        if ("dDsSwW".includes(char)) {
            const lower = char.toLowerCase();
            return { kind: "class", inverted: false, parts: [{ kind: "builtin",
                name: lower === "d" ? "digit" : lower === "s" ? "space" : "word", inverted: char !== lower }] };
        }
        if (char >= "1" && char <= "9" || char === "0" && digit(this.current()) || char === "k")
            return this.reject("unsupported", "backreferences and legacy numeric escapes are unsupported");
        const controls = "fnrtv";
        const controlIndex = controls.indexOf(char);
        if (controlIndex >= 0) return { kind: "character", value: [12, 10, 13, 9, 11][controlIndex] };
        if (char === "0") return { kind: "character", value: 0 };
        if (char === "c") {
            const letter = this.current();
            if (!(letter >= "a" && letter <= "z" || letter >= "A" && letter <= "Z"))
                return this.reject("unsupported", "legacy control escape is unsupported");
            this.take();
            return { kind: "character", value: letter.charCodeAt(0) % 32 };
        }
        if (char === "x" || char === "u") {
            const count = char === "x" ? 2 : 4;
            let value = 0;
            for (let i = 0; i < count; i++) {
                const part = hex(this.source.charAt(this.offset + i));
                if (part < 0) return { kind: "character", value: char.charCodeAt(0) };
                value = value * 16 + part;
            }
            for (let i = 0; i < count; i++) this.take();
            return { kind: "character", value };
        }
        return { kind: "character", value: char.charCodeAt(0) };
    }
    private classAtom(): RegExpAtom | null {
        if (this.current() === "\\") { this.take(); return this.escape(true); }
        const char = this.take();
        return this.failure === null ? { kind: "character", value: char.charCodeAt(0) } : null;
    }
    private characterClass(): RegExpAtom | null {
        const inverted = this.current() === "^";
        if (inverted) this.take();
        const parts: RegExpClassPart[] = [];
        while (this.failure === null && this.offset < this.source.length && this.current() !== "]") {
            const first = this.classAtom();
            if (first === null) return null;
            if (this.current() === "-" && this.source.charAt(this.offset + 1) !== "]" && this.offset + 1 < this.source.length) {
                this.take();
                const last = this.classAtom();
                if (last === null) return null;
                if (first.kind !== "character" || last.kind !== "character")
                    return this.reject("unsupported", "legacy character-class ranges are unsupported");
                if (first.value > last.value) return this.reject("syntax-error", "character-class range is reversed");
                parts.push({ kind: "range", from: first.value, to: last.value });
            } else if (first.kind === "character") parts.push({ kind: "range", from: first.value, to: first.value });
            else if (first.kind === "class") for (const part of first.parts) parts.push(part);
            else throw new Error("invalid class atom");
        }
        if (this.failure !== null) return null;
        if (this.current() !== "]") return this.reject("syntax-error", "unterminated character class");
        this.take();
        return { kind: "class", parts, inverted };
    }
}

export function parseRegExpPattern(source: string, context: OperationContext, loc: Location): RegExpParseResult {
    return new PatternParser(source, context, loc).parse();
}
