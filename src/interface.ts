import BigNumber from "bignumber.js";
import { INetworkConfig, INetworkProvider } from "./interfaceOfNetwork";
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
    saveAddress(params: { name: string, address: IAddress }): Promise<void>;
    loadAddress(name: string): Promise<IAddress>;
    saveToken(params: { name: string, token: IToken }): Promise<void>;
    loadToken(name: string): Promise<IToken>;
    saveBreadcrumb(params: { type?: string, name: string, value: any }): Promise<void>;
    loadBreadcrumb(name: string): Promise<any>;
    loadBreadcrumbsByType(type: string): Promise<any[]>;
    destroy(): Promise<void>;
}

export interface ICorrelationHolder {
    step: string;
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

export interface IStorage {
    storeBreadcrumb(record: IBreadcrumbRecord): void;
    loadBreadcrumb(name: string): IBreadcrumbRecord;
    loadBreadcrumbs(): IBreadcrumbRecord[];
    loadBreadcrumbsByType(type: string): IBreadcrumbRecord[];
    storeAuditEntry(record: IAuditEntryRecord): void;
    save(): Promise<void>;
    destroy(): Promise<void>;
}

interface IBreadcrumbRecord {
    id: number;
    correlationStep: string;
    correlationTag: string;
    type: string;
    name: string;
    payload: any;
}

interface IAuditEntryRecord {
    id: number;
    correlationStep: string;
    correlationTag: string;
    summary: string;
    payload: any;
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
    addEntry(summary: string, payload: any): Promise<void>;
}
