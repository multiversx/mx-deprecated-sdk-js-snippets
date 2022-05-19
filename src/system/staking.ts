import { Address, BigUIntValue, BytesType, BytesValue, ContractFunction, Interaction, ResultsParser, ReturnCode, SmartContract, SmartContractAbi, TokenIdentifierValue, TokenPayment, Transaction, TransactionPayload, TransactionWatcher, ESDTTransferPayloadBuilder } from "@elrondnetwork/erdjs";
import { NetworkConfig } from "@elrondnetwork/erdjs-network-providers";
import BigNumber from "bignumber.js";
import { Signer } from "crypto";
import path from "path";
import { stringify } from "querystring";
import { loadAbiRegistry } from "../contracts";
import { computeGasLimitOnInteraction, computeGasLimit } from "../gasLimit";
import { IBLS, IBlsKeyOwnerAddress, ITestSession, ITestUser, IToken } from "../interface";
import { INetworkConfig, INetworkProvider } from "../interfaceOfNetwork";

const StakingContractAddress = new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqllls0lczs7");
const ValidatorContractAddress = new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l");
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

    async stake(owner: ITestUser, blsKey: Buffer, rewardAddress: Address, ownerAddress: Address): Promise<any> {
        let cost = NodeStakeAmount;

        let interaction = <Interaction>this.contract.methods
            .stake([
                blsKey,
                rewardAddress,
                ownerAddress
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withQuerent(ValidatorContractAddress)
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, (6000000))
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs
    }

    async register(owner: ITestUser, blsKey: Buffer, rewardAddress: Address, ownerAddress: Address): Promise<any> {
        let cost = NodeStakeAmount;
        let interaction = <Interaction>this.contract.methods
            .stake([
                blsKey,
                rewardAddress,
                ownerAddress
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withQuerent(ValidatorContractAddress)
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, (6000000))
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs
    }

    async unStake(owner: ITestUser, blsKey: Buffer, rewardAddress: Address): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unStake([
                blsKey,
                rewardAddress
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withQuerent(ValidatorContractAddress)
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

    async unBond(owner: ITestUser, blsKey: Buffer
    ): Promise<void> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unBond([
                blsKey,
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

    async checkIfStaked(blsKey: Buffer): Promise<any> {

        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods.isStaked([blsKey]);
        let query = interaction.check().buildQuery();
        query.caller = new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l")

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let { values } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        const unwrappedValues = values.map(value => value.valueOf());

        console.info(queryResponse.returnCode)

        return queryResponse.returnCode
    }

    //To be tested using a local testnet (20min epoch) so that a node could naturally move through observer-> waiting validator ->
    //eligible -> jailed
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

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 6000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
    }

    //To be unJailed after previous Jail action.
    async unJail(owner: ITestUser, args: string): Promise<void> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unJail([
                ...args,
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

    async changeRewardAddress(owner: ITestUser, newRewardAddress: Address, blsKey: Buffer
    ): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .changeRewardAddress([
                newRewardAddress,
                blsKey,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withQuerent(new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l"))
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

    async changeValidatorKeys(owner: ITestUser, oldBlsKey: Buffer, newBlsKey: Buffer
    ): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .changeValidatorKeys([
                oldBlsKey,
                newBlsKey,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withQuerent(ValidatorContractAddress)
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

    async switchJailedWithWaiting(owner: ITestUser, blsKey: string): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .switchJailedWithWaiting([
                blsKey
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

    async getWaitingListIndex(blsKey: Buffer): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods
            .getQueueIndex([blsKey])
            .withQuerent(ValidatorContractAddress);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);

        console.info(queryResponse.returnMessage)

        return queryResponse.returnMessage
    }

    async getWaitingListSize(): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods
            .getQueueSize()
            .withQuerent(ValidatorContractAddress);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);

        console.info(queryResponse.returnData)

        return queryResponse.returnData
    }

    async getRewardAddress(blsKey: Buffer): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods
            .getRewardAddress([blsKey])
            .withQuerent(ValidatorContractAddress);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);

        console.info(queryResponse.returnData)

        return queryResponse.returnData
    }

    async getBLSKeyStatus(blsKey: Buffer): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods
            .getBLSKeyStatus([blsKey])
            .withQuerent(ValidatorContractAddress);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let { values } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        console.info(queryResponse.returnData)

        return queryResponse.returnData
    }

    async getRemainingUnbondPeriod(blsKey: Buffer): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods
            .getRemainingUnbondPeriod([blsKey])
            .withQuerent(ValidatorContractAddress);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);

        console.info(queryResponse.returnData)

        return queryResponse.returnData
    }

    async getWaitingListRegisterNonceAndRewardAddress(): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods
            .getQueueRegisterNonceAndRewardAddress()
            .withQuerent(ValidatorContractAddress);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);

        console.info(queryResponse.returnMessage)

        return queryResponse.returnMessage
    }

    async updateConfigMinNodes(owner: ITestUser, newMinNodes: number): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .updateConfigMinNodes([
                newMinNodes
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

    async setOwnersOnAddresses(owner: ITestUser, ...BlsKeyOwnerAddressPair: IBlsKeyOwnerAddress[]): Promise<any> {
        //TODO: parse input
        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .setOwnersOnAddresses([
                ...BlsKeyOwnerAddressPair
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

    async getOwner(blsKey: Buffer): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods
            .getOwner([blsKey])
            .withQuerent(ValidatorContractAddress);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);

        console.info(queryResponse.returnData)

        return queryResponse.returnData
    }

    async updateConfigMaxNodes(owner: ITestUser, newMaxNodes: number): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .updateConfigMaxNodes([
                newMaxNodes
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

    async stakeNodesFromQueue(owner: ITestUser, numberOfNodesFromQueue: number): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .stakeNodesFromQueue([
                numberOfNodesFromQueue
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

    async unStakeAtEndOfEpoch(owner: ITestUser, blsKey: string): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .unStakeAtEndOfEpoch([
                blsKey
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

    async getTotalNumberOfRegisteredNodes(): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods
            .getTotalNumberOfRegisteredNodes()
            .withQuerent(ValidatorContractAddress);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);

        console.info(queryResponse.returnData)

        return queryResponse.returnData
    }

    async resetLastUnJailedFromQueue(owner: ITestUser): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .resetLastUnJailedFromQueue([])
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

    async cleanAdditionalQueue(owner: ITestUser): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .cleanAdditionalQueue([])
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

    async changeOwnerAndRewardAddress(owner: ITestUser, newOwnerAddress: Address, ...blsKey: Buffer[]): Promise<any> {
        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .changeOwnerAndRewardAddress([
                newOwnerAddress,
                ...blsKey
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withQuerent(ValidatorContractAddress)
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

    async fixWaitingListQueueSize(owner: ITestUser): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .fixWaitingListQueueSize([])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
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

    async addMissingNodeToQueue(owner: ITestUser, blsKey: Buffer): Promise<any> {

        let cost = 0

        let interaction = <Interaction>this.contract.methods
            .addMissingNodeToQueue([blsKey])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 300000000)
        interaction.withGasLimit(gasLimit)

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction)

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs
    }
}