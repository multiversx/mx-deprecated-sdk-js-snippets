import { INetworkConfig } from "./interfaceOfNetwork";

interface IInteraction {
    buildTransaction(): { getData(): { length(): number; } };
}

export function computeGasLimit(config: INetworkConfig, dataLength: number = 0, additionalGas: number = 0) {
    return config.MinGasLimit + config.GasPerDataByte * dataLength + additionalGas;
}

export function computeGasLimitOnInteraction(interaction: IInteraction, config: INetworkConfig, estimatedExecutionComponent: number) {
    let transaction = interaction.buildTransaction();
    let dataLength = transaction.getData().length();
    let movementComponent = config.MinGasLimit + config.GasPerDataByte * dataLength;
    return movementComponent + estimatedExecutionComponent;
}
