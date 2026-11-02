type Result = { type: "normal"; value: number } | { type: "throw"; value: number; diagnostic: string };
class State { abrupt: { type: "throw"; value: number; diagnostic: string } | null = null; }
function same(result: Result, state: State): boolean { return result.type === "throw" && state.abrupt !== null && result === state.abrupt; }
const state = new State();
state.abrupt = { type: "throw", value: 7, diagnostic: "original" };
console.log(same(state.abrupt, state));
