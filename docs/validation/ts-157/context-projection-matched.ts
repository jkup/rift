export {};
class Realm { readonly name: string; constructor(name: string) { this.name = name; } }
type Context = { readonly realm: Realm; construct?: () => number };
type ActiveContext = { realm: Realm; construct?: () => number };
const original = new Realm('original'), replacement = new Realm('replacement');
const active: ActiveContext = { realm: original, construct: () => 7 };
const context: Context = active;
active.realm = replacement;
console.log(context.realm === replacement ? 'shared' : 'copied');
