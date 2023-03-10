import { DefaultGasConfiguration, GasEstimator, Transaction, TransactionFactory } from "@multiversx/sdk-core";
import { AccountWatcher } from "./erdjsPatching/accountWatcher";
import { ITestSession, ITestUser, ITokenPayment } from "./interface";
import { INetworkConfig, INetworkProvider } from "./interfaceOfNetwork";

export function createAirdropService(session: ITestSession): AirdropService {
    let networkProvider = session.networkProvider;
    let networkConfig = session.getNetworkConfig();
    let service = new AirdropService(networkProvider, networkConfig);
    return service;
}

export class AirdropService {
    private readonly networkProvider: INetworkProvider;
    private readonly networkConfig: INetworkConfig;
    private readonly transactionsFactory: TransactionFactory;

    constructor(networkProvider: INetworkProvider, networkConfig: INetworkConfig) {
        this.networkProvider = networkProvider;
        this.networkConfig = networkConfig;
        this.transactionsFactory = new TransactionFactory(new GasEstimator(DefaultGasConfiguration))
    }

    async sendToEachUser(
        sender: ITestUser,
        receivers: ITestUser[],
        payments: ITokenPayment[]
    ) {
        // Remove the "sender" from the list of "receivers".
        receivers = receivers.filter(user => user.address.bech32() != sender.address.bech32());
        let transactions = this.createTransactions(sender, receivers, payments);

        let promisesOfSignAndSend = transactions.map(async (transaction) => {
            await sender.signer.sign(transaction);
            await this.networkProvider.sendTransaction(transaction);
        });

        await Promise.all(promisesOfSignAndSend);

        let senderExpectedNonce = sender.account.nonce;
        let watcher = new AccountWatcher(sender.address, this.networkProvider);
        await watcher.awaitNonce(senderExpectedNonce);
    }

    private createTransactions(sender: ITestUser, receivers: ITestUser[], payments: ITokenPayment[]): Transaction[] {
        if (payments.length > 1) {
            return this.createMultiTransferTransactions(sender, receivers, payments);
        }

        let payment = payments[0];

        if (payment.isEgld()) {
            return this.createEGLDTransferTransactions(sender, receivers, payment);
        }

        if (payment.isFungible()) {
            return this.createSingleESDTTransferTransactions(sender, receivers, payment);
        }

        return this.createSingleESDTNFTTransferTransactions(sender, receivers, payment);
    }

    private createMultiTransferTransactions(sender: ITestUser, receivers: ITestUser[], payments: ITokenPayment[]): Transaction[] {
        let transactions: Transaction[] = [];

        for (const receiver of receivers) {

            const transaction = this.transactionsFactory.createMultiESDTNFTTransfer({
                payments: payments,
                nonce: sender.account.getNonceThenIncrement(),
                destination: receiver.address,
                sender: sender.address,
                chainID: this.networkConfig.ChainID
            });

            transactions.push(transaction);
        }

        return transactions;
    }

    private createEGLDTransferTransactions(sender: ITestUser, receivers: ITestUser[], payment: ITokenPayment): Transaction[] {
        let transactions: Transaction[] = [];

        for (const receiver of receivers) {
            const transaction = this.transactionsFactory.createEGLDTransfer({
                nonce: sender.account.getNonceThenIncrement(),
                sender: sender.address,
                receiver: receiver.address,
                value: payment.toString(),
                chainID: this.networkConfig.ChainID
            });

            transactions.push(transaction);
        }

        return transactions;
    }

    private createSingleESDTTransferTransactions(sender: ITestUser, receivers: ITestUser[], payment: ITokenPayment): Transaction[] {
        let transactions: Transaction[] = [];

        for (const receiver of receivers) {
            const transaction = this.transactionsFactory.createESDTTransfer({
                payment: payment,
                nonce: sender.account.getNonceThenIncrement(),
                sender: sender.address,
                receiver: receiver.address,
                chainID: this.networkConfig.ChainID
            });

            transactions.push(transaction);
        }

        return transactions;
    }

    private createSingleESDTNFTTransferTransactions(sender: ITestUser, receivers: ITestUser[], payment: ITokenPayment): Transaction[] {
        let transactions: Transaction[] = [];

        for (const receiver of receivers) {
            const transaction = this.transactionsFactory.createESDTNFTTransfer({
                payment: payment,
                nonce: sender.account.getNonceThenIncrement(),
                sender: sender.address,
                destination: receiver.address,
                chainID: this.networkConfig.ChainID
            });

            transactions.push(transaction);
        }

        return transactions;
    }
}
