console.log("sync");
Promise.resolve({ then(resolve) { console.log("thenable"); resolve(3); } })
    .then(value => { console.log("value", value); throw 4; })
    .catch(value => console.log("caught", value));
Promise.resolve().then(() => console.log("reaction"));
