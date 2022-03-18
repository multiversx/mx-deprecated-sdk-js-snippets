import path from "path";
import { AbiRegistry, Address, BigUIntValue, Code, CodeMetadata, GasLimit, IInteractionChecker, Interaction, IProvider, SmartContract, SmartContractAbi, StrictChecker } from "@elrondnetwork/erdjs";
import { ITestSession, IUser } from "../../interfaces";

const PathToWasm = path.resolve(__dirname, "adder.wasm");
const PathToAbi = path.resolve(__dirname, "adder.abi.json");

export class AdderInteractor {
    private readonly proxy: IProvider;
    private readonly contract: SmartContract;
    private readonly checker: IInteractionChecker;

    constructor(session: ITestSession, contract: SmartContract) {
        this.proxy = session.proxy;
        this.contract = contract;
        this.checker = new StrictChecker();
    }

    static async create(session: ITestSession, address?: Address): Promise<AdderInteractor> {
        let registry = await AbiRegistry.load({ files: [PathToAbi] });
        let abi = new SmartContractAbi(registry, ["Adder"]);
        let contract = new SmartContract({ address: address, abi: abi });
        let interactor = new AdderInteractor(session, contract);
        return interactor;
    }

    async deploy(deployer: IUser, initialValue: number): Promise<Address> {
        // Load the bytecode from a file.
        let code = await Code.fromFile(PathToWasm);

        // Prepare the deploy transaction.
        let transaction = this.contract.deploy({
            code: code,
            codeMetadata: new CodeMetadata(),
            initArguments: [new BigUIntValue(initialValue)],
            gasLimit: new GasLimit(20000000)
        });

        // Set the transaction nonce. Also, locally increment the nonce of the deployer (optional).
        transaction.setNonce(deployer.account.getNonceThenIncrement());

        // Let's sign the transaction. For dApps, use a wallet provider instead.
        await deployer.signer.sign(transaction);

        // Let's broadcast the transaction (and await for its execution).
        await transaction.send(this.proxy);
        await transaction.awaitExecuted(this.proxy);

        console.log(`AdderInteractor.deploy(): transaction = ${transaction.getHash()}, contract = ${this.contract.getAddress()}`);
        return this.contract.getAddress();
    }

    async add(caller: IUser, value: number): Promise<void> {
        // Prepare the interaction
        let interaction = <Interaction>this.contract.methods
            .add([new BigUIntValue(value)])
            .withGasLimit(new GasLimit(10000000))
            .withNonce(caller.account.getNonceThenIncrement());

        // Let's check the interaction against the ABI.
        this.checker.checkInteraction(interaction);

        // Let's build the transaction object.
        let transaction = interaction.buildTransaction();
        
        // Let's sign the transaction. For dApps, use a wallet provider instead.
        await caller.signer.sign(transaction);

        // Let's broadcast the transaction (and await for its execution).
        await transaction.send(this.proxy);
        let transactionOnNetwork = await transaction.getAsOnNetwork(this.proxy);
    }

    async getSum(caller: IUser): Promise<number> {
        let interaction = <Interaction>this.contract.methods.getSum();
        let { firstValue: result } = await this.runQuery(caller, interaction);
        return (<BigUIntValue>result).valueOf().toNumber();
    }
}
