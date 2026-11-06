function need(ok: boolean, code: string): void { if (!ok) throw new Error("script-producer/" + code); }
function decimal(text: string): number {
    need(text.length > 0, "limit");
    let value = 0;
    for (let n = 0; n < text.length; n++) {
        const digit = text.charCodeAt(n) - 48;
        need(digit >= 0 && digit <= 9, "limit");
        need(value < 900719925474099 || (value === 900719925474099 && digit <= 1), "limit");
        value = value * 10 + digit;
    }
    return value;
}
console.log(decimal(process.argv[2]));
