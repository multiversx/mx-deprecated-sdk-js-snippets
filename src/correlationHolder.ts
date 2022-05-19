import { ICorrelationHolder } from "./interface";

export class CorrelationHolder implements ICorrelationHolder {
    step: string = "";
    tag: string = "";
}
