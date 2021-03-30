import {ExpressionBuilder} from './ExpressionBuilder';
import {UpdateAction, UpdateAttributes} from './UpdateAction';

export type ActionType = 'SET' | 'REMOVE' | 'ADD' | 'DELETE';

export class UpdateExpressionBuilder<T extends Record<string, any>> extends ExpressionBuilder<UpdateAttributes<T>> {
  private readonly actions = new Map<ActionType, string[]>();

  build(attributes: UpdateAttributes<T>): string | undefined {
    for (const [path, value] of Object.entries(attributes)) {
      const action = UpdateAction.from(value);
      const {type, expression} = action.build(path, this);

      this.addAction(type, expression);
    }

    return [...this.actions.entries()]
        .map(([type, actions]) => `${type} ${actions.join(', ')}`)
        .join(' ') || undefined;
  }

  protected addValue(value: unknown, prefix = '') {
    return super.addValue(value, `val_${prefix}`);
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


