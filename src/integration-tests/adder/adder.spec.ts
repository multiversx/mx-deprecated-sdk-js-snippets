import { Balance } from "@elrondnetwork/erdjs";
import { assert } from "chai";
import { AirdropService } from "../../airdrop";
import { ITestSession, IUser } from "../../interfaces";
import { TestSession } from "../../session";
import { createInteractor } from "./adderInteractor";

describe("adder snippet", async function () {
    this.bail(true);

    let suite = this;
    let session: ITestSession;
    let whale: IUser;
    let owner: IUser;

    this.beforeAll(async function () {
        session = await TestSession.loadOnSuite("default", suite);
        whale = session.users.whale;
        owner = session.users.alice;
        await session.syncNetworkConfig();
    });

    it("airdrop", async function () {
        session.expectLongInteraction(this);

        await session.syncUsers([whale]);
        await AirdropService.createOnSession(session).sendToEachUser(whale, Balance.egld(1));
    });

    it("setup", async function () {
        session.expectLongInteraction(this);

        await session.syncUsers([owner]);

        let interactor = await createInteractor(session);
        let { address, returnCode } = await interactor.deploy(owner, 42);
        
        assert.isTrue(returnCode.isSuccess());

        await session.saveAddress("contractAddress", address);
    });

    it("add", async function () {
        session.expectLongInteraction(this);

        await session.syncUsers([owner]);

        let contractAddress = await session.loadAddress("contractAddress");
        let interactor = await createInteractor(session, contractAddress);

        let sumBefore = await interactor.getSum();
        let { returnCode, sum } = await interactor.add(owner, 3);
        assert.isTrue(returnCode.isSuccess());
        assert.equal(sum, sumBefore + 3);
    });

    it("getSum", async function () {
        let contractAddress = await session.loadAddress("contractAddress");
        let interactor = await createInteractor(session, contractAddress);
        let result = await interactor.getSum();
        assert.isTrue(result > 0);
    });
});
