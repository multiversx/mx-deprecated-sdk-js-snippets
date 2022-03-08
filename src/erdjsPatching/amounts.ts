import { Balance, Token } from "@elrondnetwork/erdjs";
import BigNumber from "bignumber.js";

export function createTokenAmount(token: Token, amount: string) {
    return new Balance(token, 0, new BigNumber(amount));
}
