import { TokenPayment } from "@multiversx/sdk-core";
import { createAirdropService } from "../../airdrop";
import { FiveMinutesInMilliseconds } from "../../constants";
import { ITestSession, ITestUser } from "../../interface";
import { INetworkProvider } from "../../interfaceOfNetwork";
import { TestSession } from "../../session";

describe("transfers snippet", async function () {
    this.bail(true);

    let session: ITestSession;
    let provider: INetworkProvider;
    let alice: ITestUser;
    let bob: ITestUser;

    this.beforeAll(async function () {
        session = await TestSession.load("devnet", __dirname);
        provider = session.networkProvider;
        alice = session.users.getUser("alice");
        bob = session.users.getUser("bob");
        await session.syncNetworkConfig();
    });

    it("transfer NFT", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        const payment = TokenPayment.nonFungible("ERDJS-38f249", 1);
        await session.syncUsers([alice]);
        await createAirdropService(session).sendToEachUser(alice, [bob], [payment]);
    });
});
