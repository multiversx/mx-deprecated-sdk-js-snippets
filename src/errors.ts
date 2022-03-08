
export class Err extends Error {
    inner: Error | undefined = undefined;

    public constructor(message: string, inner?: Error) {
        super(message);
        this.inner = inner;
    }

    /**
     * Returns a pretty, friendly summary for the error or for the chain of errros (if appropriate).
     */
    summary(): any[] {
        let result = [];

        result.push({ name: this.name, message: this.message });

        let inner: any = this.inner;
        while (inner) {
            result.push({ name: inner.name, message: inner.message });
            inner = inner.inner;
        }

        return result;
    }
}

export class ErrBadWorkspace extends Err {
    public constructor(workspace: string) {
        super(`Bad workspace: ${workspace}`);
    }
}

export class ErrBadWorkspaceConfig extends Err {
    public constructor(workspace: string, message: string) {
        super(`Bad workspace config for ${workspace}: ${message}`);
    }
}

export class ErrBadSessionConfig extends Err {
    public constructor(session: string, message: string) {
        super(`Bad session config for ${session}: ${message}`);
    }
}

export class ErrNotImplemented extends Err {
    public constructor(message: string) {
        super(`Not implemented: ${message}`);
    }
}
