import {ExpressionBuilder, Params} from './ExpressionBuilder';

type ActionType = 'SET' | 'REMOVE' | 'ADD' | 'DELETE';

type UpdateValue<V> = V | UpdateAction<V | void>;

class UpdateExpressionBuilder<T extends Record<string, any>> extends ExpressionBuilder<UpdateAttributes<T>> {
  private readonly actions = new Map<ActionType, string[]>();

  build(attributes: UpdateAttributes<T>): string | undefined {
    for (const [path, value] of Object.entries(attributes)) {
      const action = value instanceof UpdateAction ? value : UpdateAction.set(value);

      action.build(path, this);
    }

    return [...this.actions.entries()]
        .map(([type, actions]) => `${type} ${actions.join(', ')}`)
        .join(' ') || undefined;
  }

  addValue(name: string, value: unknown) {
    return super.addValue(name, value, 'val_');
  }

  addAction(type: ActionType, action: string) {
    let actions = this.actions.get(type);

    if (!actions) {
      actions = [];
      this.actions.set(type, actions);
    }

    actions.push(action);
  }
}

export type UpdateAttributes<T> = {
  [P in keyof T]?: UpdateValue<T[P]>;
} & {
  [path: string]: UpdateValue<any>;
}

export class SetValue {
  private constructor(readonly build: (path: string, builder: UpdateExpressionBuilder<any>) => string) {
  }

  static value<T>(value: T): SetValue {
    return new SetValue((path, builder) => builder.addValue(path, value));
  }

  static add(n1: number | string, n2: number | string): SetValue {
    return new SetValue((path, builder) => {
      const operands = [n1, n2].map((n, i) =>
          typeof n === 'string' ? builder.addName(n) : builder.addValue(`${path}${i}`, n));

      return operands.join(' + ');
    });
  }

  static subtract(n1: number | string, n2: number | string): SetValue {
    return new SetValue((path, builder) => {
      const operands = [n1, n2].map((n, i) =>
          typeof n === 'string' ? builder.addName(n) : builder.addValue(`${path}${i}`, n));

      return operands.join(' - ');
    });
  }

  static append<T>(list1: Array<T> | string, list2: Array<T> | string): SetValue {
    return new SetValue((path, builder) => {
      const operands = [list1, list2].map((list, i) =>
          typeof list === 'string' ? builder.addName(list) : builder.addValue(`${path}${i}`, list));

        return `list_append(${operands.join(', ')})`;
    });
  }

  static ifNotExists<T>(p: string, value: T): SetValue {
    return new SetValue((path, builder) => {
      const operands = [builder.addName(p), builder.addValue(path, value)];

      return `if_not_exists(${operands.join(', ')})`;
    });
  }
}

export class UpdateAction<T> {
  private constructor(readonly build: (path: string, builder: UpdateExpressionBuilder<any>) => void) {}

  static set<T>(value: T | SetValue): UpdateAction<T> {
    return new UpdateAction((path, builder) => {
      const v = value instanceof SetValue ? value : SetValue.value(value);

      return builder.addAction('SET', `${builder.addName(path)} = ${v.build(path, builder)}`);
    });
  }

  static remove(): UpdateAction<void> {
    return new UpdateAction((path, builder) =>
        builder.addAction('REMOVE', `${builder.addName(path)}`));
  }

  static add<T extends number | Set<unknown>>(value: T): UpdateAction<T> {
    return new UpdateAction((path, builder) =>
        builder.addAction('ADD', `${builder.addName(path)} ${builder.addValue(path, value)}`))
  }

  static delete<T extends Set<unknown>>(value: T): UpdateAction<T> {
    return new UpdateAction((path, builder) =>
        builder.addAction('DELETE', `${builder.addName(path)} ${builder.addValue(path, value)}`));
  }
}

export function buildUpdateExpression<T>(attributes: UpdateAttributes<T>, params: Partial<Params>): string | undefined {
  return new UpdateExpressionBuilder(params).build(attributes) || undefined;
}
