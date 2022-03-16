import * as fs from "fs";
import { Connection, createConnection } from "typeorm";
import { IAccountSnapshotWithinStorage, IInteractionWithinStorage, IReferenceOfInteractionWithinStorage, IStorage } from "../interfaces";
import { AccountSnapshotRecord, BreadcrumbRecord, InteractionRecord, ReferenceOfInteractionWithinStorage } from "./records";

export class Storage implements IStorage {
    private readonly file: string;
    private readonly connection: Connection;

    private static connections: Map<string, Connection> = new Map();

    constructor(file: string, connection: Connection) {
        this.file = file;
        this.connection = connection;
    }

    static async create(file: string): Promise<Storage> {
        let exists = fs.existsSync(file);
        let synchronize = !exists;

        if (Storage.connections.has(file)) {
            let connection = Storage.connections.get(file);
            return new Storage(file, connection!);
        }

        let connection = await createConnection({
            type: "better-sqlite3",
            database: file,
            name: file,
            entities: [BreadcrumbRecord, InteractionRecord, AccountSnapshotRecord],
            logging: false,
            synchronize: synchronize
        });

        Storage.connections.set(file, connection);
        return new Storage(file, connection);
    }

    async destroy() {
        await this.connection.dropDatabase();
        await this.connection.close();
        await fs.promises.unlink(this.file);
    }

    async storeBreadcrumb(scope: string, type: string, name: string, payload: any): Promise<void> {
        let record = await this.connection.manager.findOne(BreadcrumbRecord, { scope: scope, name: name });

        if (!record) {
            record = new BreadcrumbRecord();
            record.scope = scope;
            record.type = type;
            record.name = name;
        }

        record.payload = this.serializeItem(payload);

        await this.connection.manager.save(record);
    }

    async loadBreadcrumb(scope: string, name: string): Promise<any> {
        let record = await this.connection.manager.findOne(BreadcrumbRecord, { scope: scope, name: name });
        let payload = this.deserializeItem(record!.payload);
        return payload;
    }

    async loadBreadcrumbsByType(scope: string, type: string): Promise<any[]> {
        let records: BreadcrumbRecord[] = await this.connection.manager.find(BreadcrumbRecord, { scope: scope, type: type });
        let payloads = records.map(record => this.deserializeItem(record.payload));
        return payloads;
    }

    async storeInteraction(scope: string, interaction: IInteractionWithinStorage): Promise<IReferenceOfInteractionWithinStorage> {
        let record = new InteractionRecord();
        record.scope = scope;
        record.action = interaction.action;
        record.user = interaction.userAddress.bech32();
        record.contract = interaction.contractAddress.bech32();
        record.transaction = interaction.transactionHash.toString();
        record.timestamp = interaction.timestamp;
        record.round = interaction.round;
        record.epoch = interaction.epoch;
        record.blockNonce = interaction.blockNonce.valueOf();
        record.hyperblockNonce = interaction.hyperblockNonce.valueOf();
        record.input = this.serializeItem(interaction.input);
        record.transfers = this.serializeItem(interaction.transfers);
        record.output = this.serializeItem(interaction.output);

        let result = await this.connection.manager.insert(InteractionRecord, record);
        let reference = new ReferenceOfInteractionWithinStorage(result.raw);
        return reference;
    }

    async updateInteractionSetOutput(reference: IReferenceOfInteractionWithinStorage, output: any) {
        let interactionId = (<ReferenceOfInteractionWithinStorage>reference).id;
        let outputJson = JSON.stringify(output);
        await this.connection.manager.update(InteractionRecord, interactionId, { output: outputJson });
    }

    async storeAccountSnapshot(scope: string, snapshot: IAccountSnapshotWithinStorage): Promise<void> {
        let record = new AccountSnapshotRecord();
        record.scope = scope;
        record.timestamp = snapshot.timestamp;
        record.address = snapshot.address.bech32();
        record.nonce = snapshot.nonce.valueOf();
        record.balance = snapshot.balance.toString();
        record.tokens = this.serializeItem(snapshot.tokens);

        if (snapshot.takenBeforeInteraction) {
            record.takenBeforeInteraction = (<ReferenceOfInteractionWithinStorage>snapshot.takenBeforeInteraction).getRecord();
        }
        if (snapshot.takenAfterInteraction) {
            record.takenAfterInteraction = (<ReferenceOfInteractionWithinStorage>snapshot.takenAfterInteraction).getRecord();
        }

        await this.connection.manager.insert(AccountSnapshotRecord, record);
    }

    private serializeItem(item: any) {
        return JSON.stringify(item || {}, null, 4);
    }

    private deserializeItem(json: string) {
        return JSON.parse(json);
    }
}
