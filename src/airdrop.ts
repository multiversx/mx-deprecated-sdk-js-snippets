import { Balance, Transaction, TransactionPayload } from "@elrondnetwork/erdjs";
import { NetworkConfig } from "@elrondnetwork/erdjs-network-providers";
import { AccountWatcher } from "./erdjsPatching/accountWatcher";
import { ESDTTransferPayloadBuilder } from "./erdjsPatching/transactionBuilders";
import { ErrNotImplemented } from "./errors";
import { computeGasLimit } from "./gasLimit";
import { IBunchOfUsers, ITestSession, ITestUser } from "./interface";
import { INetworkProvider } from "./interfaceOfNetwork";

export function createAirdropService(session: ITestSession): AirdropService {
    let users = session.users;
    let networkProvider = session.networkProvider;
    let networkConfig = session.getNetworkConfig();
    let service = new AirdropService(users, networkProvider, networkConfig);
    return service;
}

export class AirdropService {
    private readonly users: IBunchOfUsers;
    private readonly networkProvider: INetworkProvider;
    private readonly networkConfig: NetworkConfig;

    constructor(users: IBunchOfUsers, networkProvider: INetworkProvider, networkConfig: NetworkConfig) {
        this.users = users;
        this.networkProvider = networkProvider;
        this.networkConfig = networkConfig;
    }

    async sendToEachUser(sender: ITestUser, amount: Balance) {
        let transactions = this.createTransactions(sender, amount);

        let promisesOfSignAndSend = transactions.map(async (transaction) => {
            await sender.signer.sign(transaction);
            await this.networkProvider.sendTransaction(transaction);
        });

        await Promise.all(promisesOfSignAndSend);

        let senderExpectedNonce = sender.account.nonce;
        let watcher = new AccountWatcher(sender.address, this.networkProvider);
        await watcher.awaitNonce(senderExpectedNonce);
    }

    private createTransactions(sender: ITestUser, amount: Balance): Transaction[] {
        let transactions: Transaction[] = [];
        // Temporary workaround:
        let isFungible = amount.getNonce().toNumber() == 0;

        for (const userAddress of this.users.getAddressesOfAllExcept([sender])) {
            let value = Balance.Zero();
            let data = new TransactionPayload();
            let gasLimit = computeGasLimit(this.networkConfig);

            if (amount.token.isEgld()) {
                value = amount;
            } else if (isFungible) {
                data = new ESDTTransferPayloadBuilder().setAmount(amount).build();
                gasLimit = computeGasLimit(this.networkConfig, data.length(), 300000);
            } else {
                throw new ErrNotImplemented("transfer of other tokens");
            }

            transactions.push(new Transaction({
                nonce: sender.account.getNonceThenIncrement(),
                receiver: userAddress,
                value: value,
                data: data,
                gasLimit: gasLimit,
                chainID: this.networkConfig.ChainID
            }));
        }

        return transactions;
    }
}
