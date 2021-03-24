import {ConditionExpressionBuilder} from './ConditionExpressionBuilder';
import {Params} from './ExpressionBuilder';

type Comparator = '=' | '<>' | '<' | '<=' | '>' | '>=';
type Func = 'attribute_exists' | 'attribute_not_exists' | 'attribute_type' | 'begins_with' | 'contains' | 'size';

type Operator = 'AND' | 'OR';
const OPERATOR = Symbol();
const OPERANDS = Symbol();

export type ConditionAttributes<T> = {
  [P in keyof T]?: T[P] | Condition<T[P]>;
};

export type ConditionSet<T> = ConditionAttributes<T> | CompositeCondition<T>;

export class Condition<T> {
  private constructor(readonly build: (path: string, builder: ConditionExpressionBuilder<unknown>) => void) {
  }

  private static comparator<T>(operator: Comparator, value: T): Condition<T> {
    return new Condition<T>((path, builder) =>
        builder.addCondition(`${builder.addName(path)} ${operator} ${builder.addValue(path, value)}`));
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
    return new Condition<T>((path, builder) =>
        builder.addCondition(`${builder.addName(path)} BETWEEN ${
            operands.map((operand, i) => builder.addValue(`${path}${i}`, operand)).join(' AND ')}`));
  }

  static in<T>(operands: T[]): Condition<T> {
    return new Condition<T>((path, builder) =>
        builder.addCondition(`${builder.addName(path)} IN (${
            operands.map((operand, i) => builder.addValue(`${path}${i}`, operand)).join(', ')})`));
  }

  private static func<T>(func: Func, ...args: unknown[]): Condition<T> {
    return new Condition<T>((path, builder) =>
        builder.addCondition(`${func}(${[
          builder.addName(path),
          ...args.map((arg, i) => builder.addValue(`${path}${i}`, arg)),
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

  static composite<T>():CompositeCondition<T> {
    return new CompositeCondition<T>();
  }
}

export class CompositeCondition<T> {
  private [OPERATOR]: Operator = 'AND';
  private [OPERANDS]: Array<ConditionSet<T>> = [];

  get operator() {
    return this[OPERATOR];
  }

  get operands() {
    return this[OPERANDS];
  }

  private push(operator: Operator, operands: Array<ConditionSet<T>>): CompositeCondition<T> {
    if (this[OPERATOR] === operator || this[OPERANDS].length === 0) {
      // Same operator, or no operands yet so we may change
      this[OPERATOR] = operator;
      this[OPERANDS].push(...operands);
      return this;
    }

    // Create nested condition from this and the new operands
    return new CompositeCondition<T>().push(operator, [this, ...operands]);
  }

  and(...operands: Array<ConditionSet<T>>): CompositeCondition<T> {
    return this.push('AND', operands);
  }

  or(...operands: Array<ConditionSet<T>>): CompositeCondition<T> {
    return this.push('OR', operands);
  }
}

export function buildConditionExpression<T>(conditions: ConditionSet<T>, params: Partial<Params>): string | undefined {
  return new ConditionExpressionBuilder(params).build(conditions) || undefined;
}
