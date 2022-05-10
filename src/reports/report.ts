import ejs from "ejs";
import { readFileSync, writeFileSync } from "fs";
import { resolvePath } from "../filesystem";
import { IStorage } from "../interface";

interface IReportConfig {
    explorerUrl: string;
    apiUrl: string;
    outputFolder: string;
}

export class Report {
    private readonly config: IReportConfig;
    private readonly storage: IStorage;

    constructor(config: IReportConfig, storage: IStorage) {
        this.config = config;
        this.storage = storage;
    }

    async prepare() {

    }

    async generate(name: string) {
        const template = this.getMainHtml();
        const html = ejs.render(template, {});

        this.save(name, html);
    }

    private getMainHtml(): string {
        const filePath = resolvePath(__dirname, "main.html");
        const html = readFileSync(filePath, { encoding: "utf8" });
        return html;
    }

    private save(name: string, content: string) {
        const filePath = resolvePath(this.config.outputFolder, `${name}.html`);
        writeFileSync(resolvePath(filePath), content, { encoding: "utf8" });
    }
}
