import { AccountOnNetwork, ContractQueryResponse, NetworkConfig, TransactionOnNetwork } from "@elrondnetwork/erdjs-network-providers";
import { IAddress, Query, Transaction } from "@elrondnetwork/erdjs";

export interface INetworkProvider {
    getNetworkConfig(): Promise<NetworkConfig>;
    getAccount(address: IAddress): Promise<AccountOnNetwork>;
    getTransaction(txHash: string): Promise<TransactionOnNetwork>;
    sendTransaction(tx: Transaction): Promise<string>;
    queryContract(query: Query): Promise<ContractQueryResponse>;
}
