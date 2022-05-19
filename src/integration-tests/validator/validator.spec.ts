import { Address, TokenPayment } from "@elrondnetwork/erdjs";
import { assert } from "chai";
import { ITestSession, ITestUser, ITestNode, IBlsKeyOwnerAddress, IBLS } from "../../interface";
import { INetworkProvider } from "../../interfaceOfNetwork";
import { TestSession } from "../../session";
import { createValidatorInteractor } from "../../system/validator";
import { BLS, ValidatorSecretKey, parseUserKeys, UserSecretKey, UserSigner } from "@elrondnetwork/erdjs-walletcore";
import { PathLike, readFileSync, readdirSync } from "fs";
import { FiveMinutesInMilliseconds } from "../../constants";

describe("validator interactor", async function () {
    this.bail(true);

    let suite = this;
    let session: ITestSession;
    let provider: INetworkProvider;
    let owner: ITestUser;
    let node: ITestNode;
    let nodes: ITestNode[];

    this.beforeAll(async function () {
        await BLS.initIfNecessary();
        session = await TestSession.load("devnet", __dirname);
        provider = session.networkProvider;
        owner = session.users.getUser("self");
        node = session.nodes.getNode("staking-node")
        nodes = session.nodes.getGroupOfNodes("groupOfNodes");

        await session.syncNetworkConfig();
    });

    it("Stake Individual Node", async function () {
        this.timeout(FiveMinutesInMilliseconds);
        let keySignaturePair: Buffer[] = []

        let interactor = await createValidatorInteractor(session)

        let secretKey = node.secretKey;
        let key = new ValidatorSecretKey(secretKey);
        let signature = key.sign(new Address(owner.address.bech32()).pubkey());
        keySignaturePair.push(key.generatePublicKey().valueOf(), signature);

        await session.syncUsers([owner]);
        await interactor.stake(
            owner,
            1,
            ...keySignaturePair
        )
    });

    it("Stake Individual Node and Change Reward Address", async function () {

        this.timeout(FiveMinutesInMilliseconds);
        let keySignaturePair: Buffer[] = []

        let interactor = await createValidatorInteractor(session)

        let secretKey = node.secretKey;
        let key = new ValidatorSecretKey(secretKey);
        let signature = key.sign(new Address(owner.address.bech32()).pubkey());
        keySignaturePair.push(key.generatePublicKey().valueOf(), signature);
        let newRewardAddress = new Address("erd19uv7xe40k399jl4shr0tynxj3uq58syzg6f5vs9k75dgyuvpmzds6s5juk")
        keySignaturePair.push(newRewardAddress.pubkey());
        await session.syncUsers([owner]);
        await interactor.stake(
            owner,
            1,
            ...keySignaturePair
        )
    });

    it("Stake Group Of Nodes", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let keySignaturePair: Buffer[] = []
        let numberOfNodes = 0

        let interactor = await createValidatorInteractor(session)
        for (node of nodes) {
            let secretKey = node.secretKey;
            let key = new ValidatorSecretKey(secretKey);
            let signature = key.sign(new Address(owner.address.bech32()).pubkey());
            keySignaturePair.push(key.generatePublicKey().valueOf(), signature);
            numberOfNodes++;
        }

        await session.syncUsers([owner]);
        await interactor.stake(
            owner,
            numberOfNodes,
            ...keySignaturePair
        )
    });


    it("Stake Group Of Nodes and Change Reward Address", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let keySignaturePair: Buffer[] = []
        let numberOfNodes = 0

        let interactor = await createValidatorInteractor(session)
        for (node of nodes) {
            let secretKey = node.secretKey;
            let key = new ValidatorSecretKey(secretKey);
            let signature = key.sign(new Address(owner.address.bech32()).pubkey());
            keySignaturePair.push(key.generatePublicKey().valueOf(), signature);
            numberOfNodes++;
        }

        await session.syncUsers([owner]);
        await interactor.stake(
            owner,
            numberOfNodes,
            ...keySignaturePair
        )
    });

    it("Unstake Individual Node", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createValidatorInteractor(session)

        let secretKey = node.secretKey;
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.unStake(
            owner,
            key.generatePublicKey().valueOf()
        )
    });

    it("Unstake Group of Nodes", async function () {
        this.timeout(FiveMinutesInMilliseconds);
        let blsKeyList: Buffer[] = []

        let interactor = await createValidatorInteractor(session)

        for (node of nodes) {
            let secretKey = node.secretKey;
            let key = new ValidatorSecretKey(secretKey);
            blsKeyList.push(key.generatePublicKey().valueOf())
        }

        await session.syncUsers([owner]);
        await interactor.unStake(
            owner,
            ...blsKeyList
        )
    });

    it("UnstakeNodes for Individual Node", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createValidatorInteractor(session)

        let secretKey = node.secretKey;
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.unStakeNodes(
            owner,
            key.generatePublicKey().valueOf()
        )
    });

    it("UnstakeNodes for Group of Nodes", async function () {
        this.timeout(FiveMinutesInMilliseconds);
        let blsKeyList: Buffer[] = []

        let interactor = await createValidatorInteractor(session)

        for (node of nodes) {
            let secretKey = node.secretKey;
            let key = new ValidatorSecretKey(secretKey);
            blsKeyList.push(key.generatePublicKey().valueOf())
        }
        await session.syncUsers([owner]);
        await interactor.unStakeNodes(
            owner,
            ...blsKeyList
        )
    });

    it("UnStake Tokens", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createValidatorInteractor(session)
        let unStakeValue = 200000000000000000000;

        await session.syncUsers([owner]);
        await interactor.unStakeTokens(
            owner,
            unStakeValue
        )
    });

    it("Unbond for Individual Node", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createValidatorInteractor(session)

        let secretKey = node.secretKey;
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.unBond(
            owner,
            key.generatePublicKey().valueOf()
        )
    });

    it("Unbond for Group Of Nodes", async function () {
        this.timeout(FiveMinutesInMilliseconds);
        let blsKeyList: Buffer[] = []

        let interactor = await createValidatorInteractor(session)

        for (node of nodes) {
            let secretKey = node.secretKey;
            let key = new ValidatorSecretKey(secretKey);
            blsKeyList.push(key.generatePublicKey().valueOf())
        }
        await session.syncUsers([owner]);
        await interactor.unBond(
            owner,
            ...blsKeyList
        )
    });

    it("Unbond Nodes", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createValidatorInteractor(session)

        let secretKey = node.secretKey;
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.unBondNodes(
            owner,
            key.generatePublicKey().valueOf()
        )
    });

    it("Unbond Tokens", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createValidatorInteractor(session)

        await session.syncUsers([owner]);
        await interactor.unBondTokens(owner)
    });

    it("Unjail", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createValidatorInteractor(session)

        let secretKey = node.secretKey;
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.unJail(
            owner,
            key.generatePublicKey().valueOf()
        )
    });

    it("Change Reward Address", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createValidatorInteractor(session)
        let newRewardAddress = new Address("erd19uv7xe40k399jl4shr0tynxj3uq58syzg6f5vs9k75dgyuvpmzds6s5juk")

        let secretKey = node.secretKey
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.changeRewardAddress(
            owner,
            newRewardAddress,
            key.generatePublicKey().valueOf()
        )
    });

    it("Get Total Staked", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createValidatorInteractor(session)
        let address = new Address("erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye")

        await session.syncUsers([owner]);
        await interactor.getTotalStaked(address)
    });

    it("Get Total Staked Topup Staked Bls Keys", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createValidatorInteractor(session)
        let address = new Address("erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye")

        await session.syncUsers([owner]);
        await interactor.getTotalStakedTopUpStakedBlsKeys(address)
    });

    it("Get Bls Key Status", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createValidatorInteractor(session)
        let address = new Address("erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye")

        await session.syncUsers([owner]);
        await interactor.getBlsKeysStatus(address)
    });

    it("Clean Registered Data", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createValidatorInteractor(session)

        await session.syncUsers([owner]);
        await interactor.cleanRegisteredData(owner)
    });

    it("Get UnStaked Tokens List", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createValidatorInteractor(session)
        let address = new Address("erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye")

        await session.syncUsers([owner]);
        await interactor.getUnStakedTokensList(address)
    });

    it("ReStake UnStaked Nodes", async function () {
        this.timeout(FiveMinutesInMilliseconds);

        let interactor = await createValidatorInteractor(session)

        let secretKey = node.secretKey;
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.reStakeUnStakedNodes(
            owner,
            key.generatePublicKey().valueOf()
        )
    });
});