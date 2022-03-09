import { Address, BigUIntValue, Code, GasLimit, Interaction } from "@elrondnetwork/erdjs";
import { createSmartContract, DefaultInteractor } from "../interactors";
import { ITestSession, IUser } from "../interfaces";

const PathToWasm = "./src/integration-tests/adder.wasm";
const PathToAbi = "./src/integration-tests/adder.abi.json";

export class AdderInteractor extends DefaultInteractor {
    static async create(session: ITestSession, address?: Address): Promise<AdderInteractor> {
        let contract = await createSmartContract(PathToAbi, address);
        let interactor = new AdderInteractor(session, contract);
        return interactor;
    }

    async deploy(deployer: IUser, initialValue: number): Promise<Address> {
        return await this.doDeploy(deployer, PathToWasm, {
            gasLimit: new GasLimit(20000000),
            initArguments: [new BigUIntValue(initialValue)]
        });
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
