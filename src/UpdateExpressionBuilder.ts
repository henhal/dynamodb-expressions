import {ExpressionBuilder} from './ExpressionBuilder';
import {UpdateAction, UpdateAttributes} from './UpdateAction';

type ActionType = 'SET' | 'REMOVE' | 'ADD' | 'DELETE';

export class UpdateExpressionBuilder<T extends Record<string, any>> extends ExpressionBuilder<UpdateAttributes<T>> {
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


