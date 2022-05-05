import { AccountOnNetwork, ContractQueryResponse, NetworkConfig, TransactionOnNetwork } from "@elrondnetwork/erdjs-network-providers";
import { IAddress } from "@elrondnetwork/erdjs";

export interface INetworkProvider {
    getNetworkConfig(): Promise<NetworkConfig>;
    getAccount(address: IAddress): Promise<AccountOnNetwork>;
    getTransaction(txHash: string): Promise<TransactionOnNetwork>;
    sendTransaction(tx: ITransaction): Promise<string>;
    queryContract(query: IContractQuery): Promise<ContractQueryResponse>;
}

export interface ITransaction {
    toSendable(): any;
}

export interface IContractQuery {
    address: IAddress;
    caller?: IAddress;
    func: { toString(): string; };
    value?: { toString(): string; };
    getEncodedArguments(): string[];
}
