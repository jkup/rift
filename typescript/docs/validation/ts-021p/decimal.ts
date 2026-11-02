function format(value: number): string {
    return String(value);
}
function parse(token: string): number { return parseFloat(token); }
const value: number = parse(process.argv[2]);
console.log(format(value));
