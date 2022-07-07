
export class Err extends Error {
    inner: Error | undefined = undefined;

    public constructor(message: string, inner?: Error) {
        super(message);
        this.inner = inner;
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

export class ErrBadArgument extends Err {
    public constructor(message: string) {
        super(`Bad argument: ${message}`);
    }
}

export class ErrMissingUserOrGroup extends Err {
    public constructor(name: string) {
        super(`Missing user or group: ${name}`);
    }
}

export class ErrNumRetriesExceeded extends Err {
    public constructor() {
        super(`Number of retries exceeded.`);
    }
}

export class ErrBreadcrumbNotFound extends Err {
    public constructor(breadcrumb: string) {
        super(`Breadcrumb not found: ${breadcrumb}`);
    }
}

export class ErrMissingNodeOrGroupOfNodes extends Err {
    public constructor(name: string) {
        super(`Missing node or groupOfNodes: ${name}`);
    }
}

export class ErrEventOccurance extends Err {
    public constructor(name: string) {
        super(`${name} event did not occur.`);
    }
}

export class ErrNoToken extends Err {
    public constructor(name: string) {
        super(`${name} was not issued/registered.`);
    }
}

export class ErrNoNFT extends Err {
    public constructor(name: string) {
        super(`${name} was not created.`);
    }
}

export class ErrNumberOfNodesMismatch extends Err {
    public constructor() {
        super(`numberOfNodes param does not match calculated number of nodes.`);
    }
}
