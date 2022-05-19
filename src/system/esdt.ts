import { Address, BigUIntValue, BytesType, BytesValue, ContractFunction, Interaction, ResultsParser, ReturnCode, SmartContract, SmartContractAbi, TokenIdentifierValue, TokenPayment, TokenProperty, Transaction, TransactionPayload, TransactionWatcher, ESDTTransferPayloadBuilder } from "@elrondnetwork/erdjs";
import { NetworkConfig } from "@elrondnetwork/erdjs-network-providers";
import BigNumber from "bignumber.js";
import { Signer } from "crypto";
import path from "path";
import { loadAbiRegistry } from "../contracts";
import { computeGasLimitOnInteraction, computeGasLimit } from "../gasLimit";
import { ITestSession, ITestUser, IToken } from "../interface";
import { INetworkProvider } from "../interfaceOfNetwork";

const ESDTContractAddress = new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u");
const PathToAbi = path.resolve(__dirname, "esdt.abi.json");
const IssuePriceInEgld = new BigNumber("0.05");

export async function createESDTInteractor(session: ITestSession) {
    let registry = await loadAbiRegistry(PathToAbi);
    let abi = new SmartContractAbi(registry, ["esdt"]);
    let contract = new SmartContract({ address: ESDTContractAddress, abi: abi });
    let networkProvider = session.networkProvider;
    let networkConfig = session.getNetworkConfig();
    let interactor = new ESDTInteractor(contract, networkProvider, networkConfig);
    return interactor;
}

export class ESDTInteractor {
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

    async issueFungibleToken(owner: ITestUser, token: {
        name: string, ticker: string, supply: BigNumber.Value, decimals: number,
        canMint?: boolean,
        canBurn?: boolean,
        canFreeze?: boolean,
        canWipe?: boolean,
        canPause?: boolean,
        canAddSpecialRoles?: boolean,
        canChangeOwner?: boolean,
        canUpgrade?: boolean,
    }): Promise<IToken> {

        let argsForProperties = [
            ...(token.canMint ? [["canMint", "true"]] : []),
            ...(token.canBurn ? [["canBurn", "true"]] : []),
            ...(token.canFreeze ? [["canFreeze", "true"]] : []),
            ...(token.canWipe ? [["canWipe", "true"]] : []),
            ...(token.canPause ? [["canPause", "true"]] : []),
            ...(token.canAddSpecialRoles ? [["canAddSpecialRoles", "true"]] : []),
            ...(token.canChangeOwner ? [["canChangeOwner", "true"]] : []),
            ...(token.canUpgrade ? [["canUpgrade", "true"]] : []),
        ]

        let interaction = <Interaction>this.contract.methods
            .issue([
                token.name,
                token.ticker,
                token.supply,
                token.decimals,
                ...argsForProperties,
            ])
            .withValue(TokenPayment.egldFromAmount(IssuePriceInEgld))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("issue");
        let identifier = event!.topics[0].toString();

        console.info(`ESDTInteractor.issue [end]: token = ${identifier}`);
        return { identifier: identifier, decimals: token.decimals };
    }

    async issueSemiFungibleToken(owner: ITestUser, token: {
        name: string, ticker: string, canMint?: boolean,
        canBurn?: boolean,
        canFreeze?: boolean,
        canWipe?: boolean,
        canPause?: boolean,
        canTransferNFTCreateRole?: boolean,
        canAddSpecialRoles?: boolean,
        canChangeOwner?: boolean,
        canUpgrade?: boolean,
        canCreateMultiShard?: boolean,
    }): Promise<IToken> {

        let argsForProperties = [
            ...(token.canFreeze ? [["canFreeze", "true"]] : []),
            ...(token.canWipe ? [["canWipe", "true"]] : []),
            ...(token.canPause ? [["canPause", "true"]] : []),
            ...(token.canAddSpecialRoles ? [["canAddSpecialRoles", "true"]] : []),
            ...(token.canChangeOwner ? [["canChangeOwner", "true"]] : []),
            ...(token.canUpgrade ? [["canUpgrade", "true"]] : []),
            ...(token.canTransferNFTCreateRole ? [["canTransferNFTCreateRole", "true"]] : []),
            ...(token.canCreateMultiShard ? [["canCreateMultiShard", "true"]] : []),
        ]

        let interaction = <Interaction>this.contract.methods
            .issueSemiFungible([
                token.name,
                token.ticker,
                ...argsForProperties
            ])
            .withValue(TokenPayment.egldFromAmount(IssuePriceInEgld))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("issueSemiFungible");
        let identifier = event!.topics[0].toString();

        console.info(`ESDTInteractor.issueSemiFungible [end]: token = ${identifier}`);
        return { identifier: identifier, decimals: 0 };
    }

    async issueNonFungibleToken(owner: ITestUser, token: {
        name: string, ticker: string,
        canMint?: boolean,
        canBurn?: boolean,
        canFreeze?: boolean,
        canWipe?: boolean,
        canPause?: boolean,
        canTransferNFTCreateRole?: boolean,
        canAddSpecialRoles?: boolean,
        canChangeOwner?: boolean,
        canUpgrade?: boolean,
        canCreateMultiShard?: boolean,
    }): Promise<IToken> {

        let argsForProperties = [
            ...(token.canMint ? [["canMint", "true"]] : []),
            ...(token.canBurn ? [["canBurn", "true"]] : []),
            ...(token.canFreeze ? [["canFreeze", "true"]] : []),
            ...(token.canWipe ? [["canWipe", "true"]] : []),
            ...(token.canPause ? [["canPause", "true"]] : []),
            ...(token.canAddSpecialRoles ? [["canAddSpecialRoles", "true"]] : []),
            ...(token.canChangeOwner ? [["canChangeOwner", "true"]] : []),
            ...(token.canUpgrade ? [["canUpgrade", "true"]] : []),
            ...(token.canTransferNFTCreateRole ? [["canTransferNFTCreateRole", "true"]] : []),
            ...(token.canCreateMultiShard ? [["canCreateMultiShard", "true"]] : []),
        ]

        let interaction = <Interaction>this.contract.methods
            .issueNonFungible([
                token.name,
                token.ticker,
                ...argsForProperties
            ])
            .withValue(TokenPayment.egldFromAmount(IssuePriceInEgld))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("issueNonFungible");
        let identifier = event!.topics[0].toString();

        console.info(`ESDTInteractor.issueNonFungible [end]: token = ${identifier}`);
        return { identifier: identifier, decimals: 0 };
    }

    async burnToken(owner: ITestUser, token: { name: string, burnAmount: BigNumber.Value }): Promise<void> {
        let transaction = this.contract.call({
            func: new ContractFunction("ESDTLocalBurn"),
            gasLimit: 300000,
            args: [BytesValue.fromUTF8(token.name), new BigUIntValue(token.burnAmount)],
            receiver: owner.address,
            chainID: this.networkConfig.ChainID
        });
        transaction.setNonce(owner.account.getNonceThenIncrement());

        await owner.signer.sign(transaction);
        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("ESDTLocalBurn");

        let endpointDefinition = this.contract.getEndpoint("ESDTLocalBurn");
        let { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, endpointDefinition);
    }

    async mintToken(owner: ITestUser, token: { name: string, newSupply: BigNumber.Value }): Promise<void> {
        let transaction = this.contract.call({
            func: new ContractFunction("ESDTLocalMint"),
            gasLimit: 300000,
            args: [BytesValue.fromUTF8(token.name), new BigUIntValue(token.newSupply)],
            receiver: owner.address,
            chainID: this.networkConfig.ChainID
        });
        transaction.setNonce(owner.account.getNonceThenIncrement());

        await owner.signer.sign(transaction);
        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("ESDTLocalMint");

        let endpointDefinition = this.contract.getEndpoint("ESDTLocalMint");
        let { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, endpointDefinition);
    }

    async freezeAccountAddress(owner: ITestUser, token: { name: string, account: Address }): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .freeze([
                token.name,
                token.account,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("ESDTFreeze");

        let { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, interaction.getEndpoint());
        return returnCode;
    }

    async unfreezeAccountAddress(owner: ITestUser, token: { name: string, account: Address }): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unFreeze([
                token.name,
                token.account,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("unFreeze");

        let { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, interaction.getEndpoint());
        return returnCode;
    }

    async wipeAccount(owner: ITestUser, token: { name: string, account: Address }): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .wipe([
                token.name,
                token.account,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("wipe");

        let { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, interaction.getEndpoint());
        return returnCode;
    }

    async pauseTransactions(owner: ITestUser, token: { name: string }): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .pause([
                token.name,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("pause");

        let { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, interaction.getEndpoint());
        return returnCode;
    }

    async unPauseTransactions(owner: ITestUser, token: { name: string }): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unPause([
                token.name,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("unPause");
        let identifier = event!.topics[0].toString();

        console.info(`ESDTInteractor.unPauseTransactions [end]: token = ${identifier}`);
        let { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, interaction.getEndpoint());
        return returnCode;
    }

    async transferOwnership(owner: ITestUser, token: { name: string, newAccount: Address }): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .transferOwnership([
                token.name,
                token.newAccount,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("transferOwnership");
        let identifier = event!.topics[0].toString();

        console.info(`ESDTInteractor.TransferOwnership [end]: token = ${identifier}`);
        let { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, interaction.getEndpoint());
        return returnCode;
    }

    async getTokenProperties(token: { name: string }): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods.getTokenProperties([token.name]);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let { values } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        const unwrappedValues = values.map(value => value.valueOf());
        let tokenName = unwrappedValues[0].toString();
        let tokenType = unwrappedValues[1].toString();
        let ownerAddress = unwrappedValues[2].bech32();

        console.info(tokenName, tokenType, ownerAddress);
        let tokenProperties = unwrappedValues.slice(1, 6)
        let argsProperties = this.parseTokenProperties(unwrappedValues.slice(6, 17));
        let returnProperties = tokenProperties.concat(argsProperties)

        console.info(argsProperties)

        return argsProperties
    }

    // Token properties have the following format: {PropertyName}-{PropertyValue}.
    private parseTokenProperties(propertiesBuffers: Buffer[]): Record<string, any> {
        let properties: Record<string, any> = {};

        for (let buffer of propertiesBuffers) {
            let [name, value] = buffer.toString().split("-");
            properties[name] = this.parseValueOfTokenProperty(value);
        }

        return properties;
    }

    parseValueOfTokenProperty(value: string): any {
        switch (value) {
            case "true": return true;
            case "false": return false;
            default: return new BigNumber(value);
        }
    }

    async setSpecialRole(owner: ITestUser, token: { name: string, addressToSetRolesFor: Address, roleLocalMint?: string, roleLocalBurn?: string }): Promise<ReturnCode> {
        let argsForProperties = [
            ...(token.roleLocalMint != "" ? ["ESDTRoleLocalMint"] : []),
            ...(token.roleLocalBurn != "" ? ["ESDTRoleLocalBurn"] : []),
        ]

        let interaction = <Interaction>this.contract.methods
            .setSpecialRole([
                token.name,
                token.addressToSetRolesFor,
                ...argsForProperties,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("ESDTSetRole");

        let { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, interaction.getEndpoint());
        return returnCode;
    }

    async getSpecialRoles(token: { name: string }): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods.getSpecialRoles([token.name]);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let { values } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        const unwrappedValues = values.map(value => value.valueOf());
        let specialRoles = this.parseSpecialRoles(unwrappedValues)

        console.info(specialRoles)

        return specialRoles
    }

    // Special Roles have the following format: {Address}: variadic{Special Roles}.
    private parseSpecialRoles(specialRolesBuffers: Buffer[]): Record<string, any> {
        let specialRole: Record<string, any> = {};

        for (let buffer of specialRolesBuffers) {
            let [address, roles] = buffer.toString().split(":");
            specialRole[address] = this.parseAddressSpecialRole(roles);
        }

        return specialRole;
    }

    parseAddressSpecialRole(roles: string): any {
        let role = roles.toString().split(",");

        return role
    }

    async getContractConfig(): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods.getContractConfig();
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let { values } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        const unwrappedValues = values.map(value => value.valueOf());

        console.info(unwrappedValues)

        return unwrappedValues
    }

    async claim(owner: ITestUser): Promise<any> {
        let interaction = <Interaction>this.contract.methods
            .claim()
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("claim");
        let identifier = event!.topics[0].toString();

        console.info(`ESDTInteractor.claim [end]: token = ${identifier}`);
        let { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, interaction.getEndpoint());
        return returnCode;
    }

    async stopNFTCreateForever(owner: ITestUser, token: { name: string }): Promise<any> {
        let interaction = <Interaction>this.contract.methods
            .stopNFTCreateForever([token.name])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("claim");
        let identifier = event!.topics[0].toString();

        console.info(`ESDTInteractor.claim [end]: token = ${identifier}`);
        let { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, interaction.getEndpoint());
        return returnCode;
    }

    async transferNFTCreateRole(owner: ITestUser, token: { name: string }, currentNFTCreateOwner: Address, nextNFTCreateOwner: Address): Promise<any> {
        let interaction = <Interaction>this.contract.methods
            .transferNFTCreateRole([
                token.name,
                currentNFTCreateOwner,
                nextNFTCreateOwner
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs;
    }

    async unSetSpecialRole(owner: ITestUser, token: { name: string, owner: Address }, roles: string[]): Promise<any> {
        let interaction = <Interaction>this.contract.methods
            .unSetSpecialRole([
                token.name,
                token.owner,
                roles
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs;
    }

    async wipeSingleNFT(owner: ITestUser, token: { name: string }, nonce: number, ownerAddress: Address): Promise<any> {
        let interaction = <Interaction>this.contract.methods
            .wipeSingleNFT([
                token.name,
                nonce,
                ownerAddress
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs;
    }

    async toggleFreezeSingleNFT(owner: ITestUser, token: { name: string }, nonce: number, ownerAddress: Address): Promise<any> {
        let interaction = <Interaction>this.contract.methods
            .freezeSingleNFT([
                token.name,
                nonce,
                ownerAddress
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs;
    }

    async unFreezeSingleNFT(owner: ITestUser, token: { name: string }, nonce: number, ownerAddress: Address): Promise<any> {
        let interaction = <Interaction>this.contract.methods
            .unFreezeSingleNFT([
                token.name,
                nonce,
                ownerAddress
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;

        return logs;
    }

    async getAllAddressesAndRoles(token: { name: string }): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods.getAllAddressesAndRoles([token.name]);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let { values } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        const unwrappedValues = values.map(value => value.valueOf());

        console.info(unwrappedValues)

        return unwrappedValues
    }

    async registerMetaESDT(owner: ITestUser, token: {
        name: string, ticker: string, decimals: number,
        canMint?: boolean,
        canBurn?: boolean,
        canFreeze?: boolean,
        canWipe?: boolean,
        canPause?: boolean,
        canAddSpecialRoles?: boolean,
        canChangeOwner?: boolean,
        canUpgrade?: boolean,
    }): Promise<IToken> {

        let argsForProperties = [
            ...(token.canMint ? [["canMint", "true"]] : []),
            ...(token.canBurn ? [["canBurn", "true"]] : []),
            ...(token.canFreeze ? [["canFreeze", "true"]] : []),
            ...(token.canWipe ? [["canWipe", "true"]] : []),
            ...(token.canPause ? [["canPause", "true"]] : []),
            ...(token.canAddSpecialRoles ? [["canAddSpecialRoles", "true"]] : []),
            ...(token.canChangeOwner ? [["canChangeOwner", "true"]] : []),
            ...(token.canUpgrade ? [["canUpgrade", "true"]] : []),
        ]

        let interaction = <Interaction>this.contract.methods
            .registerMetaESDT([
                token.name,
                token.ticker,
                token.decimals,
                ...argsForProperties
            ])
            .withValue(TokenPayment.egldFromAmount(IssuePriceInEgld))
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        let gasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, 60000000);
        interaction.withGasLimit(gasLimit);

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("registerMetaESDT");
        let identifier = event!.topics[0].toString();

        console.info(`ESDTInteractor.issueSemiFungible [end]: token = ${identifier}`);
        return { identifier: identifier, decimals: 0 };
    }
    async sendToUser(sender: ITestUser, receiver: Address, payment: TokenPayment) {
        let data = new ESDTTransferPayloadBuilder()
            .setPayment(payment)
            .build();

        let gasLimit = computeGasLimit(this.networkConfig, data.length(), 300000);

        let transaction = new Transaction({
            nonce: sender.account.getNonceThenIncrement(),
            receiver: receiver,
            data: data,
            gasLimit: gasLimit,
            chainID: this.networkConfig.ChainID
        });

        await sender.signer.sign(transaction);
        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.findFirstOrNoneEvent("ESDTTransfer");
        let identifier = event!.topics[0].toString();

        console.info(`ESDTInteractor.setSpecialRole [end]: token = ${identifier}`);
    }
}
