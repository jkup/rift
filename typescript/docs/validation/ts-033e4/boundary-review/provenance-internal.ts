// No AST or interpreter. A scalar stands for an inaccessible record payload.
class Key {}
const executionKey = new Key();
class Record {
    #payload: number | null = null;
    #id = "";
    private constructor() {}
    static prepare(id: string, value: number): Record {
        const record = new Record(); record.#id = id; record.#payload = value; return record;
    }
    static read(record: Record, key: Key): number {
        if (key !== executionKey || !(record instanceof Record) || record.#payload === null) throw new Error("record");
        return record.#payload;
    }
    inspect(): { id: string } { return { id: this.#id }; }
}
class Callable {
    #owner: Record;
    constructor(owner: Record, key: Key) { if (key !== executionKey) throw new Error("callable"); this.#owner = owner; }
    static read(callable: Callable, owner: Record, key: Key): number {
        if (key !== executionKey || !(callable instanceof Callable) || callable.#owner !== owner) throw new Error("callable");
        return Record.read(callable.#owner, key);
    }
}
class Session {
    #key: Key;
    #steps = 0;
    constructor(key: Key) { if (key !== executionKey) throw new Error("session"); this.#key = key; }
    static evaluate(session: Session, owner: Record, callable: Callable): number {
        if (!(session instanceof Session) || session.#key !== executionKey) throw new Error("session");
        const payload = Callable.read(callable, owner, session.#key);
        session.#steps++;
        return payload;
    }
    inspect(): number { return this.#steps; }
}
export type { Record, Callable, Session };
export function prepare(id: string, value: number): Record { return Record.prepare(id, value); }
// Probe factory only. Production callable creation stays within private record algorithms.
export function materialize(record: Record): Callable { Record.read(record, executionKey); return new Callable(record, executionKey); }
export function createSession(): Session { return new Session(executionKey); }
export function evaluate(session: Session, record: Record, callable: Callable): number { return Session.evaluate(session, record, callable); }
