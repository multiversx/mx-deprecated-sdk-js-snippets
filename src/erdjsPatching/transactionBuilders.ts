import { ArgSerializer, BigUIntValue, BytesValue, TokenPayment, TransactionPayload, TypedValue } from "@elrondnetwork/erdjs";

export class ESDTTransferPayloadBuilder {
    payment = TokenPayment.fungibleFromAmount("", "0");

    setPayment(payment: TokenPayment): ESDTTransferPayloadBuilder {
        this.payment = payment;
        return this;
    }

    /**
     * Builds the {@link TransactionPayload}.
     */
    build(): TransactionPayload {
        let args: TypedValue[] = [
            // The token identifier
            BytesValue.fromUTF8(this.payment.tokenIdentifier),
            // The transfered amount
            new BigUIntValue(this.payment.valueOf()),
        ];
        let { argumentsString } = new ArgSerializer().valuesToString(args);
        let data = `ESDTTransfer@${argumentsString}`;

        return new TransactionPayload(data);
    }
}
