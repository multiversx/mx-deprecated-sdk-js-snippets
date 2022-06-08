import { Address, Interaction, ResultsParser, ReturnCode, SmartContract, SmartContractAbi, TokenPayment, TransactionWatcher } from "@elrondnetwork/erdjs";
import path from "path";
import { loadAbiRegistry } from "../contracts";
import { computeGasLimitOnInteraction } from "../gasLimit";
import { ITestSession, ITestUser } from "../interface";
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
    ): Promise<ReturnCode> {
        let keySignaturePair: Buffer[] = [];

        //if even value => a reward address has been provided on the last position
        const rewardAddress = ((args.length) % 2 != 0) ? args[args.length - 1] : [];

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
            .withValue(TokenPayment.egldFromAmount(Number(numberOfNodes) * NodeStakeAmount))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, (6000000 * Number(numberOfNodes)), "stake")
    }

    async unStake(owner: ITestUser, ...blsKeys: Buffer[]): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unStake([
                ...blsKeys,
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unStake")
    }

    async unStakeNodes(owner: ITestUser, ...blsKeys: Buffer[]): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unStakeNodes([
                ...blsKeys,
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unStakeNodes")
    }

    async unStakeTokens(owner: ITestUser, unstakeValue: number): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unStakeTokens([
                unstakeValue.toString(),
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unStakeTokens")
    }

    async unBond(owner: ITestUser, ...blsKey: Buffer[]
    ): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unBond([
                ...blsKey,
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unBond")
    }

    async unBondNodes(owner: ITestUser, ...blsKey: Buffer[]
    ): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unBondNodes([
                ...blsKey,
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unBondNodes")
    }

    async unBondTokens(owner: ITestUser): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unBondTokens([])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unBondTokens")
    }

    //To be unJailed after previous Jail action.
    async unJail(owner: ITestUser, ...blsKeys: Buffer[]): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unJail([
                ...blsKeys,
            ])
            .withValue(TokenPayment.egldFromAmount(2.5))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unJail")
    }

    async changeRewardAddress(owner: ITestUser, newRewardAddress: Address, ...blsKeys: Buffer[]
    ): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .changeRewardAddress([
                newRewardAddress,
                ...blsKeys,
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "changeRewardAddress")
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
        let interaction = <Interaction>this.contract.methods
            .cleanRegisteredData([])
            .withNonce(owner.account.getNonceThenIncrement())
            .withValue(TokenPayment.egldFromAmount(0))
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "cleanRegisteredData")
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
        let interaction = <Interaction>this.contract.methods
            .reStakeUnStakedNodes([
                ...blsKeys
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withValue(TokenPayment.egldFromAmount(0))
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "reStakeUnStakedNodes")
    }

    async runInteraction(owner: ITestUser, interaction: Interaction, gaslimit: number, endpoint: string): Promise<ReturnCode> {
        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, gaslimit);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);

        let endpointDefinition = this.contract.getEndpoint(endpoint);
        let { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, endpointDefinition);

        return returnCode
    }
}
