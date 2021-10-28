import {ConditionExpressionBuilder} from './ConditionExpressionBuilder';
import {Params} from './ExpressionBuilder';
import ParamsBuilder from './ParamsBuilder';

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

export interface ConditionParams extends Params {
  ConditionExpression: string;
}

export interface KeyConditionParams extends Params {
  KeyConditionExpression: string;
}

export type ConditionSet<T> = ConditionAttributes<T> | CompositeCondition<T>;

export class Condition<T> {
  private constructor(readonly build: (key: string, builder: ParamsBuilder) => {expression: string;}) {
  }

  private static comparator<T>(operator: Comparator, value: T): Condition<T> {
    return new Condition<T>((key, builder) => ({
      expression: `${builder.addOperand(key, 'name')} ${operator} ${builder.addOperand(value, 'value')}`
    }));
  }

  private static func<T>(func: Func, ...args: unknown[]): Condition<T> {
    return new Condition<T>((key, builder) => ({
      expression: `${func}(${[
        builder.addOperand(key, 'name'),
        ...args.map((arg, i) => builder.addOperand(arg, 'value', `${func}_arg${i}`)),
      ].join(', ')})`
    }));
  }

  static from<T>(c: ConditionValue<T>): Condition<T> {
    return c instanceof Condition ? c : Condition.eq(c);
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
    return new Condition<T>((key, builder) => ({
      expression: `${builder.addOperand(key, 'name')} BETWEEN ${
          operands.map((operand, i) => builder.addOperand(operand, 'value', `between${i}`)).join(' AND ')}`
    }));
  }

  static in<T>(operands: T[]): Condition<T> {
    return new Condition<T>((key, builder) => ({
      expression: `${builder.addOperand(key, 'name')} IN (${
          operands.map((operand, i) => builder.addOperand(operand, 'value', `in${i}`)).join(', ')})`
    }));
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

  static beginsWith<T extends string>(substr: string): Condition<T> {
    return Condition.func('begins_with', substr);
  }

  static contains<T extends string | Set<unknown>>(operand: T): Condition<T> {
    return Condition.func('contains', operand);
  }

  static size<T>(): Condition<T> {
    return Condition.func('size');
  }

  static not<T>(c: ConditionValue<T>): Condition<T> {
    return new Condition((key, builder) => {
      const {expression} = Condition.from(c).build(key, builder);

      return {
        expression: `NOT (${expression})`
      };
    });
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

/**
 * Build condition params to be used for an update() call to the DynamoDB client
 * @param conditions Update conditions
 * @param [params] Optional other params such as TableName, additional ExpressionAttributeNames etc.
 *                 This object will be merged with the produced ConditionExpression and associated
 *                 ExpressionAttributeNames/Values.
 */
export function buildConditionParams<T, P extends Record<string, unknown>>(
    {conditions, params = {} as P}: {conditions: ConditionSet<T>, params?: P}
): ConditionParams & P {
  const expression = buildConditionExpression(conditions, params);

  if (!expression) {
    throw new Error(`Cannot build condition expression for empty conditions`);
  }

  return Object.assign(params, {ConditionExpression: expression}) as P & ConditionParams;
}

/**
 * Build key condition params to be used for a query() call to the DynamoDB client
 * @param conditions Update conditions
 * @param [params] Optional other params such as TableName, additional ExpressionAttributeNames etc.
 *                 This object will be merged with the produced KeyConditionExpression and associated
 *                 ExpressionAttributeNames/Values.
 */
export function buildKeyConditionParams<T, P extends Record<string, unknown>>(
    {conditions, params = {} as P}: {conditions: ConditionSet<T>, params?: P}
): KeyConditionParams & P {
  const expression = buildConditionExpression(conditions, params);

  if (!expression) {
    throw new Error(`Cannot build key condition expression for empty conditions`);
  }
  return Object.assign(params, {KeyConditionExpression: expression}) as P & KeyConditionParams;
}