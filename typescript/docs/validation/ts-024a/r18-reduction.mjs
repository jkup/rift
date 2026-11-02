import { parse } from '../../../build/node/src/parser.js';
for (const operator of ['==', '===']) {
    const source = '('.repeat(129) + '1 ' + operator + ' 1' + ')'.repeat(129) + ';';
    console.log(operator, JSON.stringify(parse(source).error));
}
