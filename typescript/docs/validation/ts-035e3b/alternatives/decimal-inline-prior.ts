function need(ok: boolean, code: string): void { if (!ok) throw new Error("script-producer/" + code); }
function decimal(text: string): number {
    if (text.length === 0) throw new Error("script-producer/limit");
    for (let n = 0; n < text.length; n++) if (text.charCodeAt(n) < 48 || text.charCodeAt(n) > 57) throw new Error("script-producer/limit");
    const value = Number(text);
    need(Number.isSafeInteger(value), "limit");
    return value;
}
console.log(decimal(process.argv[2]));

