import { assert } from "chai";
import { Storage } from "./storage";

describe("test storage", async function () {
    const Timeout = 10000;

    it("should create and destroy", async function () {
        const storage = await Storage.create(createDatabaseName(this));
        await storage.destroy();
    });

    it("should store and load breadcrumbs", async function () {
        this.timeout(Timeout);

        const storage = await Storage.create(createDatabaseName(this));

        await storage.storeBreadcrumb({ id: 0, correlationTag: "test", type: "typeX", name: "A", payload: { value: 42 } });
        await storage.storeBreadcrumb({ id: 0, correlationTag: "test", type: "typeX", name: "A", payload: { value: 43 } });
        await storage.storeBreadcrumb({ id: 0, correlationTag: "test", type: "typeX", name: "C", payload: { value: 42 } });
        await storage.storeBreadcrumb({ id: 0, correlationTag: "test", type: "typeY", name: "B", payload: { value: 44 } });

        let breadcrumb = await storage.loadBreadcrumb("A");
        assert.deepEqual(breadcrumb, { id: 1, correlationTag: "test", type: "typeX", name: "A", payload: { value: 43 } });
        breadcrumb = await storage.loadBreadcrumb("B");
        assert.deepEqual(breadcrumb, { id: 3, correlationTag: "test", type: "typeY", name: "B", payload: { value: 44 } });

        let breadcrumbs = await storage.loadBreadcrumbsByType("typeX");
        assert.lengthOf(breadcrumbs, 2);
        breadcrumbs = await storage.loadBreadcrumbsByType("typeY");
        assert.lengthOf(breadcrumbs, 1);
        breadcrumbs = await storage.loadBreadcrumbsByType("typeY");
        assert.lengthOf(breadcrumbs, 1);
        breadcrumbs = await storage.loadBreadcrumbsByType("typeMissing");
        assert.lengthOf(breadcrumbs, 0);

        await storage.destroy();
    });

    it("should store and load audit entries", async function () {
        this.timeout(Timeout);

        const storage = await Storage.create(createDatabaseName(this));

        const entryOne = {
            id: 0,
            correlationTag: "test",
            summary: "foobar",
            event: "StateSnapshot",
            payload: { a: "b", c: "d", foo: 42 },
            comparableTo: null
        };

        await storage.storeAuditEntry(entryOne);

        const entryTwo = {
            id: 0,
            correlationTag: "test",
            summary: "foobar",
            event: "StateSnapshot",
            payload: { a: "d", c: "b", foo: 43 },
            comparableTo: entryOne.id
        };

        await storage.storeAuditEntry(entryTwo);

        const records = await storage.loadAuditEntries();
        assert.deepEqual(records, [entryOne, entryTwo]);

        await storage.destroy();
    });

    function createDatabaseName(context: Mocha.Context): string {
        return `${context.runnable().fullTitle()}.sqlite`;
    }
});
