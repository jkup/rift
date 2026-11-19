Promise.reject("unhandled");
Promise.resolve().then(() => { throw "reaction rejection"; });
console.log("no rejection tracker");
