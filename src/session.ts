import { Address, Token } from "@elrondnetwork/erdjs";
import { NetworkConfig, ProxyNetworkProvider } from "@elrondnetwork/erdjs-network-providers";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { ErrBadArgument, ErrBadSessionConfig } from "./errors";
import { IBunchOfUsers, IMochaSuite, IMochaTest, IStorage, ITestSession, ITestSessionConfig, ITestUser } from "./interface";
import { INetworkProvider } from "./interfaceOfNetwork";
import { Storage } from "./storage/storage";
import { BunchOfUsers } from "./users";
import { resolvePath } from "./utils";

const TypeToken = "token";
const TypeAddress = "address";
const OneMinuteInMilliseconds = 60 * 1000;

export class TestSession implements ITestSession {
    readonly name: string;
    readonly scope: string;
    readonly networkProvider: INetworkProvider;
    readonly users: IBunchOfUsers;
    readonly storage: IStorage;
    private networkConfig: NetworkConfig = new NetworkConfig();

    constructor(args: {
        name: string,
        scope: string,
        provider: INetworkProvider,
        users: IBunchOfUsers,
        storage: IStorage,
        config: ITestSessionConfig
    }) {
        this.name = args.name;
        this.scope = args.scope;
        this.networkProvider = args.provider;
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
        let configFile = this.findSessionConfigFile(sessionName, folder);
        let folderOfConfigFile = path.dirname(configFile);
        let configJson = readFileSync(configFile, { encoding: "utf8" });
        let config = <ITestSessionConfig>JSON.parse(configJson);
        
        if (!config.providerUrl) {
            throw new ErrBadSessionConfig(sessionName, "missing 'providerUrl'");
        }
        if (!config.whalePem) {
            throw new ErrBadSessionConfig(sessionName, "missing 'whalePem'");
        }

        let provider = new ProxyNetworkProvider(config.providerUrl);
        let whalePem = resolvePath(config.whalePem);
        let othersPem = config.othersPem ? resolvePath(config.whalePem) : undefined;
        let users = new BunchOfUsers(whalePem, othersPem);
        let storageName = resolvePath(folderOfConfigFile, `${sessionName}.session.sqlite`);
        let storage = await Storage.create(storageName);

        let session = new TestSession({
            name: sessionName,
            scope: scope,
            provider: provider,
            users: users,
            storage: storage,
            config: config
        });

        return session;
    }

    private static findSessionConfigFile(sessionName: string, folder: string) {
        let configFile = resolvePath(folder, `${sessionName}.session.json`);
        if (existsSync(configFile)) {
            return configFile;
        }

        // Fallback to parent folder
        configFile = resolvePath(folder, "..", `${sessionName}.session.json`);
        if (existsSync(configFile)) {
            return configFile;
        }

        throw new ErrBadSessionConfig(sessionName, "file not found");
    }

    expectLongInteraction(mochaTest: IMochaTest, minutes: number = 5) {
        mochaTest.timeout(minutes * OneMinuteInMilliseconds);
    }

    async syncNetworkConfig(): Promise<void> {
        this.networkConfig = await this.networkProvider.getNetworkConfig();
    }

    getNetworkConfig(): NetworkConfig {
        return this.networkConfig;
    }

    async syncWhale(): Promise<void> {
        await this.users.whale.sync(this.networkProvider);
    }

    async syncAllUsers(): Promise<void> {
        await this.syncUsers(this.users.getAll());
    }

    async syncUsers(users: ITestUser[]): Promise<void> {
        let promises = users.map(user => user.sync(this.networkProvider));
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

