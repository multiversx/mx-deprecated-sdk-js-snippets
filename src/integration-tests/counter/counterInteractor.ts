// counterInteractor.ts
/**
 * The code in this file is partially usable as production code, as well.
 * Note: in production code, make sure you do not depend on {@link ITestUser}.
 * Note: in production code, make sure you DO NOT reference the package "erdjs-snippets".
 * Note: in dApps, make sure you use a proper wallet provider to sign the transaction.
 * @module
 */
import path from "path";
import { Address, Balance, BigUIntValue, CodeMetadata, GasLimit, Interaction, ReturnCode, SmartContract, SmartContractAbi, U64Value } from "@elrondnetwork/erdjs";
import { ITestUser } from "../../interface";
import { loadAbiRegistry, loadCode } from "../../contracts";
import { INetworkProvider } from "../../interfaceOfNetwork";

const PathToWasm = path.resolve(__dirname, "counter.wasm");
const PathToAbi = path.resolve(__dirname, "counter.abi.json");

export async function createInteractor(provider: INetworkProvider, address?: Address): Promise<CounterInteractor> {
    let registry = await loadAbiRegistry(PathToAbi);
    let abi = new SmartContractAbi(registry, ["Counter"]);
    let contract = new SmartContract({ address: address, abi: abi });
    let interactor = new CounterInteractor(contract);
    return interactor;
}

export class CounterInteractor {
    private readonly contract: SmartContract;

    constructor(contract: SmartContract) {
        this.contract = contract;
    }

    async deploy(deployer: ITestUser, initialValue: number): Promise<{ address: Address, returnCode: ReturnCode }> {
        // Load the bytecode from a file.
        let code = await loadCode(PathToWasm);

        // Prepare the deploy transaction.
        let transaction = this.contract.deploy({
            code: code,
            codeMetadata: new CodeMetadata(),
            initArguments: [new BigUIntValue(initialValue)],
            gasLimit: new GasLimit(5000000)
        });

        // Set the transaction nonce. The account nonce must be synchronized beforehand.
        // Also, locally increment the nonce of the deployer (optional).
        transaction.setNonce(deployer.account.getNonceThenIncrement());

        // Let's sign the transaction. For dApps, use a wallet provider instead.
        await deployer.signer.sign(transaction);

        // After signing the deployment transaction, the contract address (deterministically computable) is available:
        let address = this.contract.getAddress();

        // Let's broadcast the transaction (and await for its execution), via the controller.
        let { bundle: { returnCode } } = await this.controller.deploy(transaction);

        console.log(`CounterInteractor.deploy(): contract = ${address}`);
        return { address, returnCode };
    }

    async incrementWithSingleESDTTransfer(caller: ITestUser, value: number, amount: Balance): Promise<ReturnCode> {
        // Prepare the interaction
        let interaction = <Interaction>this.contract.methods
            .increment([new U64Value(value)])
            .withSingleESDTTransfer(amount)
            .withGasLimit(new GasLimit(3000000))
            .withNonce(caller.account.getNonceThenIncrement());

        // Let's build the transaction object.
        let transaction = interaction.buildTransaction();

        // Let's sign the transaction. For dApps, use a wallet provider instead.
        await caller.signer.sign(transaction);

        // Let's perform the interaction via the controller
        let { bundle: { returnCode } } = await this.controller.execute(interaction, transaction);
        return returnCode;
    }

    async incrementWithMultiTransfer(caller: ITestUser, value: number, amount: Balance): Promise<ReturnCode> {
        // Prepare the interaction
        let interaction = <Interaction>this.contract.methods
            .increment([new U64Value(value)])
            .withMultiESDTNFTTransfer([amount], caller.address)
            .withGasLimit(new GasLimit(3000000))
            .withNonce(caller.account.getNonceThenIncrement());

        // Let's build the transaction object.
        let transaction = interaction.buildTransaction();

        // Let's sign the transaction. For dApps, use a wallet provider instead.
        await caller.signer.sign(transaction);

        // Let's perform the interaction via the controller
        let { bundle: { returnCode } } = await this.controller.execute(interaction, transaction);
        return returnCode;
    }
}
