type OperandType = 'name' | 'value';

export default interface ParamsBuilder {
  addOperand(operand: unknown, defaultType: OperandType, prefix?: string): string;
}