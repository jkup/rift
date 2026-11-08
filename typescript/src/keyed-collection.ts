import type { GuestObject, ThrowCompletion, Value, ValueCompletion } from "./runtime.js";
import type { GuestSymbol } from "./symbols.js";
import type { Location } from "./syntax.js";

type CollectionKey = undefined | null | boolean | number | string | GuestObject | GuestSymbol;
type CollectionBudget = { tick: (loc: Location) => ValueCompletion };
export type CollectionEntry = { key: Value; value: Value };
type CursorCompletion = { type: "normal"; entry: CollectionEntry | null } | ThrowCompletion;

function collectionKey(value: Value): CollectionKey {
    switch (value.kind) {
        case "undefined": return undefined;
        case "null": return null;
        case "object": return value.object;
        default: return value.value;
    }
}

class CollectionNode {
    entry: CollectionEntry | null = null;
    previous: CollectionNode | null = null;
    next: CollectionNode | null = null;
}

export class CollectionCursor {
    constructor(private current: CollectionNode | null) {}

    next(context: CollectionBudget, loc: Location): CursorCompletion {
        while (this.current !== null) {
            const tick = context.tick(loc);
            if (tick.type === "throw") return tick;
            const node = this.current;
            this.current = node.next;
            if (node.entry !== null)
                return { type: "normal", entry: { key: node.entry.key, value: node.entry.value } };
        }
        return { type: "normal", entry: null };
    }
}

export class KeyedCollection {
    private readonly index: Map<CollectionKey, CollectionNode> = new Map();
    private first = new CollectionNode();
    private tail = this.first;

    get size(): number { return this.index.size; }

    get(key: Value): Value | undefined {
        const node = this.index.get(collectionKey(key));
        return node === undefined || node.entry === null ? undefined : node.entry.value;
    }

    has(key: Value): boolean { return this.index.has(collectionKey(key)); }

    set(key: Value, value: Value): void {
        const lookup = collectionKey(key);
        const existing = this.index.get(lookup);
        if (existing !== undefined) {
            if (existing.entry === null) throw new Error("deleted collection entry in index");
            existing.entry.value = value;
            return;
        }
        const node = this.tail;
        const normalized = key.kind === "number" && key.value === 0 ? { kind: "number" as const, value: 0 } : key;
        node.entry = { key: normalized, value };
        this.tail = new CollectionNode();
        this.tail.previous = node;
        node.next = this.tail;
        this.index.set(lookup, node);
    }

    delete(key: Value): boolean {
        const lookup = collectionKey(key);
        const node = this.index.get(lookup);
        if (node === undefined) return false;
        const next = node.next;
        if (next === null) throw new Error("collection entry without tail");
        if (node.previous === null) this.first = next;
        else node.previous.next = next;
        next.previous = node.previous;
        this.index.delete(lookup);
        node.entry = null;
        node.previous = null;
        // A live cursor may still point here. Keep its forward path, but release
        // payloads and unlink the node from storage owned by the collection.
        return true;
    }

    clear(context: CollectionBudget, loc: Location): ValueCompletion {
        while (this.first.entry !== null) {
            const tick = context.tick(loc);
            if (tick.type === "throw") return tick;
            this.delete(this.first.entry.key);
        }
        return { type: "normal", value: { kind: "undefined" } };
    }

    cursor(): CollectionCursor { return new CollectionCursor(this.first); }
}
