import { IAddress, ICorrelationHolder, IAudit, IHash, IReturnCode, IStorage, ITestUser } from "./interface";
import { INetworkProvider, ITransactionOnNetwork } from "./interfaceOfNetwork";
import { prettifyObject } from "./pretty";

enum EventKind {
    TransactionSent = "TransactionSent",
    ContractDeploymentSent = "ContractDeploymentSent",
    TransactionCompleted = "TransactionCompleted",
    ContractOutcomeReceived = "ContractOutcomeReceived",
    AccountsSnapshot = "AccountsSnapshot",
    ArbitrarySnapshot = "ArbitrarySnapshot"
}

export class Audit implements IAudit {
    private readonly storage: IStorage;
    private readonly correlation: ICorrelationHolder;
    private readonly networkProvider: INetworkProvider;

    constructor(params: {
        storage: IStorage,
        correlation: ICorrelationHolder,
        networkProvider: INetworkProvider
    }) {
        this.storage = params.storage;
        this.correlation = params.correlation;
        this.networkProvider = params.networkProvider;
    }

    async onContractDeploymentSent(params: { transactionHash: IHash, contractAddress: IAddress }): Promise<void> {
        const transaction = params.transactionHash.toString();
        const address = params.contractAddress.bech32();

        const payload =  {
            transaction: transaction,
            address: address
        };

        await this.storage.storeAuditEntry({
            id: 0,
            correlationStep: this.correlation.step,
            correlationTag: this.correlation.tag,
            event: EventKind.ContractDeploymentSent,
            summary: `deployment, transaction = ${transaction}, contract = ${address}`,
            payload: payload,
            comparableTo: null
        });
    }

    async onTransactionSent(params: { action?: string, args?: any[], transactionHash: IHash }): Promise<void> {
        const payload = {
            action: params.action,
            args: params.args,
            transactionHash: params.transactionHash,
        };

        await this.storage.storeAuditEntry({
            id: 0,
            correlationStep: this.correlation.step,
            correlationTag: this.correlation.tag,
            event: EventKind.TransactionSent,
            summary: `action = ${params.action}, transaction = ${params.transactionHash}`,
            payload: payload,
            comparableTo: null
        });
    }

    async onTransactionCompleted(params: { transactionHash: IHash, transaction: ITransactionOnNetwork }): Promise<void> {
        const payload = {
            transactionHash: params.transactionHash,
            transaction: prettifyObject(params.transaction)
        };

        await this.storage.storeAuditEntry({
            id: 0,
            correlationStep: this.correlation.step,
            correlationTag: this.correlation.tag,
            event: EventKind.TransactionCompleted,
            summary: `transaction = ${params.transactionHash}`,
            payload: payload,
            comparableTo: null
        });
    }

    async onContractOutcome(params: {
        transactionHash?: IHash,
        returnCode?: IReturnCode,
        returnMessage?: string,
        values?: any[]
    }): Promise<void> {
        const payload = {
            transactionHash: params.transactionHash,
            returnCode: params.returnCode,
            returnMessage: params.returnMessage,
            values: prettifyObject(params.values)
        };

        await this.storage.storeAuditEntry({
            id: 0,
            correlationStep: this.correlation.step,
            correlationTag: this.correlation.tag,
            event: EventKind.ContractOutcomeReceived,
            summary: `returnCode = ${params.returnCode?.toString()}, returnMessage = ${params.returnMessage}`,
            payload: payload,
            comparableTo: null
        });
    }

    async onSnapshot(params: { state: any, summary?: string, comparableTo?: number }): Promise<number> {
        return await this.storage.storeAuditEntry({
            id: 0,
            correlationStep: this.correlation.step,
            correlationTag: this.correlation.tag,
            event: EventKind.ArbitrarySnapshot,
            summary: params.summary || "",
            payload: params.state,
            comparableTo: params.comparableTo || null
        });
    }

    async emitSnapshotOfUsers(params: { users: ITestUser[]; comparableTo?: number | undefined; }): Promise<number> {
        return await this.emitSnapshotOfAccounts({
            addresses: params.users.map(user => user.address),
            comparableTo: params.comparableTo
        });
    }

    async emitSnapshotOfAccounts(params: { addresses: IAddress[]; comparableTo?: number | undefined; }): Promise<number> {
        const accounts: any[] = [];

        for (const address of params.addresses) {
            accounts.push(await this.takeSnapshotOfAccount(address));
        }

        return await this.onAccountsSnapshot({
            state: accounts,
            comparableTo: params.comparableTo
        });
    }

    private async takeSnapshotOfAccount(address: IAddress): Promise<any> {
        const account = await this.networkProvider.getAccount(address);
        const fungibleTokens = await this.networkProvider.getFungibleTokensOfAccount(address);
        const nonFungibleTokens = await this.networkProvider.getNonFungibleTokensOfAccount(address);

        const simplifiedFungibleTokens: any[] = fungibleTokens.map(token => {
            return {
                identifier: token.identifier,
                balance: token.balance.toString()
            }
        });

        const simplifiedNonFungibleTokens: any[] = nonFungibleTokens.map(token => {
            return {
                identifier: token.identifier,
                nonce: token.nonce
            }
        });

        const snapshot = {
            address: address,
            nonce: account.nonce,
            balance: account.balance,
            fungibleTokens: simplifiedFungibleTokens,
            nonFungibleTokens: simplifiedNonFungibleTokens
        };

        return snapshot;
    }


    private async onAccountsSnapshot(params: { state: any, summary?: string, comparableTo?: number }): Promise<number> {
        return await this.storage.storeAuditEntry({
            id: 0,
            correlationStep: this.correlation.step,
            correlationTag: this.correlation.tag,
            event: EventKind.AccountsSnapshot,
            summary: params.summary || "",
            payload: params.state,
            comparableTo: params.comparableTo || null
        });
    }
}
