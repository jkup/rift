type Completion = { type: "normal"; value: number };
type Callback = (receiver: number, args: number[], context: number, loc: number) => Completion;
function invoke(callback: Callback): Completion {
    return callback(0, [], 0, 0);
}
invoke((_receiver, _args, _context, _loc): Completion => {
    throw new Error("unreachable hook");
});
