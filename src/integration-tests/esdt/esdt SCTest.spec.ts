import { Address, TokenPayment } from "@elrondnetwork/erdjs";
import { assert } from "chai";
import { ITestSession, ITestUser } from "../../interface";
import { INetworkProvider } from "../../interfaceOfNetwork";
import { TestSession } from "../../session";
import { BLS } from "@elrondnetwork/erdjs-walletcore";
import { createESDTInteractor } from "../../system/esdt";
import { FiveMinutesInMilliseconds } from "../../constants";

describe("esdt Scenario 1", async function () {
    this.bail(true);

    let suite = this;
    let session: ITestSession;
    let provider: INetworkProvider;
    let whale: ITestUser;
    let owner: ITestUser;
    let friends: ITestUser[];

    this.beforeAll(async function () {
        await BLS.initIfNecessary();
        session = await TestSession.load("testnet", __dirname);
        provider = session.networkProvider;
        whale = session.users.getUser("whale");
        owner = session.users.getUser("self");
        friends = session.users.getGroup("friends");
        await session.syncNetworkConfig();
    });

    it("Issue/Check Fungible Token with all properties and wipe afterwards", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([owner]);
        await interactor.issueFungibleToken(
            owner,
            {
                name: "FUNGI1",
                ticker: "FUNGI1",
                supply: "1000000000000000",
                decimals: 2,
                canFreeze: true,
                canMint: true,
                canBurn: true,
                canWipe: true
            })


    });

    it("Issue SemiFungible Token", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.issueSemiFungibleToken(
            owner,
            {
                name: "SEMIFUNGI",
                ticker: "SEMI",
                canFreeze: true,
                canWipe: true,
                canPause: true,
                canAddSpecialRoles: true
            })
    });

    it("Issue NonFungible Token", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.issueNonFungibleToken(
            owner,
            {
                name: "NONFUNGI",
                ticker: "NON",
                canChangeOwner: true,
                canTransferNFTCreateRole: true
            })
    });

    it("Burn Token", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.burnToken(
            owner,
            {
                name: "FUNGI-ceb797",
                burnAmount: 1000000
            })
    });

    it("Set Special Role", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);

        await interactor.setSpecialRole(
            owner,
            {
                name: "FUNGI-ceb797",
                addressToSetRolesFor: new Address("erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th"),
                roleLocalBurn: "ESDTRoleLocalBurn",
                roleLocalMint: "ESDTRoleLocalMint",
            })
    });

    it("Mint Token", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.mintToken(
            owner,
            {
                name: "FUNGI-ceb797",
                newSupply: 1000000
            })
    });

    it("Freeze Token", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)
        let accountToFreeze = new Address("erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye")

        await session.syncUsers([whale]);
        await interactor.freezeAccountAddress(
            owner,
            {
                name: "FUNGI-ceb797",
                account: accountToFreeze
            })
    });

    it("Unfreeze Token", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)
        let accountToUnfreeze = new Address("erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye")

        await session.syncUsers([whale]);
        await interactor.unfreezeAccountAddress(
            owner,
            {
                name: "FUNGI-ceb797",
                account: accountToUnfreeze
            })
    });

    it("Wipe Token", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)
        let accountToWipe = new Address("erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye")

        await session.syncUsers([whale]);
        await interactor.wipeAccount(
            owner,
            {
                name: "FUNGI-ceb797",
                account: accountToWipe
            })
    });

    it("Pause Token", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.pauseTransactions(owner, { name: "FUNGI-ceb797" })
    });

    it("Unpause Token", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.unPauseTransactions(owner, { name: "FUNGI-ceb797" })
    });

    it("Get Token Properties", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.getTokenProperties({ name: "FUNGI-ceb797" })
    });

    it("Get Special Roles", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.getSpecialRoles({ name: "FUNGI-ceb797" });
    });

    it("Get Contract Configuration", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.getContractConfig();
    });

    it("Claim", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.claim(owner);
    });

    it("Transfer Token To User", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createESDTInteractor(session)
        let receiver = new Address("erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye")

        let payment = TokenPayment.fungibleFromBigInteger("FUNGI-ceb797", 1000, 1);
        await session.syncUsers([whale]);
        await interactor.sendToUser(owner, receiver, payment)
    });

});
