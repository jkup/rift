import { GuestObject, normal, failure, type Builtin, type OperationContext, type Value, type ValueCompletion, type Completion } from '../../../../src/runtime.js';
import type { Realm } from '../../../../src/realm.js';
import type { Location } from '../../../../src/syntax.js';
import { guard } from './guard.js';

// Evidence harness only: no AST, body, parser, evaluator or executable record.
class Key {}
const key = new Key();
class Source {
    #realm: Realm;
    #unit: string;
    constructor(secret: Key, realm: Realm, unit: string) {
        if (secret !== key) throw new Error('source key');
        this.#realm = realm; this.#unit = unit;
    }
    static realm(source: Source): Realm { return source.#realm; }
    static unit(source: Source): string { return source.#unit; }
}
export function source(realm: Realm, unit: string): Source { return new Source(key, realm, unit); }
type Frame = { realm: Realm; source: Source; receiver: Value; scope: number };
type Permit = { context: OperationContext; realm: Realm; target: Builtin; receiver: Value; args: Value[]; loc: Location; used: boolean };
let pending: Permit | null = null;
export function consume(context: OperationContext, realm: Realm, target: Builtin, receiver: Value, args: Value[], loc: Location): boolean {
    const p = pending;
    if (p === null || p.used || p.context !== context || p.realm !== realm || p.target !== target || p.receiver !== receiver || p.args !== args || p.loc !== loc) return false;
    p.used = true;
    return true;
}
export function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
export function reject(action: () => Completion, message: string): void {
    let matched = false;
    try { action(); } catch (e) { matched = e instanceof Error && e.message === message; }
    check(matched, 'expected ' + message);
}
export function target(realm: Realm, raw: Builtin): Value {
    return { kind: 'object', object: new GuestObject(null, false, { kind: 'builtin', realm, invoke: guard(realm, raw), initialName: 'model' }) };
}
export function invoke(value: Value): Builtin {
    if (value.kind !== 'object' || value.object.callable === null || value.object.callable.kind !== 'builtin') throw new Error('target');
    return value.object.callable.invoke;
}
type MutableContext = { realm: Realm; call: OperationContext['call']; tick: OperationContext['tick'] };
class Session {
    #frame: Frame | null = null;
    #context: MutableContext;
    #steps = 0;
    #calls = 0;
    #depth = 0;
    #dispatches = 0;
    #checks = 0;
    #maxSteps: number;
    #maxCalls: number;
    #maxDepth: number;
    #foreign: Realm;
    constructor(secret: Key, realm: Realm, foreign: Realm, maxSteps: number, maxCalls: number, maxDepth: number) {
        if (secret !== key) throw new Error('session key');
        for (const limit of [maxSteps, maxCalls, maxDepth]) if (!Number.isInteger(limit) || limit < 0) throw new Error('limits');
        this.#maxSteps = maxSteps; this.#maxCalls = maxCalls; this.#maxDepth = maxDepth;
        this.#foreign = foreign;
        this.#context = {
            realm,
            call: (callee: Value, receiver: Value, args: Value[], loc: Location): ValueCompletion => this.dispatch(callee, receiver, args, loc),
            tick: (loc: Location): ValueCompletion => this.tick(loc),
        };
    }
    inspect(): { steps: number; calls: number; depth: number; dispatches: number; checks: number; realm: Realm; source: Source | null; unit: string; receiver: Value | null; scope: number; active: boolean; permit: boolean } {
        const f = this.#frame;
        return { steps: this.#steps, calls: this.#calls, depth: this.#depth, dispatches: this.#dispatches, checks: this.#checks,
            realm: this.#context.realm, source: f === null ? null : f.source, unit: f === null ? '' : Source.unit(f.source),
            receiver: f === null ? null : f.receiver, scope: f === null ? -1 : f.scope, active: f !== null, permit: pending !== null };
    }
    private active(): Frame { const f = this.#frame; if (f === null) throw new Error('idle'); return f; }
    private tick(loc: Location): ValueCompletion {
        this.active(); this.#steps++;
        return this.#steps > this.#maxSteps ? failure('RangeError', 'steps', loc) : normal();
    }
    // Harness root action deliberately exposes context; NOT a proposed production API.
    run(code: Source, receiver: Value, action: (context: OperationContext) => ValueCompletion): ValueCompletion {
        if (this.#frame !== null) throw new Error('reentry');
        const realm = this.#context.realm;
        this.#frame = { realm: Source.realm(code), source: code, receiver, scope: 0 };
        this.#context.realm = Source.realm(code);
        try { return action(this.#context); }
        finally { this.#frame = null; this.#context.realm = realm; }
    }
    // Synthetic code-frame transition, not guest function execution. Private source identity,
    // scope and strict receiver change together; builtin calls retain them.
    code(code: Source, receiver: Value, action: (context: OperationContext) => ValueCompletion, loc: Location): ValueCompletion {
        const saved = this.active(), depth = this.#depth, realm = this.#context.realm;
        if (depth >= this.#maxDepth) return failure('RangeError', 'depth', loc);
        this.#depth++;
        this.#frame = { realm: Source.realm(code), source: code, receiver, scope: 1 };
        this.#context.realm = Source.realm(code);
        try { return action(this.#context); }
        finally { this.#frame = saved; this.#context.realm = realm; this.#depth = depth; }
    }
    private dispatch(callee: Value, receiver: Value, args: Value[], loc: Location): ValueCompletion {
        const frame = this.active();
        if (callee.kind !== 'object' || callee.object.callable === null || callee.object.callable.kind !== 'builtin') throw new Error('target');
        const callable = callee.object.callable;
        if (callable.realm.profile !== frame.realm.profile) throw new Error('cross-profile callable invocation');
        if (this.#calls >= this.#maxCalls) return failure('RangeError', 'calls', loc);
        const saved = pending, calls = this.#calls, realm = this.#context.realm;
        this.#calls++; this.#dispatches++;
        this.#frame = { realm: callable.realm, source: frame.source, receiver: frame.receiver, scope: frame.scope };
        this.#context.realm = callable.realm;
        pending = { context: this.#context, realm: callable.realm, target: callable.invoke, receiver, args, loc, used: false };
        try {
            // Harness-only pre-consumption neighbors. There is no exported permit mint/hook.
            // Every mismatch must leave the authentic pending tuple available.
            const p = pending;
            const clone: OperationContext = { realm: callable.realm, call: this.#context.call, tick: this.#context.tick };
            const cross: OperationContext = { realm: this.#foreign, call: this.#context.call, tick: this.#context.tick };
            const other = guard(callable.realm, (_r, _a, _c, _l): Completion => normal());
            const badReceiver: Value = { kind: 'undefined' };
            const badArgs: Value[] = args.slice();
            const badLoc: Location = { line: loc.line, column: loc.column };
            reject((): Completion => callable.invoke(receiver, args, clone, loc), 'Script execution unavailable');
            reject((): Completion => callable.invoke(receiver, args, cross, loc), 'cross-profile callable invocation');
            reject((): Completion => other(receiver, args, this.#context, loc), 'Script execution unavailable');
            reject((): Completion => callable.invoke(badReceiver, args, this.#context, loc), 'Script execution unavailable');
            reject((): Completion => callable.invoke(receiver, badArgs, this.#context, loc), 'Script execution unavailable');
            reject((): Completion => callable.invoke(receiver, args, this.#context, badLoc), 'Script execution unavailable');
            check(!consume(this.#context, this.#foreign, callable.invoke, receiver, args, loc), 'wrong Realm');
            check(!p.used && pending === p, 'negative consumed'); this.#checks += 7;
            const result = callable.invoke(receiver, args, this.#context, loc);
            reject((): Completion => callable.invoke(receiver, args, this.#context, loc), 'Script execution unavailable');
            this.#checks++;
            if (result.type !== 'normal' && result.type !== 'throw') throw new Error('completion');
            // Completion groups normal/return in one member; the runtime check above
            // narrows the value semantically while this cast preserves exact identity.
            return result as ValueCompletion;
        } finally {
            pending = saved; this.#frame = frame; this.#context.realm = realm; this.#calls = calls;
        }
    }
}
export function session(realm: Realm, foreign: Realm, maxSteps: number, maxCalls: number, maxDepth: number): Session {
    return new Session(key, realm, foreign, maxSteps, maxCalls, maxDepth);
}
export type { Source, Session };
