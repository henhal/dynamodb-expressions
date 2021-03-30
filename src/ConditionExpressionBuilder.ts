import {ExpressionBuilder} from './ExpressionBuilder';
import {CompositeCondition, Condition, ConditionAttributes, ConditionSet} from './Condition';

export class ConditionExpressionBuilder<T> extends ExpressionBuilder<ConditionAttributes<T>> {
  private readonly conditions: string[] = [];

  build(conditions: ConditionSet<T>): string | undefined {
    if (conditions instanceof CompositeCondition) {
      const expressions = conditions.operands
          .map(operand => new ConditionExpressionBuilder(this.params).build(operand))
          .filter(expression => expression);

      const joined = expressions.join(` ${conditions.operator} `);
      return expressions.length > 1 ? `(${joined})` : joined;
    }

    for (const [key, value] of Object.entries(conditions)) {
      const {expression} = Condition.from(value).build(key, this);

      this.addCondition(expression);
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
