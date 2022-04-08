import { Account, Address, IProvider, TokenOfAccountOnNetwork } from "@elrondnetwork/erdjs";
import { parseUserKeys, UserSecretKey, UserSigner } from "@elrondnetwork/erdjs-walletcore";
import { PathLike, readFileSync } from "fs";
import path from "path";
import { IBunchOfUsers, ITestUser as ITestUser } from "./interface";
import { ISigner } from "./interfaceOfWalletCore";
import { resolvePath } from "./utils";

export class TestUser implements ITestUser {
    readonly address: Address;
    readonly account: Account;
    readonly signer: ISigner;
    accountTokens: TokenOfAccountOnNetwork[] = [];

    constructor(secretKey: UserSecretKey) {
        let publicKey = secretKey.generatePublicKey();
        this.address = new Address(publicKey.toAddress().bech32());
        this.account = new Account(this.address);
        this.signer = new UserSigner(secretKey);
    }

    static fromPemFile(file: PathLike): TestUser {
        let text = readFileSync(file, { encoding: "utf8" });
        let secretKey = UserSecretKey.fromPem(text);
        let user = new TestUser(secretKey);
        return user;
    }

    static moreFromPemFile(file: PathLike): TestUser[] {
        let text = readFileSync(file, { encoding: "utf8" });
        let secretKeys: UserSecretKey[] = parseUserKeys(text);
        let users = secretKeys.map(key => new TestUser(key));
        return users;
    }

    async sync(provider: IProvider): Promise<void> {
        await this.account.sync(provider);
    }
}

export class BunchOfUsers implements IBunchOfUsers {
    readonly whale: ITestUser;
    private readonly others: ITestUser[];

    readonly alice: ITestUser;
    readonly bob: ITestUser;
    readonly carol: ITestUser;
    readonly dan: ITestUser;
    readonly eve: ITestUser;
    readonly frank: ITestUser;
    readonly grace: ITestUser;
    readonly heidi: ITestUser;
    readonly ivan: ITestUser;
    readonly judy: ITestUser;
    readonly mallory: ITestUser;
    readonly mike: ITestUser;

    constructor(whalePem: string, othersPem?: string) {
        this.whale = TestUser.fromPemFile(whalePem);
        this.others = othersPem ? TestUser.moreFromPemFile(othersPem) : [];

        let friendsFolder = resolvePath("~", "elrondsdk", "testwallets", "latest", "users");
        this.alice = TestUser.fromPemFile(path.resolve(friendsFolder, "alice.pem"));
        this.bob = TestUser.fromPemFile(path.resolve(friendsFolder, "bob.pem"));
        this.carol = TestUser.fromPemFile(path.resolve(friendsFolder, "carol.pem"));
        this.dan = TestUser.fromPemFile(path.resolve(friendsFolder, "dan.pem"));
        this.eve = TestUser.fromPemFile(path.resolve(friendsFolder, "eve.pem"));
        this.frank = TestUser.fromPemFile(path.resolve(friendsFolder, "frank.pem"));
        this.grace = TestUser.fromPemFile(path.resolve(friendsFolder, "grace.pem"));
        this.heidi = TestUser.fromPemFile(path.resolve(friendsFolder, "heidi.pem"));
        this.ivan = TestUser.fromPemFile(path.resolve(friendsFolder, "ivan.pem"));
        this.judy = TestUser.fromPemFile(path.resolve(friendsFolder, "judy.pem"));
        this.mallory = TestUser.fromPemFile(path.resolve(friendsFolder, "mallory.pem"));
        this.mike = TestUser.fromPemFile(path.resolve(friendsFolder, "mike.pem"));
    }

    getFriends(): ITestUser[] {
        return [this.alice, this.bob, this.carol, this.dan, this.eve, this.frank, this.grace, this.heidi, this.ivan, this.judy, this.mallory, this.mike];
    }

    getOthers(): ITestUser[] {
        return this.others;
    }

    getAll(): ITestUser[] {
        return [this.whale, ...this.getFriends(), ...this.getOthers()];
    }

    getAllExcept(some: ITestUser[]): ITestUser[] {
        let result = this.getAll().filter(user => !some.includes(user));
        return result;
    }

    getAddressesOfFriends(): Address[] {
        return this.getFriends().map(user => user.address);
    }

    getAddressesOfOthers(): Address[] {
        return this.getOthers().map(user => user.address);
    }

    getAddressesOfAll(): Address[] {
        return this.getAll().map(user => user.address);
    }

    getAddressesOfAllExcept(some: ITestUser[]): Address[] {
        return this.getAllExcept(some).map(user => user.address);
    }
}
