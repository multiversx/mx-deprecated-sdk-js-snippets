import { Address, Balance, BigUIntValue, BooleanType, BytesType, BytesValue, CompositeType, Interaction, ResultsParser, SmartContract, SmartContractAbi, Token, TransactionWatcher, U32Value, VariadicType, VariadicValue } from "@elrondnetwork/erdjs";
import { NetworkConfig } from "@elrondnetwork/erdjs-network-providers";
import BigNumber from "bignumber.js";
import path from "path";
import { loadAbiRegistry } from "../contracts";
import { computeGasLimitOnInteraction } from "../gasLimit";
import { ITestSession, ITestUser } from "../interface";
import { INetworkProvider } from "../interfaceOfNetwork";

const ESDTContractAddress = new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u");
const PathToAbi = path.resolve(__dirname, "esdt.abi.json");
const IssuePriceInEgld = "0.05";

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

    async issueToken(owner: ITestUser, token: Token): Promise<void> {
        let interaction = <Interaction>this.contract.methods
            .issue([
                token.name,
                token.ticker,
                token.supply,
                token.decimals
            ])
            .withValue(Balance.egld(new BigNumber(IssuePriceInEgld)))
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

        // (Hack) here we also mutate the token, since now we know the full identifier.
        token.identifier = identifier;

        console.info(`ESDTInteractor.issue [end]: token = ${identifier}`);
    }
}
