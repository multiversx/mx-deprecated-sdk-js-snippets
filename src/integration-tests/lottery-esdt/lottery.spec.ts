import { ReturnCode, TokenPayment } from "@multiversx/sdk-core";
import { assert } from "chai";
import { createAirdropService } from "../../airdrop";
import { FiveMinutesInMilliseconds } from "../../constants";
import { retryOnError } from "../../faulty";
import { ITestSession, ITestUser } from "../../interface";
import { INetworkProvider } from "../../interfaceOfNetwork";
import { TestSession } from "../../session";
import { createESDTInteractor } from "../../system/esdtInteractor";
import { createInteractor } from "./lotteryInteractor";

describe("lottery snippet", async function () {
    this.bail(true);

    const LotteryName = "fooLottery";

    let session: ITestSession;
    let provider: INetworkProvider;
    let whale: ITestUser;
    let owner: ITestUser;
    let friends: ITestUser[];

    this.beforeAll(async function () {
        session = await TestSession.load("devnet", __dirname);
        provider = session.networkProvider;
        whale = session.users.getUser("whale");
        owner = session.users.getUser("whale");
        friends = session.users.getGroup("friends");
        await session.syncNetworkConfig();
    });

    it("airdrop EGLD", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        const payment = TokenPayment.egldFromAmount(0.1);
        await session.syncUsers([whale]);
        await createAirdropService(session).sendToEachUser(whale, friends, [payment]);
    });

    it("issue lottery token", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        const interactor = await createESDTInteractor(session);
        await session.syncUsers([owner]);
        const token = await interactor.issueFungibleToken(owner, { name: "FOO", ticker: "FOO", decimals: 0, supply: "100000000" });
        await session.saveToken({ name: "lotteryToken", token: token });
        await session.save();
    });

    it("airdrop lottery token", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        const lotteryToken = await session.loadToken("lotteryToken");
        const payment = TokenPayment.fungibleFromAmount(lotteryToken.identifier, "10", lotteryToken.decimals);
        await session.syncUsers([owner]);
        await createAirdropService(session).sendToEachUser(owner, friends, [payment]);
    });

    it("setup", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        await session.syncUsers([owner]);

        const interactor = await createInteractor(session);
        const { address, returnCode } = await interactor.deploy(owner);

        assert.isTrue(returnCode.isSuccess());

        await session.saveAddress({ name: "lottery", address: address });
        await session.save();
    });

    it("start lottery", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        await session.syncUsers([owner]);

        const contractAddress = await session.loadAddress("lottery");
        const lotteryToken = await session.loadToken("lotteryToken");
        const interactor = await createInteractor(session, contractAddress);
        const whitelist = friends.map(user => user.address);
        const returnCode = await interactor.start(owner, LotteryName, lotteryToken.identifier, 1, whitelist);
        assert.isTrue(returnCode.isSuccess());

        await session.save();
    });

    it("get lottery info and status", async function () {
        const contractAddress = await session.loadAddress("lottery");
        const lotteryToken = await session.loadToken("lotteryToken");
        const interactor = await createInteractor(session, contractAddress);
        const lotteryInfo = await interactor.getLotteryInfo(LotteryName);
        const lotteryStatus = await interactor.getStatus(LotteryName);
        console.log("Info:", lotteryInfo.valueOf());
        console.log("Prize pool:", lotteryInfo.getFieldValue("prize_pool").toString());
        console.log("Status:", lotteryStatus);

        assert.equal(lotteryInfo.getFieldValue("token_identifier"), lotteryToken.identifier);
        assert.equal(lotteryStatus, "Running");
    });

    it("get whitelist", async function () {
        const contractAddress = await session.loadAddress("lottery");
        const interactor = await createInteractor(session, contractAddress);
        const whitelist = await interactor.getWhitelist(LotteryName);
        const expectedWhitelist = friends.map(user => user.address).map(address => address.bech32());

        console.log("Whitelist:", whitelist);
        assert.deepEqual(whitelist, expectedWhitelist);
    });

    it("friends buy tickets", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        // If something fails, retry.
        await retryOnError({
            func: async function () {
                await session.syncUsers([owner, ...friends]);

                const contractAddress = await session.loadAddress("lottery");
                const lotteryToken = await session.loadToken("lotteryToken");
                const interactor = await createInteractor(session, contractAddress);

                const payment = TokenPayment.fungibleFromAmount(lotteryToken.identifier, "1", lotteryToken.decimals);
                const buyPromises = friends.map(friend => interactor.buyTicket(friend, LotteryName, payment));
                const returnCodes: ReturnCode[] = await Promise.all(buyPromises);

                for (const returnCode of returnCodes) {
                    assert.isTrue(returnCode.isSuccess());
                }

                await session.save();
            },
            numRetries: 3,
            delayInMilliseconds: 1000
        });
    });

    it("destroy session", async function () {
        await session.destroy();
    });
});
