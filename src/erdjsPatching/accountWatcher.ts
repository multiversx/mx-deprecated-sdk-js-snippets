

import { AsyncTimer, Err, IAddress, Nonce } from "@elrondnetwork/erdjs";
import { AccountOnNetwork } from "@elrondnetwork/erdjs-network-providers";
import { INetworkProvider } from "../interfaceOfNetwork";

export class AccountWatcher {
    static DefaultPollingInterval: number = 6000;
    static DefaultTimeout: number = AccountWatcher.DefaultPollingInterval * 15;

    private readonly address: IAddress;
    private readonly fetcher: INetworkProvider;
    private readonly pollingInterval: number;
    private readonly timeout: number;

    constructor(
        address: IAddress,
        fetcher: INetworkProvider,
        pollingInterval: number = AccountWatcher.DefaultPollingInterval,
        timeout: number = AccountWatcher.DefaultTimeout
    ) {
        this.address = address;
        this.fetcher = fetcher;
        this.pollingInterval = pollingInterval;
        this.timeout = timeout;
    }

    public async awaitNonce(nonce: Nonce): Promise<AccountOnNetwork> {
        let doFetch = async () => await this.fetcher.getAccount(this.address);
        let onFetched = (account: AccountOnNetwork) => console.log(`AccountWatcher.awaitNonce(${nonce.valueOf()}). Current: ${account.nonce.valueOf()}.`);
        let hasReachedNonce = (account: AccountOnNetwork) => account.nonce.valueOf() >= nonce.valueOf();

        return this.awaitConditionally<AccountOnNetwork>(
            hasReachedNonce,
            doFetch,
            onFetched
        );
    }

    private async awaitConditionally<TData>(
        isSatisfied: (data: TData) => boolean,
        doFetch: () => Promise<TData>,
        onFetched: (data: TData) => void
    ): Promise<TData> {
        let periodicTimer = new AsyncTimer("watcher:periodic");
        let timeoutTimer = new AsyncTimer("watcher:timeout");

        let stop = false;
        let fetchedData: TData | undefined = undefined;
        let satisfied: boolean = false;

        let _ = timeoutTimer.start(this.timeout).finally(() => {
            timeoutTimer.stop();
            stop = true;
        });

        while (!stop) {
            await periodicTimer.start(this.pollingInterval);

            try {
                fetchedData = await doFetch();
                onFetched(fetchedData);
                
                satisfied = isSatisfied(fetchedData);
                if (satisfied || stop) {
                    break;
                }
            } catch (error) {
                if (!(error instanceof Err)) {
                    throw error;
                }
            }
        }

        if (!timeoutTimer.isStopped()) {
            timeoutTimer.stop();
        }

        if (!fetchedData || !satisfied) {
            throw new ErrExpectedAccountStateNotReached();
        }

        return fetchedData;
    }
}

export class ErrExpectedAccountStateNotReached extends Err {
    public constructor() {
        super(`Expected account state not reached`);
    }
}
