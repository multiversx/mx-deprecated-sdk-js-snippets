import { Address, TokenPayment } from "@elrondnetwork/erdjs";
import { assert } from "chai";
import { ITestSession, ITestUser } from "../../interface";
import { INetworkProvider } from "../../interfaceOfNetwork";
import { TestSession } from "../../session";
import { InteractionRecord } from "../../storage/records";
import { createESDTInteractor } from "../../system/esdt";

describe("staking interactor", async function () {
    this.bail(true);

    let suite = this;
    let session: ITestSession;
    let provider: INetworkProvider;
    let whale: ITestUser;
    let owner: ITestUser;
    let friends: ITestUser[];

    this.beforeAll(async function () {
        session = await TestSession.loadOnSuite("testnet", suite);
        provider = session.networkProvider;
        whale = session.users.getUser("whale");
        owner = session.users.getUser("whale");
        friends = session.users.getGroup("friends");
        await session.syncNetworkConfig();
    });

    it("Issue Fungible Token", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.issueFungibleToken(
            owner,
            {
                name: "FUNGI",
                ticker: "FUNGI",
                supply: "1000000000000000",
                decimals: 2,
                canFreeze: true,
                canMint: true,
                canBurn: true,
                canWipe: true
            })
    });
});