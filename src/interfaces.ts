import { Account, Address, Balance, IProvider, ISigner, Nonce, Token, TokenOfAccountOnNetwork, TransactionHash } from "@elrondnetwork/erdjs";

export interface ITestSessionConfig {
    readonly providerUrl: string;
    readonly whalePem: string;
    readonly othersPem: string;
}

export interface ITestSession {
    readonly name: string;
    readonly scope: string;
    readonly provider: IProvider;
    readonly storage: IStorage;
    readonly users: IBunchOfUsers;

    expectLongInteraction(mochaTest: IMochaTest, minutes?: number): void;
    syncNetworkConfig(): Promise<void>;
    syncWhale(): Promise<void>;
    syncAllUsers(): Promise<void>;
    syncUsers(users: ITestUser[]): Promise<void>;

    saveAddress(name: string, address: Address): Promise<void>;
    loadAddress(name: string): Promise<Address>;

    saveToken(name: string, token: Token): Promise<void>;
    loadToken(name: string): Promise<Token>;
    getTokensOnFocus(): Promise<Token[]>;
}

export interface IMochaSuite {
    file?: string | undefined;
    fullTitle(): string;
}

export interface IMochaTest {
    timeout(ms: string | number): void;
}

export interface IUsersConfig {
    readonly whalePem: string;
    readonly othersPem: string;
}

export interface IBunchOfUsers {
    readonly whale: ITestUser;

    readonly alice: ITestUser;
    readonly bob: ITestUser;
    readonly carol: ITestUser;
    readonly dan: ITestUser;
    readonly eve: ITestUser;
    readonly frank: ITestUser;
    readonly grace: ITestUser;
    readonly heidi: ITestUser;
    readonly ivan: ITestUser;
    readonly judy: ITestUser;
    readonly mallory: ITestUser;
    readonly mike: ITestUser;

    getFriends(): ITestUser[];
    getOthers(): ITestUser[];
    getAll(): ITestUser[];
    getAllExcept(some: ITestUser[]): ITestUser[];

    getAddressesOfFriends(): Address[];
    getAddressesOfOthers(): Address[];
    getAddressesOfAll(): Address[];
    getAddressesOfAllExcept(some: ITestUser[]): Address[];
}

export interface ITestUser {
    readonly address: Address;
    readonly account: Account;
    readonly signer: ISigner;
    readonly accountTokens: TokenOfAccountOnNetwork[];

    sync(provider: IProvider): Promise<void>;
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
