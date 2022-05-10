import { IAddress, ISnapshottingService, IStorage, ITestUser } from "./interface";
import { INetworkProvider } from "./interfaceOfNetwork";

export class SnapshottingService implements ISnapshottingService {
    private readonly networkProvider: INetworkProvider;
    private readonly storage: IStorage;

    constructor(networkProvider: INetworkProvider, storage: IStorage) {
        this.networkProvider = networkProvider;
        this.storage = storage;
    }

    async takeSnapshotsOfUsers(users: ITestUser[]): Promise<void> {
        for (const user of users) {
            await this.takeSnapshotOfAccount(user.address);
        }
    }

    async takeSnapshotsOfAccounts(addresses: IAddress[]): Promise<void> {
        for (const address of addresses) {
            await this.takeSnapshotOfAccount(address);
        }
    }

    async takeSnapshotOfAccount(address: IAddress): Promise<void> {
        const account = await this.networkProvider.getAccount(address);
        const fungibleTokens = await this.networkProvider.getFungibleTokensOfAccount(address);
        const nonFungibleTokens = await this.networkProvider.getNonFungibleTokensOfAccount(address);

        const simplifiedFungibleTokens: any[] = fungibleTokens.map(token => {
            return {
                identifier: token.identifier,
                balance: token.balance.toString()
            }
        });

        const simplifiedNonFungibleTokens: any[] = nonFungibleTokens.map(token => {
            return {
                identifier: token.identifier,
                nonce: token.nonce
            }
        });

        const snapshot = {
            address: address,
            nonce: account.nonce,
            balance: account.balance,
            fungibleTokens: simplifiedFungibleTokens,
            nonFungibleTokens: simplifiedNonFungibleTokens
        };

        await this.storage.storeAccountSnapshot(snapshot);
    }
}
