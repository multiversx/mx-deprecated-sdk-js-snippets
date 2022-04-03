import { IProvider, Token, TokenType } from "@elrondnetwork/erdjs";
import { assert } from "chai";
import { AirdropService } from "../../airdrop";
import { createTokenAmount } from "../../erdjsPatching/amounts";
import { ITestSession, ITestUser } from "../../interfaces";
import { TestSession } from "../../session";
import { ESDTInteractor } from "../../system/esdtInteractor";
import { createInteractor } from "./counterInteractor";

describe("counter snippet", async function () {
    this.bail(true);

    let suite = this;
    let session: ITestSession;
    let provider: IProvider;
    let whale: ITestUser;
    let owner: ITestUser;
    let alice: ITestUser;

    this.beforeAll(async function () {
        session = await TestSession.loadOnSuite("devnet", suite);
        provider = session.provider;
        whale = session.users.whale;
        owner = session.users.whale;
        alice = session.users.alice;
        await session.syncNetworkConfig();
    });

    it("issue counter token", async function () {
        session.expectLongInteraction(this);

        let interactor = await ESDTInteractor.create(session);
        let token = new Token({ name: "COUNTER", ticker: "COUNTER", decimals: 0, supply: "100000000", type: TokenType.Fungible });
        await session.syncUsers([owner]);
        await interactor.issueToken(owner, token);
        await session.saveToken("counterToken", token);
    });

    it("airdrop counter token", async function () {
        session.expectLongInteraction(this);

        let lotteryToken = await session.loadToken("counterToken");
        let amount = createTokenAmount(lotteryToken, "100");
        await session.syncUsers([owner]);
        await AirdropService.createOnSession(session).sendToEachUser(owner, amount);
    });

    it("setup", async function () {
        session.expectLongInteraction(this);

        await session.syncUsers([owner]);

        let interactor = await createInteractor(provider);
        let { address, returnCode } = await interactor.deploy(owner, 42);
        
        assert.isTrue(returnCode.isSuccess());

        await session.saveAddress("contractAddress", address);
    });

    it("increment with single ESDT transfer", async function () {
        session.expectLongInteraction(this);

        await session.syncUsers([owner, alice]);

        let contractAddress = await session.loadAddress("contractAddress");
        let counterToken = await session.loadToken("counterToken");
        let interactor = await createInteractor(provider, contractAddress);

        let amount = createTokenAmount(counterToken, "10");
        
        // Intra-shard
        interactor.incrementWithSingleESDTTransfer(owner, 1, amount);

        // Cross-shard
        interactor.incrementWithSingleESDTTransfer(alice, 1, amount);
    });

    it("increment with multi transfer", async function () {
        session.expectLongInteraction(this);

        await session.syncUsers([owner, alice]);

        let contractAddress = await session.loadAddress("contractAddress");
        let counterToken = await session.loadToken("counterToken");
        let interactor = await createInteractor(provider, contractAddress);

        let amount = createTokenAmount(counterToken, "10");

        // Intra-shard
        interactor.incrementWithMultiTransfer(owner, 1, amount);

        // Cross-shard
        interactor.incrementWithSingleESDTTransfer(alice, 1, amount);
    });
});