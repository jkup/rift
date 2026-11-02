type Callback = (receiver: number, args: number[], context: number, location: number) => number;
function invoke(callback: Callback): number { return callback(0, [3], 0, 0); }
console.log(invoke((_receiver: number, args: number[], _context: number, _location: number): number => args[0]));
