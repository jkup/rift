export class PrivateName {
    constructor(readonly description: string) {}
}

export class PrivateEnvironment {
    private readonly names = new Map<string, PrivateName>();
    constructor(readonly outer: PrivateEnvironment | null = null) {}
    declare(description: string): PrivateName {
        if (this.names.has(description)) throw new Error("duplicate private name declaration");
        const name = new PrivateName(description);
        this.names.set(description, name);
        return name;
    }
    ownName(description: string): PrivateName | undefined { return this.names.get(description); }
    ownNames(): string[] { return Array.from(this.names.keys()); }
}
