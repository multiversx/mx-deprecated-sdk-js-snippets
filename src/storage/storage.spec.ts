import { Address, TokenPayment, TransactionHash } from "@elrondnetwork/erdjs";
import { assert } from "chai";
import { Storage } from "./storage";

describe("test storage", async function () {
    const Timeout = 10000;

    it("store and load breadcrumbs", async function () {
        this.timeout(Timeout);

        let storage = await Storage.create(createDatabaseName(this));

        await storage.storeBreadcrumb({ type: "typeX", name: "A", payload: { value: 42 }});
        await storage.storeBreadcrumb({ type: "typeX", name: "A", payload: { value: 43 }});
        await storage.storeBreadcrumb({ type: "typeX", name: "C", payload: { value: 42 }});
        await storage.storeBreadcrumb({ type: "typeY", name: "B", payload: { value: 44 }});
        await storage.storeBreadcrumb({ type: "typeY", name: "A", payload: { value: 42 }});

        let breadcrumb = await storage.loadBreadcrumb("A");
        assert.deepEqual(breadcrumb.payload, { value: 43 });
        breadcrumb = await storage.loadBreadcrumb("B");
        assert.deepEqual(breadcrumb.payload, { value: 44 });
        breadcrumb = await storage.loadBreadcrumb("A");
        assert.deepEqual(breadcrumb.payload, { value: 42 });

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

    it("store & update interactions", async function () {
        this.timeout(Timeout);

        let storage = await Storage.create(createDatabaseName(this));

        let reference = await storage.storeInteraction({
            action: "stake",
            userAddress: new Address("erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th"),
            contractAddress: new Address("erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu"),
            transactionHash: new TransactionHash(""),
            timestamp: "friday",
            round: 42,
            epoch: 1,
            blockNonce: 7,
            hyperblockNonce: 9,
            input: { foo: "bar" },
            transfers: {},
            output: {}
        });

        assert.isTrue(reference.valueOf() > 0);

        await storage.updateInteractionSetOutput(reference, { something: "something" });

        await storage.destroy();
    });

    it("store account snapshots", async function () {
        this.timeout(Timeout);

        let storage = await Storage.create(createDatabaseName(this));

        // Without reference to "before" / "after" interaction
        await storage.storeAccountSnapshot({
            address: new Address("erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th"),
            nonce: 42,
            balance: TokenPayment.egldFromAmount(1),
            fungibleTokens: [{ identifier: "RIDE", balance: 1000 }, { identifier: "MEX", balance: 1000 }],
        });

        // With references to "before" / "after" interaction
        let interactionReference = await storage.storeInteraction({
            action: "doSomething",
            userAddress: new Address("erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th"),
            contractAddress: new Address("erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu"),
            transactionHash: new TransactionHash(""),
            timestamp: "friday",
            round: 42,
            epoch: 1,
            blockNonce: 7,
            hyperblockNonce: 9,
            input: { foo: "bar" },
            transfers: {},
            output: { bar: "foo" }
        });

        let snapshotBefore = {
            address: new Address("erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th"),
            nonce: 42,
            balance: TokenPayment.egldFromAmount(1),
            fungibleTokens: [{ identifier: "RIDE", balance: 1000 }, { identifier: "MEX", balance: 1000 }],
            takenBeforeInteraction: interactionReference
        };

        let snapshotAfter = {
            address: new Address("erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th"),
            nonce: 43,
            balance: TokenPayment.egldFromAmount(2),
            fungibleTokens: [{ identifier: "RIDE", balance: 500 }, { identifier: "MEX", balance: 500 }],
            takenAfterInteraction: interactionReference
        };

        await storage.storeAccountSnapshot(snapshotBefore);
        await storage.storeAccountSnapshot(snapshotAfter);

        // TODO: Add some assertions.

        await storage.destroy();
    });

    function createDatabaseName(context: Mocha.Context): string {
        return `${context.runnable().fullTitle()}.sqlite`;
    }
});
