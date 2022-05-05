import { Account, IAddress } from "@elrondnetwork/erdjs";
import { parseUserKeys, UserSecretKey, UserSigner } from "@elrondnetwork/erdjs-walletcore";
import { PathLike, readFileSync, readdirSync } from "fs";
import { ErrMissingUserOrGroup } from "./errors";
import { IBunchOfUsers, ITestUser, IUsersConfig } from "./interface";
import { INetworkProvider } from "./interfaceOfNetwork";
import { ISigner } from "./interfaceOfWalletCore";
import { resolvePath } from "./filesystem";

export class TestUser implements ITestUser {
    readonly name: string;
    readonly group: string;
    readonly address: IAddress;
    readonly account: Account;
    readonly signer: ISigner;

    constructor(name: string, group: string, secretKey: UserSecretKey) {
        let publicKey = secretKey.generatePublicKey();

        this.name = name;
        this.group = group;
        this.address = publicKey.toAddress();
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

    constructor(config: IUsersConfig) {
        // Load individuals
        for (const individual of config.individuals) {
            let key = loadKeyFromPemFile(individual.pem);
            let user = new TestUser(individual.name, "", key);

            this.individuals.set(individual.name, user);
        }

        // Load groups
        for (const group of config.groups) {
            // From a single file
            if (group.pem) {
                let keys = loadMoreKeysFromPemFile(group.pem);
                let users = keys.map(key => new TestUser("", group.name, key));

                this.groups.set(group.name, users);
                continue;
            }

            // From a folder
            if (group.folder) {
                let files = readdirSync(resolvePath(group.folder));
                let groupOfUsers: ITestUser[] = [];

                for (const file of files) {
                    if (!file.endsWith(".pem")) {
                        continue;
                    }
                    
                    let keys = loadMoreKeysFromPemFile(resolvePath(group.folder, file));
                    let users = keys.map(key => new TestUser("", group.name, key));

                    groupOfUsers.push(...users);
                }

                this.groups.set(group.name, groupOfUsers);
                continue;
            }
        }
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

function loadKeyFromPemFile(file: PathLike): UserSecretKey {
    file = resolvePath(file);
    let text = readFileSync(file, { encoding: "utf8" });
    let secretKey = UserSecretKey.fromPem(text);
    return secretKey;
}

function loadMoreKeysFromPemFile(file: PathLike): UserSecretKey[] {
    file = resolvePath(file);
    let text = readFileSync(file, { encoding: "utf8" });
    let secretKeys: UserSecretKey[] = parseUserKeys(text);
    return secretKeys;
}
