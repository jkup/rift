type Value = { kind: "undefined" } | { kind: "number"; value: number };
type Throw = { type: "throw"; value: Value; diagnostic: { message: string } };
type ValueCompletion = { type: "normal"; value: Value } | Throw;
type StatementCompletion = { type: "normal"; payload: { kind: "empty" } | { kind: "value"; value: Value } } | { type: "return"; value: Value } | Throw;
class Engine {
    #value(): ValueCompletion { return { type: "throw", value: { kind: "number", value: 7 }, diagnostic: { message: "sentinel" } }; }
    statement(): StatementCompletion {
        const result = this.#value();
        if (result.type === "throw") return result;
        return { type: "normal", payload: { kind: "value", value: result.value } };
    }
}
console.log(new Engine().statement().type);
