import { TokenPayment } from "@multiversx/sdk-core";
import { assert } from "chai";
import { createAirdropService } from "../../airdrop";
import { FiveMinutesInMilliseconds } from "../../constants";
import { ITestSession, ITestUser } from "../../interface";
import { TestSession } from "../../session";
import { createInteractor } from "./adderInteractor";

describe("adder snippet", async function () {
    this.bail(true);

    let session: ITestSession;
    let whale: ITestUser;
    let owner: ITestUser;
    let friends: ITestUser[];

    this.beforeAll(async function () {
        session = await TestSession.load("devnet", __dirname);
        whale = session.users.getUser("whale");
        owner = session.users.getUser("whale");
        friends = session.users.getGroup("friends");
        await session.syncNetworkConfig();
    });

    it("airdrop", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        await session.syncUsers([whale]);
        let payment = TokenPayment.egldFromAmount(0.1);
        await createAirdropService(session).sendToEachUser(whale, friends, [payment]);
    });

    it("setup", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        await session.syncUsers([owner]);

        let interactor = await createInteractor(session);
        let { address, returnCode } = await interactor.deploy(owner, 42);

        assert.isTrue(returnCode.isSuccess());

        await session.saveAddress({ name: "adder", address: address });
        await session.save();
    });

    it("add", async function () {
        this.timeout(FiveMinutesInMilliseconds);
        // If the step fails, retry it (using a Mocha utility function).
        this.retries(5);

        await session.syncUsers([owner]);

        const contractAddress = await session.loadAddress("adder");
        const interactor = await createInteractor(session, contractAddress);

        const sumBefore = await interactor.getSum();
        await session.audit.addEntry("sum before add", { sum: sumBefore });

        const returnCode = await interactor.add(owner, 3);
        await session.audit.addEntry("add outcome", { returnCode });

        const sumAfter = await interactor.getSum();
        await session.audit.addEntry("sum after add", { sum: sumAfter });

        assert.isTrue(returnCode.isSuccess());
        assert.equal(sumAfter, sumBefore + 3);
        await session.save();
    });

    it("getSum", async function () {
        const contractAddress = await session.loadAddress("adder");
        const interactor = await createInteractor(session, contractAddress);
        const result = await interactor.getSum();
        assert.isTrue(result > 0);
    });

    it("destroy session", async function () {
        await session.destroy();
    });
});
