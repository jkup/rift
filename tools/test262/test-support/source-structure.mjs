import { parseSync } from "oxc-parser";

export function replaceImportSources(source, replacements) {
    const parsed = parseSync("isolated.mjs", source);
    if (parsed.errors.length !== 0) {
        throw new Error("Cannot rewrite imports in invalid source");
    }
    const edits = [];
    for (const [before, after] of Object.entries(replacements)) {
        const matches = parsed.program.body.filter(
            (node) => node.type === "ImportDeclaration" && node.source.value === before,
        );
        if (matches.length !== 1) {
            throw new Error(`Expected exactly one import of ${before}, found ${matches.length}`);
        }
        edits.push({ ...matches[0].source, replacement: JSON.stringify(after) });
    }
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
        source = source.slice(0, edit.start) + edit.replacement + source.slice(edit.end);
    }
    return source;
}

// Historical source contracts compare syntax rather than printer choices.
// Only a single statement's optional control-flow braces are normalized;
// declarations and multi-statement blocks retain their scope boundaries.
export function sourceStructure(source, filename = "contract.mjs") {
    const parsed = parseSync(filename, source, { preserveParens: false });
    if (parsed.errors.length !== 0) {
        throw new Error("Cannot compare invalid source: " + JSON.stringify(parsed.errors));
    }
    return normalize(parsed.program);
}

function normalize(value, parentType, key) {
    if (Array.isArray(value)) {
        return value.map((item) => normalize(item));
    }
    if (value === null || typeof value !== "object") {
        return value;
    }
    const controlBody =
        (parentType === "IfStatement" && (key === "consequent" || key === "alternate")) ||
        ([
            "WhileStatement",
            "DoWhileStatement",
            "ForStatement",
            "ForInStatement",
            "ForOfStatement",
        ].includes(parentType) &&
            key === "body");
    if (
        controlBody &&
        value.type === "BlockStatement" &&
        value.body.length === 1 &&
        !["VariableDeclaration", "FunctionDeclaration", "ClassDeclaration"].includes(
            value.body[0].type,
        )
    ) {
        return normalize(value.body[0]);
    }
    const result = {};
    for (const [field, child] of Object.entries(value)) {
        if (
            ["start", "end", "range"].includes(field) ||
            (field === "raw" && value.type === "Literal")
        ) {
            continue;
        }
        if (
            field === "key" &&
            value.computed === false &&
            ["Property", "MethodDefinition", "PropertyDefinition"].includes(value.type) &&
            (child.type === "Identifier" ||
                (child.type === "Literal" && typeof child.value === "string"))
        ) {
            result[field] = { type: "PropertyName", value: child.name ?? child.value };
            continue;
        }
        result[field] = normalize(child, value.type, field);
    }
    return result;
}
