// Both operands arrive after compilation; no literal formatting calls.
function format(value: number, radix: number): string {
    return value.toString(radix);
}
const value = Number(process.argv[2]);
const radix = Number(process.argv[3]);
console.log(format(value, radix));
