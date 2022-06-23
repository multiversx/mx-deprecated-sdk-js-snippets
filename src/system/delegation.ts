import { Address, IAddress, Interaction, ResultsParser, ReturnCode, SmartContract, SmartContractAbi, TokenPayment, TransactionWatcher } from "@elrondnetwork/erdjs";
import path from "path";
import { loadAbiRegistry } from "../contracts";
import { computeGasLimitOnInteraction } from "../gasLimit";
import { ITestSession, ITestUser } from "../interface";
import { INetworkConfig, INetworkProvider } from "../interfaceOfNetwork";
import { ErrEventOccurance, ErrNumberOfNodesMismatch } from "../errors";

const DelegationManagerContractAddress = new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqylllslmq6y6");
const PathToAbi = path.resolve(__dirname, "delegation.abi.json");
const DelegationContractStake = 1250;

export async function createDelegationManagerInteractor(session: ITestSession) {
    let registry = await loadAbiRegistry(PathToAbi);
    let abi = new SmartContractAbi(registry);
    let contract = new SmartContract({ address: DelegationManagerContractAddress, abi: abi });
    let networkProvider = session.networkProvider;
    let networkConfig = session.getNetworkConfig();
    let interactor = new DelegationManagerInteractor(contract, networkProvider, networkConfig);
    return interactor;
}

export async function createDelegatorInteractor(session: ITestSession, delegationSCAddress: Address) {
    let registry = await loadAbiRegistry(PathToAbi);
    let abi = new SmartContractAbi(registry);
    let contract = new SmartContract({ address: delegationSCAddress, abi: abi });
    let networkProvider = session.networkProvider;
    let networkConfig = session.getNetworkConfig();
    let interactor = new DelegatorInteractor(contract, networkProvider, networkConfig);
    return interactor;
}

export class DelegationManagerInteractor {
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

    async createNewDelegationContract(owner: ITestUser, denominatedDelegationCap: number, serviceFee: number):
        Promise<{ delegationContract: IAddress, returnCode: ReturnCode }> {
        const cost = DelegationContractStake;

        const interaction = <Interaction>this.contract.methods
            .createNewDelegationContract([
                TokenPayment.egldFromAmount(denominatedDelegationCap),
                serviceFee,
            ])
            .withValue(TokenPayment.egldFromAmount(cost))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        const gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        const transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        const transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);

        const { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, interaction.getEndpoint());
        const logs = transactionOnNetwork.logs;
        const event = logs.findFirstOrNoneEvent("SCDeploy");
        if (event) {
            let delegationContractAddress = event.address;
            return { delegationContract: delegationContractAddress, returnCode };
        }

        throw new ErrEventOccurance("SCDeploy");
    }


    async getAllContractAddresses(): Promise<Address[]> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods.getAllContractAddresses();
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let { values } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        const unwrappedValues = values.map(value => value.valueOf());
        let contractAddresses = unwrappedValues.map(value => new Address(value.valueOf().tostring()));

        return contractAddresses;
    }

    async getContractConfig(caller: Address): Promise<any[]> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods.getContractConfig().withQuerent(caller);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let { values } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        const unwrappedValues = values.map(value => value.valueOf());

        return unwrappedValues
    }
}

export class DelegatorInteractor {
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

    async whitelistForMerge(owner: ITestUser, addressToWhitelist: Address): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .whitelistForMerge([
                addressToWhitelist,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "whitelistForMerge")
    }

    async deleteWhitelistForMerge(owner: ITestUser): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .deleteWhitelistForMerge([])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "deleteWhitelistForMerge")
    }

    async getWhitelistForMerge(): Promise<any[]> {
        return await this.runQuery(<Interaction>this.contract.methods.getWhitelistForMerge([]))
    }

    async addNodes(owner: ITestUser, numberOfNodes: number, gasLimit: number, ...args: Buffer[]): Promise<ReturnCode> {
        let keySignaturePair: Buffer[] = [];

        let calculatedNumberOfNodes = ((args.length) % 2 != 0) ? 0 : (args.length / 2);

        if (numberOfNodes != calculatedNumberOfNodes) {
            throw new ErrNumberOfNodesMismatch
        }

        let variableGasLimit = 1000000 + (Number(numberOfNodes) * 6000000);

        let interaction = <Interaction>this.contract.methods
            .addNodes([...args])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, gasLimit, "addNodes")
    }

    async removeNodes(owner: ITestUser, ...publicBLSKeys: Buffer[]): Promise<ReturnCode> {
        let numberOfNodes = publicBLSKeys.length;

        let variableGasLimit = 1000000 + (Number(numberOfNodes) * 6000000);

        let interaction = <Interaction>this.contract.methods
            .removeNodes([...publicBLSKeys])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, variableGasLimit, "removeNodes")
    }

    async stakeNodes(owner: ITestUser, ...publicBlsKeys: Buffer[]): Promise<ReturnCode> {
        let numberOfNodes = publicBlsKeys.length;

        let variableGasLimit = 1000000 + (Number(numberOfNodes) * 6000000);

        let interaction = <Interaction>this.contract.methods
            .stakeNodes([...publicBlsKeys])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, variableGasLimit, "stakeNodes")
    }

    async unStakeNodes(owner: ITestUser, ...publicBlsKeys: Buffer[]): Promise<ReturnCode> {
        let numberOfNodes = publicBlsKeys.length;

        let variableGasLimit = 1000000 + (Number(numberOfNodes) * 6000000);

        let interaction = <Interaction>this.contract.methods
            .unStakeNodes([...publicBlsKeys])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, variableGasLimit, "unStakeNodes")
    }

    async reStakeUnStakedNodes(owner: ITestUser, ...publicBlsKeys: Buffer[]): Promise<ReturnCode> {
        let numberOfNodes = publicBlsKeys.length;

        let variableGasLimit = 1000000 + (Number(numberOfNodes) * 10000000);

        let interaction = <Interaction>this.contract.methods
            .reStakeUnStakedNodes([...publicBlsKeys])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, variableGasLimit, "reStakeUnStakedNodes")
    }

    async unBondNodes(owner: ITestUser, ...publicBlsKeys: Buffer[]): Promise<ReturnCode> {
        let numberOfNodes = publicBlsKeys.length;

        let variableGasLimit = 1000000 + (Number(numberOfNodes) * 6000000);

        let interaction = <Interaction>this.contract.methods
            .unBondNodes([...publicBlsKeys])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, variableGasLimit, "unBondNodes")
    }

    async unJailNodes(owner: ITestUser, ...publicBlsKeys: Buffer[]): Promise<ReturnCode> {
        let numberOfNodes = publicBlsKeys.length;

        let variableGasLimit = 1000000 + (Number(numberOfNodes) * 6000000);

        let interaction = <Interaction>this.contract.methods
            .unJailNodes([...publicBlsKeys])
            .withValue(TokenPayment.egldFromAmount(2.5 * numberOfNodes))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, variableGasLimit, "unJailNodes")
    }

    async delegate(owner: ITestUser, valueInEgld: number): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .delegate([])
            .withValue(TokenPayment.egldFromAmount(valueInEgld))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 12000000, "delegate")
    }

    async unDelegate(owner: ITestUser, amountToUndelegate: number): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unDelegate([TokenPayment.egldFromAmount(amountToUndelegate)])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 12000000, "unDelegate")
    }

    async withdraw(owner: ITestUser): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .withdraw([])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 2000000, "withdraw")
    }

    async changeServiceFee(owner: ITestUser, newServiceFee: number): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .changeServiceFee([newServiceFee])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 2000000, "changeServiceFee")
    }

    async setCheckCapOnReDelegateRewards(owner: ITestUser, settingValue: string): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .setCheckCapOnReDelegateRewards([settingValue])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 2000000, "setCheckCapOnReDelegateRewards")
    }

    async setAutomaticActivation(owner: ITestUser, settingValue: string): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .setAutomaticActivation([settingValue])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 2000000, "setAutomaticActivation")
    }

    async modifyTotalDelegationCap(owner: ITestUser, newTotalDelegationCap: number): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .modifyTotalDelegationCap([TokenPayment.egldFromAmount(newTotalDelegationCap)])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 2000000, "modifyTotalDelegationCap")
    }

    async updateRewards(owner: ITestUser): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .updateRewards([])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 2000000, "updateRewards")
    }

    async claimRewards(owner: ITestUser): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .claimRewards([])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 6000000, "claimRewards")
    }

    async getRewardData(epochNumber: number): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getRewardData([epochNumber]))
    }

    async getClaimableRewards(delegatorAddress: Address): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getClaimableRewards([delegatorAddress]))
    }

    async getTotalCumulatedRewardsForUser(delegatorAddress: Address): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getTotalCumulatedRewardsForUser([delegatorAddress]))
    }

    async getNumUsers(): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getNumUsers([]))
    }

    async getTotalUnStaked(): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getTotalUnStaked([]))
    }

    async getTotalActiveStake(): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getTotalActiveStake([]))
    }

    async getUserActiveStake(delegatorAddress: Address): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getUserActiveStake([delegatorAddress]))
    }

    async getUserUnStakedValue(delegatorAddress: Address): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getUserUnStakedValue([delegatorAddress]))
    }

    async getUserUnBondable(delegatorAddress: Address): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getUserUnBondable([delegatorAddress]))
    }

    async getUserUnDelegatedList(delegatorAddress: Address): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getUserUnDelegatedList([delegatorAddress]))
    }

    async getNumNodes(): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getNumNodes([]))
    }

    async getAllNodeStates(): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getAllNodeStates([]))
    }

    async getContractConfig(): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getContractConfig([]))
    }

    async reDelegateRewards(owner: ITestUser): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .reDelegateRewards([])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 12000000, "reDelegateRewards")
    }

    async isDelegator(owner: ITestUser, addressToCheck: Address): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .isDelegator([addressToCheck])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 1200000, "isDelegator")
    }

    async getDelegatorFundsData(delegatorAddress: Address): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getDelegatorFundsData([delegatorAddress]))
    }

    async setMetaData(owner: ITestUser, metadata: { name: string, website: string, identifier: string }): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .setMetaData([metadata.name,
            metadata.website,
            metadata.identifier
            ])
            .withValue(TokenPayment.egldFromAmount(0))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 2000000, "setMetaData")
    }

    async getMetaData(): Promise<any> {
        return await this.runQuery(<Interaction>this.contract.methods.getMetaData([]))
    }

    private async runInteraction(owner: ITestUser, interaction: Interaction, gaslimit: number, endpoint: string): Promise<ReturnCode> {
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

    private async runQuery(interaction: Interaction): Promise<any[]> {
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let { values } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        const unwrappedValues = values.map(value => value.valueOf());

        return unwrappedValues
    }
}
