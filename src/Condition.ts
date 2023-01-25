import {ConditionExpressionBuilder} from './ConditionExpressionBuilder';
import {Params} from './ExpressionBuilder';
import ParamsBuilder from './ParamsBuilder';

type Comparator = '=' | '<>' | '<' | '<=' | '>' | '>=';
type Func = 'attribute_exists' | 'attribute_not_exists' | 'attribute_type' | 'begins_with' | 'contains' | 'size';

type Operator = 'AND' | 'OR';
const OPERATOR = Symbol('OPERATOR');
const OPERANDS = Symbol('OPERANDS');

type ConditionValue<T> = T | Condition<T>;

/**
 * An object of key-value pairs where each key is an attribute name in the record and each value is either a
 * literal value, will be treated as an equality condition, or a Condition object.
 * All key-value pairs will be combined into an AND condition.
 */
export type ConditionAttributes<T> = {
  [P in keyof T]?: ConditionValue<T[P]>;
} & {
  [path: string]: ConditionValue<unknown>;
};

export interface ConditionParams extends Params {
  ConditionExpression: string;
}

export interface KeyConditionParams extends Params {
  KeyConditionExpression: string;
}

export type ConditionSet<T> = ConditionAttributes<T> | CompositeCondition<T>;

export namespace ConditionSet {
  /**
   * Create a composite AND condition from the given operands
   * @param operands
   */
  export function and<T, U extends T>(...operands: Array<ConditionSet<U>>): CompositeCondition<T> {
    return new CompositeCondition<T>('AND', operands);
  }

  /**
   * Create a composite OR condition from the given operands
   * @param operands
   */
  export function or<T, U extends T>(...operands: Array<ConditionSet<U>>): CompositeCondition<T> {
    return new CompositeCondition<T>('OR', operands);
  }
}

type BuildConditionExpression = (key: string, builder: ParamsBuilder) => {
  expression: string;
};

type EvaluateCondition<T> = (value: T) => boolean;

export type AttributeType = 'S' | 'SS' | 'N' | 'NS' | 'B' | 'BS' | 'BOOL' | 'NULL' | 'L' | 'M';

/**
 * A condition for a single attribute having the type T.
 * See https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html
 */
export class Condition<T> {
  private constructor(readonly build: BuildConditionExpression, readonly evaluate: EvaluateCondition<T>) {
  }

  private static comparator<T>(operator: Comparator, value: T, evaluate: EvaluateCondition<T>): Condition<T> {
    return new Condition<T>((key, builder) => ({
      expression: `${builder.addOperand(key, 'name')} ${operator} ${builder.addOperand(value, 'value')}`
    }), evaluate);
  }

  private static func<T>(func: Func, args: unknown[], evaluate: EvaluateCondition<T>): Condition<T> {
    return new Condition<T>((key, builder) => ({
      expression: `${func}(${[
        builder.addOperand(key, 'name'),
        ...args.map((arg, i) => builder.addOperand(arg, 'value', `${func}_arg${i}`)),
      ].join(', ')})`
    }), evaluate);
  }

  /**
   * Wrap a condition so that a literal value will be turned into an equality condition.
   * If the given value is already a condition, it's returned as-is.
   * @param c Condition object or literal value treated as an equality condition
   */
  static from<T>(c: ConditionValue<T>): Condition<T> {
    return c instanceof Condition ? c : Condition.eq(c);
  }

  /**
   * Create a condition for the given value with the operator '='
   * @param value
   */
  static eq<T>(value: T): Condition<T> {
    return Condition.comparator('=', value, v => v === value);
  }

  /**
   * Create a condition for the given value with the operator '>'
   * @param value
   */
  static gt<T>(value: T): Condition<T> {
    return Condition.comparator('>', value, v => v > value);
  }

  /**
   * Create a condition for the given value with the operator '>='
   * @param value
   */
  static ge<T>(value: T): Condition<T> {
    return Condition.comparator('>=', value, v => v >= value);
  }

  /**
   * Create a condition for the given value with the operator '<'
   * @param value
   */
  static lt<T>(value: T): Condition<T> {
    return Condition.comparator('<', value, v => v < value);
  }

  /**
   * Create a condition for the given value with the operator '<='
   * @param value
   */
  static le<T>(value: T): Condition<T> {
    return Condition.comparator('<=', value, v => v <= value);
  }

  /**
   * Create a condition for the given value with the operator '>'
   * @param value
   */
  static neq<T>(value: T): Condition<T> {
    return Condition.comparator('<>', value, v => v !== value);
  }

  /**
   * Create a condition for the given operands with the operator 'BETWEEN', i.e.,
   * where the target value must be >= minValue and <= maxValue
   * @param minValue
   * @param maxValue
   */
  static between<T>(minValue: T, maxValue: T): Condition<T> {
    return new Condition<T>((key, builder) => ({
      expression: `${builder.addOperand(key, 'name')} BETWEEN ${
          [minValue, maxValue]
              .map((operand, i) => builder.addOperand(operand, 'value', `between${i}`))
              .join(' AND ')}`
    }), v => v >= minValue && v <= maxValue);
  }

  /**
   * Create a condition for the given operands with the operator 'IN', i.e.,
   * where the target value must be equal to one of the given values
   * @param operands
   */
  static in<T>(operands: T[]): Condition<T> {
    return new Condition<T>((key, builder) => ({
      expression: `${builder.addOperand(key, 'name')} IN (${
          operands.map((operand, i) => builder.addOperand(operand, 'value', `in${i}`)).join(', ')})`
    }), v => operands.includes(v));
  }

  /**
   * Create a condition for the attribute existing, i.e.,
   * using the DynamoDB function attribute_exists(path)
   */
  static attributeExists<T>(): Condition<T> {
    return Condition.func('attribute_exists', [], v => v !== undefined);
  }

  /**
   * Create a condition for the attribute not existing, i.e.,
   * using the DynamoDB function attribute_not_exists(path)
   */
  static attributeNotExists<T>(): Condition<T> {
    return Condition.func('attribute_not_exists', [], v => v === undefined);
  }

  /**
   * Create a condition for the attribute having the given type, i.e.,
   * using the DynamoDB function attribute_exists(path, type)
   * @param type
   */
  static attributeType<T>(type: AttributeType): Condition<T> {
    return Condition.func('attribute_type', [type], v => {
      switch (type) {
        case 'S':
          return typeof v === 'string';
        case 'SS':
        case 'NS':
        case 'BS':
          return v instanceof Set;
        case 'N':
          return typeof v === 'number';
        case 'B':
          return v instanceof Buffer;
        case 'BOOL':
          return typeof v === 'boolean';
        case 'NULL':
          return v === null;
        case 'L':
          return Array.isArray(v);
        case 'M':
          return typeof v === 'object' && (v as any).constructor === Object;
      }
    });
  }

  /**
   * Create a condition for the attribute being a string that starts with the given substring, i.e.,
   * using the DynamoDB function begins_with(path, substr)
   * @param substr
   */
  static beginsWith<T extends string>(substr: string): Condition<T> {
    return Condition.func('begins_with', [substr], v => v.startsWith(substr));
  }

  /**
   * Create a condition for the attribute being either a string that contains with the given substring or for
   * the attribute being a Set that contains at least one element from the given subset, i.e.,
   * using the DynamoDB function contains(path, operand)
   * @param operand
   */
  static contains<T extends string | Set<unknown>>(operand: T): Condition<T extends string ? string : T> {
    return Condition.func('contains', [operand], v => {
      if (typeof v === 'string') {
        return v.includes(operand as string);
      }

      const set = v as Set<unknown>;

      return [...operand as Set<unknown>].some(x => set.has(x));
    });
  }

  /**
   * Create a condition that negates the given condition
   * @param v A condition or a literal value which will be treated as an equality condition for the value
   */
  static not<T>(v: ConditionValue<T>): Condition<T> {
    const cond = Condition.from(v);
    return new Condition((key, builder) => {
      const {expression} = cond.build(key, builder);

      return {
        expression: `NOT (${expression})`
      };
    }, v => !cond.evaluate(v));
  }

  /**
   * Create an AND condition for the given conditions or literal values
   * @param operands
   */
  static and<T>(...operands: Array<ConditionValue<T>>): Condition<T> {
    const conditions = operands.map(op => Condition.from(op));
    return new Condition((key, builder) => {
      return {
        expression: `(${conditions.map(c => c.build(key, builder).expression).join(' AND ')})`
      };
    }, v => conditions.every(c => c.evaluate(v)));
  }

  /**
   * Create an AND condition for the given conditions or literal values
   * @param operands
   */
  static or<T>(...operands: Array<ConditionValue<T>>): Condition<T> {
    const conditions = operands.map(op => Condition.from(op));
    return new Condition((key, builder) => {
      return {
        expression: `(${conditions.map(c => c.build(key, builder).expression).join(' OR ')})`
      };
    }, v => conditions.some(c => c.evaluate(v)));
  }

  /**
   * Adjust this condition so that records with the attribute not existing are included if the given defaultValue
   * matches the condition. This is useful to query tables with newly added attributes, to enable treating records
   * without the attribute as if they have the given value.
   * @param defaultValue
   */
  withDefaultValue(defaultValue: T | undefined): Condition<T> {
    if (defaultValue !== undefined && this.evaluate(defaultValue)) {
      return Condition.or(this, Condition.attributeNotExists());
    }

    return this;
  }
}

/**
 * A composite condition using AND or OR operator to combine multiple sub-conditions.
 */
export class CompositeCondition<T> {
  private readonly [OPERATOR]: Operator;
  private readonly [OPERANDS]: Array<ConditionSet<T>> = [];

  constructor(operator: Operator, operands: Array<ConditionSet<T>>) {
    this[OPERATOR] = operator;
    this[OPERANDS] = operands;
  }

  get operator(): Operator {
    return this[OPERATOR];
  }

  get operands(): Array<ConditionSet<T>> {
    return this[OPERANDS];
  }

  /**
   * Create a new AND condition that combines this condition and the given operands
   * @param operands
   */
  and(...operands: Array<ConditionSet<T>>): CompositeCondition<T> {
    return new CompositeCondition<T>('AND', [this, ...operands]);
  }

  /**
   * Create a new OR condition that combines this condition and the given operands
   * @param operands
   */
  or(...operands: Array<ConditionSet<T>>): CompositeCondition<T> {
    return new CompositeCondition<T>('OR', [this, ...operands]);
  }
}

/**
 * @deprecated Use buildConditionParams or buildKeyConditionParams
 * @param conditions
 * @param params
 */
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
