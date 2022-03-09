import { Account, Address, IProvider, ISigner, parseUserKeys, TokenOfAccountOnNetwork, UserSecretKey, UserSigner } from "@elrondnetwork/erdjs";
import { PathLike, readFileSync } from "fs";
import path from "path";
import { IBunchOfUsers, IUser } from "./interfaces";

export class User implements IUser {
    readonly address: Address;
    readonly account: Account;
    readonly signer: ISigner;
    accountTokens: TokenOfAccountOnNetwork[] = [];

    constructor(secretKey: UserSecretKey) {
        let publicKey = secretKey.generatePublicKey();
        this.address = publicKey.toAddress();
        this.account = new Account(this.address);
        this.signer = new UserSigner(secretKey);
    }

    static fromPemFile(file: PathLike): User {
        let text = readFileSync(file, { encoding: "utf8" });
        let secretKey = UserSecretKey.fromPem(text);
        let user = new User(secretKey);
        return user;
    }

    static moreFromPemFile(file: PathLike): User[] {
        let text = readFileSync(file, { encoding: "utf8" });
        let secretKeys: UserSecretKey[] = parseUserKeys(text);
        let users = secretKeys.map(key => new User(key));
        return users;
    }

    async sync(proxy: IProvider): Promise<void> {
        await this.account.sync(proxy);
    }
}

export class BunchOfUsers implements IBunchOfUsers {
    readonly whale: IUser;
    private readonly others: IUser[];

    readonly alice: IUser;
    readonly bob: IUser;
    readonly carol: IUser;
    readonly dan: IUser;
    readonly eve: IUser;
    readonly frank: IUser;
    readonly grace: IUser;
    readonly heidi: IUser;
    readonly ivan: IUser;
    readonly judy: IUser;
    readonly mallory: IUser;
    readonly mike: IUser;

    constructor(whalePem: string, othersPem?: string) {
        this.whale = User.fromPemFile(whalePem);
        this.others = othersPem ? User.moreFromPemFile(othersPem) : [];

        let friendsFolder = path.resolve(__dirname, "..", "wallets", "friends");
        this.alice = User.fromPemFile(path.resolve(friendsFolder, "alice.pem"));
        this.bob = User.fromPemFile(path.resolve(friendsFolder, "bob.pem"));
        this.carol = User.fromPemFile(path.resolve(friendsFolder, "carol.pem"));
        this.dan = User.fromPemFile(path.resolve(friendsFolder, "dan.pem"));
        this.eve = User.fromPemFile(path.resolve(friendsFolder, "eve.pem"));
        this.frank = User.fromPemFile(path.resolve(friendsFolder, "frank.pem"));
        this.grace = User.fromPemFile(path.resolve(friendsFolder, "grace.pem"));
        this.heidi = User.fromPemFile(path.resolve(friendsFolder, "heidi.pem"));
        this.ivan = User.fromPemFile(path.resolve(friendsFolder, "ivan.pem"));
        this.judy = User.fromPemFile(path.resolve(friendsFolder, "judy.pem"));
        this.mallory = User.fromPemFile(path.resolve(friendsFolder, "mallory.pem"));
        this.mike = User.fromPemFile(path.resolve(friendsFolder, "mike.pem"));
    }

    getFriends(): IUser[] {
        return [this.alice, this.bob, this.carol, this.dan, this.eve, this.frank, this.grace, this.heidi, this.ivan, this.judy, this.mallory, this.mike];
    }

    getOthers(): IUser[] {
        return this.others;
    }

    getAll(): IUser[] {
        return [this.whale, ...this.getFriends(), ...this.getOthers()];
    }

    getAllExceptWhale(): IUser[] {
        return [...this.getFriends(), ...this.getOthers()];
    }
}

