import { Account, Address, IProvider, ISigner, parseUserKeys, TokenOfAccountOnNetwork, UserSecretKey, UserSigner } from "@elrondnetwork/erdjs";
import { PathLike, readFileSync } from "fs";
import { IUser } from "./interfaces";

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

