import { Balance } from "@elrondnetwork/erdjs";
import { AdderInteractor } from "./adderInteractor";
import { AirdropService } from "../airdrop";
import { MOCHA_TIMEOUT_ONE_MINUTE } from "../constants";
import { ITestSession, IUser } from "../interfaces";
import { TestSession } from "../session";
import { assert } from "chai";

describe("adder snippet", async function () {
    let scope = this.fullTitle();
    let session: ITestSession;
    let owner: IUser;

    this.beforeAll(async function () {
        session = await TestSession.loadSession(__dirname, "default", scope);
        owner = session.users.alice;
        await session.syncNetworkConfig();
    });

    it("airdrop", async function () {
        this.timeout(MOCHA_TIMEOUT_ONE_MINUTE * 5);

        await session.syncUsers([owner]);
        await AirdropService.createOnSession(session).sendToEachUser(Balance.egld(1));
    });

    it("setup", async function () {
        this.timeout(MOCHA_TIMEOUT_ONE_MINUTE * 5);

        await session.syncUsers([owner]);

        let interactor = await AdderInteractor.create(session);
        let contractAddress = await interactor.deploy(owner, 42);
        await session.saveAddress("contractAddress", contractAddress);
    });

    it("add", async function () {
        this.timeout(MOCHA_TIMEOUT_ONE_MINUTE * 5);

        await session.syncUsers([owner]);

        let contractAddress = await session.loadAddress("contractAddress");
        let interactor = await AdderInteractor.create(session, contractAddress);

        await interactor.add(owner, 3);
    });

    it("getSum", async function () {
        let contractAddress = await session.loadAddress("contractAddress");
        let interactor = await AdderInteractor.create(session, contractAddress);
        let result = await interactor.getSum(owner);
        assert.isTrue(result > 0)
    });
});
