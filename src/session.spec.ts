import { assert } from "chai";
import { TestSession } from "./session";

describe("test session", async function () {
    const Timeout = 10000;

    it("store and load breadcrumbs", async function () {
        this.timeout(Timeout);

        const session = await TestSession.load("dummy", "src/testdata");

        await session.saveBreadcrumb({ name: "a", type: "foo", value: { x: 42 } });
        await session.saveBreadcrumb({ name: "b", type: "foo", value: { x: 43 } });
        await session.saveBreadcrumb({ name: "c", value: { x: 44 } });

        const a = await session.loadBreadcrumb("a");
        const b = await session.loadBreadcrumb("b");
        const c = await session.loadBreadcrumb("c");
        const fooBreadcrumbs = await session.loadBreadcrumbsByType("foo");

        assert.equal(a.x, 42);
        assert.equal(b.x, 43);
        assert.equal(c.x, 44);
        assert.lengthOf(fooBreadcrumbs, 2);

        await session.destroy();
    });
});
