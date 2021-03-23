import {ExpressionBuilder, Params} from './ExpressionBuilder';

export type ConditionAttributes<T> = {
  [P in keyof T]?: T[P] | Condition<T[P]>;
};

type Comparator = '=' | '<>' | '<' | '<=' | '>' | '>=';
type Func = 'attribute_exists' | 'attribute_not_exists' | 'attribute_type' | 'begins_with' | 'contains' | 'size';

class ConditionExpressionBuilder<T> extends ExpressionBuilder<ConditionAttributes<T>> {
  private readonly conditions: string[] = [];

  build(attributes: ConditionAttributes<T>): string | undefined {
    for (const [path, value] of Object.entries(attributes)) {
      const action = value instanceof Condition ? value : Condition.eq(value);

      action.build(path, this);
    }

    return `${this.conditions.join(' AND ')}` || undefined;
  }

  addValue(name: string, value: unknown): string {
    return super.addValue(name, value, 'cond_');
  }

  addCondition(condition: string): void {
    this.conditions.push(condition);
  }
}

export class Condition<T> {
  private constructor(readonly build: (path: string, builder: ConditionExpressionBuilder<unknown>) => void) {
  }

  private static comparator<T>(operator: Comparator, value: T): Condition<T> {
    return new Condition<T>((path, builder) =>
        builder.addCondition(`${builder.addName(path)} ${operator} ${builder.addValue(path, value)}`));
  }

  static eq<T>(value: T): Condition<T> {
    return this.comparator('=', value);
  }

  static gt<T>(value: T): Condition<T> {
    return this.comparator('>', value);
  }

  static ge<T>(value: T): Condition<T> {
    return this.comparator('>=', value);
  }

  static lt<T>(value: T): Condition<T> {
    return this.comparator('<', value);
  }

  static le<T>(value: T): Condition<T> {
    return this.comparator('<=', value);
  }

  static neq<T>(value: T): Condition<T> {
    return this.comparator('<>', value);
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
    return this.func('attribute_exists');
  }

  static attributeNotExists<T>(): Condition<T> {
    return this.func('attribute_not_exists');
  }

  static attributeType<T>(type: string): Condition<T> {
    return this.func('attribute_type', type);
  }

  static beginsWith<T>(substr: string): Condition<T> {
    return this.func('begins_with', substr);
  }

  static contains<T>(operand: unknown): Condition<T> {
    return this.func('contains', operand);
  }
}

export function buildConditionExpression<T>(conditions: ConditionAttributes<T>, params: Partial<Params>): string | undefined {
  return new ConditionExpressionBuilder(params).build(conditions) || undefined;
}
