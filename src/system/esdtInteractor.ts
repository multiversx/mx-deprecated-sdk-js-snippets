import { AbiRegistry, Address, Balance, BigUIntValue, BooleanType, BytesType, BytesValue, CompositeType, Interaction, SmartContract, SmartContractAbi, Token, U32Value, VariadicType, VariadicValue } from "@elrondnetwork/erdjs";
import BigNumber from "bignumber.js";
import path from "path";
import { DefaultInteractor } from "../interactors";
import { ITestSession } from "../interfaces";
import { User } from "../users";

const ESDTContractAddress = new Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u");
const PathToAbi = path.resolve(__dirname, "esdt.abi.json");

export class ESDTInteractor extends DefaultInteractor {
    private constructor(session: ITestSession, contract: SmartContract) {
        super(session, contract);
    }

    static async create(session: ITestSession): Promise<ESDTInteractor> {
        let registry = await AbiRegistry.load({ files: [PathToAbi] });
        let abi = new SmartContractAbi(registry, ["esdt"]);
        let contract = new SmartContract({ address: ESDTContractAddress, abi: abi });
        let interactor = new ESDTInteractor(session, contract);
        return interactor;
    }

    async issueToken(owner: User, token: Token): Promise<void> {
        let propertiesType = new VariadicType(new CompositeType(new BytesType(), new BooleanType()));

        let interaction = <Interaction>this.contract.methods
            .issue([
                BytesValue.fromUTF8(token.name),
                BytesValue.fromUTF8(token.ticker),
                new BigUIntValue(new BigNumber(token.supply)),
                new U32Value(token.decimals),
                new VariadicValue(propertiesType, [])
            ])
            .withValue(Balance.egld(new BigNumber("0.05")))
            .withGasLimitComponents({ estimatedExecutionComponent: 60000000});

        let { transactionOnNetwork } = await this.runInteraction(owner, interaction);
        let logs = transactionOnNetwork.getLogs();
        let event = logs.findEventByIdentifier("issue");
        let identifier = event.topics[0].toString();

        // (Hack) here we also mutate the token, since now we know the full identifier.
        token.identifier = identifier;

        console.info(`Issued ESDT token: ${identifier}.`);
    }
}
