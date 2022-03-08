export function prettifyObject(source: any): any {
    let destination = {};
    prettifyObjectRecursively(source, destination);
    return destination;
}

function prettifyObjectRecursively(source: any, destination: any) {
    const prettyCharsRegex = /^[ -~]+$/;

    for (let [key, value] of Object.entries(source)) {
        if (value instanceof Buffer) {
            let bufferAscii = value.toString("ascii");
            let bufferHex = value.toString("hex");

            if (prettyCharsRegex.test(bufferAscii)) {
                destination[key] = bufferAscii;
            } else {
                destination[key] = bufferHex;
            }

            continue;
        }

        if (typeof value == "object") {
            if (value == null || value == undefined) {
                continue;
            }

            let hasOverridenToString = value.hasOwnProperty("toString");
            if (hasOverridenToString) {
                destination[key] = value.toString();
                continue;
            }

            destination[key] = {};
            prettifyObjectRecursively(value, destination[key]);

            continue;
        }

        destination[key] = value;
    }
}
