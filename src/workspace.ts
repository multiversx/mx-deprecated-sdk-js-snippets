import * as path from "path";
import { existsSync, readFileSync, mkdirSync } from "fs";
import { ErrBadWorkspace, ErrBadWorkspaceConfig } from "./errors";
import { ITestSession, ITestSessionConfig, IWorkspaceConfig } from "./interfaces";
import { ProxyProvider } from "@elrondnetwork/erdjs";
import { TestSession } from "./session";
import { Storage } from "./storage/storage";

export class Workspace {
    readonly folder: string;
    readonly config: IWorkspaceConfig;

    constructor(folder: string, config: IWorkspaceConfig) {
        if (!config.proxyUrl) {
            throw new ErrBadWorkspaceConfig(folder, "bad proxy url");
        }
        if (!config.session) {
            throw new ErrBadWorkspaceConfig(folder, "no active session");
        }

        this.folder = folder;
        this.config = config;
    }

    static load(): Workspace {
        let folder = process.env.WORKSPACE || path.join("workspaces", "default");
        let configFile = path.join(folder, "workspace.json");
        let configExists = existsSync(configFile);

        if (!configExists) {
            throw new ErrBadWorkspace(folder);
        }

        let config = Workspace.readConfig(configFile);
        let workspace = new Workspace(folder, config);
        return workspace;
    }

    private static readConfig(configFile: string): IWorkspaceConfig {
        let json = readFileSync(configFile, { encoding: "utf8" });
        let config = <IWorkspaceConfig>JSON.parse(json);
        return config;
    }

    async loadSession(scope: string): Promise<ITestSession> {
        let proxy = new ProxyProvider(this.config.proxyUrl);
        let sessionName = this.config.session;
        let sessionConfig = this.readSessionConfig();
        let storageName = path.join(this.folder, `${sessionName}.sqlite`);
        let storage = await Storage.create(storageName);

        let session = new TestSession({
            name: sessionName,
            scope: scope,
            proxy: proxy,
            storage: storage,
            config: sessionConfig
        });

        return session;
    }

    private readSessionConfig(): ITestSessionConfig {
        let configFilename = `session.${this.config.session}.json`;
        let configFile = path.join(this.folder, configFilename);
        let json = readFileSync(configFile, { encoding: "utf8" });
        let config = <ITestSessionConfig>JSON.parse(json);
        return config;
    }
}
