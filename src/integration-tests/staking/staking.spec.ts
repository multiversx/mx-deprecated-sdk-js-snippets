import { Address, TokenPayment } from "@elrondnetwork/erdjs";
import { assert } from "chai";
import { ITestSession, ITestUser, ITestNode, IBlsKeyOwnerAddress, IBLS } from "../../interface";
import { INetworkProvider } from "../../interfaceOfNetwork";
import { TestSession } from "../../session";
import { InteractionRecord } from "../../storage/records";
import { createStakingInteractor } from "../../system/staking";
import { BLS, ValidatorSecretKey, parseUserKeys, UserSecretKey, UserSigner } from "@elrondnetwork/erdjs-walletcore";
import * as path from "path";
import { PathLike, readFileSync, readdirSync } from "fs";
import { resolvePath } from "../../utils";

describe("staking interactor", async function () {
    this.bail(true);

    let suite = this;
    let session: ITestSession;
    let provider: INetworkProvider;
    let whale: ITestUser;
    let owner: ITestUser;
    let friends: ITestUser[];
    let node: ITestNode;

    this.beforeAll(async function () {
        await BLS.initIfNecessary();
        session = await TestSession.loadOnSuite("testnet", suite);
        provider = session.networkProvider;
        whale = session.users.getUser("whale");
        owner = session.users.getUser("self");
        node = session.nodes.getNode("staking-node")
        friends = session.users.getGroup("friends");

        await session.syncNetworkConfig();
    });

    it("Get Waiting List Index", async function () {

        this.timeout(5000);
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        let secretKey = node.secretKey;
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.getWaitingListIndex(key.generatePublicKey().valueOf())
    });


    it("Get Waiting List Size", async function () {
        this.timeout(5000);
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        await session.syncUsers([owner]);
        await interactor.getWaitingListSize()
    });

    it("Get Reward Address", async function () {
        this.timeout(5000);
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        let secretKey = node.secretKey
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.getRewardAddress(key.generatePublicKey().valueOf())
    });

    it("Get BLS Key Status", async function () {
        this.timeout(5000);
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        let secretKey = node.secretKey
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.getBLSKeyStatus(key.generatePublicKey().valueOf())
    });

    it("Get Remaining Unbond Period", async function () {
        this.timeout(5000);
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        let secretKey = node.secretKey;
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.getRemainingUnbondPeriod(key.generatePublicKey().valueOf())
    });

    it("Get Waiting List Register Nonce and Reward Address", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        await session.syncUsers([owner]);
        await interactor.getWaitingListRegisterNonceAndRewardAddress()
    });

    it("Get Owner", async function () {
        this.timeout(5000);
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        let secretKey = node.secretKey
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.getOwner(key.generatePublicKey().valueOf())
    });

    it("Get Total Number of Registered Nodes", async function () {
        this.timeout(5000);
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)
        let bksKey = "testKey"

        await session.syncUsers([owner]);
        await interactor.getTotalNumberOfRegisteredNodes()
    });

    it("Fix Waiting List Queue Size", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)
        let bksKey = "testKey"

        await session.syncUsers([owner]);
        await interactor.fixWaitingListQueueSize(owner)
    });

    it("Add Missing Node To Queue", async function () {
        this.timeout(5000);
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        let secretKey = node.secretKey
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.addMissingNodeToQueue(
            owner,
            key.generatePublicKey().valueOf())
    });

    it("Check if staked", async function () {
        this.timeout(5000);
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        let secretKey = node.secretKey
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.checkIfStaked(key.generatePublicKey().valueOf())
    });

    it("#ValidatorSC Call -> Stake", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        let secretKey = node.secretKey;
        let key = new ValidatorSecretKey(secretKey);
        let rewardAddress = new Address("erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye")
        let ownerAddress = new Address(owner.address.bech32())

        await session.syncUsers([owner]);
        await interactor.stake(
            owner,
            key.generatePublicKey().valueOf(),
            rewardAddress,
            ownerAddress
        )
    });

    it("#ValidatorSC Call -> Register", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        let secretKey = node.secretKey;
        let key = new ValidatorSecretKey(secretKey);
        let rewardAddress = new Address("erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye")
        let ownerAddress = new Address(owner.address.bech32())

        await session.syncUsers([owner]);
        await interactor.stake(
            owner,
            key.generatePublicKey().valueOf(),
            rewardAddress,
            ownerAddress
        )
    });

    it("#ValidatorSC Call -> Unstake", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        let secretKey = node.secretKey;
        let key = new ValidatorSecretKey(secretKey);
        let rewardAddress = new Address("erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye")

        await session.syncUsers([owner]);
        await interactor.unStake(
            owner,
            key.generatePublicKey().valueOf(),
            rewardAddress
        )
    });

    it("#ValidatorSC Call -> Unbond", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        let secretKey = node.secretKey
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.unBond(
            owner,
            key.generatePublicKey().valueOf()
        )
    });


    it("#ValidatorSC Call -> Change Owner and Reward Address", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)
        let newOwner = new Address("erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye")
        let secretKey = node.secretKey
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.changeOwnerAndRewardAddress(
            owner,
            newOwner,
            key.generatePublicKey().valueOf()
        )
    });

    it("#ValidatorSC Call -> Change Reward Address", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)
        let newRewardAddress = new Address("erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye")

        let secretKey = node.secretKey
        let key = new ValidatorSecretKey(secretKey);

        await session.syncUsers([owner]);
        await interactor.changeRewardAddress(
            owner,
            newRewardAddress,
            key.generatePublicKey().valueOf())
    });

    it("#ValidatorSC Call -> Change Validator Key", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)
        let olbBlsKey = Buffer.from("23f918f98b2e1812bfb964251491446b7ee553cd37ec786fb779e522db7b711138727b6b1dd0c5e41c19e7b22a3d240f4533062b7af9a385c52af4c9442355b989cfc0e73f1a2b46f3f0541470bf2476521c8c0835af4d7b9c42294f89651989")
        let newBlsKey = Buffer.from("23f918f98b2e1812bfb964251491446b7ee553cd37ec786fb779e522db7b711138727b6b1dd0c5e41c19e7b22a3d240f4533062b7af9a385c52af4c9442355b989cfc0e73f1a2b46f3f0541470bf2476521c8c0835af4d7b9c42294f89651989")

        await session.syncUsers([owner]);
        await interactor.changeValidatorKeys(
            owner,
            olbBlsKey,
            newBlsKey)
    });


    it("#SystemSC Call -> Set Owners on Addresses", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)
        let BlsKeyOwnerAddressPair = {
            blsKey: "testkey",
            ownerAddress: new Address("address")
        }

        await session.syncUsers([owner]);
        await interactor.setOwnersOnAddresses(
            owner,
            BlsKeyOwnerAddressPair
        )
    });

    it("#SystemSC Call -> Stake Nodes from Queue", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)
        let numberOfNodesFromQueue = 5

        await session.syncUsers([owner]);
        await interactor.stakeNodesFromQueue(
            owner,
            numberOfNodesFromQueue,
        )
    });

    it("#SystemSC Call -> Unstake at End of Epoch", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)
        let bksKey = "testKey"

        await session.syncUsers([owner]);
        await interactor.unStakeAtEndOfEpoch(
            owner,
            bksKey,
        )
    });

    it("#SystemSC Call -> Reset Last Unjailed from Queue", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)
        let bksKey = "testKey"

        await session.syncUsers([owner]);
        await interactor.resetLastUnJailedFromQueue(owner)
    });

    it("#SystemSC Call -> Clean Additional Queue", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)
        let bksKey = "testKey"

        await session.syncUsers([owner]);
        await interactor.cleanAdditionalQueue(owner)
    });

    it("SystemSC Call -> Switch Jailed With Waiting", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)
        let blsKey = "erd18h5dulxp5zdp80qjndd2w25kufx0rm5yqd2h7ajrfucjhr82y8vqyq0hye"

        await session.syncUsers([owner]);
        await interactor.switchJailedWithWaiting(
            owner,
            blsKey
        )
    });

    it("#EndOfEpochSC Call-> Update Config Min Nodes", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)
        let newMinNodes = 3

        await session.syncUsers([owner]);
        await interactor.updateConfigMinNodes(
            owner,
            newMinNodes
        )
    });

    it("#EndOfEpochSC Call-> Update Config Max Nodes", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)
        let maxNodes = 5

        await session.syncUsers([owner]);
        await interactor.updateConfigMaxNodes(
            owner,
            maxNodes,
        )
    });

    it("#EndOfEpochSC Call-> Jail", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        await session.syncUsers([owner]);
        await interactor.jail(
            owner,
            "buffer")
    });

    it("# After EndOfEpochSC Call-> Unjail", async function () {
        session.expectLongInteraction(this);

        let interactor = await createStakingInteractor(session)

        await session.syncUsers([owner]);
        await interactor.jail(
            owner,
            "string")
    });
});