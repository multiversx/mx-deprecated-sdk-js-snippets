import { AbiRegistry, Address, BigUIntValue, Code, GasLimit, Interaction, SmartContract, SmartContractAbi } from "@elrondnetwork/erdjs";
import { DefaultInteractor } from "../interactors";
import { ITestSession, IUser } from "../interfaces";

const PathToWasm = "./src/integration-tests/adder.wasm";
const PathToAbi = "./src/integration-tests/adder.abi.json";

export class AdderInteractor extends DefaultInteractor {
    private readonly contract: SmartContract;

    private constructor(session: ITestSession, contract: SmartContract) {
        super(session);
        this.contract = contract;
    }

    static async create(session: ITestSession, address?: Address): Promise<AdderInteractor> {
        let registry = await AbiRegistry.load({ files: [PathToAbi] });
        let abi = new SmartContractAbi(registry, ["Adder"]);
        let contract = new SmartContract({ address: address, abi: abi });
        let interactor = new AdderInteractor(session, contract);
        return interactor;
    }

    async deploy(deployer: IUser, initialValue: number): Promise<Address> {
        let code = await Code.fromFile(PathToWasm);

        let transaction = this.contract.deploy({
            code: code,
            gasLimit: new GasLimit(20000000),
            initArguments: [new BigUIntValue(initialValue)]
        });

        await this.doDeploy(deployer, transaction);
        return this.contract.getAddress();
    }

    async add(owner: IUser, value: number): Promise<void> {
        let interaction = <Interaction>this.contract.methods
            .add([new BigUIntValue(value)])
            .withGasLimit(new GasLimit(10000000));

        await this.runInteraction(owner, interaction);
    }

    async getSum(caller: IUser): Promise<number> {
        let interaction = <Interaction>this.contract.methods.getSum();
        let { firstValue: result } = await this.runQuery(caller, interaction);
        return (<BigUIntValue>result).valueOf().toNumber();
    }
}
