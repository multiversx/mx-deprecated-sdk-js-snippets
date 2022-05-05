import BigNumber from "bignumber.js";
import { Account, IAccountBalance, IAddress, TransactionHash } from "@elrondnetwork/erdjs";
import { NetworkConfig } from "@elrondnetwork/erdjs-network-providers";
import { INetworkProvider } from "./interfaceOfNetwork";
import { ISigner } from "./interfaceOfWalletCore";

export interface ITestSessionConfig {
    readonly networkProvider: INetworkProviderConfig;
    readonly users: IUsersConfig;
}

export interface INetworkProviderConfig {
    readonly type: string;
    readonly url: string;
    readonly timeout?: number;
}

export interface IUsersConfig {
    readonly individuals: IUserConfig[];
    readonly groups: IGroupOfUsersConfig[];
}

export interface IUserConfig {
    readonly name: string;
    readonly pem: string;
}

export interface IGroupOfUsersConfig {
    readonly name: string;
    readonly pem?: string;
    readonly folder?: string;
}

export interface ITestSession {
    readonly name: string;
    readonly scope: string;
    readonly networkProvider: INetworkProvider;
    readonly storage: IStorage;
    readonly users: IBunchOfUsers;

    syncNetworkConfig(): Promise<void>;
    getNetworkConfig(): NetworkConfig;
    syncUsers(users: ITestUser[]): Promise<void>;

    saveAddress(name: string, address: IAddress): Promise<void>;
    loadAddress(name: string): Promise<IAddress>;

    saveToken(name: string, token: IToken): Promise<void>;
    loadToken(name: string): Promise<IToken>;

    saveBreadcrumb(params: { type?: string, name: string, value: any }): Promise<void>;
    loadBreadcrumb(name: string): Promise<any>;
    loadBreadcrumbsByType(type: string): Promise<any[]>;

    destroy(): Promise<void>;
}

export interface IMochaSuite {
    file?: string | undefined;
    fullTitle(): string;
}

export interface IUsersConfig {
    readonly whalePem: string;
    readonly othersPem: string;
}

export interface IBunchOfUsers {
    getUser(name: string): ITestUser;
    getGroup(name: string): ITestUser[];
}

export interface ITestUser {
    readonly name: string;
    readonly group: string;
    readonly address: IAddress;
    readonly account: Account;
    readonly signer: ISigner;

    sync(provider: INetworkProvider): Promise<void>;
}

/**
 * [Design] For the moment, the storage interface holds all functions necessary to store / load records.
 * The functions are not grouped "by entity" ("by record type") at this point - 
 * that is, the interface isn't segregated into more, smaller interfaces yet (for simplicity).
 * It will be split once it grows a little bit more.
 * 
 * [Design] {@link IStorage} depends on `I{name of record}WithinStorage` interfaces.
 * That is, it does not depend on complex (and somehow unstable) types of erdjs, such as: Interaction, TransactionOnNetwork etc.
 * Though, it depends on simple (and quite stable) types of erdjs, such as: Address, TransactionHash etc.
 */
export interface IStorage {
    storeBreadcrumb(scope: string, type: string, name: string, payload: any): Promise<void>;
    loadBreadcrumb(scope: string, name: string): Promise<any>;
    loadBreadcrumbsByType(scope: string, type: string): Promise<any[]>;
    storeInteraction(scope: string, interaction: IInteractionWithinStorage): Promise<number>;
    updateInteractionSetOutput(id: number, output: any): Promise<void>;
    storeAccountSnapshot(scope: string, snapshot: IAccountSnapshotWithinStorage): Promise<void>;
    destroy(): Promise<void>;
}

export interface IInteractionWithinStorage {
    action: string;
    userAddress: IAddress;
    contractAddress: IAddress;
    transactionHash: TransactionHash;
    timestamp: string;
    round: number;
    epoch: number;
    blockNonce: number;
    hyperblockNonce: number;
    input: any;
    transfers: any;
    output: any;
}

export interface IAccountSnapshotWithinStorage {
    timestamp: string;
    address: IAddress;
    nonce: number;
    balance: IAccountBalance;
    tokens: any;
    takenBeforeInteraction?: number;
    takenAfterInteraction?: number;
}

export interface IToken { identifier: string, decimals: number; }

export interface ITokenPayment {
    readonly tokenIdentifier: string;
    readonly nonce: number;
    readonly amountAsBigInteger: BigNumber.Value;
    isEgld(): boolean;
    isFungible(): boolean;
    valueOf(): BigNumber.Value;
}
