import { parseSync, visitorKeys } from "oxc-parser";

export const structureLimits = { fileLines: 600, functionLines: 100, depth: 4 };
const functions = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);
const controls = new Set([
    "IfStatement",
    "ForStatement",
    "ForInStatement",
    "ForOfStatement",
    "WhileStatement",
    "DoWhileStatement",
    "SwitchStatement",
    "TryStatement",
]);

function children(node) {
    return (visitorKeys[node.type] ?? []).flatMap((key) => {
        const value = node[key];
        return (Array.isArray(value) ? value : [value]).filter((child) => child?.type);
    });
}

function nesting(node, depth = 0, parent = null) {
    if (functions.has(node.type)) {
        return 0;
    }
    const elseIf = parent?.type === "IfStatement" && parent.alternate === node;
    const next = depth + (controls.has(node.type) && !elseIf ? 1 : 0);
    return Math.max(next, ...children(node).map((child) => nesting(child, next, node)));
}

function nameOf(node) {
    return node?.name ?? node?.value ?? "anonymous";
}

export function measureStructure(filename, source) {
    const parsed = parseSync(filename, source, { preserveParens: false });
    if (parsed.errors.length !== 0) {
        throw new Error(`Cannot measure invalid source: ${filename}`);
    }
    // Keep positions and line breaks intact while excluding comment-only lines.
    let withoutComments = source;
    for (const comment of [...parsed.comments].reverse()) {
        withoutComments =
            withoutComments.slice(0, comment.start) +
            source.slice(comment.start, comment.end).replace(/[^\r\n]/g, " ") +
            withoutComments.slice(comment.end);
    }
    const lines = (node) =>
        withoutComments
            .slice(node.start, node.end)
            .split(/\r?\n/)
            .filter((line) => line.trim() !== "").length;
    const production =
        filename.startsWith("src/") ||
        (filename.startsWith("tools/") &&
            !filename.includes("/test-support/") &&
            !/\.(?:test|integration)\.mjs$/.test(filename));
    const metrics = [
        {
            filename,
            name: "<module>",
            depth: nesting(parsed.program),
            fileLines: production ? lines(parsed.program) : 0,
        },
    ];
    const occurrences = new Map();
    function walk(node, scope = []) {
        let context = scope;
        if (["ClassDeclaration", "ClassExpression"].includes(node.type)) {
            context = [...scope, nameOf(node.id)];
        } else if (["MethodDefinition", "PropertyDefinition", "Property"].includes(node.type)) {
            context = [...scope, nameOf(node.key)];
        } else if (node.type === "VariableDeclarator") {
            context = [...scope, nameOf(node.id)];
        }
        if (functions.has(node.type)) {
            if (node.id) {
                context = [...scope, node.id.name];
            } else if (context.length === 0 || context === scope) {
                context = [...scope, "callback"];
            }
            const base = context.join(".");
            const ordinal = (occurrences.get(base) ?? 0) + 1;
            occurrences.set(base, ordinal);
            const name = ordinal === 1 ? base : `${base}#${ordinal}`;
            metrics.push({
                filename,
                name,
                depth: nesting(node.body),
                functionLines: production ? lines(node) : 0,
            });
            context = [name];
        }
        for (const child of children(node)) {
            walk(child, context);
        }
    }
    walk(parsed.program);
    return metrics;
}

export function structuralViolations(metrics) {
    return metrics.flatMap((metric) =>
        Object.entries(structureLimits).flatMap(([rule, limit]) => {
            const value = metric[rule] ?? 0;
            return value > limit
                ? [{ filename: metric.filename, name: metric.name, rule, value }]
                : [];
        }),
    );
}

const keyOf = (entry) => JSON.stringify([entry.filename, entry.name, entry.rule]);

// Exact per-function measurements make the baseline a ratchet: growth is an
// error, and improvements require removing or reducing the old allowance.
export function compareStructure(actual, baseline) {
    const errors = [];
    const remaining = new Map();
    for (const entry of baseline) {
        const key = keyOf(entry);
        if (
            remaining.has(key) ||
            !Number.isInteger(entry.value) ||
            !(entry.value > structureLimits[entry.rule])
        ) {
            errors.push(`Invalid or duplicate baseline entry: ${key}`);
        }
        remaining.set(key, entry);
    }
    for (const entry of actual) {
        const key = keyOf(entry);
        const previous = remaining.get(key);
        if (!previous) {
            errors.push(
                `New ${entry.rule} violation: ${entry.filename} ${entry.name} (${entry.value})`,
            );
        } else if (entry.value > previous.value) {
            errors.push(
                `Increased ${entry.rule}: ${entry.filename} ${entry.name} (${previous.value} -> ${entry.value})`,
            );
        } else if (entry.value < previous.value) {
            errors.push(
                `Reduce baseline ${entry.rule}: ${entry.filename} ${entry.name} (${previous.value} -> ${entry.value})`,
            );
        }
        remaining.delete(key);
    }
    for (const entry of remaining.values()) {
        errors.push(
            `Remove resolved baseline entry: ${entry.filename} ${entry.name} ${entry.rule}`,
        );
    }
    return errors;
}
