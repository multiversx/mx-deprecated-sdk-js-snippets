import { Address, BigUIntValue, BytesType, BytesValue, ContractFunction, Interaction, ResultsParser, ReturnCode, SmartContract, SmartContractAbi, TokenIdentifierValue, TokenPayment, TokenProperty, Transaction, TransactionPayload, TransactionWatcher, ESDTTransferPayloadBuilder } from "@elrondnetwork/erdjs";
import { NetworkConfig } from "@elrondnetwork/erdjs-network-providers";
import BigNumber from "bignumber.js";
import { Signer } from "crypto";
import path from "path";
import { stringify } from "querystring";
import { loadAbiRegistry } from "../contracts";
import { computeGasLimitOnInteraction, computeGasLimit } from "../gasLimit";
import { IBLS, ITestSession, ITestUser, IToken } from "../interface";
import { INetworkProvider } from "../interfaceOfNetwork";

const StakingContractAddress = new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l");
const PathToAbi = path.resolve(__dirname, "staking.abi.json");
const NodeStakeAmount = 2500;

export async function createStakingInteractor(session: ITestSession) {
    let registry = await loadAbiRegistry(PathToAbi);
    let abi = new SmartContractAbi(registry, ["staking"]);
    let contract = new SmartContract({ address: StakingContractAddress, abi: abi });
    let networkProvider = session.networkProvider;
    let networkConfig = session.getNetworkConfig();
    let interactor = new StakingInteractor(contract, networkProvider, networkConfig);
    return interactor;
}

export class StakingInteractor {
    private readonly contract: SmartContract;
    private readonly networkProvider: INetworkProvider;
    private readonly networkConfig: NetworkConfig;
    private readonly transactionWatcher: TransactionWatcher;
    private readonly resultsParser: ResultsParser;

    constructor(contract: SmartContract, networkProvider: INetworkProvider, networkConfig: NetworkConfig) {
        this.contract = contract;
        this.networkProvider = networkProvider;
        this.networkConfig = networkConfig;
        this.transactionWatcher = new TransactionWatcher(networkProvider);
        this.resultsParser = new ResultsParser();
    }

    async stake(owner: ITestUser, numberOfNodes: number, ...args: string[]
    ): Promise<void> {

        let cost = numberOfNodes * NodeStakeAmount

        let interaction = <Interaction>this.contract.methods
            .stake([
                numberOfNodes.toString(),
                ...args,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 12000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

    }

    async register(owner: ITestUser, numberOfNodes: number, ...args: string[]
    ): Promise<void> {

        let cost = numberOfNodes * NodeStakeAmount

        let interaction = <Interaction>this.contract.methods
            .register([
                numberOfNodes.toString(),
                ...args,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 12000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

    }

    async unStake(owner: ITestUser, ...args: string[]
    ): Promise<void> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unStake([
                ...args,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 12000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

    }

    async unBond(owner: ITestUser, ...args: string[]
    ): Promise<void> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unBond([
                ...args,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 12000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

    }

    async getStorage(owner: ITestUser, ...args: string[]
    ): Promise<void> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .get([
                ...args,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 12000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

    }

    async checkIfStaked(owner: ITestUser, ...args: string[]
    ): Promise<void> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .isStaked([
                ...args,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 12000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
    }

    async jail(owner: ITestUser, ...args: string[]
    ): Promise<void> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .jail([
                ...args,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 12000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
    }

    async unJail(owner: ITestUser, ...args: string[]
    ): Promise<void> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unJail([
                ...args,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 12000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
    }

    async changeRewardAddress(owner: ITestUser, ...args: string[]
    ): Promise<void> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unJail([
                ...args,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 12000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
    }
}