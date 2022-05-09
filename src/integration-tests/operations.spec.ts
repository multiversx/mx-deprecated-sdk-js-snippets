import { readJson } from "../filesystem";
import { TestSession } from "../session";
import { ISecretKeysGeneratorConfig } from "../interface";
import { generateSecretKeys } from "../secretKeysGenerator";
import { OneMinuteInMilliseconds } from "../constants";

describe("operations snippet", async function () {
    this.bail(true);

    let suite = this;

    it("generate keys", async function () {
        this.timeout(OneMinuteInMilliseconds);

        const config = readJson<ISecretKeysGeneratorConfig>("src/integration-tests/secretKeysGenerator.json");
        await generateSecretKeys(config);
    });

    it("generate report", async function () {
        const session = await loadSession();
    });

    it("clear cache", async function () {
        const session = await loadSession();
    });

    it("destroy session", async function () {
        const session = await loadSession();
        await session.destroy();
    });

    async function loadSession() {
        return await TestSession.loadOnSuite("devnet", suite);
    }
});
