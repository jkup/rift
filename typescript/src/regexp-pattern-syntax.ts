export type RegExpClassPart = { kind: "range"; from: number; to: number }
    | { kind: "builtin"; name: "digit" | "word" | "space"; inverted: boolean };
export type RegExpAtom = { kind: "character"; value: number } | { kind: "dot" }
    | { kind: "backreference"; index: number }
    | { kind: "class"; parts: RegExpClassPart[]; inverted: boolean }
    | { kind: "assertion"; name: "start" | "end" | "word" | "notWord" }
    | { kind: "group"; index: number; body: RegExpDisjunction };
export type RegExpTerm = { atom: RegExpAtom; min: number; max: number | null; lazy: boolean; captureFrom: number; captureTo: number };
export type RegExpDisjunction = { alternatives: RegExpTerm[][] };
export type RegExpPattern = { source: string; body: RegExpDisjunction; captures: number };
export type RegExpSyntaxFailure = { kind: "syntax-error" | "unsupported"; message: string; offset: number }
    | { kind: "stopped" }
    | { kind: "depth-limit"; count: number; limit: number };
export type RegExpSyntaxResult = { kind: "ready"; pattern: RegExpPattern } | RegExpSyntaxFailure;
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
    private totalCaptures: number | null = null;
    private depth = 0;
    private failure: RegExpSyntaxFailure | null = null;
    constructor(private readonly source: string, private readonly tick: () => boolean) {}

    parse(): RegExpSyntaxResult {
        const body = this.disjunction();
        if (this.failure !== null) return this.failure;
        if (this.offset !== this.source.length) return { kind: "syntax-error", message: "unmatched closing parenthesis", offset: this.offset };
        return { kind: "ready", pattern: { source: this.source, body, captures: this.captures } };
    }
    private current(): string { return this.source.charAt(this.offset); }
    private take(): string {
        if (this.failure !== null) return "";
        if (!this.tick()) { this.failure = { kind: "stopped" }; return ""; }
        return this.source.charAt(this.offset++);
    }
    private reject(kind: "syntax-error" | "unsupported", message: string): null {
        if (this.failure === null) this.failure = { kind, message, offset: this.offset };
        return null;
    }
    private captureCount(): number {
        if (this.totalCaptures !== null) return this.totalCaptures;
        let count = 0, escaped = false, inClass = false;
        for (let i = 0; i < this.source.length; i++) {
            if (!this.tick()) { this.failure = { kind: "stopped" }; return 0; }
            const char = this.source.charAt(i);
            if (escaped) { escaped = false; continue; }
            if (char === "\\") { escaped = true; continue; }
            if (inClass) { if (char === "]") inClass = false; continue; }
            if (char === "[") inClass = true;
            else if (char === "(" && this.source.charAt(i + 1) !== "?") count++;
        }
        this.totalCaptures = count;
        return count;
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
                this.failure = { kind: "depth-limit", count: this.depth, limit: 128 };
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
        if (char >= "1" && char <= "9" && !inClass) {
            const count = this.captureCount();
            let index = char.charCodeAt(0) - 48;
            while (this.failure === null && digit(this.current()))
                index = Math.min(count + 1, index * 10 + this.take().charCodeAt(0) - 48);
            if (this.failure !== null) return null;
            if (index <= count) return { kind: "backreference", index };
            return this.reject("unsupported", "legacy numeric escape is unsupported");
        }
        if (char >= "1" && char <= "9" || char === "0" && digit(this.current()) || char === "k")
            return this.reject("unsupported", "named backreferences and legacy numeric escapes are unsupported");
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

export function parseRegExpSyntax(source: string, tick: () => boolean): RegExpSyntaxResult {
    return new PatternParser(source, tick).parse();
}
