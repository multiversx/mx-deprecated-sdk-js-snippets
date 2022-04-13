import { TokenPayment } from "@elrondnetwork/erdjs/out";
import { createAirdropService } from "../../airdrop";
import { ITestSession, ITestUser } from "../../interface";
import { INetworkProvider } from "../../interfaceOfNetwork";
import { TestSession } from "../../session";

describe("transfers snippet", async function () {
    this.bail(true);

    let suite = this;
    let session: ITestSession;
    let provider: INetworkProvider;
    let alice: ITestUser;
    let bob: ITestUser;

    this.beforeAll(async function () {
        session = await TestSession.loadOnSuite("devnet", suite);
        provider = session.networkProvider;
        alice = session.users.getUser("alice");
        bob = session.users.getUser("bob");
        await session.syncNetworkConfig();
    });

    it("transfer NFT", async function () {
        session.expectLongInteraction(this);

        let payment = TokenPayment.nonFungible("ERDJS-38f249", 1);
        await session.syncUsers([alice]);
        await createAirdropService(session).sendToEachUser(alice, [bob], payment);
    });
});
