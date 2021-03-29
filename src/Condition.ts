import {ConditionExpressionBuilder} from './ConditionExpressionBuilder';
import {Params} from './ExpressionBuilder';

type Comparator = '=' | '<>' | '<' | '<=' | '>' | '>=';
type Func = 'attribute_exists' | 'attribute_not_exists' | 'attribute_type' | 'begins_with' | 'contains' | 'size';

type Operator = 'AND' | 'OR';
const OPERATOR = Symbol('OPERATOR');
const OPERANDS = Symbol('OPERANDS');

type ConditionValue<T> = T | Condition<T>;

export type ConditionAttributes<T> = {
  [P in keyof T]?: ConditionValue<T[P]>;
} & {
  [path: string]: ConditionValue<any>;
};

export type ConditionSet<T> = ConditionAttributes<T> | CompositeCondition<T>;

export class Condition<T> {
  private constructor(readonly build: (key: string, builder: ConditionExpressionBuilder<unknown>) => void) {
  }

  private static comparator<T>(operator: Comparator, value: T): Condition<T> {
    return new Condition<T>((key, builder) =>
        builder.addCondition(`${builder.addOperand(key, 'name')} ${operator} ${builder.addOperand(value, 'value')}`));
  }

  static eq<T>(value: T): Condition<T> {
    return Condition.comparator('=', value);
  }

  static gt<T>(value: T): Condition<T> {
    return Condition.comparator('>', value);
  }

  static ge<T>(value: T): Condition<T> {
    return Condition.comparator('>=', value);
  }

  static lt<T>(value: T): Condition<T> {
    return Condition.comparator('<', value);
  }

  static le<T>(value: T): Condition<T> {
    return Condition.comparator('<=', value);
  }

  static neq<T>(value: T): Condition<T> {
    return Condition.comparator('<>', value);
  }

  static between<T>(...operands: [T, T]): Condition<T> {
    return new Condition<T>((key, builder) =>
        builder.addCondition(`${builder.addOperand(key, 'name')} BETWEEN ${
            operands.map((operand, i) => builder.addOperand(operand, 'value', `between${i}`)).join(' AND ')}`));
  }

  static in<T>(operands: T[]): Condition<T> {
    return new Condition<T>((key, builder) =>
        builder.addCondition(`${builder.addOperand(key, 'name')} IN (${
            operands.map((operand, i) => builder.addOperand(operand, 'value', `in${i}`)).join(', ')})`));
  }

  private static func<T>(func: Func, ...args: unknown[]): Condition<T> {
    return new Condition<T>((key, builder) =>
        builder.addCondition(`${func}(${[
          builder.addOperand(key, 'name'),
          ...args.map((arg, i) => builder.addOperand(arg, 'value', `${func}_arg${i}`)),
        ].join(', ')})`));
  }

  static attributeExists<T>(): Condition<T> {
    return Condition.func('attribute_exists');
  }

  static attributeNotExists<T>(): Condition<T> {
    return Condition.func('attribute_not_exists');
  }

  static attributeType<T>(type: string): Condition<T> {
    return Condition.func('attribute_type', type);
  }

  static beginsWith<T>(substr: string): Condition<T> {
    return Condition.func('begins_with', substr);
  }

  static contains<T>(operand: unknown): Condition<T> {
    return Condition.func('contains', operand);
  }

  static size<T>(): Condition<T> {
    return Condition.func('size');
  }

  static and<T, U extends T>(...operands: Array<ConditionSet<U>>): CompositeCondition<T> {
    return new CompositeCondition<T>('AND', operands);
  }

  static or<T, U extends T>(...operands: Array<ConditionSet<U>>): CompositeCondition<T> {
    return new CompositeCondition<T>('OR', operands);
  }
}

export class CompositeCondition<T> {
  private readonly [OPERATOR]: Operator;
  private readonly [OPERANDS]: Array<ConditionSet<T>> = [];

  constructor(operator: Operator, operands: Array<ConditionSet<T>>) {
    this[OPERATOR] = operator;
    this[OPERANDS] = operands;
  }

  get operator() {
    return this[OPERATOR];
  }

  get operands() {
    return this[OPERANDS];
  }

  and(...operands: Array<ConditionSet<T>>): CompositeCondition<T> {
    return new CompositeCondition<T>('AND', [this, ...operands]);
  }

  or(...operands: Array<ConditionSet<T>>): CompositeCondition<T> {
    return new CompositeCondition<T>('OR', [this, ...operands]);
  }
}

export function buildConditionExpression<T>(conditions: ConditionSet<T>, params: Partial<Params>): string | undefined {
  return new ConditionExpressionBuilder(params).build(conditions) || undefined;
}
