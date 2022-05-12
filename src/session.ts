import path from "path";
import { existsSync, PathLike, readFileSync } from "fs";
import { Address } from "@elrondnetwork/erdjs";
import { ApiNetworkProvider, NetworkConfig, ProxyNetworkProvider } from "@elrondnetwork/erdjs-network-providers";
import { ErrBadSessionConfig } from "./errors";
import { IBunchOfUsers, ICorrelationHolder, IAudit, INetworkProviderConfig, IStorage, ITestSession, ITestSessionConfig, ITestUser, IToken } from "./interface";
import { INetworkConfig, INetworkProvider } from "./interfaceOfNetwork";
import { Storage } from "./storage/storage";
import { BunchOfUsers } from "./users";
import { resolvePath } from "./filesystem";
import { Audit } from "./audit";
import { Report } from "./reports/report";
import { CorrelationHolder } from "./correlationHolder";
import { BreadcrumbTypeAddress, BreadcrumbTypeArbitrary, BreadcrumbTypeToken } from "./constants";

export class TestSession implements ITestSession {
    readonly config: ITestSessionConfig;
    readonly name: string;
    readonly correlation: ICorrelationHolder;
    readonly networkProvider: INetworkProvider;
    readonly users: IBunchOfUsers;
    readonly storage: IStorage;
    readonly audit: IAudit;
    private networkConfig: INetworkConfig = new NetworkConfig();

    constructor(args: {
        config: ITestSessionConfig,
        name: string,
        correlation: ICorrelationHolder,
        provider: INetworkProvider,
        users: IBunchOfUsers,
        storage: IStorage,
        log: IAudit
    }) {
        this.config = args.config;
        this.name = args.name;
        this.correlation = args.correlation;
        this.networkProvider = args.provider;
        this.users = args.users;
        this.storage = args.storage;
        this.audit = args.log;
    }

    static async load(sessionName: string, folder: string): Promise<ITestSession> {
        const configFile = this.findSessionConfigFile(sessionName, folder);
        const folderOfConfigFile = path.dirname(configFile.toString());
        const configJson = readFileSync(configFile, { encoding: "utf8" });
        const config = <ITestSessionConfig>JSON.parse(configJson);

        const correlation = new CorrelationHolder();
        const networkprovider = this.createNetworkProvider(sessionName, config.networkProvider);
        const users = await BunchOfUsers.create(config.users);
        const storageName = resolvePath(folderOfConfigFile, `${sessionName}.session.sqlite`);
        const storage = await Storage.create(storageName.toString());
        const log = new Audit({
            storage: storage,
            correlation: correlation,
            networkProvider: networkprovider
        });

        let session = new TestSession({
            config: config,
            name: sessionName,
            correlation: correlation,
            provider: networkprovider,
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

    getNetworkConfig(): INetworkConfig {
        return this.networkConfig;
    }

    async syncUsers(users: ITestUser[]): Promise<void> {
        let promises = users.map(user => user.sync(this.networkProvider));
        await Promise.all(promises);
    }

    async saveAddress(name: string, address: Address): Promise<void> {
        console.log(`TestSession.saveAddress(): name = [${name}], address = ${address.bech32()}`);

        await this.storage.storeBreadcrumb({
            id: 0,
            correlationStep: this.correlation.step,
            correlationTag: this.correlation.tag,
            type: BreadcrumbTypeAddress,
            name: name,
            payload: address.bech32()
        });
    }

    async loadAddress(name: string): Promise<Address> {
        const breadcrumb = await this.storage.loadBreadcrumb(name);
        const address = new Address(breadcrumb.payload);
        return address;
    }

    async saveToken(name: string, token: IToken): Promise<void> {
        console.log(`TestSession.saveToken(): name = [${name}], token = ${token.identifier}`);

        await this.storage.storeBreadcrumb({
            id: 0,
            correlationStep: this.correlation.step,
            correlationTag: this.correlation.tag,
            type: BreadcrumbTypeToken,
            name: name,
            payload: token
        });
    }

    async loadToken(name: string): Promise<IToken> {
        const breadcrumb = await this.storage.loadBreadcrumb(name);
        const token = { identifier: breadcrumb.payload.identifier, decimals: breadcrumb.payload.decimals };
        return token;
    }

    async saveBreadcrumb(params: { type?: string, name: string, value: any }): Promise<void> {
        console.log(`TestSession.saveBreadcrumb(): name = [${params.name}], type = ${params.type}`);

        await this.storage.storeBreadcrumb({
            id: 0,
            correlationStep: this.correlation.step,
            correlationTag: this.correlation.tag,
            type: params.type || BreadcrumbTypeArbitrary,
            name: params.name,
            payload: params.value,
        });
    }

    async loadBreadcrumb(name: string): Promise<any> {
        const breadcrumb = await this.storage.loadBreadcrumb(name);
        return breadcrumb.payload;
    }

    async loadBreadcrumbsByType(type: string): Promise<any[]> {
        const breadcrumbs = await this.storage.loadBreadcrumbsByType(type);
        const payloads = breadcrumbs.map(breadcrumb => breadcrumb.payload);
        return payloads;
    }

    async generateReport(tag?: string): Promise<void> {
        const report = new Report(this.config.reporting, this.storage);
        await report.prepare();
        await report.generate(tag);
    }

    async destroy(): Promise<void> {
        await this.storage.destroy();
    }
}
