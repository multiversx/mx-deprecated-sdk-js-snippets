import path from "path";
import { Address, Interaction, ResultsParser, SmartContract, SmartContractAbi, TokenPayment, TransactionWatcher, ReturnCode } from "@elrondnetwork/erdjs";
import { loadAbiRegistry } from "../contracts";
import { computeGasLimitOnInteraction } from "../gasLimit";
import { IBlsKeyOwnerAddress, ITestSession, ITestUser, IAudit } from "../interface";
import { INetworkConfig, INetworkProvider } from "../interfaceOfNetwork";

const StakingContractAddress = new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqllls0lczs7");
const ValidatorContractAddress = new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l");
const PathToAbi = path.resolve(__dirname, "staking.abi.json");
const NodeStakeAmount = 2500;

export async function createStakingInteractor(session: ITestSession) {
    const registry = await loadAbiRegistry(PathToAbi);
    const abi = new SmartContractAbi(registry, ["staking"]);
    const contract = new SmartContract({ address: StakingContractAddress, abi: abi });
    const networkProvider = session.networkProvider;
    const networkConfig = session.getNetworkConfig();
    const audit = session.audit;
    const interactor = new StakingInteractor(contract, networkProvider, networkConfig, audit);
    return interactor;
}

//majority of functions can be called only by the validator sc address
//getTotalNumberOfRegisteredNodes, fixWaitingListQueueSize, addMissingNodeToQueue can be called by anyone.
export class StakingInteractor {
    private readonly contract: SmartContract;
    private readonly networkProvider: INetworkProvider;
    private readonly networkConfig: INetworkConfig;
    private readonly transactionWatcher: TransactionWatcher;
    private readonly resultsParser: ResultsParser;
    private readonly audit: IAudit;

    constructor(contract: SmartContract, networkProvider: INetworkProvider, networkConfig: INetworkConfig, audit: IAudit) {
        this.contract = contract;
        this.networkProvider = networkProvider;
        this.networkConfig = networkConfig;
        this.transactionWatcher = new TransactionWatcher(networkProvider);
        this.resultsParser = new ResultsParser();
        this.audit = audit;
    }

    async stake(owner: ITestUser, blsKey: Buffer, rewardAddress: Address, ownerAddress: Address): Promise<ReturnCode> {
        const cost = NodeStakeAmount;

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

        return await this.runInteraction(owner, interaction, 6000000, "stake")
    }

    async register(owner: ITestUser, blsKey: Buffer, rewardAddress: Address, ownerAddress: Address): Promise<ReturnCode> {
        const cost = NodeStakeAmount;
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

        return await this.runInteraction(owner, interaction, 6000000, "register")
    }

    async unStake(owner: ITestUser, blsKey: Buffer, rewardAddress: Address): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unStake([
                blsKey,
                rewardAddress
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withQuerent(ValidatorContractAddress)
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unStake")
    }

    async unBond(owner: ITestUser, blsKey: Buffer
    ): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unBond([
                blsKey,
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unBond")
    }

    async checkIfStaked(blsKey: Buffer): Promise<ReturnCode> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods.isStaked([blsKey]);
        let query = interaction.check().buildQuery();
        query.caller = ValidatorContractAddress;

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let { returnCode } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        console.info(queryResponse.returnMessage)
        return returnCode
    }

    //To be unJailed after previous Jail action.
    async unJail(owner: ITestUser, args: string): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unJail([
                ...args,
            ])
            .withValue(TokenPayment.egldFromAmount(2.5))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unJail")
    }

    async changeRewardAddress(owner: ITestUser, newRewardAddress: Address, blsKey: Buffer
    ): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .changeRewardAddress([
                newRewardAddress,
                blsKey,
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withQuerent(ValidatorContractAddress)
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "changeRewardAddress")
    }

    async changeValidatorKeys(owner: ITestUser, oldBlsKey: Buffer, newBlsKey: Buffer
    ): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .changeValidatorKeys([
                oldBlsKey,
                newBlsKey,
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withQuerent(ValidatorContractAddress)
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "changeValidatorKeys")
    }

    async switchJailedWithWaiting(owner: ITestUser, blsKey: string): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .switchJailedWithWaiting([
                blsKey
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "switchJailedWithWaiting")
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

        return queryResponse.returnData
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

    async updateConfigMinNodes(owner: ITestUser, newMinNodes: number): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .updateConfigMinNodes([
                newMinNodes
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "updateConfigMinNodes")
    }

    async setOwnersOnAddresses(owner: ITestUser, ...BlsKeyOwnerAddressPair: IBlsKeyOwnerAddress[]): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .setOwnersOnAddresses([
                ...BlsKeyOwnerAddressPair
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "setOwnersOnAddresses")
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

    async updateConfigMaxNodes(owner: ITestUser, newMaxNodes: number): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .updateConfigMaxNodes([
                newMaxNodes
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "updateConfigMaxNodes")
    }

    async stakeNodesFromQueue(owner: ITestUser, numberOfNodesFromQueue: number): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .stakeNodesFromQueue([
                numberOfNodesFromQueue
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "stakeNodesFromQueue")
    }

    async unStakeAtEndOfEpoch(owner: ITestUser, blsKey: string): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unStakeAtEndOfEpoch([
                blsKey
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unStakeAtEndOfEpoch")
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

    async resetLastUnJailedFromQueue(owner: ITestUser): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .resetLastUnJailedFromQueue([])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unStakeAtEndOfEpoch")
    }

    async cleanAdditionalQueue(owner: ITestUser): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .cleanAdditionalQueue([])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "cleanAdditionalQueue")
    }

    async changeOwnerAndRewardAddress(owner: ITestUser, newOwnerAddress: Address, ...blsKey: Buffer[]): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .changeOwnerAndRewardAddress([
                newOwnerAddress,
                ...blsKey
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withQuerent(ValidatorContractAddress)
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "changeOwnerAndRewardAddress")
    }

    async fixWaitingListQueueSize(owner: ITestUser): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .fixWaitingListQueueSize([])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "fixWaitingListQueueSize")
    }

    async addMissingNodeToQueue(owner: ITestUser, blsKey: Buffer): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .addMissingNodeToQueue([blsKey])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "fixWaitingListQueueSize")
    }

    async runInteraction(owner: ITestUser, interaction: Interaction, gaslimit: number, endpoint: string): Promise<ReturnCode> {
        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, gaslimit);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        const transactionHash = await this.networkProvider.sendTransaction(transaction);
        await this.audit.onTransactionSent({ action: endpoint, args: interaction.getArguments(), transactionHash: transactionHash });

        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        await this.audit.onTransactionCompleted({ transactionHash: transactionHash, transaction: transactionOnNetwork });

        let endpointDefinition = this.contract.getEndpoint(endpoint);
        let { returnCode, returnMessage } = this.resultsParser.parseOutcome(transactionOnNetwork, endpointDefinition);

        return returnCode
    }
}
