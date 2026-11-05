function decimal(text: string): number { return Number(text); }
const result = {steps: decimal(process.argv[2]), calls: decimal(process.argv[3])};
console.log(JSON.stringify(result));
