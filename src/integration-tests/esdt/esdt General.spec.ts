import { Address, TokenPayment } from "@elrondnetwork/erdjs";
import { assert } from "chai";
import { ITestSession, ITestUser } from "../../interface";
import { INetworkProvider } from "../../interfaceOfNetwork";
import { TestSession } from "../../session";
import { InteractionRecord } from "../../storage/records";
import { BLS } from "@elrondnetwork/erdjs-walletcore";
import { createESDTInteractor } from "../../system/esdt";

describe("esdt interactor", async function () {
    this.bail(true);

    let suite = this;
    let session: ITestSession;
    let provider: INetworkProvider;
    let whale: ITestUser;
    let owner: ITestUser;
    let friends: ITestUser[];

    this.beforeAll(async function () {
        await BLS.initIfNecessary();
        session = await TestSession.loadOnSuite("testnet", suite);
        provider = session.networkProvider;
        whale = session.users.getUser("whale");
        owner = session.users.getUser("self");
        friends = session.users.getGroup("friends");
        await session.syncNetworkConfig();
    });

    it("Issue Fungible Token", async function () {
        session.expectLongInteraction(this);

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
        session.expectLongInteraction(this);

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
        session.expectLongInteraction(this);

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
        session.expectLongInteraction(this);

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
        session.expectLongInteraction(this);

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
        session.expectLongInteraction(this);

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
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)
        let accountToFreeze = new Address("erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th")

        await session.syncUsers([whale]);
        await interactor.freezeAccountAddress(
            whale,
            {
                name: "FUNGI-711048",
                account: accountToFreeze
            })
    });

    it("Unfreeze Token", async function () {
        session.expectLongInteraction(this);

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
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)
        let accountToWipe = new Address("erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th")

        await session.syncUsers([whale]);
        await interactor.wipeAccount(
            whale,
            {
                name: "FUNGI-711048",
                account: accountToWipe
            })
    });

    it("Pause Token", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.pauseTransactions(owner, { name: "FUNGI-ceb797" })
    });

    it("Unpause Token", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.unPauseTransactions(owner, { name: "FUNGI-ceb797" })
    });

    it("Get Token Properties", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.getTokenProperties({ name: "FUNGI-ceb797" })
    });

    it("Get Special Roles", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.getSpecialRoles({ name: "FUNGI-ceb797" });
    });

    it("Get Contract Configuration", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.getContractConfig();
    });

    it("Claim", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.claim(owner);
    });

    it("Transfer Token To User", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)
        let receiver = new Address("erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye")

        let payment = TokenPayment.fungibleFromBigInteger("FUNGI-711048", 1000, 2);
        await session.syncUsers([whale]);
        await interactor.sendToUser(whale, receiver, payment)
    });

    it("Stop NFT Create", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)
        let tokenName = "tokenName"

        await session.syncUsers([whale]);
        await interactor.stopNFTCreateForever(owner, { name: tokenName });
    });

    it("Transfer NFT Create Role", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)
        let tokenName = "tokenName"
        let currentNFTCreator = new Address("Address")
        let nextNFTCreateOwner = new Address("Address")

        await session.syncUsers([whale]);
        await interactor.transferNFTCreateRole(
            owner,
            { name: tokenName },
            currentNFTCreator,
            nextNFTCreateOwner
        );
    });

    it("Unset Special Role", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)
        let tokenName = "tokenName"
        let ownerAddress = new Address("Address")
        let roles = ["test"]

        await session.syncUsers([whale]);
        await interactor.unSetSpecialRole(
            owner,
            { name: tokenName, owner: ownerAddress },
            roles
        );

        //TODO: Add asserts
    });

    it("Wipe Single NFT", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)
        let tokenName = "tokenName"
        let ownerAddress = new Address("Address")
        let nonce = 10

        await session.syncUsers([whale]);
        await interactor.wipeSingleNFT(
            owner,
            { name: tokenName },
            nonce,
            ownerAddress
        );

        //TODO: Add asserts
    });

    it("Freeze Single NFT", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)
        let tokenName = "tokenName"
        let ownerAddress = new Address("Address")
        let nonce = 10

        await session.syncUsers([whale]);
        await interactor.toggleFreezeSingleNFT(
            owner,
            { name: tokenName },
            nonce,
            ownerAddress
        );

        //TODO: Add asserts
    });

    it("UnFreeze Single NFT", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)
        let tokenName = "tokenName"
        let ownerAddress = new Address("Address")
        let nonce = 10

        await session.syncUsers([whale]);
        await interactor.unFreezeSingleNFT(
            owner,
            { name: tokenName },
            nonce,
            ownerAddress
        );

        //TODO: Add asserts
    });

    it("Register MetaESDT", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.registerMetaESDT(
            owner,
            {
                name: "FUNGI1",
                ticker: "FUNGI1",
                decimals: 2,
                canFreeze: true,
                canMint: true,
                canBurn: true,
                canWipe: true
            });

        //TODO: Add asserts
    });

    it("Get All Address and Roles", async function () {
        session.expectLongInteraction(this);

        let interactor = await createESDTInteractor(session)

        await session.syncUsers([whale]);
        await interactor.getAllAddressesAndRoles({ name: "EGLDMEX-ac9d0a" });
    });
});
