import {Params} from './ExpressionBuilder';
import ParamsBuilder from './ParamsBuilder';
import {ActionType, UpdateExpressionBuilder} from './UpdateExpressionBuilder';

type UpdateValue<V> = V | UpdateAction<V | void>;

export type UpdateAttributes<T> = {
  [P in keyof T]?: UpdateValue<T[P]>;
} & {
  [key: string]: UpdateValue<any>;
}

export interface UpdateParams extends Params {
  UpdateExpression: string;
}

/**
 * A DynamoDB update action
 * See https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.htmls
 */
export class UpdateAction<T> {
  private constructor(readonly build: (key: string, builder: ParamsBuilder) => {
    type: ActionType;
    expression: string;
  }) {
  }

  /**
   * Obtain an UpdateAction from a value or action.
   * If the value is already an UpdateAction it's returned as-is, otherwise the value is wrapped in a SET action.
   * @param value UpdateAction or literal value to wrap in a SET action.
   */
  static from<T>(value: UpdateAction<T> | T): UpdateAction<T> {
    return value instanceof UpdateAction ? value : UpdateAction.set(value);
  }

  /**
   * Obtain an UpdateAction for a SET action
   * @param value Literal value to set, or a complex value that adds, subtracts, appends or conditionally sets a value if it exists
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html#Expressions.UpdateExpressions.SET
   */
  static set<T>(value: T | SetValue): UpdateAction<T> {
    return new UpdateAction((key, builder) => {
      const v = value instanceof SetValue ? value : SetValue.value(value);

      return {
        type: 'SET',
        expression: `${builder.addOperand(key, 'name')} = ${v.build(key, builder)}`
      }
    });
  }

  /**
   * Obtain an UpdateAction for a REMOVE action that removes an attribute
   * See https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html#Expressions.UpdateExpressions.REMOVE
   */
  static remove(): UpdateAction<void> {
    return new UpdateAction((key, builder) => ({
      type: 'REMOVE',
      expression: `${builder.addOperand(key, 'name')}`
    }));
  }

  /**
   * Obtain an UpdateAction for an ADD action that either adds the given numeric value to a numeric attribute,
   * or adds the given subset to a set attribute
   * See https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html#Expressions.UpdateExpressions.ADD
   * @param value
   */
  static add<T extends number | Set<unknown>>(value: T): UpdateAction<T> {
    return new UpdateAction((key, builder) => ({
      type: 'ADD',
      expression: `${builder.addOperand(key, 'name')} ${builder.addOperand(value, 'value', 'add')}`
    }));
  }

  /**
   * Obtain an UpdateAction for a DELETE action that removes an element from a set
   * @param value
   * See https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html#Expressions.UpdateExpressions.DELETE
   */
  static delete<T extends Set<unknown>>(value: T): UpdateAction<T> {
    return new UpdateAction((key, builder) => ({
      type: 'DELETE',
      expression: `${builder.addOperand(key, 'name')} ${builder.addOperand(value, 'value', 'delete')}`
    }));
  }
}

type PathOrValue<T> = T | string | SetValue<T>;

function buildSetOperand<T>(key: string, value: PathOrValue<T>, builder: ParamsBuilder, prefix?: string) {
  if (value instanceof SetValue) {
    return value.build(key, builder);
  }

  if (typeof value === 'string') {
    return builder.addOperand(value, 'name', prefix);
  }
  return builder.addOperand(value, 'value', prefix);
}

/**
 * A complex set value using DynamoDB SET functions
 * See https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html#Expressions.UpdateExpressions.SET
 */
export class SetValue<T = unknown> {
  private constructor(readonly build: (key: string, builder: ParamsBuilder) => string) {
  }

  /**
   * Obtain a set expression which assigns a simple scalar value (SET #price = :val)
   * @param value
   */
  static value<T>(value: T): SetValue {
    return new SetValue((key, builder) => builder.addOperand(value, 'value', 'set'));
  }

  /**
   * Obtain a set expression which adds two values (SET #z = #x + #y or SET #price = #price + :val).
   * Values may be values or names of attributes.
   * Examples:
   * add('Price', 42)
   * add('42', '43')
   * add('Price', 'Amount')
   * @param n1
   * @param n2
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html#Expressions.UpdateExpressions.SET.IncrementAndDecrement
   */
  static add(n1: PathOrValue<number>, n2: PathOrValue<number>): SetValue<number> {
    return new SetValue((key, builder) => {
      const operands = [n1, n2].map((n, i) =>
          buildSetOperand(key, n, builder, `add${i}`));

      return operands.join(' + ');
    });
  }

  /**
   * Obtain a set expression which subtracts two values (SET #z = #x - #y or SET #price = #price - :val).
   * Values may be values or names of attributes.
   * Examples:
   * subtract('Price', 42)
   * subtract('42', '43')
   * subtract('Price', 'Amount')
   * @param n1
   * @param n2
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html#Expressions.UpdateExpressions.SET.IncrementAndDecrement
   */
  static subtract(n1: PathOrValue<number>, n2: PathOrValue<number>): SetValue<number> {
    return new SetValue((key, builder) => {
      const operands = [n1, n2].map((n, i) =>
          buildSetOperand(key, n, builder, `sub${i}`));

      return operands.join(' - ');
    });
  }

  /**
   * Obtain a set expression which appends elements from a source list to a target list (SET #mylist = list_append(#mylist, :new_values)
   * Examples:
   * append('mylist', [42, 43])
   * append('['abc'], ['def', 'ghi'])
   * append('mylist', 'myotherlist')
   * @param list1
   * @param list2
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html#Expressions.UpdateExpressions.SET.UpdatingListElements
   */
  static append<T>(list1: PathOrValue<T[]>, list2: PathOrValue<T[]>): SetValue<T[]> {
    return new SetValue((key, builder) => {
      const operands = [list1, list2].map((list, i) =>
          buildSetOperand(key, list, builder, `append${i}`));

      return `list_append(${operands.join(', ')})`;
    });
  }

  /**
   * Obtain a set expression for a if_not_exists function (SET #price = if_not_exists(#price, :100))
   * @param p Attribute name
   * @param value Value to use if the attribute has no value
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html#Expressions.UpdateExpressions.SET.PreventingAttributeOverwrites
   */
  static ifNotExists<T>(p: string, value: T): SetValue<T> {
    return new SetValue((key, builder) => {
      const operands = [
        builder.addOperand(p, 'name'),
        builder.addOperand(value, 'value', 'ifnotexists')
      ];

      return `if_not_exists(${operands.join(', ')})`;
    });
  }
}

/**
 * @deprecated Use buildUpdateParams
 * @param attributes
 * @param params
 */
export function buildUpdateExpression<T>(attributes: UpdateAttributes<T>, params: Partial<Params>): string | undefined {
  return new UpdateExpressionBuilder(params).build(attributes) || undefined;
}

/**
 * Build update params to be used for an update() call to the DynamoDB client
 * @param attributes Update attributes
 * @param [params] Optional other params such as TableName, additional ExpressionAttributeNames etc.
 *                 This object will be merged with the produced UpdateExpression and associated
 *                 ExpressionAttributeNames/Values.
 */
export function buildUpdateParams<T, P extends Record<string, unknown>>(
    {attributes, params = {} as P}: {attributes: UpdateAttributes<T>; params?: P}
): UpdateParams & P {
  const expression = buildUpdateExpression(attributes, params);

  if (!expression) {
    throw new Error(`Cannot build update expression for empty attributes`);
  }

  return Object.assign(params, {UpdateExpression: expression}) as P & UpdateParams;
}
