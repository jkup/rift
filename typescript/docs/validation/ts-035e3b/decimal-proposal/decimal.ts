function need(ok: boolean, code: string): void { if (!ok) throw new Error("script-producer/" + code); }
export function decimal(text: string): number {
    if (text.length === 0) throw new Error("script-producer/limit");
    for (let n = 0; n < text.length; n++) need(text.charCodeAt(n) >= 48 && text.charCodeAt(n) <= 57, "limit");
    const value = Number(text);
    need(Number.isSafeInteger(value), "limit");
    return value;
}
