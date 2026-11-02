class Box {}
class NumberBox extends Box {}
const box = new Box();
Object.setPrototypeOf(box, NumberBox.prototype);
console.log(box instanceof NumberBox);
