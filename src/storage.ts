import * as fs from "fs";

interface IBreadcrumbRecord {
    id: number;
    type: string;
    name: string;
    payload: any;
}

interface IAuditEntryRecord {
    id: number;
    summary: string;
    payload: any;
}

export class Storage {
    private readonly path: string;
    private readonly audit: Collection;
    private readonly breadcrumbs: Collection

    constructor(path: string, audits: Collection, breadcrumbs: Collection) {
        this.path = path;
        this.audit = audits;
        this.breadcrumbs = breadcrumbs;
    }

    static async create(path: string): Promise<Storage> {
        const auditsPath = `${path}/audits.json`;
        const breadcrumbsPath = `${path}/breadcrumbs.json`;

        const shouldCreate = !fs.existsSync(path);
        if (shouldCreate) {
            await fs.promises.mkdir(path, { recursive: true });

            const audits = new Collection(auditsPath, 1, []);
            const breadcrumbs = new Collection(breadcrumbsPath, 1, []);

            await audits.save();
            await breadcrumbs.save();
        }

        const audits = await Collection.load(auditsPath);
        const breadcrumbs = await Collection.load(breadcrumbsPath);
        return new Storage(path, audits, breadcrumbs);
    }

    async save() {
        await this.audit.save();
        await this.breadcrumbs.save();
    }

    async destroy() {
        await fs.promises.rmdir(this.path, { recursive: true });
    }

    storeBreadcrumb(breadcrumb: IBreadcrumbRecord) {
        const existingItem = this.breadcrumbs.find(item => item.name === breadcrumb.name);

        if (existingItem) {
            this.breadcrumbs.remove(existingItem);
        }

        this.breadcrumbs.insert(breadcrumb);
    }

    loadBreadcrumb(name: string): IBreadcrumbRecord {
        const item = this.breadcrumbs.find(item => item.name === name);
        if (!item) {
            throw new Error(`Breadcrumb not found: ${name}`);
        }

        const record = this.hydrateBreadcrumb(item);
        return record;
    }

    private hydrateBreadcrumb(item: any): IBreadcrumbRecord {
        return {
            id: item.id,
            name: item.name,
            type: item.type,
            payload: item.payload
        };
    }

    loadBreadcrumbs(): IBreadcrumbRecord[] {
        const items = this.breadcrumbs.getAll();
        const records = items.map(item => this.hydrateBreadcrumb(item));
        return records;
    }

    loadBreadcrumbsByType(type: string): IBreadcrumbRecord[] {
        const items = this.breadcrumbs.findMany(item => item.type === type);
        const breadcrumbs = items.map(item => this.hydrateBreadcrumb(item));
        return breadcrumbs;
    }

    storeAuditEntry(entry: IAuditEntryRecord) {
        this.audit.insert(entry);
    }

    loadAuditEntries(): IAuditEntryRecord[] {
        const items = this.audit.getAll();
        const entries = items.map(item => this.hydrateAuditEntry(item));
        return entries;
    }

    private hydrateAuditEntry(item: any): IAuditEntryRecord {
        return {
            id: item.id,
            summary: item.summary,
            payload: item.payload
        };
    }
}


export class Collection {
    private readonly path: string
    private nextId: number;
    private readonly items: any[];

    constructor(path: string, nextId: number, items: any[]) {
        this.path = path;
        this.nextId = nextId;
        this.items = items;
    }

    static async load(path: string): Promise<Collection> {
        console.assert(fs.existsSync(path), `file does not exist: ${path}`)

        const json = await fs.promises.readFile(path, "utf8");
        const data = JSON.parse(json);
        return new Collection(path, data.nextId, data.items);
    }

    insert(item: any) {
        console.assert(!item.id, "when inserting an item, id should not be set");

        item.id = this.nextId++;
        this.items.push(item);
    }

    update(item: any) {
        const index = this.items.findIndex(item => item.id === item.id);

        console.assert(index > -1, "item not found")
        console.assert(this.items[index].id === item.id, "when updating an item, id should not change");

        this.items[index] = item;
    }

    remove(item: any) {
        this.removeById(item.id);
    }

    removeById(id: number) {
        const index = this.items.findIndex(item => item.id === id);
        if (index === -1) {
            return;
        }

        this.items.splice(index, 1);
    }

    find(predicate: (item: any) => boolean): any | undefined {
        return this.items.find(predicate);
    }

    findMany(predicate: (item: any) => boolean): any[] {
        return this.items.filter(predicate);
    }

    getAll(): any[] {
        return this.items;
    }

    async save() {
        const data = {
            nextId: this.nextId,
            items: this.items
        };

        const json = JSON.stringify(data, null, 4);
        await fs.promises.writeFile(this.path, json, "utf8");
    }
}


