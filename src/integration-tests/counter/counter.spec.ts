import { TokenPayment } from "@elrondnetwork/erdjs/out";
import { assert } from "chai";
import { createAirdropService } from "../../airdrop";
import { ITestSession, ITestUser } from "../../interface";
import { INetworkProvider } from "../../interfaceOfNetwork";
import { TestSession } from "../../session";
import { createESDTInteractor } from "../../system/esdtInteractor";
import { createInteractor } from "./counterInteractor";

describe("counter snippet", async function () {
    this.bail(true);

    let suite = this;
    let session: ITestSession;
    let provider: INetworkProvider;
    let whale: ITestUser;
    let owner: ITestUser;
    let alice: ITestUser;

    this.beforeAll(async function () {
        session = await TestSession.loadOnSuite("devnet", suite);
        provider = session.networkProvider;
        whale = session.users.getUser("whale");
        owner = session.users.getUser("whale");
        alice = session.users.getUser("alice");
        await session.syncNetworkConfig();
    });

    it("issue counter token", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session);
        await session.syncUsers([owner]);
        let token = await interactor.issueFungibleToken(owner, { name: "COUNTER", ticker: "COUNTER", decimals: 0, supply: "100000000" });
        await session.saveToken("counterToken", token);
    });

    it("airdrop counter token", async function () {
        session.expectLongInteraction(this);

        let token = await session.loadToken("counterToken");
        let payment = TokenPayment.fungibleFromAmount(token.identifier, "100", token.decimals);
        await session.syncUsers([owner]);
        await createAirdropService(session).sendToEachUser(owner, [alice], payment);
    });

    it("setup", async function () {
        session.expectLongInteraction(this);

        await session.syncUsers([owner]);

        let interactor = await createInteractor(session);
        let { address, returnCode } = await interactor.deploy(owner, 42);

        assert.isTrue(returnCode.isSuccess());

        await session.saveAddress("contractAddress", address);
    });

    it("increment with single ESDT transfer", async function () {
        session.expectLongInteraction(this);

        await session.syncUsers([owner, alice]);

        let contractAddress = await session.loadAddress("contractAddress");
        let token = await session.loadToken("counterToken");
        let interactor = await createInteractor(session, contractAddress);

        let payment = TokenPayment.fungibleFromAmount(token.identifier, "10", token.decimals);

        // Intra-shard
        interactor.incrementWithSingleESDTTransfer(owner, 1, payment);

        // Cross-shard
        interactor.incrementWithSingleESDTTransfer(alice, 1, payment);
    });

    it("increment with multi transfer", async function () {
        session.expectLongInteraction(this);

        await session.syncUsers([owner, alice]);

        let contractAddress = await session.loadAddress("contractAddress");
        let token = await session.loadToken("counterToken");
        let interactor = await createInteractor(session, contractAddress);

        let payment = TokenPayment.fungibleFromAmount(token.identifier, "10", token.decimals);

        // Intra-shard
        interactor.incrementWithMultiTransfer(owner, 1, payment);

        // Cross-shard
        interactor.incrementWithSingleESDTTransfer(alice, 1, payment);
    });
});
