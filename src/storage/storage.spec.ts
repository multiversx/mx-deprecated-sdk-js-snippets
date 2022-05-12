import { Address, TokenPayment, TransactionHash } from "@elrondnetwork/erdjs";
import { assert } from "chai";
import { Storage } from "./storage";

describe("test storage", async function () {
    const Timeout = 10000;

    it("store and load breadcrumbs", async function () {
        this.timeout(Timeout);

        let storage = await Storage.create(createDatabaseName(this));

        await storage.storeBreadcrumb({ id: 0, correlationTag: "test", type: "typeX", name: "A", payload: { value: 42 }});
        await storage.storeBreadcrumb({ id: 0, correlationTag: "test", type: "typeX", name: "A", payload: { value: 43 }});
        await storage.storeBreadcrumb({ id: 0, correlationTag: "test", type: "typeX", name: "C", payload: { value: 42 }});
        await storage.storeBreadcrumb({ id: 0, correlationTag: "test", type: "typeY", name: "B", payload: { value: 44 }});

        let breadcrumb = await storage.loadBreadcrumb("A");
        assert.deepEqual(breadcrumb, { id: 0, correlationTag: "test", type: "typeX", name: "A", payload: { value: 43 }});
        breadcrumb = await storage.loadBreadcrumb("B");
        assert.deepEqual(breadcrumb, { id: 0, correlationTag: "test", type: "typeY", name: "B", payload: { value: 44 }});

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

    it("store & load audit entries", async function () {
        this.timeout(Timeout);

        let storage = await Storage.create(createDatabaseName(this));

        // TODO

        await storage.destroy();
    });

    function createDatabaseName(context: Mocha.Context): string {
        return `${context.runnable().fullTitle()}.sqlite`;
    }
});
