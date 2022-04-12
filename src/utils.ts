import { PathLike } from "fs";
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
