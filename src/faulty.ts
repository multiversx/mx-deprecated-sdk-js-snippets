import { AsyncTimer } from "@elrondnetwork/erdjs";
import { TenSecondsInMilliseconds } from "./constants";
import { ErrNumRetriesExceeded } from "./errors";

const DefaultNumRetries = 3;
const DefaultDelayBetweenRetries = TenSecondsInMilliseconds;

export async function retryOnError(params: {
    func: () => Promise<any>,
    numRetries?: number,
    delayInMilliseconds?: number
}): Promise<any> {
    const numRetries = params.numRetries || DefaultNumRetries;
    const delay = params.delayInMilliseconds || DefaultDelayBetweenRetries;

    for (let i = 0; i < numRetries; i++) {
        try {
            let result = await params.func();
            return result;
        } catch (error: any) {
            console.log(`retryOnError: current retry = ${i}, error = ${error.message}`);
            await sleep(delay);
        }
    }

    throw new ErrNumRetriesExceeded();
}

async function sleep(milliseconds: number) {
    console.log(`Sleeping ${milliseconds} milliseconds...`);
    await new AsyncTimer("sleep").start(milliseconds);
    console.log(`Slept ${milliseconds} milliseconds...`)
}
