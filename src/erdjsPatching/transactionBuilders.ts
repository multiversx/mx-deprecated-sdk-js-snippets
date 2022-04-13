import { Address, AddressValue, ArgSerializer, BigUIntValue, BytesValue, IAddress, TokenPayment, TransactionPayload, TypedValue, U64Value } from "@elrondnetwork/erdjs";

export class ESDTTransferPayloadBuilder {
    payment = TokenPayment.fungibleFromAmount("", "0");

    setPayment(payment: TokenPayment): ESDTTransferPayloadBuilder {
        this.payment = payment;
        return this;
    }

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

export class ESDTNFTTransferPayloadBuilder {
    payment: TokenPayment = TokenPayment.nonFungible("", 0);
    destination: IAddress = new Address("");

    setPayment(payment: TokenPayment): ESDTNFTTransferPayloadBuilder {
        this.payment = payment;
        return this;
    }

    setDestination(destination: IAddress): ESDTNFTTransferPayloadBuilder {
        this.destination = destination;
        return this;
    }

    build(): TransactionPayload {
        let args: TypedValue[] = [
            // The token identifier
            BytesValue.fromUTF8(this.payment.tokenIdentifier),
            // The nonce of the token
            new U64Value(this.payment.nonce),
            // The transfered quantity
            new BigUIntValue(this.payment.valueOf()),
            // The destination address
            new AddressValue(this.destination)
        ];

        let { argumentsString } = new ArgSerializer().valuesToString(args);
        let data = `ESDTNFTTransfer@${argumentsString}`;
        return new TransactionPayload(data);
    }
}
