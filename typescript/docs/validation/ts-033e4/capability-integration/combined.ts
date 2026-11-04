import { readFileSync } from 'node:fs';
import { Realm } from '../../../../src/realm.js';
import { normal, failure, UNDEFINED, type OperationContext, type Value, type ValueCompletion, type Completion } from '../../../../src/runtime.js';
import type { Location } from '../../../../src/syntax.js';
import { check, reject, source, session, target, invoke, type Session, type Source } from './seam.js';

const input = readFileSync(process.argv[2], 'utf8').trim();
check(input === 'seed' || input === 'other', 'input');
const seed = input === 'seed', amount = seed ? 7 : 11, property = seed ? 'alpha' : 'beta';
const a = new Realm((_line: string): void => {}, 'script'), b = new Realm((_line: string): void => {}, 'script');
const legacy = new Realm((_line: string): void => {});
const codeA = source(a, property), codeB = source(b, property), codeNext = source(a, property + '-next');
const sa = session(a, legacy, 4, 2, 2), sb = session(b, legacy, 10, 2, 2);
const left: Value = { kind: 'object', object: a.createObject() }, right: Value = { kind: 'object', object: b.createObject() };
const receiver = seed ? left : right, nestedReceiver = seed ? right : left;
const value: Value = { kind: 'number', value: amount }, args: Value[] = [value];
const loc: Location = { line: seed ? 3 : 8, column: 2 };
const result = normal(value), abrupt = failure('TypeError', property, loc), sentinel = new Error(property);
let held: OperationContext = { realm: a,
    call: (_c: Value, _r: Value, _a: Value[], _l: Location): ValueCompletion => { throw new Error('unset'); },
    tick: (_l: Location): ValueCompletion => { throw new Error('unset'); } };
let leafHits = 0, hostHits = 0, guestHits = 0, expectedOwner = sa, expectedCode = codeA, expectedThis = receiver, expectedScope = 0;
let realHits = 0;
const real = a.createBuiltin('closed', 0, (_r, _a, _c, _l): Completion => { realHits++; return result; });
const realValue: Value = { kind: 'object', object: real };
const realInvoke = invoke(realValue);
function frame(s: Session, realm: Realm, code: Source, thisValue: Value, scope: number, calls: number, depth: number): void {
    const f = s.inspect();
    check(f.active && f.realm === realm && f.source === code && f.unit === property && f.receiver === thisValue && f.scope === scope && f.calls === calls && f.depth === depth, 'frame');
}
function idle(s: Session, realm: Realm, steps: number, dispatches: number, checks: number): void {
    const f = s.inspect();
    check(!f.active && !f.permit && f.source === null && f.unit === '' && f.receiver === null && f.scope === -1 && f.realm === realm && f.steps === steps && f.calls === 0 && f.depth === 0 && f.dispatches === dispatches && f.checks === checks, 'idle counters');
}
function host(action: () => Completion): void {
    let same = false;
    try { action(); } catch (e) { same = e instanceof Error && e === sentinel; }
    check(same, 'host identity');
}
const leaf = target(b, (r, values, c, l): Completion => {
    leafHits++;
    check(r === receiver && values === args && values[0] === value && l === loc && c.realm === b, 'leaf tuple');
    const f = expectedOwner.inspect();
    check(f.source === expectedCode && f.receiver === expectedThis && f.scope === expectedScope && f.realm === b && f.permit, 'leaf provenance');
    reject((): Completion => realInvoke(r, values, c, l), 'Script execution unavailable');
    // A real guest object effect allocated through the projected callee Realm.
    const object = c.realm.createObject();
    check(object.getPrototypeOf() === b.objectPrototype, 'allocation Realm');
    const defined = object.defineOwnProperty(property, { value: values[0], writable: true, configurable: true, enumerable: true }, c, loc);
    check(defined.type === 'normal' && defined.value, 'effect define');
    const stored = object.getOwnProperty(property);
    check(stored !== undefined && stored.kind === 'data' && stored.value === value && object.getOwnProperty(seed ? 'beta' : 'alpha') === undefined, 'selected effect');
    return result;
});
const guest = target(b, (_r, _a, c, _l): Completion => { guestHits++; check(c.realm === b, 'guest Realm'); return abrupt; });
const throwing = target(b, (_r, _a, c, _l): Completion => { hostHits++; check(c.realm === b, 'host Realm'); throw sentinel; });
const outer = target(a, (_r, _a, c, _l): Completion => {
    frame(sa, a, codeA, receiver, 0, 1, 0);
    check(sa.code(codeB, nestedReceiver, (nested: OperationContext): ValueCompletion => {
        frame(sa, b, codeB, nestedReceiver, 1, 1, 1);
        expectedCode = codeB; expectedThis = nestedReceiver; expectedScope = 1;
        check(nested.call(leaf, receiver, args, loc) === result, 'nested normal identity');
        check(nested.call(guest, receiver, args, loc) === abrupt && abrupt.diagnostic.loc === loc, 'guest identity');
        host((): Completion => nested.call(throwing, receiver, args, loc));
        frame(sa, b, codeB, nestedReceiver, 1, 1, 1);
        return result;
    }, loc) === result, 'code normal identity');
    frame(sa, a, codeA, receiver, 0, 1, 0);
    expectedCode = codeA; expectedThis = receiver; expectedScope = 0;
    check(sb.run(codeB, nestedReceiver, (other: OperationContext): ValueCompletion => {
        frame(sb, b, codeB, nestedReceiver, 0, 0, 0);
        check(other.tick(loc).type === 'normal', 'B tick');
        const forwarded: OperationContext = { realm: b, call: c.call, tick: c.tick };
        const detached = forwarded.call;
        check(detached(leaf, receiver, args, loc) === result, 'A dispatch while B active');
        check(forwarded.tick(loc).type === 'normal', 'A tick while B active');
        check(sa.inspect().steps === 2 && sb.inspect().steps === 1, 'owner budgets');
        frame(sa, a, codeA, receiver, 0, 1, 0);
        expectedOwner = sb; expectedCode = codeB; expectedThis = nestedReceiver;
        check(other.call(leaf, receiver, args, loc) === result, 'B own call');
        expectedOwner = sa; expectedCode = codeA; expectedThis = receiver;
        return result;
    }) === result, 'B root identity');
    frame(sa, a, codeA, receiver, 0, 1, 0);
    reject((): Completion => invoke(outer)(receiver, args, c, loc), 'Script execution unavailable');
    reject((): Completion => invoke(leaf)(receiver, args, c, loc), 'Script execution unavailable');
    return result;
});

check(sa.run(codeA, receiver, (c: OperationContext): ValueCompletion => {
    held = c;
    const detachedSnapshot = sa.inspect();
    detachedSnapshot.source = codeB; detachedSnapshot.realm = b; detachedSnapshot.steps = 999;
    frame(sa, a, codeA, receiver, 0, 0, 0);
    check(sa.inspect().steps === 0, 'snapshot detached');
    reject((): Completion => sa.run(codeA, receiver, (_c: OperationContext): ValueCompletion => result), 'reentry');
    check(c.tick(loc).type === 'normal', 'first tick');
    const clone: OperationContext = { realm: b, call: c.call, tick: c.tick };
    reject((): Completion => invoke(leaf)(receiver, args, clone, loc), 'Script execution unavailable');
    const copied = clone.call;
    check(copied(leaf, receiver, args, loc) === result, 'copied capability');
    check(c.call(outer, receiver, args, loc) === result, 'outer normal identity');
    return abrupt;
}) === abrupt, 'root guest identity');
idle(sa, a, 2, 6, 47); idle(sb, b, 1, 1, 8);
check(leafHits === 4 && guestHits === 1 && hostHits === 1, 'first exact effects');
reject((): Completion => held.tick(loc), 'idle');
reject((): Completion => held.call(leaf, receiver, args, loc), 'idle');
sb.run(codeB, nestedReceiver, (_other: OperationContext): ValueCompletion => {
    reject((): Completion => held.tick(loc), 'idle');
    reject((): Completion => held.call(leaf, receiver, args, loc), 'idle');
    return result;
});
idle(sa, a, 2, 6, 47); idle(sb, b, 1, 1, 8);
console.log('PASS ' + property + ' captured owner two sessions normal guest identity effects=' + amount);

host((): Completion => sa.run(codeA, receiver, (c: OperationContext): ValueCompletion => sa.code(codeB, nestedReceiver,
    (nested: OperationContext): ValueCompletion => nested.call(throwing, receiver, args, loc), loc)));
idle(sa, a, 2, 7, 54);
reject((): Completion => invoke(throwing)(receiver, args, held, loc), 'Script execution unavailable');
const recurse = target(a, (_r, _a, c, _l): Completion => c.call(recurse, receiver, args, loc));
const limited = sa.run(codeA, receiver, (c: OperationContext): ValueCompletion => c.call(recurse, receiver, args, loc));
check(limited.type === 'throw' && limited.diagnostic.message === 'calls' && limited.diagnostic.loc === loc, 'call limit');
idle(sa, a, 2, 9, 70);
const depthLimited = sa.run(codeA, receiver, (_c: OperationContext): ValueCompletion => sa.code(codeB, nestedReceiver,
    (_c: OperationContext): ValueCompletion => sa.code(codeA, receiver,
        (_c: OperationContext): ValueCompletion => sa.code(codeB, nestedReceiver, (_c: OperationContext): ValueCompletion => result, loc), loc), loc));
check(depthLimited.type === 'throw' && depthLimited.diagnostic.message === 'depth' && depthLimited.diagnostic.loc === loc, 'depth limit');
idle(sa, a, 2, 9, 70);
// Retained functions are session capabilities, deliberately valid on a later unit.
check(sa.run(codeNext, receiver, (_c: OperationContext): ValueCompletion => {
    expectedCode = codeNext;
    check(held.tick(loc).type === 'normal', 'retained tick');
    return held.call(leaf, receiver, args, loc);
}) === result, 'retained later unit');
idle(sa, a, 3, 10, 78);
check(sa.run(codeA, receiver, (c: OperationContext): ValueCompletion => c.tick(loc)).type === 'normal', 'last available step');
for (const count of [5, 6]) {
    const exhausted = sa.run(codeA, receiver, (c: OperationContext): ValueCompletion => c.tick(loc));
    check(exhausted.type === 'throw' && exhausted.diagnostic.message === 'steps' && exhausted.diagnostic.loc === loc && sa.inspect().steps === count, 'monotonic exhausted');
}
idle(sa, a, 6, 10, 78); idle(sb, b, 1, 1, 8);
check(leafHits === 5 && guestHits === 1 && hostHits === 2, 'final exact effects');
console.log('PASS cleanup host identity call-depth limits retained unit A=6/10/78 B=1/1/8 leaf=5 guest=1 host=2');

// Real wrappers are still unavailable even while the seam's session is active.
const legacyContext: OperationContext = { realm: legacy, call: held.call, tick: held.tick };
sa.run(codeA, receiver, (c: OperationContext): ValueCompletion => {
    reject((): Completion => realInvoke(receiver, args, c, loc), 'Script execution unavailable');
    reject((): Completion => realInvoke(receiver, args, legacyContext, loc), 'cross-profile callable invocation');
    const legacyTarget: Value = { kind: 'object', object: legacy.createBuiltin('legacy', 0, (_r, _a, _c, _l): Completion => result) };
    reject((): Completion => c.call(legacyTarget, receiver, args, loc), 'cross-profile callable invocation');
    return result;
});
check(realHits === 0, 'production raw closed');
idle(sa, a, 6, 10, 78);
console.log('PASS profile-first exact errors tuple neighbors replay direct denial production closed');

// Guest abrupt crosses the synthetic code-frame and root finally boundaries too.
check(sa.run(codeA, receiver, (_c: OperationContext): ValueCompletion => sa.code(codeB, nestedReceiver,
    (c: OperationContext): ValueCompletion => c.call(guest, receiver, args, loc), loc)) === abrupt, 'code guest unwind identity');
idle(sa, a, 6, 11, 86); idle(sb, b, 1, 1, 8);
check(guestHits === 2 && realHits === 0, 'guest unwind counts');
console.log('PASS guest code-root unwind snapshot isolation final A=6/11/86 productionRaw=0');
