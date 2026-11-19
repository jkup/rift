import {
    KeyedCollection,
    type CollectionCursor,
    type CollectionEntry,
} from "../src/keyed-collection.js";
import {
    UNDEFINED,
    normal,
    resourceFailure,
    sameValue,
    type Value,
    type ValueCompletion,
} from "../src/runtime.js";
import { GuestSymbol } from "../src/symbols.js";
import type { Location } from "../src/syntax.js";
import { Realm } from "../src/realm.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function number(value: number): Value {
    return { kind: "number", value };
}
function string(value: string): Value {
    return { kind: "string", value };
}
const loc: Location = { line: 1, column: 1 };
const unlimited = { tick: (_loc: Location): ValueCompletion => normal() };
function budget(limit: number): { tick: (loc: Location) => ValueCompletion } {
    let count = 0;
    return {
        tick: (where: Location): ValueCompletion => {
            count++;
            return count > limit
                ? resourceFailure("steps", count, limit, "storage test budget", where)
                : normal();
        },
    };
}
function next(cursor: CollectionCursor): CollectionEntry | null {
    const result = cursor.next(unlimited, loc);
    if (result.type === "throw") {
        throw new Error("unexpected cursor throw");
    }
    return result.entry;
}
function keys(cursor: CollectionCursor): string {
    const values: string[] = [];
    let entry = next(cursor);
    while (entry !== null) {
        if (entry.key.kind !== "string") {
            throw new Error("string key expected");
        }
        values.push(entry.key.value);
        entry = next(cursor);
    }
    return values.join(",");
}
function collection(): KeyedCollection {
    const store = new KeyedCollection();
    for (const key of ["a", "b", "c"]) {
        store.set(string(key), string(key));
    }
    return store;
}

{
    const owner = new Realm((_line: string) => {}, "script"),
        foreign = new Realm((_line: string) => {}, "script");
    const object = owner.createObject(),
        symbol = new GuestSymbol("x");
    const samples: Value[] = [
        UNDEFINED,
        { kind: "null" },
        { kind: "boolean", value: false },
        { kind: "boolean", value: true },
        number(0),
        number(-0),
        number(NaN),
        number(NaN),
        number(1),
        string("1"),
        string(""),
        { kind: "object", object },
        { kind: "object", object },
        { kind: "object", object: foreign.createObject() },
        { kind: "symbol", value: symbol },
        { kind: "symbol", value: symbol },
        { kind: "symbol", value: new GuestSymbol("x") },
    ];
    const expected = [0, 1, 2, 3, 5, 5, 7, 7, 8, 9, 10, 12, 12, 13, 15, 15, 16];
    const store = new KeyedCollection();
    for (let i = 0; i < samples.length; i++) {
        store.set(samples[i], number(i));
    }
    check(store.size === 13, "distinct key count");
    for (let i = 0; i < samples.length; i++) {
        const value = store.get(samples[i]);
        check(value !== undefined && sameValue(value, number(expected[i])), "key identity " + i);
    }
    const cursor = store.cursor();
    let entry = next(cursor),
        count = 0;
    while (entry !== null) {
        if (entry.key.kind === "number" && entry.key.value === 0) {
            check(1 / entry.key.value === Infinity, "canonical positive zero");
        }
        count++;
        entry = next(cursor);
    }
    check(count === 13, "iteration count");
    check(
        store.delete(number(NaN)) && !store.has(number(NaN)) && !store.delete(number(NaN)),
        "NaN deletion",
    );
    store.set(string("present"), UNDEFINED);
    check(
        store.has(string("present")) &&
            store.get(string("present")) === UNDEFINED &&
            store.get(string("absent")) === undefined,
        "guest undefined versus absence",
    );
}
{
    const store = collection();
    const cursor = store.cursor();
    const first = next(cursor);
    check(first !== null && sameValue(first.key, string("a")), "first entry");
    store.set(string("a"), number(9));
    check(first !== null && sameValue(first.value, string("a")), "returned entry snapshot");
    store.delete(string("a"));
    store.delete(string("b"));
    store.set(string("a"), number(1));
    store.set(string("b"), number(2));
    check(keys(cursor) === "c,a,b", "delete current and pending, then reinsert");
    check(keys(store.cursor()) === "c,a,b", "live root excludes deleted nodes");
    store.set(string("d"), number(4));
    check(next(cursor) === null, "exhaustion is permanent");
}
{
    const store = collection(),
        before = store.cursor(),
        afterFirst = store.cursor();
    next(afterFirst);
    check(store.clear(unlimited, loc).type === "normal" && store.size === 0, "clear");
    store.set(string("x"), number(1));
    store.set(string("y"), number(2));
    check(keys(before) === "x,y" && keys(afterFirst) === "x,y", "clear preserves pending cursors");
    check(keys(store.cursor()) === "x,y", "new cursor starts at live root");
}
{
    const store = new KeyedCollection(),
        cursor = store.cursor();
    store.set(string("a"), number(1));
    store.delete(string("a"));
    store.set(string("b"), number(2));
    check(keys(cursor) === "b", "initial empty tail survives insertion and deletion");
    const tail = store.cursor();
    next(tail);
    store.delete(string("b"));
    store.set(string("c"), number(3));
    check(keys(tail) === "c", "deleted final entry does not strand cursor");
}
{
    const store = new KeyedCollection(),
        old = store.cursor();
    for (let i = 0; i < 2000; i++) {
        store.set(number(i), number(i));
        store.delete(number(i));
    }
    store.set(string("live"), number(1));
    const stopped = old.next(budget(10), loc);
    check(
        stopped.type === "throw" && stopped.origin.kind === "resource-limit",
        "old cursor traversal bounded",
    );
    const fresh = store.cursor().next(budget(1), loc);
    check(
        fresh.type === "normal" &&
            fresh.entry !== null &&
            sameValue(fresh.entry.key, string("live")),
        "fresh cursor skips no deletion history",
    );
    check(keys(old) === "live", "interrupted traversal retains correct position");
}
{
    const store = collection(),
        cursor = store.cursor();
    const result = store.clear(budget(1), loc);
    check(result.type === "throw" && result.origin.kind === "resource-limit", "clear budget");
    check(
        store.size === 2 && keys(store.cursor()) === "b,c",
        "interrupted clear leaves consistent lookup and order",
    );
    store.set(string("a"), number(1));
    check(keys(cursor) === "b,c,a", "cursor after interrupted clear and insertion");
}
console.log("Keyed collection storage passed");
