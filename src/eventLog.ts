import { IAddress, IEventLog, IHash, IStorage } from "./interface";

enum EventKind {
    TransactionSent = "TransactionSent",
    ContractDeploymentSent = "ContractDeploymentSent",
    TransactionCompleted = "TransactionCompleted",
    ContractOutcomeParsed = "ContractOutcomeParsed"
}

export class EventLog implements IEventLog {
    private readonly scope: string;
    private readonly storage: IStorage;

    constructor(scope: string, storage: IStorage) {
        this.scope = scope;
        this.storage = storage;
    }

    async onContractDeploymentSent(transactionHash: IHash, contractAddress: IAddress): Promise<void> {
        const transaction = transactionHash.toString();
        const address = contractAddress.bech32();

        await this.storage.logEvent(this.scope, {
            kind: EventKind.ContractDeploymentSent,
            summary: `deployment transaction sent, transaction = ${transaction}, contract = ${address}`,
            payload: {
                transaction: transaction,
                address: address
            }
        });
    }

    async onTransactionSent(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async onTransactionCompleted(transactionHash: IHash, payload: any): Promise<void> {
        await this.storage.logEvent(this.scope, {
            kind: EventKind.TransactionCompleted,
            summary: `transaction completed, transaction = ${transactionHash.toString()}`,
            payload: payload.toJSON()
        });
    }
    
    async onContractOutcomeParsed(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
