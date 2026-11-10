import type { RegExpAtom, RegExpClassPart, RegExpDisjunction, RegExpPattern, RegExpTerm } from "./regexp-pattern.js";
import { type OperationContext, type ThrowCompletion } from "./runtime.js";
import { isStringWhitespace, stringUpperCase } from "./strings.js";
import type { Location } from "./syntax.js";

export type RegExpMatchFlags = { ignoreCase: boolean; multiline: boolean; dotAll: boolean };
type Instruction = { kind: "character"; value: number } | { kind: "dot" }
    | { kind: "backreference"; index: number }
    | { kind: "lookahead"; negative: boolean; end: number } | { kind: "lookahead-end" }
    | { kind: "class"; parts: RegExpClassPart[]; inverted: boolean; folded: Set<number> | null }
    | { kind: "assertion"; name: "start" | "end" | "word" | "notWord" }
    | { kind: "split"; first: number; second: number } | { kind: "jump"; target: number }
    | { kind: "save"; slot: number } | { kind: "clear"; from: number; to: number }
    | { kind: "mark"; slot: number } | { kind: "progress"; slot: number } | { kind: "match" };
export type RegExpProgram = { instructions: Instruction[]; captures: number; marks: number; flags: RegExpMatchFlags };
export type RegExpCompileResult = { kind: "ready"; program: RegExpProgram } | { kind: "abrupt"; completion: ThrowCompletion };
export type RegExpMatchResult = { kind: "match"; start: number; end: number; captures: number[] }
    | { kind: "no-match" } | { kind: "abrupt"; completion: ThrowCompletion };

function canonicalize(code: number): number {
    const upper = stringUpperCase(String.fromCharCode(code));
    if (upper.length !== 1) return code;
    const result = upper.charCodeAt(0);
    return code >= 128 && result < 128 ? code : result;
}

class PatternCompiler {
    private instructions: Instruction[] = [];
    private marks = 0;
    private failure: ThrowCompletion | null = null;
    constructor(private readonly flags: RegExpMatchFlags, private readonly context: OperationContext, private readonly loc: Location) {}

    compile(pattern: RegExpPattern): RegExpCompileResult {
        this.disjunction(pattern.body);
        this.emit({ kind: "match" });
        return this.failure === null ? { kind: "ready", program: { instructions: this.instructions, captures: pattern.captures,
            marks: this.marks, flags: this.flags } } : { kind: "abrupt", completion: this.failure };
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
    private disjunction(body: RegExpDisjunction): void {
        const exits: { kind: "jump"; target: number }[] = [];
        for (let i = 0; i < body.alternatives.length && this.failure === null; i++) {
            const split = { kind: "split" as const, first: this.instructions.length + 1, second: 0 };
            if (i + 1 < body.alternatives.length) this.emit(split);
            for (const term of body.alternatives[i]) { if (this.failure !== null) break; this.term(term); }
            if (i + 1 < body.alternatives.length) {
                const exit = { kind: "jump" as const, target: 0 };
                this.emit(exit); exits.push(exit); split.second = this.instructions.length;
            }
        }
        for (const exit of exits) exit.target = this.instructions.length;
    }
    private iteration(term: RegExpTerm): void {
        if (!this.tick()) return;
        if (term.captureFrom <= term.captureTo) this.emit({ kind: "clear", from: term.captureFrom * 2, to: term.captureTo * 2 + 1 });
        this.atom(term.atom);
    }
    private term(term: RegExpTerm): void {
        for (let i = 0; i < term.min && this.failure === null; i++) this.iteration(term);
        if (this.failure !== null || term.max === term.min) return;
        const slot = this.marks++;
        const exits: { kind: "split"; first: number; second: number }[] = [];
        const count = term.max === null ? 1 : term.max - term.min;
        for (let i = 0; i < count && this.failure === null; i++) {
            const start = this.instructions.length;
            const split = { kind: "split" as const, first: start + 1, second: 0 };
            this.emit(split); exits.push(split);
            this.emit({ kind: "mark", slot });
            this.iteration(term);
            // Optional empty iterations fail, including their capture changes (RepeatMatcher).
            this.emit({ kind: "progress", slot });
            if (term.max === null) this.emit({ kind: "jump", target: start });
        }
        for (const split of exits) {
            split.second = this.instructions.length;
            if (term.lazy) { const body = split.first; split.first = split.second; split.second = body; }
        }
    }
    private atom(atom: RegExpAtom): void {
        if (this.failure !== null) return;
        if (atom.kind === "group") {
            if (atom.index !== 0) this.emit({ kind: "save", slot: atom.index * 2 });
            this.disjunction(atom.body);
            if (atom.index !== 0) this.emit({ kind: "save", slot: atom.index * 2 + 1 });
        } else if (atom.kind === "lookahead") {
            const assertion = { kind: "lookahead" as const, negative: atom.negative, end: 0 };
            this.emit(assertion);
            this.disjunction(atom.body);
            this.emit({ kind: "lookahead-end" });
            assertion.end = this.instructions.length;
        } else if (atom.kind === "character") {
            this.emit({ kind: "character", value: this.flags.ignoreCase ? canonicalize(atom.value) : atom.value });
        } else if (atom.kind === "class") {
            const folded = this.flags.ignoreCase ? new Set<number>() : null;
            if (folded !== null) for (const part of atom.parts) {
                if (!this.tick()) return;
                if (part.kind === "range") for (let code = part.from; code <= part.to; code++) {
                    if (!this.tick()) return;
                    folded.add(canonicalize(code));
                }
            }
            this.emit({ kind: "class", parts: atom.parts, inverted: atom.inverted, folded });
        } else this.emit(atom);
    }
}

export function compileRegExpPattern(pattern: RegExpPattern, flags: RegExpMatchFlags, context: OperationContext, loc: Location): RegExpCompileResult {
    return new PatternCompiler(flags, context, loc).compile(pattern);
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
    private inClass(instruction: Extract<Instruction, { kind: "class" }>, code: number): boolean {
        let found = instruction.folded !== null && instruction.folded.has(code);
        for (const part of instruction.parts) {
            if (found || !this.tick()) break;
            if (part.kind === "range") {
                if (instruction.folded === null) found = code >= part.from && code <= part.to;
            } else {
                const member = part.name === "digit" ? code >= 48 && code <= 57 : part.name === "word" ? word(code) : isStringWhitespace(code);
                found = member !== part.inverted;
            }
        }
        return found !== instruction.inverted;
    }
    match(start: number, sticky: boolean): RegExpMatchResult {
        for (let attempt = start; attempt <= this.input.length && this.failure === null; attempt++) {
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
                } else if (instruction.kind === "lookahead") {
                    assertions.push({ resume: { pc: instruction.end, position: state.position, captures: this.copy(state.captures), marks: this.copy(state.marks) },
                        backtrackDepth: stack.length, negative: instruction.negative });
                } else if (instruction.kind === "lookahead-end") {
                    const assertion = assertions.pop();
                    if (assertion === undefined) throw new Error("lookahead frame invariant");
                    const captures = state.captures;
                    // A successful lookahead commits its first match; later failure cannot re-enter it.
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
                    const before = this.input.charCodeAt(state.position - 1), after = this.input.charCodeAt(state.position);
                    if (instruction.name === "start") accepted = state.position === 0 || this.program.flags.multiline && lineTerminator(before);
                    else if (instruction.name === "end") accepted = state.position === this.input.length || this.program.flags.multiline && lineTerminator(after);
                    else accepted = (word(before) !== word(after)) === (instruction.name === "word");
                } else if (instruction.kind === "backreference") {
                    const from = state.captures[instruction.index * 2], to = state.captures[instruction.index * 2 + 1];
                    if (from >= 0 && to >= 0) {
                        const length = to - from;
                        accepted = state.position + length <= this.input.length;
                        for (let i = 0; accepted && i < length; i++) {
                            if (!this.tick()) { accepted = false; break; }
                            const captured = this.input.charCodeAt(from + i), current = this.input.charCodeAt(state.position + i);
                            accepted = this.program.flags.ignoreCase ? canonicalize(captured) === canonicalize(current) : captured === current;
                        }
                        if (accepted) state.position += length;
                    }
                } else if (state.position >= this.input.length) accepted = false;
                else {
                    const code = this.input.charCodeAt(state.position);
                    const canonical = this.program.flags.ignoreCase ? canonicalize(code) : code;
                    accepted = instruction.kind === "character" ? canonical === instruction.value
                        : instruction.kind === "dot" ? this.program.flags.dotAll || !lineTerminator(code) : this.inClass(instruction, canonical);
                    if (accepted) state.position++;
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
