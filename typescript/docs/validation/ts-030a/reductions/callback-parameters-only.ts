type Callback = (receiver: number, args: number[], context: number, location: number) => number;
function invoke(callback: Callback): number { return callback(0, [3], 0, 0); }
console.log(invoke((_receiver, args, _context, _location) => args[0]));
