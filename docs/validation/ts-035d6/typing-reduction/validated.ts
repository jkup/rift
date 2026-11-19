function decimal(text: string): number {
    if (text.length === 0) throw new Error("empty limit");
    for (let n = 0; n < text.length; n++) if (text.charCodeAt(n) < 48 || text.charCodeAt(n) > 57) throw new Error("nondecimal limit");
    const value = Number(text);
    if (!Number.isSafeInteger(value)) throw new Error("unsafe limit");
    return value;
}
const result = {steps: decimal(process.argv[2]), calls: decimal(process.argv[3])};
console.log(JSON.stringify(result));
