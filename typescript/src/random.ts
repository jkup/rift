export class RandomState {
    private x: number;
    private y: number;
    private z: number;
    private w: number;

    constructor(x: number, y: number, z: number, w: number) {
        this.x = x >>> 0;
        this.y = y >>> 0;
        this.z = z >>> 0;
        this.w = w >>> 0;
        if ((this.x | this.y | this.z | this.w) === 0) this.w = 1;
    }

    nextWord(): number {
        const product = Math.imul(this.y, 5);
        const result = Math.imul((product << 7) | (product >>> 25), 9);
        const shifted = this.y << 9;
        this.z ^= this.x;
        this.w ^= this.y;
        this.y ^= this.z;
        this.x ^= this.w;
        this.z ^= shifted;
        this.w = (this.w << 11) | (this.w >>> 21);
        return result >>> 0;
    }

    next(): number {
        const high = this.nextWord() >>> 5;
        const low = this.nextWord() >>> 6;
        return (high * 67108864 + low) / 9007199254740992;
    }
}

export function createRandomState(): RandomState {
    return new RandomState(Math.floor(Math.random() * 4294967296), Math.floor(Math.random() * 4294967296),
        Math.floor(Math.random() * 4294967296), Math.floor(Math.random() * 4294967296));
}
