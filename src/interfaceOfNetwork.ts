import { AccountOnNetwork, ContractQueryResponse, NetworkConfig, TransactionOnNetwork } from "@elrondnetwork/erdjs-network-providers";
import { IBech32Address, Query, Transaction } from "@elrondnetwork/erdjs";

export interface INetworkProvider {
    getNetworkConfig(): Promise<NetworkConfig>;
    getAccount(address: IBech32Address): Promise<AccountOnNetwork>;
    getTransaction(txHash: string): Promise<TransactionOnNetwork>;
    sendTransaction(tx: Transaction): Promise<string>;
    queryContract(query: Query): Promise<ContractQueryResponse>;
}
