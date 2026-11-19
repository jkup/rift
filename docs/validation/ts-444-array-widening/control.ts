type Field = { kind: "field"; key: string; value: number };
type Initializer = Field | { kind: "block"; body: number };
const fields: Initializer[] = [];
const statics: Initializer[] = [];
function select(isStatic: boolean): Initializer[] { return isStatic ? statics : fields; }
select(false).push({ kind: "field", key: "x", value: 42 });
console.log(fields.length);
if (fields.length !== 0 && fields[0].kind === "field") console.log(fields[0].key);
