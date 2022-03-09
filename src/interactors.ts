import { Address, IInteractionChecker, Interaction, IProvider, ISigner, QueryResponseBundle, SmartContractResults, StrictChecker, TokenOfAccountOnNetwork, Transaction, TypedValue } from "@elrondnetwork/erdjs";
import { TransactionOnNetwork } from "@elrondnetwork/erdjs/out/transactionOnNetwork";
import { IAccountSnapshotWithinStorage, IStorage, ITestSession, IUser } from "./interfaces";
import { prettifyObject } from "./pretty";


export class DefaultInteractor {
    private readonly scope: string;
    private readonly storage: IStorage;
    private readonly proxy: IProvider;
    private readonly checker: IInteractionChecker;

    constructor(session: ITestSession) {
        this.scope = session.scope;
        this.storage = session.storage;
        this.proxy = session.proxy;
        this.checker = new StrictChecker();
    }

    async doDeploy(deployer: IUser, deployTransaction: Transaction): Promise<void> {
        deployTransaction.setNonce(deployer.account.getNonceThenIncrement());

        await deployer.signer.sign(deployTransaction);
        await deployTransaction.send(this.proxy);
        await deployTransaction.awaitExecuted(this.proxy);

        console.log(`DefaultInteractor.doDeploy(): transaction = ${deployTransaction.getHash()}`);
    }

    async runQuery(user: IUser, interaction: Interaction, caller?: Address): Promise<{ firstValue: TypedValue, values: TypedValue[] }> {
        this.checker.checkInteraction(interaction);

        let query = interaction.buildQuery();
        query.caller = caller || user.signer.getAddress();
        let response = await this.proxy.queryContract(query);
        let bundle = interaction.interpretQueryResponse(response);
        let values = bundle.values;
        return { firstValue: values[0], values: values };
    }

    async runInteraction(user: IUser, interaction: Interaction): Promise<{ transactionOnNetwork: TransactionOnNetwork, contractResults: SmartContractResults }> {
        this.checker.checkInteraction(interaction);

        let functionName = interaction.getExecutingFunction().name;
        let args = interaction.getArguments();
        let argsPlain = args.map(arg => arg.valueOf());
        console.debug(`DefaultInteractor.runInteraction(): call = ${functionName}(${argsPlain.join(", ")})`);

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

        let contractResults = transactionOnNetwork.getSmartContractResults();
        let immediateResult = contractResults.getImmediate();
        let output: any;

        if (immediateResult.isSuccess()) {
            immediateResult.setEndpointDefinition(interaction.getEndpoint());
            output = immediateResult.outputTyped();
        } else {
            output = {
                returnCode: immediateResult.getReturnCode(),
                returnMessage: immediateResult.getReturnMessage()
            };

            console.error(output);
        }

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
            output: output
        });

        for (const snapshot of snapshotsBeforeInteraction) {
            snapshot.takenBeforeInteraction = interactionReference;
            await this.storage.storeAccountSnapshot(this.scope, snapshot);
        }

        for (const snapshot of snapshotsAfterInteraction) {
            snapshot.takenAfterInteraction = interactionReference;
            await this.storage.storeAccountSnapshot(this.scope, snapshot);
        }

        return { transactionOnNetwork, contractResults };
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
