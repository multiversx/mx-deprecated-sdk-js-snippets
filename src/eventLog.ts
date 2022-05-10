import { IAddress, IEventLog, IHash, IStorage } from "./interface";
import { ITransactionOnNetwork } from "./interfaceOfNetwork";
import { prettifyObject } from "./pretty";

enum EventKind {
    TransactionSent = "TransactionSent",
    ContractDeploymentSent = "ContractDeploymentSent",
    TransactionCompleted = "TransactionCompleted",
    ContractOutcomeParsed = "ContractOutcomeParsed"
}

export class EventLog implements IEventLog {
    private readonly storage: IStorage;

    constructor(storage: IStorage) {
        this.storage = storage;
    }

    async onContractDeploymentSent(transactionHash: IHash, contractAddress: IAddress): Promise<void> {
        const transaction = transactionHash.toString();
        const address = contractAddress.bech32();

        await this.storage.logEvent({
            kind: EventKind.ContractDeploymentSent,
            summary: `deployment transaction sent, transaction = ${transaction}, contract = ${address}`,
            payload: {
                transaction: transaction,
                address: address
            }
        });
    }

    async onTransactionSent(transactionHash: IHash): Promise<void> {
        await this.storage.logEvent({
            kind: EventKind.TransactionSent,
            summary: `transaction sent, transaction = ${transactionHash}`,
            payload: {
                transaction: transactionHash,
            }
        });
    }

    async onTransactionCompleted(transactionHash: IHash, transactionOnNetwork: ITransactionOnNetwork): Promise<void> {
        const prettyTransaction = prettifyObject(transactionOnNetwork);

        await this.storage.logEvent({
            kind: EventKind.TransactionCompleted,
            summary: `transaction completed, transaction = ${transactionHash.toString()}`,
            payload: prettyTransaction
        });
    }
}
