import {Params} from './ExpressionBuilder';
import {ActionType, UpdateExpressionBuilder} from './UpdateExpressionBuilder';
import ParamsBuilder from './ParamsBuilder';

type UpdateValue<V> = V | UpdateAction<V | void>;

export type UpdateAttributes<T> = {
  [P in keyof T]?: UpdateValue<T[P]>;
} & {
  [key: string]: UpdateValue<any>;
}

export class UpdateAction<T> {
  private constructor(readonly build: (key: string, builder: ParamsBuilder) => {
    type: ActionType;
    expression: string;
  }) {
  }

  static set<T>(value: T | SetValue): UpdateAction<T> {
    return new UpdateAction((key, builder) => {
      const v = value instanceof SetValue ? value : SetValue.value(value);

      return {
        type: 'SET',
        expression: `${builder.addOperand(key, 'name')} = ${v.build(key, builder)}`
      }
    });
  }

  static remove(): UpdateAction<void> {
    return new UpdateAction((key, builder) => ({
      type: 'REMOVE',
      expression: `${builder.addOperand(key, 'name')}`
    }));
  }

  static add<T extends number | Set<unknown>>(value: T): UpdateAction<T> {
    return new UpdateAction((key, builder) => ({
      type: 'ADD',
      expression: `${builder.addOperand(key, 'name')} ${builder.addOperand(value, 'value', 'add')}`
    }));
  }

  static delete<T extends Set<unknown>>(value: T): UpdateAction<T> {
    return new UpdateAction((key, builder) => ({
      type: 'DELETE',
      expression: `${builder.addOperand(key, 'name')} ${builder.addOperand(value, 'value', 'delete')}`
    }));
  }
}

export class SetValue {
  private constructor(readonly build: (key: string, builder: ParamsBuilder) => string) {
  }

  static value<T>(value: T): SetValue {
    return new SetValue((key, builder) => builder.addOperand(value, 'value', 'set'));
  }

  static add(n1: number | string, n2: number | string): SetValue {
    return new SetValue((key, builder) => {
      const operands = [n1, n2].map((n, i) =>
          typeof n === 'string' ? builder.addOperand(n, 'name') : builder.addOperand(n, 'value', `add${i}`));

      return operands.join(' + ');
    });
  }

  static subtract(n1: number | string, n2: number | string): SetValue {
    return new SetValue((key, builder) => {
      const operands = [n1, n2].map((n, i) =>
          typeof n === 'string' ? builder.addOperand(n, 'name') : builder.addOperand(n, 'value', `sub${i}`));

      return operands.join(' - ');
    });
  }

  static append<T>(list1: Array<T> | string, list2: Array<T> | string): SetValue {
    return new SetValue((key, builder) => {
      const operands = [list1, list2].map((list, i) =>
          typeof list === 'string' ? builder.addOperand(list, 'name') : builder.addOperand(list, 'value', `append${i}`));

      return `list_append(${operands.join(', ')})`;
    });
  }

  static ifNotExists<T>(p: string, value: T): SetValue {
    return new SetValue((key, builder) => {
      const operands = [builder.addOperand(p, 'name'), builder.addOperand(value, 'value', 'ifnotexists')];

      return `if_not_exists(${operands.join(', ')})`;
    });
  }
}

export function buildUpdateExpression<T>(attributes: UpdateAttributes<T>, params: Partial<Params>): string | undefined {
  return new UpdateExpressionBuilder(params).build(attributes) || undefined;
}