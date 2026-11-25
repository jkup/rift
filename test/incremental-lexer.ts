import { createLexer, lex, lexNumericSeparatorAudit, type Token } from "../src/lexer.js";

function check(value: boolean, message: string): void {
    if (!value) {
        throw new Error(message);
    }
}
function token(
    value: Token,
    kind: string,
    text: string,
    start: number,
    end: number,
    line: number,
    column: number,
): void {
    check(value.kind === kind && value.text === text, "token kind and value");
    check(value.start === start && value.end === end, "UTF-16 token range");
    check(value.loc.line === line && value.loc.column === column, "token location");
}
{
    const lexer = createLexer('a/*x\r\ny*/+\n"😀"', true);
    check(lexer.result().tokens.length === 0, "creation does not scan tokens");
    token(lexer.next(), "word", "a", 0, 1, 1, 1);
    check(lexer.result().tokens.length === 1, "one token per request");
    token(lexer.next(), "punct", "+", 9, 10, 2, 4);
    token(lexer.next(), "string", "😀", 11, 15, 3, 1);
    const eof = lexer.next();
    token(eof, "eof", "<eof>", 15, 15, 3, 5);
    check(lexer.next() === eof && lexer.result().tokens.length === 4, "EOF is stable");
    check(lexer.result().error === null, "valid tokens");
}
{
    const lexer = createLexer("a @", true);
    token(lexer.next(), "word", "a", 0, 1, 1, 1);
    check(lexer.result().error === null, "later lexical failure remains unscanned");
    token(lexer.next(), "eof", "<eof>", 2, 2, 1, 3);
    const result = lexer.result();
    check(result.error?.message === "unsupported character: @", "failure message");
    check(
        result.rejection?.kind === "unsupported-syntax" &&
            result.rejection.capabilityCode === "lex.character",
        "failure category",
    );
}
{
    const lexer = createLexer('"unterminated', true);
    token(lexer.next(), "string", "unterminated", 0, 13, 1, 1);
    check(lexer.result().error?.message === "unterminated string", "partial token retains failure");
    token(lexer.next(), "eof", "<eof>", 13, 13, 1, 14);
}
{
    const lexer = createLexer("`a${b}c${d}e`", true);
    const head = lexer.next();
    token(head, "template-head", "`a${", 0, 4, 1, 1);
    check(head.cooked === "a", "head cooked value");
    token(lexer.next(), "word", "b", 4, 5, 1, 5);
    const middle = lexer.next();
    token(middle, "template-middle", "}c${", 5, 9, 1, 6);
    check(middle.cooked === "c", "middle cooked value");
    token(lexer.next(), "word", "d", 9, 10, 1, 10);
    const tail = lexer.next();
    token(tail, "template-tail", "}e`", 10, 13, 1, 11);
    check(tail.cooked === "e", "tail cooked value");
    check(
        lexer.next().kind === "eof" && lexer.result().error === null,
        "template state survives requests",
    );
}
{
    const lexer = createLexer("`a${b", true);
    check(lexer.next().kind === "template-head", "unterminated substitution head");
    check(
        lexer.next().text === "b" && lexer.result().error === null,
        "unterminated substitution waits for EOF",
    );
    check(
        lexer.next().kind === "eof" &&
            lexer.result().error?.message === "unterminated template substitution",
        "EOF detects substitution failure",
    );
}
for (const source of [
    "",
    " // line\r\n",
    "/* unfinished",
    "0xZZ",
    "1e+",
    "'a\n'",
    "`x${{a:`y${1}`}.a}z`",
    "x / 2 /= 3",
    "x?.a **= 2",
    "1__2",
    "'\\u{1f600}'",
]) {
    for (const mode of [0, 1, 2]) {
        const lexer = createLexer(source, mode !== 0, mode === 2);
        while (lexer.next().kind !== "eof") {}
        const eager = mode === 2 ? lexNumericSeparatorAudit(source) : lex(source, mode === 1);
        check(
            JSON.stringify(lexer.result()) === JSON.stringify(eager),
            "eager and incremental collection agree",
        );
    }
}
{
    const audit = lexNumericSeparatorAudit("1__2");
    check(
        audit.tokens[0].kind === "invalid-number" && audit.error === null,
        "separator audit retains invalid token",
    );
    const legacy = lex("1_2");
    check(legacy.error?.message === "unsupported numeric literal", "legacy mode unchanged");
    const lexer = createLexer("a".repeat(100001), true);
    const rejection = lexer.result().rejection;
    check(
        rejection?.kind === "resource-limit" && rejection.guardCode === "source-units",
        "source guard before scanning",
    );
    token(lexer.next(), "eof", "<eof>", 0, 0, 1, 1);
}
for (const prefix of ["", " \t", "/**/ /**/", "0/*\r\n*/", "0\u2028", "0\u2029"]) {
    const source = prefix + "--> ignored\nnext";
    const result = lex(source, true);
    check(result.error === null, "HTML close comment is accepted after line trivia");
    const next = result.tokens[result.tokens.length - 2];
    check(next.text === "next" && next.start === source.indexOf("next"), "comment end offset");
    check(
        result.tokens.length === (prefix.startsWith("0") ? 3 : 2),
        "HTML comment contents are discarded",
    );
}
{
    const result = lex("x<!-- ignored\r\ny", true);
    token(result.tokens[0], "word", "x", 0, 1, 1, 1);
    token(result.tokens[1], "word", "y", 15, 16, 2, 1);
    check(result.tokens.length === 3 && result.error === null, "HTML open comment after token");
}
for (const source of ["x-->y", "x/**/-->y", "`a\nb`-->y", "'a\\\nb'-->y"]) {
    const result = lex(source, true);
    check(result.tokens[result.tokens.length - 2].text === "y", "same-line decrement is retained");
    check(
        result.tokens.some((value: Token, _index: number, _tokens: Token[]) => value.text === "--"),
        "decrement token is retained",
    );
}
{
    const result = lex("<!-- text", false);
    check(result.tokens[0].text === "<", "legacy lexer profile is unchanged");
    const unfinished = lex("/* no end", true);
    check(unfinished.error?.message === "unterminated comment", "unterminated block diagnostic");
    token(unfinished.tokens[0], "eof", "<eof>", 9, 9, 1, 10);
}
for (const separator of ["\n", "\r", "\r\n", "\u2028", "\u2029"]) {
    const source = "#!/usr/bin/env js" + separator + "next";
    const result = lex(source, true);
    check(result.error === null && result.tokens.length === 2, "initial hashbang is a comment");
    const start = source.indexOf("next");
    token(result.tokens[0], "word", "next", start, start + 4, 2, 1);
}
for (const prefix of [" ", "\ufeff", "\n", "/* comment */", ";", "{", "function f(){"]) {
    const result = lex(prefix + "#! ignored\n}", true);
    check(result.error !== null, "hashbang is rejected outside the start of source");
}
{
    const result = lex("#! no newline", true);
    check(result.error === null && result.tokens.length === 1, "hashbang can run through EOF");
    check(lex("#! legacy", false).error !== null, "legacy hashbang remains unsupported");
}
console.log("Incremental lexer passed");
