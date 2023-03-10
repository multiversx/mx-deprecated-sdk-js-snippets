import { AbiRegistry, Code } from "@multiversx/sdk-core";
import { PathLike, promises } from "fs";

export async function loadCode(file: PathLike) {
    let buffer: Buffer = await promises.readFile(file);
    return Code.fromBuffer(buffer);
}

export async function loadAbiRegistry(file: PathLike) {
    let jsonContent: string = await promises.readFile(file, { encoding: "utf8" });
    let json = JSON.parse(jsonContent);
    return AbiRegistry.create(json);
}
