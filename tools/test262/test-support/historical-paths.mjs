// Map the one relocated input after validating a historical policy's original hashes.
export function currentManifestPath(path) {
    if (path === "fixtures/assistance/test262-starter-corpus/manifest.json") {
        return "test/fixtures/test262-selection/manifest.json";
    }
    return path;
}
