import { Account, Address, Balance, IProvider, ISigner, Nonce, Token, TokenOfAccountOnNetwork, TransactionHash } from "@elrondnetwork/erdjs";

export interface IWorkspaceConfig {
    readonly proxyUrl: string;
    readonly session: string;
}

export interface ITestSessionConfig {
    readonly whalePem: string;
    readonly accountsPem: string;
}

export interface IUser {
    readonly address: Address;
    readonly account: Account;
    readonly signer: ISigner;
    readonly accountTokens: TokenOfAccountOnNetwork[];

    sync(proxy: IProvider): Promise<void>;
}

export interface ITestSession {
    readonly name: string;
    readonly scope: string;
    readonly proxy: IProvider;
    readonly storage: IStorage;
    readonly whale: IUser;
    readonly users: IUser[];

    syncNetworkConfig(): Promise<void>;
    syncWhale(): Promise<void>;
    syncUsers(): Promise<void>;

    saveAddress(name: string, address: Address): Promise<void>;
    loadAddress(name: string): Promise<Address>;

    saveToken(name: string, token: Token): Promise<void>;
    loadToken(name: string): Promise<Token>;
    getTokensOnFocus(): Promise<Token[]>;
}

/**
 * [Design] For the moment, the storage interface holds all functions necessary to store / load records.
 * The functions are not grouped "by entity" ("by record type") at this point - 
 * that is, the interface isn't segregated into more, smaller interfaces yet (for simplicity).
 * It will be split once it grows a little bit more.
 * 
 * [Design] {@link IStorage} depends on `I{name of record}WithinStorage` interfaces.
 * That is, it does not depend on complex (and somehow unstable) types of erdjs, such as: Interaction, TransactionOnNetwork etc.
 * Though, it depends on simple (and quite stable) types of erdjs, such as: Address, Nonce, TransactionHash etc.
 * 
 * [Design] when necessary, references to record objects may be used as input / output to functions of {@link IStorage}.
 * They should be interfaces as well, e.g. `IReferenceOf{name of record}WithinStorage`
 * Details: in the implementation of storage, these references would usually be surrogate keys (numbers).
 */
export interface IStorage {
    storeBreadcrumb(scope: string, type: string, name: string, payload: any): Promise<void>;
    loadBreadcrumb(scope: string, name: string): Promise<any>;
    loadBreadcrumbsByType(scope: string, type: string): Promise<any[]>;
    storeInteraction(scope: string, interaction: IInteractionWithinStorage): Promise<IReferenceOfInteractionWithinStorage>;
    updateInteractionSetOutput(reference: IReferenceOfInteractionWithinStorage, output: any): Promise<void>;
    storeAccountSnapshot(scope: string, snapshot: IAccountSnapshotWithinStorage): Promise<void>;
}

export interface IInteractionWithinStorage {
    action: string;
    userAddress: Address;
    contractAddress: Address;
    transactionHash: TransactionHash;
    timestamp: string;
    round: number;
    epoch: number;
    blockNonce: Nonce;
    hyperblockNonce: Nonce;
    input: any;
    transfers: any;
    output: any;
}

export interface IReferenceOfInteractionWithinStorage { }

export interface IAccountSnapshotWithinStorage {
    timestamp: string;
    address: Address;
    nonce: Nonce;
    balance: Balance;
    tokens: any;
    takenBeforeInteraction?: IReferenceOfInteractionWithinStorage;
    takenAfterInteraction?: IReferenceOfInteractionWithinStorage;
}
