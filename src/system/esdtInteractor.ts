import { AbiRegistry, Address, Balance, BigUIntValue, BooleanType, BytesType, BytesValue, CompositeType, Interaction, SmartContract, SmartContractAbi, Token, U32Value, VariadicType, VariadicValue } from "@elrondnetwork/erdjs";
import BigNumber from "bignumber.js";
import path from "path";
import { loadAbiRegistry } from "../contracts";
import { ITestSession, ITestUser } from "../interface";

const ESDTContractAddress = new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u");
const PathToAbi = path.resolve(__dirname, "esdt.abi.json");
const IssuePriceInEgld = "0.05";

export class ESDTInteractor {
    private readonly contract: SmartContract;


    private constructor(contract: SmartContract) {
        this.contract = contract;
    }

    static async create(session: ITestSession): Promise<ESDTInteractor> {
        let registry = await loadAbiRegistry(PathToAbi);
        let abi = new SmartContractAbi(registry, ["esdt"]);
        let contract = new SmartContract({ address: ESDTContractAddress, abi: abi });
        let interactor = new ESDTInteractor(contract);
        return interactor;
    }

    async issueToken(owner: ITestUser, token: Token): Promise<void> {
        let propertiesType = new VariadicType(new CompositeType(new BytesType(), new BooleanType()));

        let interaction = <Interaction>this.contract.methods
            .issue([
                BytesValue.fromUTF8(token.name),
                BytesValue.fromUTF8(token.ticker),
                new BigUIntValue(new BigNumber(token.supply)),
                new U32Value(token.decimals),
                new VariadicValue(propertiesType, [])
            ])
            .withValue(Balance.egld(new BigNumber(IssuePriceInEgld)))
            .withGasLimitComponents({ estimatedExecutionComponent: 60000000})
            .withNonce(owner.account.getNonceThenIncrement());

        let transaction = interaction.buildTransaction();
        await owner.signer.sign(transaction);

        let { transactionOnNetwork } = await this.controller.execute(interaction, transaction);
        let logs = transactionOnNetwork.logs;
        let event = logs.requireEventByIdentifier("issue");
        let identifier = event.topics[0].toString();

        // (Hack) here we also mutate the token, since now we know the full identifier.
        token.identifier = identifier;

        console.info(`ESDTInteractor.issue [end]: token = ${identifier}`);
    }
}
