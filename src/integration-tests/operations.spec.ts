import { readJson } from "../filesystem";
import { ISecretKeysGeneratorConfig } from "../interface";
import { generateSecretKeys } from "../secretKeysGenerator";
import { OneMinuteInMilliseconds } from "../constants";

describe("operations snippet", async function () {
    this.bail(true);

    it("generate keys", async function () {
        this.timeout(OneMinuteInMilliseconds);

        const config = readJson<ISecretKeysGeneratorConfig>("src/integration-tests/secretKeysGenerator.json");
        await generateSecretKeys(config);
    });
});
