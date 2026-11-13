import { unicodeIdentifierStart, unicodeIdentifierContinue } from "./unicode-identifiers.js";
import { propertyIndex } from "./unicode-properties.js";

export type RegExpClassPart = { kind: "range"; from: number; to: number }
    | { kind: "property"; index: number; inverted: boolean }
    | { kind: "builtin"; name: "digit" | "word" | "space"; inverted: boolean };
export type RegExpAtom = { kind: "character"; value: number } | { kind: "dot" }
    | { kind: "backreference"; index: number }
    | { kind: "named-backreference"; name: string }
    | { kind: "lookahead"; negative: boolean; body: RegExpDisjunction }
    | { kind: "class"; parts: RegExpClassPart[]; inverted: boolean }
    | { kind: "assertion"; name: "start" | "end" | "word" | "notWord" }
    | { kind: "group"; index: number; body: RegExpDisjunction };
export type RegExpTerm = { atom: RegExpAtom; min: number; max: number | null; lazy: boolean; captureFrom: number; captureTo: number };
export type RegExpDisjunction = { alternatives: RegExpTerm[][] };
export type RegExpNamedCapture = { name: string; index: number };
export type RegExpPattern = { source: string; body: RegExpDisjunction; captures: number; names: RegExpNamedCapture[] };
export type RegExpSyntaxFailure = { kind: "syntax-error" | "unsupported"; message: string; offset: number }
    | { kind: "stopped" }
    | { kind: "depth-limit"; count: number; limit: number };
export type RegExpSyntaxResult = { kind: "ready"; pattern: RegExpPattern } | RegExpSyntaxFailure;
type Quantifier = { min: number; max: number | null; lazy: boolean };
type AlternativePath = { id: number; alternative: number };
type ParsedCapture = { name: string; index: number; path: AlternativePath[] };

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
    private names: ParsedCapture[] = [];
    private path: AlternativePath[] = [];
    private nextDisjunction = 0;
    private references: string[] = [];
    private totalCaptures: number | null = null;
    private hasNamedCapture = false;
    private depth = 0;
    private failure: RegExpSyntaxFailure | null = null;
    constructor(private readonly source: string, private readonly tick: () => boolean, private readonly unicode: boolean) {}

    parse(): RegExpSyntaxResult {
        const body = this.disjunction();
        if (this.failure !== null) return this.failure;
        if (this.offset !== this.source.length) return { kind: "syntax-error", message: "unmatched closing parenthesis", offset: this.offset };
        for (const name of this.references) {
            let found = false;
            for (const capture of this.names) {
                if (!this.tick()) return { kind: "stopped" };
                if (capture.name === name) found = true;
            }
            if (!found) return this.names.length === 0 && !this.unicode
                ? { kind: "unsupported", message: "legacy k escapes are unsupported", offset: this.offset }
                : { kind: "syntax-error", message: "unknown capture name", offset: this.offset };
        }
        const names: RegExpNamedCapture[] = [];
        for (const capture of this.names) {
            if (!this.tick()) return { kind: "stopped" };
            names.push({ name: capture.name, index: capture.index });
        }
        return { kind: "ready", pattern: { source: this.source, body, captures: this.captures, names } };
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
            else if (char === "(") {
                const named = this.source.charAt(i + 1) === "?" && this.source.charAt(i + 2) === "<" &&
                    this.source.charAt(i + 3) !== "=" && this.source.charAt(i + 3) !== "!";
                if (named) this.hasNamedCapture = true;
                if (named || this.source.charAt(i + 1) !== "?") count++;
            }
        }
        this.totalCaptures = count;
        return count;
    }
    private hexUnit(): number | null {
        let value = 0;
        for (let i = 0; i < 4; i++) {
            const part = hex(this.current());
            if (part < 0) return this.reject("syntax-error", "invalid Unicode escape");
            this.take();
            value = value * 16 + part;
        }
        return this.failure === null ? value : null;
    }
    private nameCodePoint(): number | null {
        const char = this.take();
        if (this.failure !== null) return null;
        if (char === "\\") {
            if (this.take() !== "u") return this.reject("syntax-error", "invalid capture name escape");
            return this.unicodeEscape();
        }
        const point = this.rawCodePoint(char.charCodeAt(0));
        return this.failure === null ? point : null;
    }
    private unicodeEscape(): number | null {
        if (this.current() === "{") {
            this.take();
            let value = 0, digits = 0;
            while (this.failure === null && this.current() !== "}") {
                const part = hex(this.current());
                if (part < 0) return this.reject("syntax-error", "invalid Unicode escape");
                this.take();
                value = value * 16 + part;
                if (value > 0x10ffff) return this.reject("syntax-error", "Unicode code point out of range");
                digits++;
            }
            if (this.failure !== null) return null;
            if (digits === 0) return this.reject("syntax-error", "empty Unicode escape");
            this.take();
            return this.failure === null ? value : null;
        }
        const unit = this.hexUnit();
        if (unit === null) return null;
        let point = unit;
        if (point >= 0xd800 && point <= 0xdbff && this.source.slice(this.offset, this.offset + 2) === "\\u") {
            let trail = 0;
            for (let i = 2; i < 6; i++) {
                const part = hex(this.source.charAt(this.offset + i));
                if (part < 0) { trail = -1; break; }
                trail = trail * 16 + part;
            }
            if (trail >= 0xdc00 && trail <= 0xdfff) {
                for (let i = 0; i < 6; i++) this.take();
                point = 0x10000 + (point - 0xd800) * 1024 + trail - 0xdc00;
            }
        }
        return this.failure === null ? point : null;
    }
    private rawCodePoint(point: number): number {
        if (point >= 0xd800 && point <= 0xdbff) {
            const trail = this.current().charCodeAt(0);
            if (trail >= 0xdc00 && trail <= 0xdfff) {
                this.take();
                point = 0x10000 + (point - 0xd800) * 1024 + trail - 0xdc00;
            }
        }
        return point;
    }
    private groupName(): string | null {
        if (this.current() !== "<") return this.reject("syntax-error", "capture name requires <");
        this.take();
        let name = "";
        while (this.failure === null && this.offset < this.source.length && this.current() !== ">") {
            const point = this.nameCodePoint();
            if (point === null) return null;
            const identifier = point === 36 || point === 95 || (name.length === 0
                ? unicodeIdentifierStart(point)
                : point === 0x200c || point === 0x200d || unicodeIdentifierContinue(point));
            if (!identifier) return this.reject("syntax-error", "invalid capture name");
            if (point <= 0xffff) name += String.fromCharCode(point);
            else {
                const offset = point - 0x10000;
                name += String.fromCharCode(0xd800 + Math.floor(offset / 1024), 0xdc00 + offset % 1024);
            }
        }
        if (this.failure !== null) return null;
        if (this.current() !== ">" || name.length === 0) return this.reject("syntax-error", "invalid capture name");
        this.take();
        return name;
    }
    private disjunction(): RegExpDisjunction {
        const frame = { id: this.nextDisjunction++, alternative: 0 };
        this.path.push(frame);
        const alternatives: RegExpTerm[][] = [];
        let terms: RegExpTerm[] = [];
        while (this.failure === null && this.offset < this.source.length && this.current() !== ")") {
            if (this.current() === "|") { this.take(); alternatives.push(terms); terms = []; frame.alternative++; continue; }
            const captureFrom = this.captures + 1;
            const atom = this.atom();
            if (atom === null) break;
            const quantifier = this.quantifier();
            if (quantifier !== null && atom.kind === "assertion") {
                this.reject("syntax-error", "assertion cannot be quantified"); break;
            }
            if (quantifier !== null && atom.kind === "lookahead") {
                this.reject(this.unicode ? "syntax-error" : "unsupported", this.unicode ? "lookahead cannot be quantified" : "quantified legacy lookahead is unsupported"); break;
            }
            terms.push({ atom, min: quantifier === null ? 1 : quantifier.min, max: quantifier === null ? 1 : quantifier.max,
                lazy: quantifier !== null && quantifier.lazy, captureFrom, captureTo: this.captures });
        }
        alternatives.push(terms);
        this.path.pop();
        return { alternatives };
    }
    private atom(): RegExpAtom | null {
        const char = this.current();
        if (this.unicode && (char === "}" || char === "]")) return this.reject("syntax-error", "unexpected pattern delimiter");
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
            let lookahead = false, negative = false;
            if (this.current() === "?") {
                this.take();
                if (this.current() === "<") {
                    if (this.source.charAt(this.offset + 1) === "=" || this.source.charAt(this.offset + 1) === "!")
                        return this.reject("unsupported", "lookbehind is unsupported");
                    const name = this.groupName();
                    if (name === null) return null;
                    for (const capture of this.names) {
                        if (!this.tick()) { this.failure = { kind: "stopped" }; return null; }
                        if (capture.name !== name) continue;
                        let disjoint = false;
                        for (let i = 0; i < capture.path.length && i < this.path.length; i++) {
                            if (!this.tick()) { this.failure = { kind: "stopped" }; return null; }
                            if (capture.path[i].id !== this.path[i].id) break;
                            if (capture.path[i].alternative !== this.path[i].alternative) { disjoint = true; break; }
                        }
                        if (!disjoint) return this.reject("syntax-error", "capture names may participate together");
                    }
                    index = ++this.captures;
                    const path: AlternativePath[] = [];
                    for (const frame of this.path) {
                        if (!this.tick()) { this.failure = { kind: "stopped" }; return null; }
                        path.push({ id: frame.id, alternative: frame.alternative });
                    }
                    this.names.push({ name, index, path });
                } else {
                    if (this.current() === "=" || this.current() === "!") { lookahead = true; negative = this.current() === "!"; }
                    else if (this.current() !== ":") return this.reject("unsupported", "modifier groups are unsupported");
                    this.take();
                }
            } else index = ++this.captures;
            const body = this.disjunction();
            this.depth--;
            if (this.failure !== null) return null;
            if (this.current() !== ")") return this.reject("syntax-error", "unterminated group");
            this.take();
            return lookahead ? { kind: "lookahead", negative, body } : { kind: "group", index, body };
        }
        const value = this.unicode ? this.rawCodePoint(char.charCodeAt(0)) : char.charCodeAt(0);
        return this.failure === null ? { kind: "character", value } : null;
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
            if (!digit(this.current())) {
                if (this.unicode) return this.reject("syntax-error", "invalid quantifier");
                this.offset = start; return null;
            }
            min = this.decimal();
            max = min;
            if (this.current() === ",") { this.take(); max = digit(this.current()) ? this.decimal() : null; }
            if (this.failure !== null) return null;
            // In non-Unicode patterns an incomplete brace expression is literal.
            if (this.current() !== "}") {
                if (this.unicode) return this.reject("syntax-error", "incomplete quantifier");
                this.offset = start; return null;
            }
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
            return this.reject(this.unicode ? "syntax-error" : "unsupported", this.unicode ? "invalid numeric escape" : "legacy numeric escape is unsupported");
        }
        if (char === "k" && !inClass) {
            this.captureCount();
            if (this.failure !== null) return null;
            if (!this.hasNamedCapture && !this.unicode) return this.reject("unsupported", "legacy k escapes are unsupported");
            if (this.current() !== "<") return this.reject(this.unicode ? "syntax-error" : "unsupported", this.unicode ? "invalid named reference" : "legacy k escapes are unsupported");
            const name = this.groupName();
            if (name === null) return null;
            this.references.push(name);
            return { kind: "named-backreference", name };
        }
        if (char >= "1" && char <= "9" || char === "0" && digit(this.current()) || char === "k")
            return this.reject(this.unicode ? "syntax-error" : "unsupported", this.unicode ? "invalid numeric or named escape" : "named backreferences and legacy numeric escapes are unsupported");
        const controls = "fnrtv";
        const controlIndex = controls.indexOf(char);
        if (controlIndex >= 0) return { kind: "character", value: [12, 10, 13, 9, 11][controlIndex] };
        if (char === "0") return { kind: "character", value: 0 };
        if (char === "c") {
            const letter = this.current();
            if (!(letter >= "a" && letter <= "z" || letter >= "A" && letter <= "Z"))
                return this.reject(this.unicode ? "syntax-error" : "unsupported", this.unicode ? "invalid control escape" : "legacy control escape is unsupported");
            this.take();
            return { kind: "character", value: letter.charCodeAt(0) % 32 };
        }
        if (char === "u" && this.unicode) {
            const value = this.unicodeEscape();
            return value === null ? null : { kind: "character", value };
        }
        if (char === "x" || char === "u") {
            const count = char === "x" ? 2 : 4;
            let value = 0;
            for (let i = 0; i < count; i++) {
                const part = hex(this.source.charAt(this.offset + i));
                if (part < 0) return this.unicode ? this.reject("syntax-error", "invalid hex escape") : { kind: "character", value: char.charCodeAt(0) };
                value = value * 16 + part;
            }
            for (let i = 0; i < count; i++) this.take();
            return { kind: "character", value };
        }
        if (this.unicode && (char === "p" || char === "P")) return this.propertyEscape(char === "P");
        if (this.unicode && !"^$\\.*+?()[]{}|/".includes(char) && !(inClass && char === "-"))
            return this.reject("syntax-error", "invalid identity escape");
        return { kind: "character", value: char.charCodeAt(0) };
    }
    private propertyEscape(inverted: boolean): RegExpAtom | null {
        if (this.current() !== "{") return this.reject("syntax-error", "invalid Unicode property escape");
        this.take();
        const start = this.offset;
        while (this.failure === null && this.offset < this.source.length && this.current() !== "}") this.take();
        if (this.failure !== null) return null;
        if (this.current() !== "}") return this.reject("syntax-error", "unterminated Unicode property escape");
        const name = this.source.slice(start, this.offset);
        this.take();
        if (this.failure !== null) return null;
        const index = propertyIndex(name);
        if (index < 0) return this.reject("syntax-error", "invalid Unicode property name or value");
        return { kind: "class", inverted: false, parts: [{ kind: "property", index, inverted }] };
    }
    private classAtom(): RegExpAtom | null {
        if (this.current() === "\\") { this.take(); return this.escape(true); }
        const char = this.take();
        const value = this.unicode ? this.rawCodePoint(char.charCodeAt(0)) : char.charCodeAt(0);
        return this.failure === null ? { kind: "character", value } : null;
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
                    return this.reject(this.unicode ? "syntax-error" : "unsupported", this.unicode ? "invalid character-class range" : "legacy character-class ranges are unsupported");
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

export function parseRegExpSyntax(source: string, tick: () => boolean, unicode = false): RegExpSyntaxResult {
    return new PatternParser(source, tick, unicode).parse();
}
