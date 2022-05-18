import { PathLike, readFileSync } from "fs";
import { homedir } from "os";
import path from "path";

export function resolvePath(...pathSegments: PathLike[]): PathLike {
    let fixedSegments = pathSegments.map(segment => asUserPath(segment).toString());
    let resolvedPath = path.resolve(...fixedSegments);
    return resolvedPath;
}

function asUserPath(userPath: PathLike): PathLike {
    return (userPath || "").toString().replace("~", homedir);
}

export function readJson<T>(filePath: PathLike): T {
    const json = readFileSync(resolvePath(filePath), { encoding: "utf8" });
    const parsed = <T>JSON.parse(json);
    return parsed;
}
