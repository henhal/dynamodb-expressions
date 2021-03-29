import {ExpressionBuilder} from './ExpressionBuilder';
import {CompositeCondition, Condition, ConditionAttributes, ConditionSet} from './Condition';

export class ConditionExpressionBuilder<T> extends ExpressionBuilder<ConditionAttributes<T>> {
  private readonly conditions: string[] = [];

  build(conditions: ConditionSet<T>): string | undefined {
    if (conditions instanceof CompositeCondition) {
      return `(${conditions.operands.map(operand => new ConditionExpressionBuilder(this.params)
          .build(operand)).join(` ${conditions.operator} `)})`;
    }

    for (const [key, value] of Object.entries(conditions)) {
      const condition = value instanceof Condition ? value : Condition.eq(value);

      condition.build(key, this);
    }

    return `${this.conditions.join(' AND ')}` || undefined;
  }

  protected addValue(value: unknown, prefix = ''): string {
    return super.addValue(value, `cond_${prefix}`);
  }

  addCondition(condition: string): void {
    this.conditions.push(condition);
  }
}
