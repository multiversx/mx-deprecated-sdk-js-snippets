import { IAddress, IEventLog, IStorage } from "./interface";

export class EventLog implements IEventLog {
    private readonly storage: IStorage;

    constructor(storage: IStorage) {
        this.storage = storage;
    }

    onContractDeploymentSent(_contractAddress: IAddress): void {
        throw new Error("Method not implemented.");
    }

    onTransactionSent(): void {
        throw new Error("Method not implemented.");
    }

    onTransactionCompleted(): void {
        throw new Error("Method not implemented.");
    }
    
    onContractOutcomeParsed(): void {
        throw new Error("Method not implemented.");
    }
}
