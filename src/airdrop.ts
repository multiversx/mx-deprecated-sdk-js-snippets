import { Balance, GasLimit, IProvider, Transaction, TransactionPayload } from "@elrondnetwork/erdjs/out";
import { AccountWatcher } from "./erdjsPatching/accountWatcher";
import { ESDTTransferPayloadBuilder } from "./erdjsPatching/transactionBuilders";
import { ErrNotImplemented } from "./errors";
import { IBunchOfUsers, ITestSession, IUser } from "./interfaces";

export class AirdropService {
    private readonly users: IBunchOfUsers;
    private readonly networkProvider: IProvider;

    constructor(users: IBunchOfUsers, networkProvider: IProvider) {
        this.users = users;
        this.networkProvider = networkProvider;
    }

    static createOnSession(session: ITestSession) {
        return new AirdropService(session.users, session.proxy);
    }

    async sendToEachUser(sender: IUser, amount: Balance) {
        let transactions = this.createTransactions(sender, amount);

        let promisesOfSignAndSend = transactions.map(async (transaction) => {
            await sender.signer.sign(transaction);
            await transaction.send(this.networkProvider);
        });

        await Promise.all(promisesOfSignAndSend);

        let senderExpectedNonce = sender.account.nonce;
        let watcher = new AccountWatcher(sender.address, this.networkProvider);
        await watcher.awaitNonce(senderExpectedNonce);
    }

    private createTransactions(sender: IUser, amount: Balance): Transaction[] {
        let transactions: Transaction[] = [];

        for (const user of this.users.getAllExceptWhale()) {
            let value = Balance.Zero();
            let data = new TransactionPayload();
            let gasLimit = GasLimit.forTransfer(data);

            if (amount.token.isEgld()) {
                value = amount;
            } else if (amount.token.isFungible()) {
                data = new ESDTTransferPayloadBuilder().setAmount(amount).build();
                gasLimit = GasLimit.forTransfer(data).add(new GasLimit(300000));
            } else {
                throw new ErrNotImplemented("transfer of other tokens");
            }

            transactions.push(new Transaction({
                nonce: sender.account.getNonceThenIncrement(),
                receiver: user.address,
                value: value,
                data: data,
                gasLimit: gasLimit
            }));
        }

        return transactions;
    }
}
