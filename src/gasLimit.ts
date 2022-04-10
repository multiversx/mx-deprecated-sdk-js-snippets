import { NetworkConfig } from "@elrondnetwork/erdjs-network-providers";
import { Interaction } from "@elrondnetwork/erdjs/out";

export function computeGasLimit(config: NetworkConfig, dataLength: number = 0, additionalGas: number = 0) {
    return config.MinGasLimit + config.GasPerDataByte * dataLength + additionalGas;
}

export function computeGasLimitOnInteraction(interaction: Interaction, config: NetworkConfig, estimatedExecutionComponent: number) {
    let transaction = interaction.buildTransaction();
    let dataLength = transaction.getData().length();
    let movementComponent = config.MinGasLimit + config.GasPerDataByte * dataLength;
    return movementComponent + estimatedExecutionComponent;
}
