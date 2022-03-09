import { AbiRegistry, Address, BigUIntValue, Code, GasLimit, Interaction, SmartContract, SmartContractAbi } from "@elrondnetwork/erdjs";
import { DefaultInteractor } from "../interactors";
import { ITestSession, IUser } from "../interfaces";

export class AdderInteractor extends DefaultInteractor {
    private readonly session: ITestSession;
    private readonly contract: SmartContract;

    private constructor(session: ITestSession, contract: SmartContract) {
        super(session);
        this.session = session;
        this.contract = contract;
    }

    static async create(session: ITestSession, address?: Address): Promise<AdderInteractor> {
        let registry = await AbiRegistry.load({ files: ["./src/integration-tests/adder.abi.json"] });
        let abi = new SmartContractAbi(registry, ["Adder"]);
        let contract = new SmartContract({ address: address, abi: abi });
        let interactor = new AdderInteractor(session, contract);
        return interactor;
    }

    async deploy(deployer: IUser, initialValue: number): Promise<Address> {
        let code = await Code.fromFile("./src/integration-tests/adder.wasm");

        let transaction = this.contract.deploy({
            code: code,
            gasLimit: new GasLimit(200000000),
            initArguments: [new BigUIntValue(initialValue)]
        });

        transaction.setNonce(deployer.account.getNonceThenIncrement());
        await deployer.signer.sign(transaction);
        await transaction.send(this.session.proxy);
        await transaction.awaitExecuted(this.session.proxy);

        console.log("Deploy transaction:", transaction.getHash().toString());
        console.log("Contract address:", this.contract.getAddress().bech32());

        return this.contract.getAddress();
    }

    async add(owner: IUser, value: number): Promise<void> {
        let interaction = <Interaction>this.contract.methods
            .add([new BigUIntValue(value)])
            .withGasLimit(new GasLimit(100000000))
            .withNonce(owner.account.getNonceThenIncrement());

        await this.runInteraction(owner, interaction);
    }

    async getSum(caller: IUser): Promise<number> {
        let interaction = <Interaction>this.contract.methods.getSum();
        let { firstValue: result } = await this.runQuery(caller, interaction);
        return (<BigUIntValue>result).valueOf().toNumber();
    }
}
