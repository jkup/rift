// A name resolves to the nearest enclosing binding. Inner bindings hide outer
// ones only inside their own block or function.

let name = "outer";

{
    let name = "block";
    console.log(name);
}
console.log(name);

function useParameter(name) {
    return name;
}
console.log(useParameter("parameter"), name);

function nested() {
    let name = "function";
    let inner = function () {
        return name;
    };
    return inner();
}
console.log(nested());

// Assigning to a shadowing binding leaves the outer binding untouched.
let count = 1;
{
    let count = 50;
    count = count + 1;
    console.log(count);
}
console.log(count);
