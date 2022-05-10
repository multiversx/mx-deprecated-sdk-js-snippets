import ejs from "ejs";
import { readFileSync, writeFileSync } from "fs";
import { resolvePath } from "../filesystem";
import { IReportingConfig, IStorage } from "../interface";

export class Report {
    private readonly config: IReportingConfig;
    private readonly storage: IStorage;

    constructor(config: IReportingConfig, storage: IStorage) {
        this.config = config;
        this.storage = storage;
    }

    async prepare() {
    }

    async generate(tag?: string) {
        const template = this.getMainHtml();
        const html = ejs.render(template, {});

        this.save(tag || "default", html);
    }

    private getMainHtml(): string {
        const filePath = resolvePath(__dirname, "main.html");
        const html = readFileSync(filePath, { encoding: "utf8" });
        return html;
    }

    private save(tag: string, content: string) {
        const timestamp = new Date().getTime();
        const filePath = resolvePath(this.config.outputFolder, `${tag}_${timestamp}.html`);
        writeFileSync(resolvePath(filePath), content, { encoding: "utf8" });
    }
}
