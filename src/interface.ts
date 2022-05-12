import BigNumber from "bignumber.js";
import { INetworkConfig, INetworkProvider, ITransactionOnNetwork } from "./interfaceOfNetwork";
import { ISigner } from "./interfaceOfWalletCore";

export interface ITestSessionConfig {
    readonly networkProvider: INetworkProviderConfig;
    readonly users: IUsersConfig;
    readonly reporting: IReportingConfig;
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

export interface IReportingConfig {
    explorerUrl: string;
    apiUrl: string;
    outputFolder: string;
}

export interface ISecretKeysGeneratorConfig {
    readonly mnemonic: string;
    readonly individuals: IGeneratedUserConfig[];
    readonly groups: IGeneratedGroupOfUsersConfig[];
}

export interface IGeneratedUserConfig {
    readonly name: string;
    readonly shard?: number;
    readonly pem: string;
}

export interface IGeneratedGroupOfUsersConfig {
    readonly name: string;
    readonly size: number;
    readonly shard?: number;
    readonly pem: string;
}

export interface ITestSession {
    readonly name: string;
    readonly correlation: ICorrelationHolder;
    readonly networkProvider: INetworkProvider;
    readonly storage: IStorage;
    readonly users: IBunchOfUsers;
    readonly audit: IAudit;

    syncNetworkConfig(): Promise<void>;
    getNetworkConfig(): INetworkConfig;
    syncUsers(users: ITestUser[]): Promise<void>;
    saveAddress(name: string, address: IAddress): Promise<void>;
    loadAddress(name: string): Promise<IAddress>;
    saveToken(name: string, token: IToken): Promise<void>;
    loadToken(name: string): Promise<IToken>;
    saveBreadcrumb(params: { type?: string, name: string, value: any }): Promise<void>;
    loadBreadcrumb(name: string): Promise<any>;
    loadBreadcrumbsByType(type: string): Promise<any[]>;
    generateReport(tag?: string): Promise<void>;
    destroy(): Promise<void>;
}

export interface ICorrelationHolder {
    tag: string;
}

export interface IBunchOfUsers {
    getUser(name: string): ITestUser;
    getGroup(name: string): ITestUser[];
}

export interface ITestUser {
    readonly name: string;
    readonly group: string;
    readonly address: IAddress;
    readonly account: IAccount;
    readonly signer: ISigner;

    sync(provider: INetworkProvider): Promise<void>;
}

/**
 * [Design] For the moment, the storage interface holds all functions necessary to store / load records.
 * The functions are not grouped "by entity" ("by record type") at this point - 
 * that is, the interface isn't segregated into more, smaller interfaces yet (for simplicity).
 * It will be split once it grows a little bit more.
 */
export interface IStorage {
    storeBreadcrumb(record: IBreadcrumbRecord): Promise<void>;
    loadBreadcrumb(name: string): Promise<IBreadcrumbRecord>;
    loadBreadcrumbs(): Promise<IBreadcrumbRecord[]>;
    loadBreadcrumbsByType(type: string): Promise<IBreadcrumbRecord[]>;
    storeEvent(record: IAuditRecord): Promise<number>;
    loadEvents(): Promise<IAuditRecord[]>;
    destroy(): Promise<void>;
}

export interface IBreadcrumbRecord {
    id: number;
    correlationTag: string;
    type: string;
    name: string;
    payload: any;
}

export interface IAuditRecord {
    id: number;
    correlationTag: string;
    event: string;
    summary: string;
    payload: any;
    comparableTo?: number;
}

export interface IAccount {
    readonly address: IAddress;
    readonly nonce: INonce;
    readonly balance: IAccountBalance;
    update(obj: { nonce: INonce; balance: IAccountBalance; }): void;
    incrementNonce(): void;
    getNonceThenIncrement(): INonce;
}

export interface INonce { valueOf(): number; }
export interface IAddress { bech32(): string; }
export interface IHash { toString(): string; }
export interface IAccountBalance { toString(): string; }
export interface IToken { identifier: string, decimals: number; }
export interface IReturnCode { toString(): string; }

export interface ITokenPayment {
    readonly tokenIdentifier: string;
    readonly nonce: number;
    readonly amountAsBigInteger: BigNumber.Value;
    isEgld(): boolean;
    isFungible(): boolean;
    valueOf(): BigNumber.Value;
}

export interface IAudit {
    onContractDeploymentSent(transactionHash: IHash, contractAddress: IAddress): Promise<void>;
    onTransactionSent(transactionHash: IHash): Promise<void>;
    onTransactionCompleted(transactionHash: IHash, transactionOnNetwork: ITransactionOnNetwork): Promise<void>;
    onContractOutcome(params: { returnCode?: IReturnCode, returnMessage?: string, values?: any[] }): Promise<void>
    onSnapshot(params: { state: any, summary?: string, comparableTo?: number }): Promise<number>;
    
    emitSnapshotOfUsers(params: { users: ITestUser[], comparableTo?: number }): Promise<number>;
    emitSnapshotOfAccounts(params: { addresses: IAddress[], comparableTo?: number }): Promise<number>;
}
