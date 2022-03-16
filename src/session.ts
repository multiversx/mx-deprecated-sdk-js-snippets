import { Address, IProvider, NetworkConfig, ProxyProvider, Token } from "@elrondnetwork/erdjs";
import { readFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { ErrBadArgument, ErrBadSessionConfig } from "./errors";
import { IBunchOfUsers, IMochaSuite, IMochaTest, IStorage, ITestSession, ITestSessionConfig, IUser } from "./interfaces";
import { Storage } from "./storage/storage";
import { BunchOfUsers, User } from "./users";

const TypeToken = "token";
const TypeAddress = "address";
const OneMinuteInMilliseconds = 60 * 1000;

export class TestSession implements ITestSession {
    readonly name: string;
    readonly scope: string;
    readonly proxy: IProvider;
    readonly users: IBunchOfUsers;
    readonly storage: IStorage;

    constructor(args: {
        name: string,
        scope: string,
        proxy: IProvider,
        users: IBunchOfUsers,
        storage: IStorage,
        config: ITestSessionConfig
    }) {
        this.name = args.name;
        this.scope = args.scope;
        this.proxy = args.proxy;
        this.users = args.users;
        this.storage = args.storage;
    }

    static async loadOnSuite(sessionName: string, mochaSuite: IMochaSuite): Promise<ITestSession> {
        if (!mochaSuite.file) {
            throw new ErrBadArgument("file of mocha suite isn't known");
        }

        let folder = path.dirname(mochaSuite.file);
        let scope = mochaSuite.fullTitle();
        return await TestSession.load(sessionName, scope, folder);
    }

    static async load(sessionName: string, scope: string, folder: string): Promise<ITestSession> {
        let configFile = path.join(folder, `${sessionName}.session.json`);
        let configJson = readFileSync(configFile, { encoding: "utf8" });
        let config = <ITestSessionConfig>JSON.parse(configJson);
        
        if (!config.proxyUrl) {
            throw new ErrBadSessionConfig(sessionName, "missing 'proxyUrl'");
        }
        if (!config.whalePem) {
            throw new ErrBadSessionConfig(sessionName, "missing 'whalePem'");
        }

        let proxy = new ProxyProvider(config.proxyUrl);
        let whalePem = resolvePath(folder, config.whalePem);
        let othersPem = config.othersPem ? resolvePath(folder, config.whalePem) : undefined;
        let users = new BunchOfUsers(whalePem, othersPem);
        let storageName = path.join(folder, `${sessionName}.session.sqlite`);
        let storage = await Storage.create(storageName);

        let session = new TestSession({
            name: sessionName,
            scope: scope,
            proxy: proxy,
            users: users,
            storage: storage,
            config: config
        });

        return session;
    }

    expectLongInteraction(mochaTest: IMochaTest, minutes: number = 5) {
        mochaTest.timeout(minutes * OneMinuteInMilliseconds);
    }

    async syncNetworkConfig(): Promise<void> {
        await NetworkConfig.getDefault().sync(this.proxy);
    }

    async syncWhale(): Promise<void> {
        await this.users.whale.sync(this.proxy);
    }

    async syncAllUsers(): Promise<void> {
        await this.syncUsers(this.users.getAll());
    }

    async syncUsers(users: IUser[]): Promise<void> {
        let promises = users.map(user => user.sync(this.proxy));
        await Promise.all(promises);
    }

    async saveAddress(name: string, address: Address): Promise<void> {
        console.log(`TestSession.saveAddress(): name = [${name}], address = ${address.bech32()}`);
        await this.storage.storeBreadcrumb(this.scope, TypeAddress, name, address.bech32());
    }

    async loadAddress(name: string): Promise<Address> {
        let payload = await this.storage.loadBreadcrumb(this.scope, name);
        let address = new Address(payload);
        return address;
    }

    async saveToken(name: string, token: Token): Promise<void> {
        await this.storage.storeBreadcrumb(this.scope, TypeToken, name, token);
    }

    async loadToken(name: string): Promise<Token> {
        let payload = await this.storage.loadBreadcrumb(this.scope, name);
        let token = new Token(payload);
        return token;
    }

    async getTokensOnFocus(): Promise<Token[]> {
        let payloads = await this.storage.loadBreadcrumbsByType(this.scope, TypeToken);
        let tokens = payloads.map(item => new Token(item));
        return tokens;
    }
}

function resolvePath(...pathSegments: string[]): string {
    let fixedSegments = pathSegments.map(segment => asUserPath(segment));
    let resolvedPath = path.resolve(...fixedSegments);
    return resolvedPath;
}

function asUserPath(userPath: string): string {
    return (userPath || "").replace("~", homedir);
}
