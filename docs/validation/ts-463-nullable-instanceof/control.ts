class Environment {}
function capture(value: Environment | null = null): boolean {
    if (!(value instanceof Environment) && value !== null) throw new Error('invalid environment');
    return value !== null;
}
console.log(capture(new Environment()), capture());
