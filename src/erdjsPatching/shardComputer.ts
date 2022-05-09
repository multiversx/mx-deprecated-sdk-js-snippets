export function computeShardOfUserPubkey(pubkey: Buffer): number {
    const numShards = 3;
    const maskHigh = parseInt("11", 2);
    const maskLow = parseInt("01", 2);
    const lastByteOfPubKey = pubkey[31];

    let shard = lastByteOfPubKey & maskHigh;

    if (shard > numShards - 1) {
        shard = lastByteOfPubKey & maskLow;
    }

    return shard;
}
