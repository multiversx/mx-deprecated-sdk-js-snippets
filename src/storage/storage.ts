import * as fs from "fs";
import * as sql from "./sql";
import { IBreadcrumbRecord, IAuditEntryRecord, IStorage } from "../interface";
import { ErrBreadcrumbNotFound } from "../errors";

export class Storage implements IStorage {
    private readonly path: string;
    private readonly auditsPath: string;
    private readonly breadcrumbsPath: string;

    constructor(path: string) {
        this.path = path;
        this.auditsPath = `${path}/audits.json`;
        this.breadcrumbsPath = `${path}/breadcrumbs.json`;
    }

    static async create(path: string): Promise<IStorage> {
        const shouldCreate = !fs.existsSync(path);
        if (shouldCreate) {
            await fs.promises.mkdir(path, { recursive: true });
        }

        return new Storage(path);
    }

    async destroy() {
        await fs.promises.rmdir(this.path, { recursive: true });
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
        const breadcrumbs = await this.loadBreadcrumbs();
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
        const content = await fs.promises.readFile(this.breadcrumbsPath, "utf8");
        const records = JSON.parse(content) as any[];
        const breadcrumbs = records.map(record => this.hydrateBreadcrumb(record));
        return breadcrumbs;
    }

    async loadBreadcrumbsByType(type: string): Promise<IBreadcrumbRecord[]> {
        const breadcrumbs = await this.loadBreadcrumbs();
        const filtered = breadcrumbs.filter(breadcrumb => breadcrumb.type === type);
        return filtered;
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
        const content = await fs.promises.readFile(this.auditsPath, "utf8");
        const records = JSON.parse(content) as any[];
        const auditEntries = records.map(record => this.hydrateAuditEntry(record));
        return auditEntries;
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


