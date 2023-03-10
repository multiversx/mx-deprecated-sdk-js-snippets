import { UserPublicKey, UserSecretKey, USER_PUBKEY_LENGTH, USER_SEED_LENGTH } from "@multiversx/sdk-wallet";
import { Err } from "../errors";

export function parseUserKeys(text: string): { sk: UserSecretKey, pk: UserPublicKey }[] {
    // The user PEM files encode both the seed and the pubkey in their payloads.
    let buffers = parse(text, USER_SEED_LENGTH + USER_PUBKEY_LENGTH);
    return buffers.map(buffer => {
        return {
            sk: new UserSecretKey(buffer.slice(0, USER_SEED_LENGTH)),
            pk: new UserPublicKey(buffer.slice(USER_SEED_LENGTH, USER_SEED_LENGTH + USER_PUBKEY_LENGTH))
        }
    });
}

export function parse(text: string, expectedLength: number): Buffer[] {
    // Split by newlines, trim whitespace, then discard remaining empty lines.
    let lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    let buffers: Buffer[] = [];
    let linesAccumulator: string[] = [];

    for (const line of lines) {
        if (line.startsWith("-----BEGIN")) {
            linesAccumulator = [];
        } else if (line.startsWith("-----END")) {
            let asBase64 = linesAccumulator.join("");
            let asHex = Buffer.from(asBase64, "base64").toString();
            let asBytes = Buffer.from(asHex, "hex");

            if (asBytes.length != expectedLength) {
                throw new Err(`incorrect key length: expected ${expectedLength}, found ${asBytes.length}`);
            }

            buffers.push(asBytes);
            linesAccumulator = [];
        } else {
            linesAccumulator.push(line);
        }
    }

    if (linesAccumulator.length != 0) {
        throw new Err("incorrect file structure");
    }

    return buffers;
}
