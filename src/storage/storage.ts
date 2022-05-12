import * as fs from "fs";
import * as sql from "./sql";
import DatabaseConstructor, { Database } from "better-sqlite3";
import { IBreadcrumbRecord, IAuditEntryRecord, IStorage } from "../interface";
import { ErrBreadcrumbNotFound } from "../errors";

export class Storage implements IStorage {
    private readonly file: string;
    private readonly db: Database;

    constructor(file: string, connection: Database) {
        this.file = file;
        this.db = connection;
    }

    static async create(file: string): Promise<Storage> {
        let shouldCreateSchema = !fs.existsSync(file);
        let db = new DatabaseConstructor(file, {});

        if (shouldCreateSchema) {
            db.prepare(sql.Breadcrumb.CreateTable).run();
            db.prepare(sql.Audit.CreateTable).run();
        }

        return new Storage(file, db);
    }

    async destroy() {
        this.db.close();
        await fs.promises.unlink(this.file);
    }

    async storeBreadcrumb(record: IBreadcrumbRecord): Promise<number> {
        const serializedPayload = this.serializeItem(record.payload);
        const find = this.db.prepare(sql.Breadcrumb.GetByName);
        const insert = this.db.prepare(sql.Breadcrumb.Insert);
        const delete_ = this.db.prepare(sql.Breadcrumb.Delete);
        const existingRow = find.get({ name: record.name });

        if (existingRow) {
            delete_.run({ id: existingRow.id });
        }

        const result = insert.run({
            correlationStep: record.correlationStep,
            correlationTag: record.correlationTag,
            type: record.type,
            name: record.name,
            payload: serializedPayload
        });

        const id = Number(result.lastInsertRowid);
        record.id = id;
        return id;
    }

    async loadBreadcrumb(name: string): Promise<IBreadcrumbRecord> {
        const find = this.db.prepare(sql.Breadcrumb.GetByName);
        const row = find.get({ name: name });

        if (!row) {
            throw new ErrBreadcrumbNotFound(name);
        }

        const record = this.hydrateBreadcrumb(row);
        return record;
    }

    private hydrateBreadcrumb(row: any): IBreadcrumbRecord {
        return {
            id: row.id,
            correlationStep: row.correlation_step,
            correlationTag: row.correlation_tag,
            name: row.name,
            type: row.type,
            payload: this.deserializeItem(row.payload)
        };
    }

    async loadBreadcrumbs(): Promise<IBreadcrumbRecord[]> {
        const find = this.db.prepare(sql.Breadcrumb.GetAll);
        const rows = find.all();
        const records = rows.map(row => this.hydrateBreadcrumb(row));
        return records;
    }

    async loadBreadcrumbsByType(type: string): Promise<IBreadcrumbRecord[]> {
        const find = this.db.prepare(sql.Breadcrumb.GetByType);
        const rows = find.all({ type: type });
        const records = rows.map(row => this.hydrateBreadcrumb(row));
        return records;
    }

    async storeAuditEntry(record: IAuditEntryRecord): Promise<number> {
        const row: any = {
            correlationStep: record.correlationStep,
            correlationTag: record.correlationTag,
            event: record.event,
            summary: record.summary,
            payload: this.serializeItem(record.payload),
            comparableTo: record.comparableTo
        }

        const insert = this.db.prepare(sql.Audit.Insert);
        const result = insert.run(row);
        const id = Number(result.lastInsertRowid);
        record.id = id;
        return id;
    }

    async loadAuditEntries(): Promise<IAuditEntryRecord[]> {
        const find = this.db.prepare(sql.Audit.GetAll);
        const rows = find.all();
        const records = rows.map(row => this.hydrateAuditEntry(row));
        return records;
    }

    private hydrateAuditEntry(row: any): IAuditEntryRecord {
        return {
            id: row.id,
            correlationStep: row.correlation_step,
            correlationTag: row.correlation_tag,
            event: row.event,
            summary: row.summary,
            payload: this.deserializeItem(row.payload),
            comparableTo: row.comparable_to
        };
    }

    private serializeItem(item: any) {
        return JSON.stringify(item || {}, null, 4);
    }

    private deserializeItem(json: string) {
        return JSON.parse(json);
    }
}
