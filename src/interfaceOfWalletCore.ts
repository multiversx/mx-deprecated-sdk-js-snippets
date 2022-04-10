export interface ISigner {
    sign(signable: ISignable): Promise<void>;
}

export interface ISignable {
}
