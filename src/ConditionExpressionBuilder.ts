import {ExpressionBuilder} from './ExpressionBuilder';
import {CompositeCondition, Condition, ConditionAttributes, ConditionSet} from './Condition';

export class ConditionExpressionBuilder<T> extends ExpressionBuilder<ConditionAttributes<T>> {
  private readonly conditions: string[] = [];

  build(conditions: ConditionSet<T>): string | undefined {
    if (conditions instanceof CompositeCondition) {
      return `(${conditions.operands.map(operand => new ConditionExpressionBuilder(this.params)
          .build(operand)).join(` ${conditions.operator} `)})`;
    }

    for (const [path, value] of Object.entries(conditions)) {
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
