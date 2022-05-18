import { Mnemonic, UserSecretKey } from "@elrondnetwork/erdjs-walletcore";
import { PathLike, writeFileSync } from "fs";
import { computeShardOfUserPubkey } from "./erdjsPatching/shardComputer";
import { resolvePath } from "./filesystem";
import { ISecretKeysGeneratorConfig } from "./interface";

const DefaultGeneratedUsersMnemonic = "portion dirt find setup grit fork angle someone hello holiday daring coconut gallery worth alley balcony mean ring time ski tomorrow hedgehog typical deny";

class SecretKeysGeneratorContext {
    readonly mnemonic: Mnemonic;
    accountIndex: number;

    constructor(mnemonicString: string) {
        this.mnemonic = Mnemonic.fromString(mnemonicString || DefaultGeneratedUsersMnemonic);
        this.accountIndex = 0;
    }
}

export async function generateSecretKeys(config: ISecretKeysGeneratorConfig): Promise<void> {
    const context = new SecretKeysGeneratorContext(config.mnemonic);

    const timeStart = new Date();

    // Generate individuals
    for (const individualConfig of config.individuals || []) {
        const secretKey = generateSecretKey(context, individualConfig.shard);

        writePem(individualConfig.pem, [secretKey]);
    }

    // Generate groups
    for (const groupConfig of config.groups || []) {
        const secretKeys = [];

        for (let i = 0; i < groupConfig.size; i++) {
            secretKeys.push(generateSecretKey(context, groupConfig.shard));
        }

        writePem(groupConfig.pem, secretKeys);
    }

    const timeEnd = new Date();

    console.info(`generateSecretKeys() took ${timeEnd.getTime() - timeStart.getTime()} ms.`);
}

function generateSecretKey(context: SecretKeysGeneratorContext, targetShard?: number): UserSecretKey {
    while (true) {
        const secretKey = context.mnemonic.deriveKey(context.accountIndex++);
        const pubkey = secretKey.generatePublicKey();
        const shard = computeShardOfUserPubkey(pubkey.valueOf());

        if (targetShard === undefined || shard == targetShard) {
            return secretKey;
        }
    }
}

function writePem(filePath: PathLike, secretKeys: UserSecretKey[]) {
    const contentChunks: string[] = [];

    for (const secretKey of secretKeys) {
        const pubkey = secretKey.generatePublicKey();
        const address = pubkey.toAddress();

        const header = `-----BEGIN PRIVATE KEY for ${address}-----`;
        const footer = `-----END PRIVATE KEY for ${address}-----`;

        const combinedKeys = secretKey.hex() + pubkey.hex();
        const combinedKeysBase64 = Buffer.from(combinedKeys).toString("base64");

        const payloadLines = combinedKeysBase64.match(/.{1,64}/g) || [];
        const payload = payloadLines.join("\n");
        const contentChunk = [header, payload, footer].join("\n");

        contentChunks.push(contentChunk);
    }

    const content = contentChunks.join("\n");
    writeFileSync(resolvePath(filePath), content, { encoding: "utf8" });
}
