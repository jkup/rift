type Source = { readonly text: string };
type Unit = { readonly id: string; readonly text: string };
class Holder { constructor(readonly source: Source) {} }
const unit: Unit = { id: "unit", text: process.argv[2] };
const holder = new Holder(unit);
console.log(holder.source === unit);
