import { Account, IAddress } from "@multiversx/sdk-core";
import { UserPublicKey, UserSecretKey, UserSigner } from "@multiversx/sdk-wallet";
import { PathLike, readdirSync, readFileSync } from "fs";
import { parseUserKeys } from "./erdjsPatching/walletcore";
import { ErrMissingUserOrGroup } from "./errors";
import { resolvePath } from "./filesystem";
import { IAccount, IBunchOfUsers, ITestUser, IUsersConfig } from "./interface";
import { INetworkProvider } from "./interfaceOfNetwork";
import { ISigner } from "./interfaceOfWalletCore";

export class TestUser implements ITestUser {
    readonly name: string;
    readonly group: string;
    readonly secretKey: UserSecretKey;
    readonly pubkey: UserPublicKey;
    readonly address: IAddress;
    readonly account: IAccount;
    readonly signer: ISigner;

    constructor(name: string, group: string, secretKey: UserSecretKey, pubkey: UserPublicKey) {
        this.name = name;
        this.group = group;
        this.secretKey = secretKey;
        this.pubkey = pubkey;
        this.address = pubkey.toAddress();
        this.account = new Account(this.address);
        this.signer = new UserSigner(secretKey);
    }

    async sync(provider: INetworkProvider): Promise<void> {
        let accountOnNetwork = await provider.getAccount(this.address);
        this.account.update(accountOnNetwork);
    }
}

export class BunchOfUsers implements IBunchOfUsers {
    readonly individuals: Map<string, ITestUser> = new Map<string, ITestUser>();
    readonly groups: Map<string, ITestUser[]> = new Map<string, ITestUser[]>();

    constructor(individuals: Map<string, ITestUser>, groups: Map<string, ITestUser[]>) {
        this.individuals = individuals;
        this.groups = groups;
    }

    static async create(config: IUsersConfig): Promise<BunchOfUsers> {
        const individuals = new Map<string, ITestUser>();
        const groups = new Map<string, ITestUser[]>();

        const timeStart = new Date();

        // Load individuals
        for (const individualConfig of config.individuals) {
            const { sk, pk } = loadKeyFromPemFile(individualConfig.pem);
            const user = new TestUser(individualConfig.name, "", sk, pk);

            individuals.set(individualConfig.name, user);
        }

        // Load groups
        for (const groupConfig of config.groups) {
            // From a single file
            if (groupConfig.pem) {
                const keyPairs = loadMoreKeysFromPemFile(groupConfig.pem);
                const users = keyPairs.map(keyPair => new TestUser("", groupConfig.name, keyPair.sk, keyPair.pk));

                groups.set(groupConfig.name, users);
                continue;
            }

            // From a folder
            if (groupConfig.folder) {
                const files = readdirSync(resolvePath(groupConfig.folder));
                const groupOfUsers: ITestUser[] = [];

                for (const file of files) {
                    if (!file.endsWith(".pem")) {
                        continue;
                    }

                    const keyPairs = loadMoreKeysFromPemFile(resolvePath(groupConfig.folder, file));
                    const users = keyPairs.map(keyPair => new TestUser("", groupConfig.name, keyPair.sk, keyPair.pk));

                    groupOfUsers.push(...users);
                }

                groups.set(groupConfig.name, groupOfUsers);
                continue;
            }
        }

        const timeEnd = new Date();

        console.info(`BunchOfUsers.create() took ${timeEnd.getTime() - timeStart.getTime()} ms.`);

        return new BunchOfUsers(individuals, groups);
    }

    getUser(name: string): ITestUser {
        let user = this.individuals.get(name);
        if (user) {
            return user;
        }

        throw new ErrMissingUserOrGroup(name);
    }

    getGroup(name: string): ITestUser[] {
        let group = this.groups.get(name);
        if (group) {
            return group;
        }

        throw new ErrMissingUserOrGroup(name);
    }
}

function loadKeyFromPemFile(file: PathLike) {
    const text = readFileSync(resolvePath(file), { encoding: "utf8" });
    const keys = parseUserKeys(text);

    return {
        sk: keys[0].sk,
        pk: keys[0].pk
    };
}

function loadMoreKeysFromPemFile(file: PathLike) {
    let text = readFileSync(resolvePath(file), { encoding: "utf8" });
    const keys = parseUserKeys(text);
    return keys;
}
