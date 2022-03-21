import { Address, Interaction, IProvider, SmartContract, TokenOfAccountOnNetwork } from "@elrondnetwork/erdjs";
import { IAccountSnapshotWithinStorage, IStorage, ITestSession, IUser } from "./interfaces";


// TBD
export class InteractionsTracker {
    private readonly scope: string;
    private readonly storage: IStorage;
    private readonly proxy: IProvider;
    public readonly contract: SmartContract;

    constructor(session: ITestSession, contract: SmartContract) {
        this.scope = session.scope;
        this.storage = session.storage;
        this.proxy = session.proxy;
        this.contract = contract;
    }

    async trackInteraction(user: IUser, interaction: Interaction): Promise<void> {
        let functionName = interaction.getFunction().name;
        let args = interaction.getArguments();
        let argsPlain = args.map(arg => arg.valueOf());
        console.debug(`InteractionsTracker.trackInteraction(): call = ${functionName}(${argsPlain.join(", ")})`);

        let interactingParticipants: Address[] = [
            user.address,
            interaction.getContract().getAddress()
        ];

        let transaction = interaction.buildTransaction();
        transaction.setNonce(user.account.getNonceThenIncrement());
        await user.signer.sign(transaction);

        let snapshotsBeforeInteraction = await this.takeSnapshotsOfAccounts(interactingParticipants);

        let transactionHash = await transaction.send(this.proxy);
        console.debug(`DefaultInteractor.runInteraction(): transaction = ${transactionHash}`);
        let transactionOnNetwork = await transaction.getAsOnNetwork(this.proxy);

        let snapshotsAfterInteraction = await this.takeSnapshotsOfAccounts(interactingParticipants);

        // TBD

        let transfers = {
            value: interaction.getValue().valueOf(),
            tokens: interaction.getTokenTransfers().map(item => {
                return {
                    token: item.token.identifier,
                    amount: item.toString()
                };
            })
        };

        let interactionReference = await this.storage.storeInteraction(this.scope, {
            action: functionName,
            userAddress: user.address,
            contractAddress: interaction.getContract().getAddress(),
            transactionHash: transactionOnNetwork.hash,
            timestamp: transactionOnNetwork.getDateTime().toISOString(),
            round: transactionOnNetwork.round,
            epoch: transactionOnNetwork.epoch,
            blockNonce: transactionOnNetwork.blockNonce,
            hyperblockNonce: transactionOnNetwork.hyperblockNonce,
            input: argsPlain,
            transfers: transfers,
            output: {}
        });

        for (const snapshot of snapshotsBeforeInteraction) {
            snapshot.takenBeforeInteraction = interactionReference;
            await this.storage.storeAccountSnapshot(this.scope, snapshot);
        }

        for (const snapshot of snapshotsAfterInteraction) {
            snapshot.takenAfterInteraction = interactionReference;
            await this.storage.storeAccountSnapshot(this.scope, snapshot);
        }
    }

    private async takeSnapshotsOfAccounts(addresses: Address[]): Promise<IAccountSnapshotWithinStorage[]> {
        let promises = addresses.map(address => this.takeSnapshotOfAccount(address));
        let snapshots = await Promise.all(promises);
        return snapshots;
    }

    private async takeSnapshotOfAccount(address: Address): Promise<IAccountSnapshotWithinStorage> {
        let accountOnNetwork = await this.proxy.getAccount(address);
        let accountTokens = await this.proxy.getAddressEsdtList(address);
        let accountTokensSimplified = accountTokens.map(item => this.simplifyAccountToken(item));

        let snapshot = {
            timestamp: new Date().toISOString(),
            address: address,
            nonce: accountOnNetwork.nonce,
            balance: accountOnNetwork.balance,
            tokens: accountTokensSimplified
        };

        return snapshot;
    }

    private simplifyAccountToken(token: TokenOfAccountOnNetwork): any {
        return {
            identifier: token.tokenIdentifier,
            balance: token.balance.valueOf(),
            nonce: token.nonce.valueOf()
        };
    }
}
