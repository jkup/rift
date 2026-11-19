// DEFERRED: needs try/catch/finally (outside the TS-001 subset).
// A `finally` block always runs. If it completes normally, the earlier
// completion (return or throw) continues; an abrupt completion in finally
// replaces it.

function keepsReturn() {
    try {
        return "try";
    } finally {
        console.log("finally ran");
    }
}
console.log(keepsReturn());

function overridesReturn() {
    try {
        return "try";
    } finally {
        return "finally";
    }
}
console.log(overridesReturn());

function swallowsThrow() {
    try {
        throw new Error("lost");
    } finally {
        return "swallowed";
    }
}
console.log(swallowsThrow());
