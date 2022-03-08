import { Address, IProvider, NetworkConfig, ProxyProvider, Token } from "@elrondnetwork/erdjs";
import { readFileSync } from "fs";
import path from "path";
import { ErrBadSessionConfig } from "./errors";
import { IStorage, ITestSession, ITestSessionConfig, IUser } from "./interfaces";
import { Storage } from "./storage/storage";
import { User } from "./users";

const TypeToken = "token";
const TypeAddress = "address";

export class TestSession implements ITestSession {
    readonly name: string;
    readonly scope: string;
    readonly proxy: IProvider;
    readonly storage: IStorage;
    readonly whale: IUser;
    readonly users: IUser[] = [];

    constructor(args: {
        name: string,
        scope: string,
        proxy: IProvider,
        storage: IStorage,
        // TODO: Receive IBunchOfUsers
        config: ITestSessionConfig
    }) {
        
        // TODO: Remove checks (move them at load time)
        if (!args.config.whalePem) {
            throw new ErrBadSessionConfig(args.name, "missing 'whalePem'");
        }
        if (!args.config.accountsPem) {
            throw new ErrBadSessionConfig(args.name, "missing 'accountsPem'");
        }

        this.name = args.name;
        this.scope = args.scope;
        this.proxy = args.proxy;
        this.storage = args.storage;
        this.whale = User.fromPemFile(args.config.whalePem);
        this.users = User.moreFromPemFile(args.config.accountsPem);
    }

    static async loadSession(folder: string, sessionName: string, scope: string): Promise<ITestSession> {
        let configFile = path.join(folder, `${sessionName}.session.json`);
        let configJson = readFileSync(configFile, { encoding: "utf8" });
        let config = <ITestSessionConfig>JSON.parse(configJson);
        
        if (!config.proxyUrl) {
            throw new ErrBadSessionConfig(sessionName, "missing 'proxyUrl'");
        }

        let proxy = new ProxyProvider(config.proxyUrl);
        let storageName = path.join(folder, `${sessionName}.sqlite`);
        let storage = await Storage.create(storageName);

        let session = new TestSession({
            name: sessionName,
            scope: scope,
            proxy: proxy,
            storage: storage,
            config: config
        });

        return session;
    }

    async syncNetworkConfig(): Promise<void> {
        await NetworkConfig.getDefault().sync(this.proxy);
    }

    async syncWhale(): Promise<void> {
        await this.whale.sync(this.proxy);
    }

    async syncUsers(): Promise<void> {
        let promises = this.users.map(user => user.sync(this.proxy));
        await Promise.all(promises);
    }

    async saveAddress(name: string, address: Address): Promise<void> {
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
