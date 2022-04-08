import { ISignable } from "@elrondnetwork/erdjs";

export interface ISigner {
    sign(signable: ISignable): Promise<void>;
    getAddress(): IAddress;
}

export interface IAddress {
    bech32(): string;
}
