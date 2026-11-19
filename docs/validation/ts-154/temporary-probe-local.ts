type Site = { name: string; loc: { line: number; column: number } };
type Candidate = { first: Site; second: Site };
class Collector {
    pairs(): { candidates: Candidate[] } {
        const candidates: Candidate[] = [];
        for (let i = 0; i < 10; i++) candidates.push({ first: {name: 'first'+i,loc:{line:1,column:2}}, second: {name:'second'+i,loc:{line:3,column:4}} });
        return { candidates };
    }
    inspect(): string {
        const pairs = this.pairs();
        const duplicate = pairs.candidates[0];
        return duplicate.second.name + ':' + duplicate.second.loc.column;
    }
}
for(let i=0;i<100;i++) if(new Collector().inspect()!=='second0:4') throw new Error('temporary result');
console.log('temporary passed');
