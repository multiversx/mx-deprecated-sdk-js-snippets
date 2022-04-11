import { ArgSerializer, Balance, BigUIntValue, BytesValue, guardValueIsSet, TransactionPayload, TypedValue } from "@elrondnetwork/erdjs";

export class ESDTTransferPayloadBuilder {
    private amount: Balance | null = null;

    setAmount(amount: Balance): ESDTTransferPayloadBuilder {
        this.amount = amount;
        return this;
    }

    /**
     * Builds the {@link TransactionPayload}.
     */
    build(): TransactionPayload {
        guardValueIsSet("amount", this.amount);

        let args: TypedValue[] = [
            // The token identifier
            BytesValue.fromUTF8(this.amount!.token.getTokenIdentifier()),
            // The transfered amount
            new BigUIntValue(this.amount!.valueOf()),
        ];
        let { argumentsString } = new ArgSerializer().valuesToString(args);
        let data = `ESDTTransfer@${argumentsString}`;

        return new TransactionPayload(data);
    }
}
