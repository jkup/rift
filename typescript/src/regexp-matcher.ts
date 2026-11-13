import type { RegExpAtom, RegExpClassPart, RegExpDisjunction, RegExpPattern, RegExpTerm } from "./regexp-pattern.js";
import { type OperationContext, type ThrowCompletion } from "./runtime.js";
import { isStringWhitespace, stringUpperCase } from "./strings.js";
import type { Location } from "./syntax.js";
import { simpleCaseFold } from "./unicode-case-fold.js";
import { propertyContains, foldedPropertyContains, foldedRangeContains } from "./unicode-properties.js";

const MAX_FOLDED_RANGE_SIZE = 256;

export type RegExpMatchFlags = { ignoreCase: boolean; multiline: boolean; dotAll: boolean };
type Instruction = { kind: "character"; value: number; ignoreCase: boolean; backward: boolean } | { kind: "dot"; dotAll: boolean; backward: boolean }
    | { kind: "backreference"; index: number; ignoreCase: boolean; backward: boolean }
    | { kind: "named-backreference"; indices: number[]; ignoreCase: boolean; backward: boolean }
    | { kind: "lookaround"; negative: boolean; end: number } | { kind: "lookaround-end" }
    | { kind: "class"; parts: RegExpClassPart[]; inverted: boolean; folded: Set<number> | null; ignoreCase: boolean; backward: boolean }
    | { kind: "assertion"; name: "start" | "end" | "word" | "notWord"; ignoreCase: boolean; multiline: boolean }
    | { kind: "split"; first: number; second: number } | { kind: "jump"; target: number }
    | { kind: "save"; slot: number } | { kind: "clear"; from: number; to: number }
    | { kind: "mark"; slot: number } | { kind: "progress"; slot: number } | { kind: "match" };
export type RegExpProgram = { instructions: Instruction[]; captures: number; names: RegExpPattern["names"]; marks: number; flags: RegExpMatchFlags; unicode: boolean };
export type RegExpCompileResult = { kind: "ready"; program: RegExpProgram } | { kind: "abrupt"; completion: ThrowCompletion };
export type RegExpMatchResult = { kind: "match"; start: number; end: number; captures: number[] }
    | { kind: "no-match" } | { kind: "abrupt"; completion: ThrowCompletion };

function canonicalize(code: number, unicode: boolean): number {
    if (unicode) return simpleCaseFold(code);
    const upper = stringUpperCase(String.fromCharCode(code));
    if (upper.length !== 1) return code;
    const result = upper.charCodeAt(0);
    return code >= 128 && result < 128 ? code : result;
}

class PatternCompiler {
    private instructions: Instruction[] = [];
    private marks = 0;
    private names: RegExpPattern["names"] = [];
    private failure: ThrowCompletion | null = null;
    constructor(private readonly flags: RegExpMatchFlags, private readonly context: OperationContext, private readonly loc: Location, private readonly unicode: boolean) {}

    compile(pattern: RegExpPattern): RegExpCompileResult {
        this.names = pattern.names;
        this.disjunction(pattern.body, this.flags, false);
        this.emit({ kind: "match" });
        return this.failure === null ? { kind: "ready", program: { instructions: this.instructions, captures: pattern.captures,
            names: this.names, marks: this.marks, flags: this.flags, unicode: this.unicode } } : { kind: "abrupt", completion: this.failure };
    }
    private tick(): boolean {
        if (this.failure !== null) return false;
        const result = this.context.tick(this.loc);
        if (result.type === "throw") { this.failure = result; return false; }
        return true;
    }
    private emit(instruction: Instruction): number {
        const index = this.instructions.length;
        if (this.tick()) this.instructions.push(instruction);
        return index;
    }
    private disjunction(body: RegExpDisjunction, flags: RegExpMatchFlags, backward: boolean): void {
        const exits: { kind: "jump"; target: number }[] = [];
        for (let i = 0; i < body.alternatives.length && this.failure === null; i++) {
            const split = { kind: "split" as const, first: this.instructions.length + 1, second: 0 };
            if (i + 1 < body.alternatives.length) this.emit(split);
            const terms = body.alternatives[i];
            for (let j = 0; j < terms.length && this.failure === null; j++) this.term(terms[backward ? terms.length - 1 - j : j], flags, backward);
            if (i + 1 < body.alternatives.length) {
                const exit = { kind: "jump" as const, target: 0 };
                this.emit(exit); exits.push(exit); split.second = this.instructions.length;
            }
        }
        for (const exit of exits) exit.target = this.instructions.length;
    }
    private iteration(term: RegExpTerm, flags: RegExpMatchFlags, backward: boolean): void {
        if (!this.tick()) return;
        if (term.captureFrom <= term.captureTo) this.emit({ kind: "clear", from: term.captureFrom * 2, to: term.captureTo * 2 + 1 });
        this.atom(term.atom, flags, backward);
    }
    private term(term: RegExpTerm, flags: RegExpMatchFlags, backward: boolean): void {
        for (let i = 0; i < term.min && this.failure === null; i++) this.iteration(term, flags, backward);
        if (this.failure !== null || term.max === term.min) return;
        const slot = this.marks++;
        const exits: { kind: "split"; first: number; second: number }[] = [];
        const count = term.max === null ? 1 : term.max - term.min;
        for (let i = 0; i < count && this.failure === null; i++) {
            const start = this.instructions.length;
            const split = { kind: "split" as const, first: start + 1, second: 0 };
            this.emit(split); exits.push(split);
            this.emit({ kind: "mark", slot });
            this.iteration(term, flags, backward);
            // Optional empty iterations fail, including their capture changes (RepeatMatcher).
            this.emit({ kind: "progress", slot });
            if (term.max === null) this.emit({ kind: "jump", target: start });
        }
        for (const split of exits) {
            split.second = this.instructions.length;
            if (term.lazy) { const body = split.first; split.first = split.second; split.second = body; }
        }
    }
    private atom(atom: RegExpAtom, flags: RegExpMatchFlags, backward: boolean): void {
        if (this.failure !== null) return;
        if (atom.kind === "group") {
            if (atom.index !== 0) this.emit({ kind: "save", slot: atom.index * 2 + (backward ? 1 : 0) });
            this.disjunction(atom.body, flags, backward);
            if (atom.index !== 0) this.emit({ kind: "save", slot: atom.index * 2 + (backward ? 0 : 1) });
        } else if (atom.kind === "modifiers") {
            const scoped = {
                ignoreCase: atom.add.includes("i") || flags.ignoreCase && !atom.remove.includes("i"),
                multiline: atom.add.includes("m") || flags.multiline && !atom.remove.includes("m"),
                dotAll: atom.add.includes("s") || flags.dotAll && !atom.remove.includes("s"),
            };
            this.disjunction(atom.body, scoped, backward);
        } else if (atom.kind === "lookaround") {
            const assertion = { kind: "lookaround" as const, negative: atom.negative, end: 0 };
            this.emit(assertion);
            this.disjunction(atom.body, flags, atom.backward);
            this.emit({ kind: "lookaround-end" });
            assertion.end = this.instructions.length;
        } else if (atom.kind === "named-backreference") {
            const indices: number[] = [];
            for (const capture of this.names) {
                if (!this.tick()) return;
                if (capture.name === atom.name) indices.push(capture.index);
            }
            if (indices.length === 0) throw new Error("unresolved RegExp capture name");
            this.emit({ kind: "named-backreference", indices, ignoreCase: flags.ignoreCase, backward });
        } else if (atom.kind === "character") {
            this.emit({ kind: "character", value: flags.ignoreCase ? canonicalize(atom.value, this.unicode) : atom.value, ignoreCase: flags.ignoreCase, backward });
        } else if (atom.kind === "class") {
            const folded = flags.ignoreCase ? new Set<number>() : null;
            if (folded !== null) for (const part of atom.parts) {
                if (!this.tick()) return;
                if (part.kind === "range" && (!this.unicode || part.to - part.from < MAX_FOLDED_RANGE_SIZE)) for (let code = part.from; code <= part.to; code++) {
                    if (!this.tick()) return;
                    folded.add(canonicalize(code, this.unicode));
                }
            }
            this.emit({ kind: "class", parts: atom.parts, inverted: atom.inverted, folded, ignoreCase: flags.ignoreCase, backward });
        } else if (atom.kind === "dot") this.emit({ kind: "dot", dotAll: flags.dotAll, backward });
        else if (atom.kind === "backreference") this.emit({ kind: "backreference", index: atom.index, ignoreCase: flags.ignoreCase, backward });
        else this.emit({ kind: "assertion", name: atom.name, ignoreCase: flags.ignoreCase, multiline: flags.multiline });
    }
}

export function compileRegExpPattern(pattern: RegExpPattern, flags: RegExpMatchFlags, context: OperationContext, loc: Location, unicode = false): RegExpCompileResult {
    return new PatternCompiler(flags, context, loc, unicode).compile(pattern);
}

function word(code: number): boolean { return code >= 48 && code <= 57 || code >= 65 && code <= 90 || code >= 97 && code <= 122 || code === 95; }
function lineTerminator(code: number): boolean { return code === 10 || code === 13 || code === 0x2028 || code === 0x2029; }
type MatchState = { pc: number; position: number; captures: number[]; marks: number[] };
type AssertionFrame = { resume: MatchState; backtrackDepth: number; negative: boolean };

class PatternMatcher {
    private failure: ThrowCompletion | null = null;
    constructor(private readonly program: RegExpProgram, private readonly input: string, private readonly context: OperationContext, private readonly loc: Location) {}
    private tick(): boolean {
        if (this.failure !== null) return false;
        const result = this.context.tick(this.loc);
        if (result.type === "throw") { this.failure = result; return false; }
        return true;
    }
    private copy(values: number[]): number[] {
        const result: number[] = [];
        for (const value of values) { if (!this.tick()) break; result.push(value); }
        return result;
    }
    private codePoint(index: number): number {
        const lead = this.input.charCodeAt(index), trail = this.input.charCodeAt(index + 1);
        return lead >= 0xd800 && lead <= 0xdbff && trail >= 0xdc00 && trail <= 0xdfff
            ? 0x10000 + (lead - 0xd800) * 1024 + trail - 0xdc00 : lead;
    }
    private containingStart(index: number): number {
        const trail = this.input.charCodeAt(index), lead = this.input.charCodeAt(index - 1);
        return trail >= 0xdc00 && trail <= 0xdfff && lead >= 0xd800 && lead <= 0xdbff ? index - 1 : index;
    }
    private unicodeBackreference(state: MatchState, from: number, to: number, ignoreCase: boolean, backward: boolean): boolean {
        let position = state.position;
        for (let capturedPosition = backward ? to : from; backward ? capturedPosition > from : capturedPosition < to;) {
            if (!this.tick() || (backward ? position <= 0 : position >= this.input.length)) return false;
            const capturedStart = backward ? this.containingStart(capturedPosition - 1) : capturedPosition;
            const currentStart = backward ? this.containingStart(position - 1) : position;
            const captured = this.codePoint(capturedStart), current = this.codePoint(currentStart);
            const equal = ignoreCase ? simpleCaseFold(captured) === simpleCaseFold(current) : captured === current;
            if (!equal) return false;
            capturedPosition = backward ? capturedStart : capturedPosition + (captured > 0xffff ? 2 : 1);
            position = backward ? currentStart : position + (current > 0xffff ? 2 : 1);
        }
        state.position = position;
        return true;
    }
    private inClass(instruction: Extract<Instruction, { kind: "class" }>, code: number): boolean {
        let found = instruction.folded !== null && instruction.folded.has(code);
        for (const part of instruction.parts) {
            if (found || !this.tick()) break;
            if (part.kind === "range") {
                if (this.program.unicode && instruction.ignoreCase && part.to - part.from >= MAX_FOLDED_RANGE_SIZE)
                    found = foldedRangeContains(part.from, part.to, code);
                else if (instruction.folded === null) found = code >= part.from && code <= part.to;
            } else if (part.kind === "property") {
                found = instruction.ignoreCase ? foldedPropertyContains(part.index, code, part.inverted)
                    : propertyContains(part.index, code) !== part.inverted;
            } else {
                const member = part.name === "digit" ? code >= 48 && code <= 57 : part.name === "word" ? word(code) : isStringWhitespace(code);
                found = member !== part.inverted;
            }
        }
        return found !== instruction.inverted;
    }
    match(start: number, sticky: boolean): RegExpMatchResult {
        if (this.program.unicode) start = this.containingStart(start);
        for (let attempt = start; attempt <= this.input.length && this.failure === null; attempt += this.program.unicode && this.codePoint(attempt) > 0xffff ? 2 : 1) {
            if (!this.tick()) break;
            const captures: number[] = [], marks: number[] = [];
            for (let i = 0; i < (this.program.captures + 1) * 2; i++) { if (!this.tick()) break; captures.push(-1); }
            for (let i = 0; i < this.program.marks; i++) { if (!this.tick()) break; marks.push(-1); }
            let state: MatchState = { pc: 0, position: attempt, captures, marks };
            const stack: MatchState[] = [];
            const assertions: AssertionFrame[] = [];
            while (this.tick()) {
                const instruction = this.program.instructions[state.pc++];
                let accepted = true;
                if (instruction.kind === "match") {
                    state.captures[0] = attempt; state.captures[1] = state.position;
                    return { kind: "match", start: attempt, end: state.position, captures: state.captures };
                } else if (instruction.kind === "lookaround") {
                    assertions.push({ resume: { pc: instruction.end, position: state.position, captures: this.copy(state.captures), marks: this.copy(state.marks) },
                        backtrackDepth: stack.length, negative: instruction.negative });
                } else if (instruction.kind === "lookaround-end") {
                    const assertion = assertions.pop();
                    if (assertion === undefined) throw new Error("lookaround frame invariant");
                    const captures = state.captures;
                    // A successful assertion commits its first match; later failure cannot re-enter it.
                    stack.length = assertion.backtrackDepth;
                    state = assertion.resume;
                    if (assertion.negative) accepted = false;
                    else state.captures = captures;
                } else if (instruction.kind === "jump") state.pc = instruction.target;
                else if (instruction.kind === "split") {
                    stack.push({ pc: instruction.second, position: state.position, captures: this.copy(state.captures), marks: this.copy(state.marks) });
                    state.pc = instruction.first;
                } else if (instruction.kind === "save") state.captures[instruction.slot] = state.position;
                else if (instruction.kind === "clear") {
                    for (let i = instruction.from; i <= instruction.to; i++) { if (!this.tick()) break; state.captures[i] = -1; }
                } else if (instruction.kind === "mark") state.marks[instruction.slot] = state.position;
                else if (instruction.kind === "progress") accepted = state.marks[instruction.slot] !== state.position;
                else if (instruction.kind === "assertion") {
                    let before = this.program.unicode ? this.codePoint(this.containingStart(state.position - 1)) : this.input.charCodeAt(state.position - 1);
                    let after = this.program.unicode ? this.codePoint(state.position) : this.input.charCodeAt(state.position);
                    if (this.program.unicode && instruction.ignoreCase) { before = simpleCaseFold(before); after = simpleCaseFold(after); }
                    if (instruction.name === "start") accepted = state.position === 0 || instruction.multiline && lineTerminator(before);
                    else if (instruction.name === "end") accepted = state.position === this.input.length || instruction.multiline && lineTerminator(after);
                    else accepted = (word(before) !== word(after)) === (instruction.name === "word");
                } else if (instruction.kind === "backreference" || instruction.kind === "named-backreference") {
                    let index = instruction.kind === "backreference" ? instruction.index : -1;
                    if (instruction.kind === "named-backreference") for (const candidate of instruction.indices) {
                        if (!this.tick()) { accepted = false; break; }
                        if (state.captures[candidate * 2] < 0 || state.captures[candidate * 2 + 1] < 0) continue;
                        if (index !== -1) throw new Error("multiple participating named captures");
                        index = candidate;
                    }
                    const from = index === -1 ? -1 : state.captures[index * 2], to = index === -1 ? -1 : state.captures[index * 2 + 1];
                    if (from >= 0 && to >= 0) {
                        if (this.program.unicode) accepted = this.unicodeBackreference(state, from, to, instruction.ignoreCase, instruction.backward);
                        else {
                            const length = to - from;
                            const start = instruction.backward ? state.position - length : state.position;
                            accepted = start >= 0 && start + length <= this.input.length;
                            for (let i = 0; accepted && i < length; i++) {
                                if (!this.tick()) { accepted = false; break; }
                                const captured = this.input.charCodeAt(from + i), current = this.input.charCodeAt(start + i);
                                accepted = instruction.ignoreCase ? canonicalize(captured, false) === canonicalize(current, false) : captured === current;
                            }
                            if (accepted) state.position += instruction.backward ? -length : length;
                        }
                    }
                } else if (instruction.backward ? state.position <= 0 : state.position >= this.input.length) accepted = false;
                else {
                    const position = instruction.backward ? (this.program.unicode ? this.containingStart(state.position - 1) : state.position - 1) : state.position;
                    const code = this.program.unicode ? this.codePoint(position) : this.input.charCodeAt(position);
                    if (instruction.kind === "dot") accepted = instruction.dotAll || !lineTerminator(code);
                    else {
                        const canonical = instruction.ignoreCase ? canonicalize(code, this.program.unicode) : code;
                        accepted = instruction.kind === "character" ? canonical === instruction.value : this.inClass(instruction, canonical);
                    }
                    if (accepted) state.position = instruction.backward ? position : state.position + (this.program.unicode && code > 0xffff ? 2 : 1);
                }
                while (!accepted && this.tick()) {
                    const assertion = assertions.length === 0 ? undefined : assertions[assertions.length - 1];
                    if (assertion !== undefined && stack.length === assertion.backtrackDepth) {
                        assertions.pop();
                        state = assertion.resume;
                        accepted = assertion.negative;
                        continue;
                    }
                    const previous = stack.pop();
                    if (previous === undefined) break;
                    state = previous;
                    accepted = true;
                }
                if (!accepted) break;
            }
            if (sticky) break;
        }
        return this.failure === null ? { kind: "no-match" } : { kind: "abrupt", completion: this.failure };
    }
}

// start is a UTF-16 index supplied by the future RegExpBuiltinExec/lastIndex layer.
export function matchRegExp(program: RegExpProgram, input: string, start: number, sticky: boolean, context: OperationContext, loc: Location): RegExpMatchResult {
    return new PatternMatcher(program, input, context, loc).match(start, sticky);
}
