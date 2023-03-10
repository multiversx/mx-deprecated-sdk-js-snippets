import { OneMinuteInMilliseconds } from "../constants";
import { readJson } from "../filesystem";
import { ISecretKeysGeneratorConfig } from "../interface";
import { generateSecretKeys } from "../secretKeysGenerator";

describe("operations snippet", async function () {
    this.bail(true);

    it("generate keys", async function () {
        this.timeout(OneMinuteInMilliseconds);

        const config = readJson<ISecretKeysGeneratorConfig>("src/examples/secretKeysGenerator.json");
        await generateSecretKeys(config);
    });
});
