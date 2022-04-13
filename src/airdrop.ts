import { TokenPayment, Transaction } from "@elrondnetwork/erdjs";
import { NetworkConfig } from "@elrondnetwork/erdjs-network-providers";
import { AccountWatcher } from "./erdjsPatching/accountWatcher";
import { ESDTNFTTransferPayloadBuilder, ESDTTransferPayloadBuilder } from "./erdjsPatching/transactionBuilders";
import { computeGasLimit } from "./gasLimit";
import { ITestSession, ITestUser } from "./interface";
import { INetworkProvider } from "./interfaceOfNetwork";

export function createAirdropService(session: ITestSession): AirdropService {
    let networkProvider = session.networkProvider;
    let networkConfig = session.getNetworkConfig();
    let service = new AirdropService(networkProvider, networkConfig);
    return service;
}

export class AirdropService {
    private readonly networkProvider: INetworkProvider;
    private readonly networkConfig: NetworkConfig;

    constructor(networkProvider: INetworkProvider, networkConfig: NetworkConfig) {
        this.networkProvider = networkProvider;
        this.networkConfig = networkConfig;
    }

    async sendToEachUser(sender: ITestUser, receivers: ITestUser[], payment: TokenPayment) {
        let transactions = this.createTransactions(sender, receivers, payment);

        let promisesOfSignAndSend = transactions.map(async (transaction) => {
            await sender.signer.sign(transaction);
            await this.networkProvider.sendTransaction(transaction);
        });

        await Promise.all(promisesOfSignAndSend);

        let senderExpectedNonce = sender.account.nonce;
        let watcher = new AccountWatcher(sender.address, this.networkProvider);
        await watcher.awaitNonce(senderExpectedNonce);
    }

    private createTransactions(sender: ITestUser, receivers: ITestUser[], payment: TokenPayment): Transaction[] {
        let transactions: Transaction[] = [];

        for (const receiver of receivers) {
            if (sender.address.bech32() == receiver.address.bech32()) {
                continue;
            }

            if (payment.isEgld()) {
                transactions.push(new Transaction({
                    nonce: sender.account.getNonceThenIncrement(),
                    receiver: receiver.address,
                    value: payment.toString(),
                    gasLimit: computeGasLimit(this.networkConfig),
                    chainID: this.networkConfig.ChainID
                }));

                continue;
            }

            if (payment.isFungible()) {
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

                continue;
            }

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
