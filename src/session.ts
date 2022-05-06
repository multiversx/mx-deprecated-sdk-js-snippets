import path from "path";
import { existsSync, PathLike, readFileSync } from "fs";
import { Address } from "@elrondnetwork/erdjs";
import { ApiNetworkProvider, NetworkConfig, ProxyNetworkProvider } from "@elrondnetwork/erdjs-network-providers";
import { ErrBadArgument, ErrBadSessionConfig } from "./errors";
import { IBunchOfUsers, IEventLog, IMochaSuite, INetworkProviderConfig, IStorage, ITestSession, ITestSessionConfig, ITestUser, IToken } from "./interface";
import { INetworkProvider } from "./interfaceOfNetwork";
import { Storage } from "./storage/storage";
import { BunchOfUsers } from "./users";
import { resolvePath } from "./filesystem";
import { EventLog } from "./eventLog";

const TypeToken = "token";
const TypeAddress = "address";
const TypeArbitraryBreadcrumb = "breadcrumb";

export class TestSession implements ITestSession {
    readonly name: string;
    readonly scope: string;
    readonly networkProvider: INetworkProvider;
    readonly users: IBunchOfUsers;
    readonly storage: IStorage;
    readonly log: IEventLog;
    private networkConfig: NetworkConfig = new NetworkConfig();

    constructor(args: {
        name: string,
        scope: string,
        provider: INetworkProvider,
        users: IBunchOfUsers,
        storage: IStorage,
        log: IEventLog
    }) {
        this.name = args.name;
        this.scope = args.scope;
        this.networkProvider = args.provider;
        this.users = args.users;
        this.storage = args.storage;
        this.log = args.log;
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
        let folderOfConfigFile = path.dirname(configFile.toString());
        let configJson = readFileSync(configFile, { encoding: "utf8" });
        let config = <ITestSessionConfig>JSON.parse(configJson);

        let provider = this.createNetworkProvider(sessionName, config.networkProvider);
        let users = new BunchOfUsers(config.users);
        let storageName = resolvePath(folderOfConfigFile, `${sessionName}.session.sqlite`);
        let storage = await Storage.create(storageName.toString());
        const log = new EventLog(storage);

        let session = new TestSession({
            name: sessionName,
            scope: scope,
            provider: provider,
            users: users,
            storage: storage,
            log: log
        });

        return session;
    }

    private static createNetworkProvider(sessionName: string, config: INetworkProviderConfig): INetworkProvider {
        if (!config.url) {
            throw new ErrBadSessionConfig(sessionName, "missing networkProvider.url");
        }
        if (!config.type) {
            throw new ErrBadSessionConfig(sessionName, "missing networkProvider.type");
        }

        if (config.type == ProxyNetworkProvider.name) {
            return new ProxyNetworkProvider(config.url, { timeout: config.timeout });
        }
        if (config.type == ApiNetworkProvider.name) {
            return new ApiNetworkProvider(config.url, { timeout: config.timeout });
        }

        throw new ErrBadSessionConfig(sessionName, "bad networkProvider.type");
    }

    private static findSessionConfigFile(sessionName: string, folder: string): PathLike {
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

    async syncNetworkConfig(): Promise<void> {
        this.networkConfig = await this.networkProvider.getNetworkConfig();
    }

    getNetworkConfig(): NetworkConfig {
        return this.networkConfig;
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

    async saveToken(name: string, token: IToken): Promise<void> {
        await this.storage.storeBreadcrumb(this.scope, TypeToken, name, token);
    }

    async loadToken(name: string): Promise<IToken> {
        let payload = await this.storage.loadBreadcrumb(this.scope, name);
        let token = { identifier: payload.identifier, decimals: payload.decimals };
        return token;
    }

    async saveBreadcrumb(params: { type?: string, name: string, value: any }): Promise<void> {
        await this.storage.storeBreadcrumb(
            this.scope,
            params.type || TypeArbitraryBreadcrumb,
            params.name,
            params.value
        );
    }

    async loadBreadcrumb(name: string): Promise<any> {
        let payload = await this.storage.loadBreadcrumb(this.scope, name);
        return payload;
    }

    async loadBreadcrumbsByType(type: string): Promise<any[]> {
        let payload: any[] = await this.storage.loadBreadcrumbsByType(this.scope, type);
        return payload;
    }

    async destroy(): Promise<void> {
        await this.storage.destroy();
    }
}
