import { parse } from '../../../build/node/src/parser.js';
for (const source of ["1 'in' {};", "let in = 1;", "function f(in) {}", "in o;", "'x' in;", "('x' in o) = true;", "for;", "x instanceof o;", "(".repeat(127)+"k in o"+")".repeat(127)+";"]) {
 console.log(source, JSON.stringify(parse(source).error));
}
