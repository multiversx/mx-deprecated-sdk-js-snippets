import { Balance, GasLimit, Transaction, TransactionPayload } from "@elrondnetwork/erdjs/out";
import { AccountWatcher } from "./erdjsPatching/accountWatcher";
import { ESDTTransferPayloadBuilder } from "./erdjsPatching/transactionBuilders";
import { ErrNotImplemented } from "./errors";
import { ITestSession } from "./interfaces";
import { User } from "./users";

export class AirdropService {
    private readonly session: ITestSession;

    constructor(session: ITestSession) {
        this.session = session;
    }

    async sendToEachUser(amount: Balance) {
        let whale = this.session.whale;
        let transactions = this.createTransactions(whale, amount);

        let promisesOfSignAndSend = transactions.map(async (transaction) => {
            await whale.signer.sign(transaction);
            await transaction.send(this.session.proxy);
        });

        await Promise.all(promisesOfSignAndSend);

        let whaleExpectedNonce = whale.account.nonce;
        let watcher = new AccountWatcher(whale.address, this.session.proxy);
        await watcher.awaitNonce(whaleExpectedNonce);
    }

    private createTransactions(whale: User, amount: Balance): Transaction[] {
        let transactions: Transaction[] = [];

        for (const user of this.session.users) {
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
                nonce: whale.account.getNonceThenIncrement(),
                receiver: user.address,
                value: value,
                data: data,
                gasLimit: gasLimit
            }));
        }

        return transactions;
    }
}
