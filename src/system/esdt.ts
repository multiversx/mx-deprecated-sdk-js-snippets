import { Address, BigUIntValue, BytesType, BytesValue, ContractFunction, Interaction, ResultsParser, ReturnCode, SmartContract, SmartContractAbi, TokenIdentifierValue, TokenPayment, Transaction, TransactionPayload, TransactionWatcher, ESDTTransferPayloadBuilder, ESDTNFTTransferPayloadBuilder, I64Value, U64Value } from "@elrondnetwork/erdjs";
import { DefinitionOfFungibleTokenOnNetwork } from "@elrondnetwork/erdjs-network-providers";
import BigNumber from "bignumber.js";
import path from "path";
import { loadAbiRegistry } from "../contracts";
import { computeGasLimitOnInteraction, computeGasLimit } from "../gasLimit";
import { IAudit, ITestSession, ITestUser, IToken } from "../interface";
import { INetworkConfig, INetworkProvider } from "../interfaceOfNetwork";

const ESDTContractAddress = new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u");
const PathToAbi = path.resolve(__dirname, "esdt.abi.json");
const IssuePriceInEgld = new BigNumber("0.05");

export async function createESDTInteractor(session: ITestSession) {
    const registry = await loadAbiRegistry(PathToAbi);
    const abi = new SmartContractAbi(registry);
    const contract = new SmartContract({ address: ESDTContractAddress, abi: abi });
    const networkProvider = session.networkProvider;
    const networkConfig = session.getNetworkConfig();
    const audit = session.audit;
    const interactor = new ESDTInteractor(contract, networkProvider, networkConfig, audit);
    return interactor;
}

export class ESDTInteractor {
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
    }): Promise<{ resultedToken: IToken, returnCode: ReturnCode }> {

        let argsForProperties = [
            ...(token.canUpgrade == false ? [["canUpgrade", "false"]] : []),
            ...(token.canMint ? [["canMint", "true"]] : []),
            ...(token.canBurn ? [["canBurn", "true"]] : []),
            ...(token.canFreeze ? [["canFreeze", "true"]] : []),
            ...(token.canWipe ? [["canWipe", "true"]] : []),
            ...(token.canPause ? [["canPause", "true"]] : []),
            ...(token.canAddSpecialRoles == false ? [["canAddSpecialRoles", "false"]] : []),
            ...(token.canChangeOwner ? [["canChangeOwner", "true"]] : []),
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
        let issuedToken = { identifier: identifier, decimals: token.decimals };
        // In the end, parse the results:
        const { returnCode } = this.resultsParser.parseUntypedOutcome(transactionOnNetwork);

        console.info(`ESDTInteractor.issue [end]: token = ${identifier}`);
        return { resultedToken: issuedToken, returnCode: returnCode };
    }

    async issueSemiFungibleToken(owner: ITestUser, token: {
        name: string, ticker: string, canFreeze?: boolean,
        canWipe?: boolean,
        canPause?: boolean,
        canAddSpecialRoles?: boolean,
        canChangeOwner?: boolean,
        canUpgrade?: boolean,
        canTransferNFTCreateRole?: boolean,
        canCreateMultiShard?: boolean,
    }): Promise<{ resultedToken: string, returnCode: ReturnCode }> {

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
        const { returnCode } = this.resultsParser.parseUntypedOutcome(transactionOnNetwork);
        if (event) {
            let identifier = event!.topics[0].toString();
            let issuedToken = { identifier: identifier };

            return { resultedToken: issuedToken.identifier, returnCode };
        }
        return { resultedToken: "no token", returnCode };
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
    }): Promise<{ resultedToken: string, returnCode: ReturnCode }> {

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
        const { returnCode } = this.resultsParser.parseUntypedOutcome(transactionOnNetwork);
        if (event) {
            let identifier = event!.topics[0].toString();
            let issuedToken = { identifier: identifier };
            return { resultedToken: issuedToken.identifier, returnCode };
        }
        return { resultedToken: "no token", returnCode };
    }

    async burnToken(owner: ITestUser, token: { name: string, burnAmount: BigNumber.Value }): Promise<ReturnCode> {
        let transaction = this.contract.call({
            func: new ContractFunction("ESDTLocalBurn"),
            gasLimit: 300000,
            args: [BytesValue.fromUTF8(token.name), new BigUIntValue(token.burnAmount)],
            receiver: owner.address,
            chainID: this.networkConfig.ChainID
        });
        return await this.runTransaction(owner, transaction, "ESDTLocalBurn")
    }

    async checkForBurning(owner: ITestUser, token: { name: string, burnAmount: BigNumber.Value }): Promise<boolean> {
        let tokenPropertiesBefore = await this.getTokenProperties({ name: token.name })

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

        let tokenPropertiesAfter = await this.getTokenProperties({ name: token.name })

        let endpointDefinition = this.contract.getEndpoint("ESDTLocalBurn");
        let { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, endpointDefinition);

        if ((tokenPropertiesBefore.supply.toNumber() - tokenPropertiesAfter.supply.toNumber()) == token.burnAmount) { return true }

        return false
    }

    async mintToken(owner: ITestUser, token: { name: string, newSupply: BigNumber.Value }): Promise<ReturnCode> {
        let transaction = this.contract.call({
            func: new ContractFunction("ESDTLocalMint"),
            gasLimit: 300000,
            args: [BytesValue.fromUTF8(token.name), new BigUIntValue(token.newSupply)],
            receiver: owner.address,
            chainID: this.networkConfig.ChainID
        });

        return await this.runTransaction(owner, transaction, "ESDTLocalMint")
    }

    async freezeAccountAddress(owner: ITestUser, token: { name: string, account: Address }): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .freeze([
                token.name,
                token.account,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "freeze")
    }

    async unfreezeAccountAddress(owner: ITestUser, token: { name: string, account: Address }): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unFreeze([
                token.name,
                token.account,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "unFreeze")
    }

    async wipeAccount(owner: ITestUser, token: { name: string, account: Address }): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .wipe([
                token.name,
                token.account,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "wipe")
    }

    async pauseTransactions(owner: ITestUser, token: { name: string }): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .pause([
                token.name,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "pause")
    }

    async unPauseTransactions(owner: ITestUser, token: { name: string }): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .unPause([
                token.name,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "unPause")
    }

    async transferOwnership(owner: ITestUser, token: { name: string, newOwner: Address }): Promise<ReturnCode> {
        let interaction = <Interaction>this.contract.methods
            .transferOwnership([
                token.name,
                token.newOwner,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "transferOwnership")
    }

    async getTokenProperties(token: { name: string }): Promise<DefinitionOfFungibleTokenOnNetwork> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods.getTokenProperties([token.name]);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let {
            values
        } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        const unwrappedValues = values.map(value => value.valueOf());

        let result = DefinitionOfFungibleTokenOnNetwork.fromResponseOfGetTokenProperties(token.name, unwrappedValues);

        return result
    }

    async getNFTTokenProperties(token: { name: string }): Promise<DefinitionOfFungibleTokenOnNetwork> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods.getTokenProperties([token.name]);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let {
            values
        } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

        const unwrappedValues = values.map(value => value.valueOf());

        let result = DefinitionOfFungibleTokenOnNetwork.fromResponseOfGetTokenProperties(token.name, unwrappedValues);

        return result
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

    async setSpecialRole(owner: ITestUser, token: {
        name: string, addressToSetRolesFor: Address,
        roleLocalMint?: string,
        roleLocalBurn?: string,
        roleNFTCreate?: string,
        roleNFTBurn?: string,
        roleNFTUpdateAttributes?: string,
        roleNFTAddURI?: string,
        roleESDTTransferRole?: string,
        roleESDTRoleNFTAddQuantity?: string
    }): Promise<ReturnCode> {
        let argsForProperties = [
            ...(token.roleLocalMint == "ESDTRoleLocalMint" ? ["ESDTRoleLocalMint"] : []),
            ...(token.roleLocalBurn == "ESDTRoleLocalBurn" ? ["ESDTRoleLocalBurn"] : []),
            ...(token.roleNFTCreate == "ESDTRoleNFTCreate" ? ["ESDTRoleNFTCreate"] : []),
            ...(token.roleNFTBurn == "ESDTRoleNFTBurn" ? ["ESDTRoleNFTBurn"] : []),
            ...(token.roleNFTUpdateAttributes == "ESDTRoleNFTUpdateAttributes" ? ["ESDTRoleNFTUpdateAttributes"] : []),
            ...(token.roleNFTAddURI == "ESDTRoleNFTAddURI" ? ["ESDTRoleNFTAddURI"] : []),
            ...(token.roleESDTTransferRole == "ESDTTransferRole" ? ["ESDTTransferRole"] : []),
            ...(token.roleESDTRoleNFTAddQuantity == "ESDTRoleNFTAddQuantity" ? ["ESDTRoleNFTAddQuantity"] : []),
        ]

        let interaction = <Interaction>this.contract.methods
            .setSpecialRole([
                token.name,
                token.addressToSetRolesFor,
                ...argsForProperties,
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "setSpecialRole")
    }

    async getSpecialRoles(token: { name: string }): Promise<any> {
        // Prepare the interaction, check it, then build the query:
        let interaction = <Interaction>this.contract.methods.getSpecialRoles([token.name]);
        let query = interaction.check().buildQuery();

        // Let's run the query and parse the results:
        let queryResponse = await this.networkProvider.queryContract(query);
        let {
            values
        } = this.resultsParser.parseQueryResponse(queryResponse, interaction.getEndpoint());

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

        return await this.runInteraction(owner, interaction, 60000000, "claim")
    }

    async stopNFTCreateForever(owner: ITestUser, token: { name: string }): Promise<any> {
        let interaction = <Interaction>this.contract.methods
            .stopNFTCreate([token.name])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "stopNFTCreate")
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

        return await this.runInteraction(owner, interaction, 60000000, "transferNFTCreateRole")
    }

    async unSetSpecialRole(owner: ITestUser, token: { name: string, owner: Address, roleLocalMint?: string, roleLocalBurn?: string }): Promise<ReturnCode> {
        let argsForProperties = [
            ...(token.roleLocalMint != "" ? ["ESDTRoleLocalMint"] : []),
            ...(token.roleLocalBurn != "" ? ["ESDTRoleLocalBurn"] : []),]

        let interaction = <Interaction>this.contract.methods
            .unSetSpecialRole([
                token.name,
                token.owner,
                ...argsForProperties
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "unSetSpecialRole")
    }

    async wipeSingleNFT(owner: ITestUser, token: { name: string, nonce: number }, ownerAddress: Address): Promise<any> {
        let interaction = <Interaction>this.contract.methods
            .wipeSingleNFT([
                token.name,
                token.nonce,
                ownerAddress
            ])
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "wipeSingleNFT")
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
        canFreeze?: boolean,
        canWipe?: boolean,
        canPause?: boolean,
        canAddSpecialRoles?: boolean,
        canChangeOwner?: boolean,
        canUpgrade?: boolean,
        canTransferNFTCreateRole?: boolean,
        canCreateMultiShard?: boolean,
    }): Promise<{ resultedToken: string, returnCode: ReturnCode }> {

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
        const { returnCode } = this.resultsParser.parseUntypedOutcome(transactionOnNetwork);
        if (event) {
            let identifier = event!.topics[0].toString();
            let issuedToken = { identifier: identifier };

            return { resultedToken: issuedToken.identifier, returnCode };
        }
        return { resultedToken: "no token", returnCode };
    }

    async controlChanges(owner: ITestUser, token: {
        name: string, canMint?: boolean,
        canBurn?: boolean,
        canFreeze?: boolean,
        canWipe?: boolean,
        canPause?: boolean,
        canAddSpecialRoles?: boolean,
        canChangeOwner?: boolean,
        canUpgrade?: boolean,
    }): Promise<ReturnCode> {

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
            .controlChanges([
                token.name,
                ...argsForProperties
            ])
            .withValue(0)
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 350000000, "controlChanges")
    }

    async sendESDTToUser(sender: ITestUser, receiver: Address, payment: TokenPayment): Promise<ReturnCode> {
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
        const { returnCode } = this.resultsParser.parseUntypedOutcome(transactionOnNetwork);

        return returnCode
    }

    async sendNFTToUser(sender: ITestUser, receiver: Address, payment: TokenPayment): Promise<ReturnCode> {
        let data = new ESDTNFTTransferPayloadBuilder()
            .setPayment(payment)
            .setDestination(receiver)
            .build();

        let gasLimit = computeGasLimit(this.networkConfig, data.length(), 1000000);

        let transaction = new Transaction({
            nonce: sender.account.getNonceThenIncrement(),
            receiver: sender.address,
            data: data,
            gasLimit: gasLimit,
            chainID: this.networkConfig.ChainID
        });

        await sender.signer.sign(transaction);
        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        const { returnCode } = this.resultsParser.parseUntypedOutcome(transactionOnNetwork);

        return returnCode
    }

    async ESDTNFTCreate(owner: ITestUser, nft: { tokenName: string, quantity: number, name: string, royalties: number }):
        Promise<{ nonce: number, returnCode: ReturnCode }> {
        let transaction = this.contract.call({
            func: new ContractFunction("ESDTNFTCreate"),
            gasLimit: 4000000,
            args:
                [
                    BytesValue.fromUTF8(nft.tokenName),
                    new U64Value(nft.quantity),
                    BytesValue.fromUTF8(nft.name),
                    new BigUIntValue(nft.royalties),
                    BytesValue.fromUTF8("QmNvUWy35W1wGnyusGaZBexdKcXuUVftU6jFy4Kkti1nLL"),//hash
                    BytesValue.fromUTF8("tags:;metadata:QmSMf3UDDcf9RVmDurDPbbMy6QsHkeF3f3BPDGAcPfSKTE"),
                    BytesValue.fromUTF8("https://ipfs.io/ipfs/QmNvUWy35W1wGnyusGaZBexdKcXuUVftU6jFy4Kkti1nLL"),
                ],
            receiver: owner.address,
            chainID: this.networkConfig.ChainID
        });

        transaction.setNonce(owner.account.getNonceThenIncrement());

        await owner.signer.sign(transaction);
        await this.networkProvider.sendTransaction(transaction);
        let transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);

        let endpointDefinition = this.contract.getEndpoint("ESDTNFTCreate");
        let { returnCode, returnMessage, values } = this.resultsParser.parseOutcome(transactionOnNetwork, endpointDefinition);

        if (returnCode.isSuccess()) {
            let nonce = values[0].valueOf().toNumber();
            return { nonce, returnCode }
        }
        const nonce = 0;
        return { nonce, returnCode }
    }

    async ESDTNFTAddQuantity(owner: ITestUser, sft: { tokenIdentifier: string, nonce: number, quantity: number }): Promise<ReturnCode> {
        let transaction = this.contract.call({
            func: new ContractFunction("ESDTNFTAddQuantity"),
            gasLimit: 10000000,
            args:
                [
                    BytesValue.fromUTF8(sft.tokenIdentifier),
                    new U64Value(sft.nonce),
                    new U64Value(sft.quantity),
                ],
            receiver: owner.address,
            chainID: this.networkConfig.ChainID
        });

        return await this.runTransaction(owner, transaction, "ESDTNFTAddQuantity")
    }

    async ESDTNFTBurn(owner: ITestUser, sft: { tokenIdentifier: string, nonce: number, quantity: number }): Promise<ReturnCode> {
        const transaction = this.contract.call({
            func: new ContractFunction("ESDTNFTBurn"),
            gasLimit: 10000000,
            args:
                [
                    BytesValue.fromUTF8(sft.tokenIdentifier),
                    new U64Value(sft.nonce),
                    new U64Value(sft.quantity),
                ],
            receiver: owner.address,
            chainID: this.networkConfig.ChainID
        });

        return await this.runTransaction(owner, transaction, "ESDTNFTBurn")
    }

    async ESDTNFTUpdateAttributes(owner: ITestUser, token: { name: string, nonce: number }, attributes: string): Promise<ReturnCode> {
        const transaction = this.contract.call({
            func: new ContractFunction("ESDTNFTUpdateAttributes"),
            gasLimit: 6000000,
            args:
                [
                    BytesValue.fromUTF8(token.name),
                    new BigUIntValue(token.nonce),
                    BytesValue.fromUTF8(attributes)
                ],
            receiver: owner.address,
            chainID: this.networkConfig.ChainID
        });

        return await this.runTransaction(owner, transaction, "ESDTNFTUpdateAttributes")
    }

    async changeSFTToMetaESDT(owner: ITestUser, token: { name: string, decimals: number }): Promise<ReturnCode> {
        const interaction = <Interaction>this.contract.methods
            .changeSFTToMetaESDT([
                token.name,
                token.decimals
            ])
            .withValue(0)
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "changeSFTToMetaESDT")
    }

    async freezeSingleNFT(owner: ITestUser, token: { name: string, nonce: number }, addressToFreeze: Address): Promise<ReturnCode> {
        const interaction = <Interaction>this.contract.methods
            .freezeSingleNFT([
                token.name,
                token.nonce,
                addressToFreeze
            ])
            .withValue(0)
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "freezeSingleNFT")
    }

    async unFreezeSingleNFT(owner: ITestUser, token: { name: string, nonce: number }, addressToUnFreeze: Address): Promise<ReturnCode> {
        const interaction = <Interaction>this.contract.methods
            .unFreezeSingleNFT([
                token.name,
                token.nonce,
                addressToUnFreeze
            ])
            .withValue(0)
            .withNonce(owner.account.getNonceThenIncrement())
            .withChainID(this.networkConfig.ChainID);

        return await this.runInteraction(owner, interaction, 60000000, "unFreezeSingleNFT")
    }

    async ESDTNFTAddURI(owner: ITestUser, token: { name: string, nonce: number }, URi: string): Promise<ReturnCode> {
        const transaction = this.contract.call({
            func: new ContractFunction("ESDTNFTAddURI"),
            gasLimit: 6000000,
            args:
                [
                    BytesValue.fromUTF8(token.name),
                    new BigUIntValue(token.nonce),
                    BytesValue.fromUTF8(URi)
                ],
            receiver: owner.address,
            chainID: this.networkConfig.ChainID
        });
        return await this.runTransaction(owner, transaction, "ESDTNFTAddURI")
    }

    async runInteraction(owner: ITestUser, interaction: Interaction, gaslimit: number, endpoint: string): Promise<ReturnCode> {
        const computedGasLimit = computeGasLimitOnInteraction(interaction, this.networkConfig, gaslimit);
        interaction.withGasLimit(computedGasLimit);

        const transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        const transactionHash = await this.networkProvider.sendTransaction(transaction);
        await this.audit.onTransactionSent({ action: endpoint, args: interaction.getArguments(), transactionHash: transactionHash });

        const transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        await this.audit.onTransactionCompleted({ transactionHash: transactionHash, transaction: transactionOnNetwork });

        const { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, interaction.getEndpoint());
        return returnCode;
    }

    async runTransaction(owner: ITestUser, transaction: Transaction, endpoint: string): Promise<ReturnCode> {
        transaction.setNonce(owner.account.getNonceThenIncrement());

        await owner.signer.sign(transaction);
        const transactionHash = await this.networkProvider.sendTransaction(transaction);

        const transactionOnNetwork = await this.transactionWatcher.awaitCompleted(transaction);
        await this.audit.onTransactionCompleted({ transactionHash: transactionHash, transaction: transactionOnNetwork });

        const endpointDefinition = this.contract.getEndpoint(endpoint);
        const { returnCode } = this.resultsParser.parseOutcome(transactionOnNetwork, endpointDefinition);
        return returnCode
    }
}
