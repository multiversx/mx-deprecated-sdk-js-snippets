import { Address, BigUIntValue, BytesType, BytesValue, ContractFunction, Interaction, ResultsParser, ReturnCode, SmartContract, SmartContractAbi, TokenIdentifierValue, TokenPayment, Transaction, TransactionPayload, TransactionWatcher, ESDTTransferPayloadBuilder } from "@elrondnetwork/erdjs";
import { NetworkConfig } from "@elrondnetwork/erdjs-network-providers";
import path from "path";
import { loadAbiRegistry } from "../contracts";
import { computeGasLimitOnInteraction, computeGasLimit } from "../gasLimit";
import { IBLS, IBlsKeyOwnerAddress, ITestSession, ITestUser, IToken } from "../interface";
import { INetworkConfig, INetworkProvider } from "../interfaceOfNetwork";

const ValidatorContractAddress = new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l");
const PathToAbi = path.resolve(__dirname, "validator.abi.json");
const NodeStakeAmount = 2500;

export async function createValidatorInteractor(session: ITestSession) {
    let registry = await loadAbiRegistry(PathToAbi);
    let abi = new SmartContractAbi(registry, ["validator"]);
    let contract = new SmartContract({ address: ValidatorContractAddress, abi: abi });
    let networkProvider = session.networkProvider;
    let networkConfig = session.getNetworkConfig();
    let interactor = new ValidatorInteractor(contract, networkProvider, networkConfig);
    return interactor;
}

export class ValidatorInteractor {
    private readonly contract: SmartContract;
    private readonly networkProvider: INetworkProvider;
    private readonly networkConfig: INetworkConfig;
    private readonly transactionWatcher: TransactionWatcher;
    private readonly resultsParser: ResultsParser;

    constructor(contract: SmartContract, networkProvider: INetworkProvider, networkConfig: INetworkConfig) {
        this.contract = contract;
        this.networkProvider = networkProvider;
        this.networkConfig = networkConfig;
        this.transactionWatcher = new TransactionWatcher(networkProvider);
        this.resultsParser = new ResultsParser();
    }

    async stake(owner: ITestUser, numberOfNodes: number, ...args: Buffer[]
    ): Promise<any> {
        let cost = Number(numberOfNodes) * NodeStakeAmount;
        let keySignaturePair: Buffer[] = [];

        //if even value => a reward address has been provided on the last position
        let rewardAddress = ((args.length) % 2 != 0) ? args[args.length - 1] : [];

        for (let i = 0; i < (args.length - 1); i++) {
            let key = args[i];
            let signature = args[i + 1]
            keySignaturePair.push(key, signature)
        }

        let interaction = <Interaction>this.contract.methods
            .stake([
                numberOfNodes,
                keySignaturePair,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, (6000000 * Number(numberOfNodes)))
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs
    }

    async unStake(owner: ITestUser, ...blsKeys: Buffer[]): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unStake([
                ...blsKeys,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 6000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs
    }

    async unStakeNodes(owner: ITestUser, ...blsKeys: Buffer[]): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unStakeNodes([
                ...blsKeys,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 6000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs
    }

    async unStakeTokens(owner: ITestUser, unstakeValue: number): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unStakeTokens([
                unstakeValue.toString(),
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 6000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs
    }

    async unBond(owner: ITestUser, ...blsKey: Buffer[]
    ): Promise<void> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unBond([
                ...blsKey,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 6000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

    }

    async unBondNodes(owner: ITestUser, ...blsKey: Buffer[]
    ): Promise<void> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unBondNodes([
                ...blsKey,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 6000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

    }

    async unBondTokens(owner: ITestUser): Promise<void> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unBondTokens([])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 6000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

    }

    //To be unJailed after previous Jail action.
    async unJail(owner: ITestUser, ...blsKeys: Buffer[]): Promise<void> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unJail([
                ...blsKeys,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 6000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
    }

    async changeRewardAddress(owner: ITestUser, newRewardAddress: Address, ...blsKeys: Buffer[]
    ): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .changeRewardAddress([
                newRewardAddress,
                ...blsKeys,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 6000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs
    }

    async getTotalStaked(address?: Address): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods.getTotalStaked([address]);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let { values } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        const unwrappedValues = values.map(value => value.valueOf());

        console.info(queryResponse.returnData)

        return unwrappedValues
    }

    async getTotalStakedTopUpStakedBlsKeys(address: Address): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods
            .getTotalStakedTopUpStakedBlsKeys([address])
            .withQuerent(ValidatorContractAddress)
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);

        console.info(queryResponse.returnData)

        return queryResponse.returnData
    }

    async getBlsKeysStatus(validatorAddress: Address): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods
            .getBlsKeysStatus([validatorAddress])
            .withQuerent(ValidatorContractAddress);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let { values } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        const unwrappedValues = values.map(value => value.valueOf());

        console.info(queryResponse.returnData)

        return unwrappedValues
    }

    async cleanRegisteredData(owner: ITestUser): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .cleanRegisteredData([])
            .withNonce(owner.account.getNonceThenIncrement())
            .withValue(TokenPayment.egldFromAmount(cost))
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 6000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs
    }

    async getUnStakedTokensList(validatorAddress: Address): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods.getUnStakedTokensList([validatorAddress]);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let { values } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        const unwrappedValues = values.map(value => value.valueOf());

        console.info(queryResponse.returnData)

        return unwrappedValues
    }

    async reStakeUnStakedNodes(owner: ITestUser, ...blsKeys: Buffer[]): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .reStakeUnStakedNodes([
                ...blsKeys
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withValue(TokenPayment.egldFromAmount(cost))
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 120000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs
    }
}