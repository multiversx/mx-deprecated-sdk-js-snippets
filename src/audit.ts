import { IAudit, ICorrelationHolder, IStorage } from "./interface";


export class Audit implements IAudit {
    private readonly storage: IStorage;
    private readonly correlation: ICorrelationHolder;

    constructor(params: {
        storage: IStorage,
        correlation: ICorrelationHolder,
    }) {
        this.storage = params.storage;
        this.correlation = params.correlation;
    }

    async addEntry(summary: string, payload: any): Promise<void> {
        await this.storage.storeAuditEntry({
            id: 0,
            correlationStep: this.correlation.step,
            correlationTag: this.correlation.tag,
            summary: summary,
            payload: payload,
        });
    }
}
