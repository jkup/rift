// Reduced test-only reflection pattern rejected by the separate coverage gate.
// This is evidence, not part of the engine or accepted native entry list.
type Descriptor = { value?: number; writable?: boolean };
function inspect(desc: Descriptor): string { return Object.keys(desc).join(","); }
console.log(inspect({ value: 1 }));
