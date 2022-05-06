import { IAccountBalance, IAddress } from "./interface";

export interface INetworkProvider {
    getNetworkConfig(): Promise<INetworkConfig>;
    getAccount(address: IAddress): Promise<IAccountOnNetwork>;
    getTransaction(txHash: string): Promise<ITransactionOnNetwork>;
    sendTransaction(tx: ITransaction): Promise<string>;
    queryContract(query: IContractQuery): Promise<IContractQueryResponse>;
}

export interface ITransaction {
    toSendable(): any;
}

export interface IContractQuery {
    address: IAddress;
    caller?: IAddress;
    func: { toString(): string; };
    value?: { toString(): string; };
    getEncodedArguments(): string[];
}

export interface INetworkConfig {
    ChainID: string;
    GasPerDataByte: number;
    MinGasLimit: number;
    MinGasPrice: number;
}

export interface IAccountOnNetwork {
    address: IAddress;
    nonce: number;
    balance: IAccountBalance;
    userName: string;
}


export interface ITransactionOnNetwork {
    isCompleted: boolean;
    
    hash: string;
    type: string;
    value: string;
    receiver: IAddress;
    sender: IAddress;
    data: Buffer;
    status: ITransactionStatus;
    receipt: ITransactionReceipt;
    contractResults: IContractResults;
    logs: ITransactionLogs;
}

export interface ITransactionStatus {
    isPending(): boolean;
    isFailed(): boolean;
    isInvalid(): boolean;
    isExecuted(): boolean;
}

export interface ITransactionReceipt {
    data: string;
}

export interface IContractResults {
    items: IContractResultItem[];
}

export interface IContractResultItem {
    hash: string;
    nonce: number;
    receiver: IAddress;
    sender: IAddress;
    data: string;
    returnMessage: string;
    logs: ITransactionLogs;
}

export interface IContractQueryResponse {
    returnCode: IContractReturnCode;
    returnMessage: string;
    getReturnDataParts(): Buffer[];
}

export interface IContractReturnCode {
    toString(): string;
}

export interface ITransactionLogs {
    events: ITransactionEvent[];

    findSingleOrNoneEvent(identifier: string, predicate?: (event: ITransactionEvent) => boolean): ITransactionEvent | undefined;
    findFirstOrNoneEvent(identifier: string, predicate?: (event: ITransactionEvent) => boolean): ITransactionEvent | undefined;
    findEvents(identifier: string, predicate?: (event: ITransactionEvent) => boolean): ITransactionEvent[];
}

export interface ITransactionEvent {
    readonly address: IAddress;
    readonly identifier: string;
    readonly topics: ITransactionEventTopic[];
    readonly data: string;

    findFirstOrNoneTopic(predicate: (topic: ITransactionEventTopic) => boolean): ITransactionEventTopic | undefined;
    getLastTopic(): ITransactionEventTopic;
}

export interface ITransactionEventTopic {
    toString(): string;
    hex(): string;
}
