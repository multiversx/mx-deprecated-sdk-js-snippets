import { homedir } from "os";
import path from "path";

export function resolvePath(...pathSegments: string[]): string {
    let fixedSegments = pathSegments.map(segment => asUserPath(segment));
    let resolvedPath = path.resolve(...fixedSegments);
    return resolvedPath;
}

function asUserPath(userPath: string): string {
    return (userPath || "").replace("~", homedir);
}
