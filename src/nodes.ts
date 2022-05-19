import { Account, IAddress } from "@elrondnetwork/erdjs";
import { parseUserKeys, parseValidatorKeys, UserSecretKey, ValidatorSigner, ValidatorSecretKey,ValidatorPublicKey } from "@elrondnetwork/erdjs-walletcore";
import { PathLike, readFileSync, readdirSync } from "fs";
import { ErrMissingNodeOrGroupOfNodes } from "./errors";
import { IBunchOfNodes, ITestNode, INodesConfig} from "./interface";
import { INetworkProvider } from "./interfaceOfNetwork";
import { ISigner } from "./interfaceOfWalletCore";
import { resolvePath } from "./utils";

export class TestNode implements ITestNode {
    readonly name: string;
    readonly group: string;
    readonly secretKey: Buffer;

    constructor(name: string, group: string, secretKey: ValidatorSecretKey) {
        let publicKey = secretKey.generatePublicKey();

        this.name = name;
        this.group = group;
        this.secretKey = Buffer.from(secretKey);
    }
}

export class BunchOfNodes implements IBunchOfNodes {
    readonly individualNodes: Map<string, ITestNode> = new Map<string, ITestNode>();
    readonly groupOfNodes: Map<string, ITestNode[]> = new Map<string, ITestNode[]>();

    constructor(config: INodesConfig) {
        // Load individual nodes
        for (const oneNode of config.individualNodes) {
            let key = loadSecretKeyFromPemFile(oneNode.pem);
            let node = new TestNode(oneNode.name, "", key);

            this.individualNodes.set(oneNode.name, node)
        }

        // Load groups
        for (const group of config.groupOfNodes) {
            // From a single file
            if (group.pem) {
                let keys = loadMoreSecretKeyFromPemFile(group.pem);
                let nodes = keys.map(key => new TestNode("", group.name, key));

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
                    
                    let keys = loadMoreSecretKeyFromPemFile(resolvePath(group.folder, file));
                    let nodes = keys.map(key => new TestNode("", group.name, key));

                    groupOfNodes.push(...nodes);
                }

                this.groupOfNodes.set(group.name, groupOfNodes);
                continue;
            }
        }
    }

    getNode(name:string): ITestNode {
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