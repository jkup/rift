export function validateNativeEntries(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
        throw new Error("native manifest must contain entries");
    }
    const sources = new Set(),
        names = new Set();
    for (const entry of entries) {
        if (
            !Array.isArray(entry) ||
            entry.length !== 2 ||
            typeof entry[0] !== "string" ||
            typeof entry[1] !== "string"
        ) {
            throw new Error("native entries must be [source, output name] pairs");
        }
        const [source, name] = entry;
        if (!/^(src|test)\/[a-z0-9/-]+\.ts$/.test(source) || !/^[a-z0-9-]+$/.test(name)) {
            throw new Error("invalid native source or output name: " + source);
        }
        if (sources.has(source) || names.has(name)) {
            throw new Error("duplicate native source or output name: " + source);
        }
        sources.add(source);
        names.add(name);
    }
}
