import { IAudit, IStorage } from "./interface";


export class Audit implements IAudit {
    private readonly storage: IStorage;

    constructor(params: {
        storage: IStorage,
    }) {
        this.storage = params.storage;
    }

    async addEntry(summary: string, payload: any): Promise<void> {
        await this.storage.storeAuditEntry({
            id: 0,
            summary: summary,
            payload: payload,
        });
    }
}
