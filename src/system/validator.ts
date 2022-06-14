import { Address, Interaction, ResultsParser, ReturnCode, SmartContract, SmartContractAbi, TokenPayment, TransactionWatcher } from "@elrondnetwork/erdjs";
import path from "path";
import { loadAbiRegistry } from "../contracts";
import { computeGasLimitOnInteraction } from "../gasLimit";
import { ITestSession, ITestUser, IAudit } from "../interface";
import { INetworkConfig, INetworkProvider } from "../interfaceOfNetwork";

const ValidatorContractAddress = new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l");
const PathToAbi = path.resolve(__dirname, "validator.abi.json");
const NodeStakeAmount = 2500;

export async function createValidatorInteractor(session: ITestSession) {
    const registry = await loadAbiRegistry(PathToAbi);
    const abi = new SmartContractAbi(registry, ["validator"]);
    const contract = new SmartContract({ address: ValidatorContractAddress, abi: abi });
    const networkProvider = session.networkProvider;
    const networkConfig = session.getNetworkConfig();
    const audit = session.audit;
    const interactor = new ValidatorInteractor(contract, networkProvider, networkConfig, audit);
    return interactor;
}

export class ValidatorInteractor {
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

    async stake(owner: ITestUser, numberOfNodes: number, ...args: Buffer[]
    ): Promise<{ returnCode: ReturnCode, returnMessage: string }> {
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

    async unStake(owner: ITestUser, ...blsKeys: Buffer[]): Promise<{ returnCode: ReturnCode, returnMessage: string }> {
        let interaction = <Interaction>this.contract.methods
            .unStake([
                ...blsKeys,
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unStake")
    }

    async unStakeNodes(owner: ITestUser, ...blsKeys: Buffer[]): Promise<{ returnCode: ReturnCode, returnMessage: string }> {
        let interaction = <Interaction>this.contract.methods
            .unStakeNodes([
                ...blsKeys,
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unStakeNodes")
    }

    async unStakeTokens(owner: ITestUser, unstakeValue: number): Promise<{ returnCode: ReturnCode, returnMessage: string }> {
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
    ): Promise<{ returnCode: ReturnCode, returnMessage: string }> {
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
    ): Promise<{ returnCode: ReturnCode, returnMessage: string }> {
        let interaction = <Interaction>this.contract.methods
            .unBondNodes([
                ...blsKey,
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unBondNodes")
    }

    async unBondTokens(owner: ITestUser): Promise<{ returnCode: ReturnCode, returnMessage: string }> {
        let interaction = <Interaction>this.contract.methods
            .unBondTokens([])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "unBondTokens")
    }

    //To be unJailed after previous Jail action.
    async unJail(owner: ITestUser, ...blsKeys: Buffer[]): Promise<{ returnCode: ReturnCode, returnMessage: string }> {
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
    ): Promise<{ returnCode: ReturnCode, returnMessage: string }> {
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
        return await this.runQuery(<Interaction>this.contract.methods.getTotalStaked([address]))
    }

    async getTotalStakedTopUpStakedBlsKeys(address: Address): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getTotalStakedTopUpStakedBlsKeys([address]))
    }

    async getBlsKeysStatus(validatorAddress: Address): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getBlsKeysStatus([validatorAddress]))
    }

    async cleanRegisteredData(owner: ITestUser): Promise<{ returnCode: ReturnCode, returnMessage: string }> {
        let interaction = <Interaction>this.contract.methods
            .cleanRegisteredData([])
            .withNonce(owner.account.getNonceThenIncrement())
            .withValue(TokenPayment.egldFromAmount(0))
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "cleanRegisteredData")
    }

    async getUnStakedTokensList(validatorAddress: Address): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getUnStakedTokensList([validatorAddress]))
    }

    async reStakeUnStakedNodes(owner: ITestUser, ...blsKeys: Buffer[]): Promise<{ returnCode: ReturnCode, returnMessage: string }> {
        let interaction = <Interaction>this.contract.methods
            .reStakeUnStakedNodes([
                ...blsKeys
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withValue(TokenPayment.egldFromAmount(0))
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "reStakeUnStakedNodes")
    }

    async runInteraction(owner: ITestUser, interaction: Interaction, gaslimit: number, endpoint: string):
        Promise<{ returnCode: ReturnCode, returnMessage: string }> {
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

        return { returnCode, returnMessage }
    }

    async runQuery(interaction: Interaction): Promise<any> {

        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let { values } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        const unwrappedValues = values.map(value => value.valueOf());

        console.info(queryResponse.returnData)

        return unwrappedValues
    }
}
