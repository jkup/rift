import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { parseSync, visitorKeys } from "oxc-parser";

// These are host entry points or observation controls, not semantic operations.
export const hostFiles = new Set([
    "src/cli.ts",
    "src/observation-driver.ts",
    "src/script-observation-driver.ts",
    "src/script-observation.ts",
]);

export function sourceFiles(root = ".") {
    const config = JSON.parse(readFileSync(`${root}/.oxlintrc.json`, "utf8"));
    const files = [];
    function visit(directory) {
        for (const entry of readdirSync(`${root}/${directory}`, { withFileTypes: true })) {
            const path = `${directory}/${entry.name}`;
            if (config.ignorePatterns.some((pattern) => posix.matchesGlob(path, pattern))) {
                continue;
            }
            if (entry.isDirectory()) {
                visit(path);
            } else if (entry.isFile() && /\.(?:ts|mjs|js)$/.test(path)) {
                files.push(path);
            }
        }
    }
    for (const directory of ["src", "test", "tools"]) {
        visit(directory);
    }
    files.push("toolchain/scriptc/prepare.mjs");
    return files.sort();
}

export function inspectPolicy(filename, source) {
    const parsed = parseSync(filename, source, { preserveParens: false });
    const issues = [];
    function report(node, rule, message) {
        const line = source.slice(0, node.start).split("\n").length;
        issues.push({ filename, line, rule, message });
    }
    for (const error of parsed.errors) {
        issues.push({ filename, line: 1, rule: "parse", message: error.message });
    }
    const semanticCore = filename.startsWith("src/") && !hostFiles.has(filename);
    function walk(node) {
        if (!node?.type) {
            return;
        }
        if (
            node.type === "PropertyDefinition" &&
            ((!node.computed && node.key.name === "prototype") || node.key.value === "prototype")
        ) {
            report(
                node,
                "compiler-prototype-field",
                "Class fields named prototype break static compilation; use proto or prototypeSlot.",
            );
        }
        if (
            semanticCore &&
            [
                "ImportDeclaration",
                "ExportNamedDeclaration",
                "ExportAllDeclaration",
                "ImportExpression",
            ].includes(node.type) &&
            node.source
        ) {
            const target = node.source.value;
            const destination =
                typeof target === "string" && target.startsWith(".")
                    ? posix.normalize(posix.join(posix.dirname(filename), target))
                    : null;
            if (
                !destination?.startsWith("src/") ||
                hostFiles.has(destination.replace(/\.js$/, ".ts"))
            ) {
                report(
                    node,
                    "core-import-boundary",
                    "Semantic modules may import only other semantic modules inside src.",
                );
            }
        }
        for (const key of visitorKeys[node.type] ?? []) {
            const children = node[key];
            for (const child of Array.isArray(children) ? children : [children]) {
                walk(child);
            }
        }
    }
    walk(parsed.program);
    for (const comment of parsed.comments) {
        const text = comment.value.trim();
        if (!/^(?:oxlint|eslint)(?:-|\s)/.test(text)) {
            continue;
        }
        if (
            !/^(?:oxlint|eslint)-disable-(?:next-line|line)\s+[\w/@-]+(?:\s*,\s*[\w/@-]+)*\s+--\s+\S.{11,}$/.test(
                text,
            )
        ) {
            report(
                comment,
                "explained-suppression",
                "Use a single-line, rule-specific suppression with -- and a meaningful explanation.",
            );
        }
    }
    return issues;
}
