import { Transaction, ESDTNFTTransferPayloadBuilder, ESDTTransferPayloadBuilder, MultiESDTNFTTransferPayloadBuilder } from "@elrondnetwork/erdjs";
import { AccountWatcher } from "./erdjsPatching/accountWatcher";
import { computeGasLimit } from "./gasLimit";
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

    constructor(networkProvider: INetworkProvider, networkConfig: INetworkConfig) {
        this.networkProvider = networkProvider;
        this.networkConfig = networkConfig;
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
            let data = new MultiESDTNFTTransferPayloadBuilder()
                .setPayments(payments)
                .setDestination(receiver.address)
                .build();

            let gasLimit = computeGasLimit(this.networkConfig, data.length(), 1000000 * payments.length);

            transactions.push(new Transaction({
                nonce: sender.account.getNonceThenIncrement(),
                receiver: sender.address,
                data: data,
                gasLimit: gasLimit,
                chainID: this.networkConfig.ChainID
            }));
        }

        return transactions;
    }

    private createEGLDTransferTransactions(sender: ITestUser, receivers: ITestUser[], payment: ITokenPayment): Transaction[] {
        let transactions: Transaction[] = [];

        for (const receiver of receivers) {
            transactions.push(new Transaction({
                nonce: sender.account.getNonceThenIncrement(),
                receiver: receiver.address,
                value: payment.toString(),
                gasLimit: computeGasLimit(this.networkConfig),
                chainID: this.networkConfig.ChainID
            }));
        }

        return transactions;
    }

    private createSingleESDTTransferTransactions(sender: ITestUser, receivers: ITestUser[], payment: ITokenPayment): Transaction[] {
        let transactions: Transaction[] = [];

        for (const receiver of receivers) {
            let data = new ESDTTransferPayloadBuilder()
                .setPayment(payment)
                .build();

            let gasLimit = computeGasLimit(this.networkConfig, data.length(), 300000);

            transactions.push(new Transaction({
                nonce: sender.account.getNonceThenIncrement(),
                receiver: receiver.address,
                data: data,
                gasLimit: gasLimit,
                chainID: this.networkConfig.ChainID
            }));
        }

        return transactions;
    }

    private createSingleESDTNFTTransferTransactions(sender: ITestUser, receivers: ITestUser[], payment: ITokenPayment): Transaction[] {
        let transactions: Transaction[] = [];

        for (const receiver of receivers) {
            let data = new ESDTNFTTransferPayloadBuilder()
                .setPayment(payment)
                .setDestination(receiver.address)
                .build();

            let gasLimit = computeGasLimit(this.networkConfig, data.length(), 1000000);

            transactions.push(new Transaction({
                nonce: sender.account.getNonceThenIncrement(),
                receiver: sender.address,
                data: data,
                gasLimit: gasLimit,
                chainID: this.networkConfig.ChainID
            }));
        }

        return transactions;
    }
}
