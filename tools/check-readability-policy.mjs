import { readFileSync } from "node:fs";
import { inspectPolicy, sourceFiles } from "./readability-policy.mjs";

const files = sourceFiles();
const issues = files.flatMap((file) => inspectPolicy(file, readFileSync(file, "utf8")));
for (const issue of issues) {
    console.error(`${issue.filename}:${issue.line} ${issue.rule}: ${issue.message}`);
}
console.log(`Readability policy: ${files.length} files, ${issues.length} violations`);
process.exitCode = issues.length === 0 ? 0 : 1;
