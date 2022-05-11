import ejs from "ejs";
import { readFileSync, writeFileSync } from "fs";
import { BreadcrumbTypeAddress, BreadcrumbTypeToken } from "../constants";
import { resolvePath } from "../filesystem";
import { IAccountSnapshotRecord, IBreadcrumbRecord, IInteractionRecord, IReportingConfig, IStorage } from "../interface";

export class Report {
    private readonly config: IReportingConfig;
    private readonly storage: IStorage;
    private readonly model: ReportModel;

    constructor(config: IReportingConfig, storage: IStorage) {
        this.config = config;
        this.storage = storage;
        this.model = new ReportModel();
    }

    async prepare() {
        const breadcrumbs = await this.storage.loadBreadcrumbs();
        const interactions = await this.storage.loadInteractions();

        this.model.breadcrumbs = breadcrumbs
            .map(e => new ArbitraryBreadcrumbModel(e));

        this.model.addresses = breadcrumbs
            .filter(e => e.type == BreadcrumbTypeAddress)
            .map(e => new AddressBreadcrumbModel(e, this.config));

        this.model.tokens = breadcrumbs
            .filter(e => e.type == BreadcrumbTypeToken)
            .map(e => new TokenBreadcrumbModel(e));

        this.model.interactions = interactions
            .sort(e => e.id)
            .map(e => new InteractionModel(e, this.config));
    }

    async generate(tag?: string) {
        const template = this.getMainHtml();
        const html = ejs.render(template, this.model);

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

        console.log(`Report saved at location: file://${filePath}`);
    }
}

class ReportModel {
    addresses: AddressBreadcrumbModel[] = [];
    tokens: TokenBreadcrumbModel[] = [];
    breadcrumbs: ArbitraryBreadcrumbModel[] = [];
    interactions: InteractionModel[] = [];
}

class AddressBreadcrumbModel {
    readonly name: string;
    readonly value: string;
    readonly explorerHref: string;
    readonly apiHref: string;
    readonly tag: string;

    constructor(breadcrumb: IBreadcrumbRecord, config: IReportingConfig) {
        this.name = breadcrumb.name;
        this.value = breadcrumb.payload;
        this.explorerHref = `${config.explorerUrl}/accounts/${this.value}`;
        this.apiHref = `${config.apiUrl}/accounts/${this.value}`;
        this.tag = breadcrumb.correlationTag;
    }
}

class TokenBreadcrumbModel {
    readonly name: string;
    readonly identifier: string;
    readonly tag: string;

    constructor(breadcrumb: IBreadcrumbRecord) {
        this.name = breadcrumb.name;
        this.identifier = breadcrumb.payload;
        this.tag = breadcrumb.correlationTag;
    }
}

class ArbitraryBreadcrumbModel {
    readonly name: string;
    readonly type: string;
    readonly payload: string;
    readonly tag: string;

    constructor(breadcrumb: IBreadcrumbRecord) {
        this.name = breadcrumb.name;
        this.type = breadcrumb.type;
        this.payload = stringifyObject(breadcrumb.payload);
        this.tag = breadcrumb.correlationTag;
    }
}

class InteractionModel {
    id: number;
    timestamp: string;
    transaction: string;
    transactionHref: string;
    action: string;
    user: string;
    userHref: string;
    contract: string;
    contractHref: string;
    input: string;
    transfers: string;
    output: string;
    tag: string;

    snapshotsBefore: AccountSnapshotModel[] = [];
    snapshotsAfter: AccountSnapshotModel[] = [];

    constructor(interaction: IInteractionRecord, config: IReportingConfig) {
        const user = interaction.userAddress.bech32();
        const contract = interaction.contractAddress.bech32();
        const transaction = interaction.transactionHash.toString();

        this.id = interaction.id;
        this.timestamp = interaction.timestamp;
        this.action = interaction.action;
        this.user = getAddressShorthand(user);
        this.userHref = `${config.explorerUrl}/accounts/${user}`;
        this.contract = getAddressShorthand(contract);
        this.contractHref = `${config.explorerUrl}/accounts/${user}`;
        this.transaction = getHashShorthand(transaction);
        this.transactionHref = `${config.explorerUrl}/transactions/${transaction}`;

        this.input = stringifyObject(interaction.input);
        this.transfers = stringifyObject(interaction.transfers);
        this.output = stringifyObject(interaction.output);
        this.tag = interaction.correlationTag;
    }
}

class AccountSnapshotModel {
    address: string;
    nonce: number;
    balance: string;
    fungibleTokens: string;
    nonFungibleTokens: string;

    constructor(snapshot: IAccountSnapshotRecord) {
        this.address = snapshot.address.bech32();
        this.nonce = snapshot.nonce
        this.balance = snapshot.balance.toString();
        this.fungibleTokens = stringifyObject(snapshot.fungibleTokens);
        this.nonFungibleTokens = stringifyObject(snapshot.fungibleTokens);
    }
}

function stringifyObject(obj: any) {
    return JSON.stringify(obj, null, 4);
}

function getAddressShorthand(address: string) {
    let shorthand = `${address.substring(0, 12)}...${address.substring(address.length - 8)}`;
    return shorthand;
}

function getHashShorthand(hash: string) {
    let shorthand = `${hash.substring(0, 4)}...${hash.substring(hash.length - 4)}`;
    return shorthand;
}
