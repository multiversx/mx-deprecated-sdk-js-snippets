import { TokenPayment } from "@multiversx/sdk-core";
import { assert } from "chai";
import { createAirdropService } from "../../airdrop";
import { FiveMinutesInMilliseconds } from "../../constants";
import { ITestSession, ITestUser } from "../../interface";
import { TestSession } from "../../session";
import { createESDTInteractor } from "../../system/esdtInteractor";
import { createInteractor } from "./counterInteractor";

describe("counter snippet", async function () {
    this.bail(true);

    let session: ITestSession;
    let owner: ITestUser;
    let alice: ITestUser;

    this.beforeAll(async function () {
        session = await TestSession.load("devnet", __dirname);
        owner = session.users.getUser("whale");
        alice = session.users.getUser("alice");
        await session.syncNetworkConfig();
    });

    it("issue counter token", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        const interactor = await createESDTInteractor(session);
        await session.syncUsers([owner]);
        const token = await interactor.issueFungibleToken(owner, { name: "COUNTER", ticker: "COUNTER", decimals: 0, supply: "100000000" });
        await session.saveToken({ name: "counterToken", token: token });
        await session.save();
    });

    it("airdrop counter token", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        const token = await session.loadToken("counterToken");
        const payment = TokenPayment.fungibleFromAmount(token.identifier, "100", token.decimals);
        await session.syncUsers([owner]);
        await createAirdropService(session).sendToEachUser(owner, [alice], [payment]);
    });

    it("setup", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        await session.syncUsers([owner]);

        const interactor = await createInteractor(session);
        const { address, returnCode } = await interactor.deploy(owner, 42);

        assert.isTrue(returnCode.isSuccess());

        await session.saveAddress({ name: "counter", address: address });
        await session.save();
    });

    it("increment with single ESDT transfer", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        await session.syncUsers([owner, alice]);

        const contractAddress = await session.loadAddress("counter");
        const token = await session.loadToken("counterToken");
        const interactor = await createInteractor(session, contractAddress);

        const payment = TokenPayment.fungibleFromAmount(token.identifier, "10", token.decimals);

        // Intra-shard
        interactor.incrementWithSingleESDTTransfer(owner, 1, payment);

        // Cross-shard
        interactor.incrementWithSingleESDTTransfer(alice, 1, payment);

        await session.save();
    });

    it("increment with multi transfer", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        await session.syncUsers([owner, alice]);

        const contractAddress = await session.loadAddress("counter");
        const token = await session.loadToken("counterToken");
        const interactor = await createInteractor(session, contractAddress);

        const payment = TokenPayment.fungibleFromAmount(token.identifier, "10", token.decimals);

        // Intra-shard
        interactor.incrementWithMultiTransfer(owner, 1, payment);

        // Cross-shard
        interactor.incrementWithSingleESDTTransfer(alice, 1, payment);

        await session.save();
    });

    it("destroy session", async function () {
        await session.destroy();
    });
});
