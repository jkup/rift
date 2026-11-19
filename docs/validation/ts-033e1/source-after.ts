type Source = { readonly text: string };
type Unit = { readonly id: string; readonly text: string };
class Holder { constructor(readonly source: Source) {} }
const unit: Unit = { id: "unit", text: process.argv[2] };
const source: Source = { text: unit.text };
const holder = new Holder(source);
console.log(holder.source === source);
