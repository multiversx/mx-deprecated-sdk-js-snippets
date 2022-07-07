import { parseValidatorKeys, ValidatorSecretKey } from "@elrondnetwork/erdjs-walletcore";
import { PathLike, readFileSync, readdirSync } from "fs";
import { ErrMissingNodeOrGroupOfNodes } from "./errors";
import { IBunchOfNodes, ITestNode, INodesConfig } from "./interface";
import { resolvePath } from "./filesystem";

export class TestNode implements ITestNode {
    readonly name: string;
    readonly group: string;
    readonly secretKey: Buffer;
    readonly publicKey: Buffer;

    constructor(name: string, group: string, secretKey: ValidatorSecretKey) {
        this.name = name;
        this.group = group;
        this.secretKey = Buffer.from(secretKey);
        this.publicKey = secretKey.generatePublicKey().valueOf();
    }
}

export class BunchOfNodes implements IBunchOfNodes {
    readonly individualNodes: Map<string, ITestNode> = new Map<string, ITestNode>();
    readonly groupOfNodes: Map<string, ITestNode[]> = new Map<string, ITestNode[]>();

    constructor(config: INodesConfig) {
        // Load individual nodes
        for (const oneNode of config.individualNodes) {
            let secretKey = loadSecretKeyFromPemFile(oneNode.pem);
            let node = new TestNode(oneNode.name, "", secretKey);

            this.individualNodes.set(oneNode.name, node)
        }

        // Load groups
        for (const group of config.groupOfNodes) {
            // From a single file
            if (group.pem) {
                let secretKeys = loadMoreSecretKeyFromPemFile(group.pem);
                let nodes = secretKeys.map(key => new TestNode("", group.name, key));

                this.groupOfNodes.set(group.name, nodes);
                continue;
            }

            // From a folder
            if (group.folder) {
                let files = readdirSync(resolvePath(group.folder));
                let groupOfNodes: ITestNode[] = [];

                for (const file of files) {
                    if (!file.endsWith(".pem")) {
                        continue;
                    }

                    let secretKeys = loadMoreSecretKeyFromPemFile(resolvePath(group.folder, file));
                    let nodes = secretKeys.map(key => new TestNode("", group.name, key));

                    groupOfNodes.push(...nodes);
                }

                this.groupOfNodes.set(group.name, groupOfNodes);
                continue;
            }
        }
    }

    getNode(name: string): ITestNode {
        let node = this.individualNodes.get(name);
        if (node) {
            return node;
        }

        throw new ErrMissingNodeOrGroupOfNodes(name);
    }

    getGroupOfNodes(name: string): ITestNode[] {
        let group = this.groupOfNodes.get(name);
        if (group) {
            return group;
        }

        throw new ErrMissingNodeOrGroupOfNodes(name);
    }
}

function loadSecretKeyFromPemFile(file: PathLike): ValidatorSecretKey {

    file = resolvePath(file);
    let text = readFileSync(file, { encoding: "utf8" });
    let secretKey = ValidatorSecretKey.fromPem(text);
    return secretKey;
}

function loadMoreSecretKeyFromPemFile(file: PathLike): ValidatorSecretKey[] {

    file = resolvePath(file);
    let text = readFileSync(file, { encoding: "utf8" });
    let secretKeys: ValidatorSecretKey[] = parseValidatorKeys(text);
    return secretKeys;
}
