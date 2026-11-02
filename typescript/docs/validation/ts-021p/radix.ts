// Both operands arrive after compilation; no literal formatting calls.
function format(value: number, radix: number): string {
    return value.toString(radix);
}
function parse(token: string): number { return parseFloat(token); }
const value: number = parse(process.argv[2]);
const radix: number = parse(process.argv[3]);
console.log(format(value, radix));
