import {CompositeCondition} from './CompositeCondition';
import {ExpressionBuilder} from './ExpressionBuilder';
import {Condition, ConditionAttributes, ConditionSet} from './Condition';

export class ConditionExpressionBuilder<T> extends ExpressionBuilder<ConditionAttributes<T>> {
  private readonly conditions: string[] = [];

  build(conditions: ConditionSet<T>): string | undefined {
    let expr: string;

    if (conditions instanceof CompositeCondition) {
      const expressions = conditions.operands
          .map(operand => new ConditionExpressionBuilder(this.params).build(operand))
          .filter(expression => expression);

      expr = expressions.join(` ${conditions.operator} `);
      if (expressions.length > 1) {
        expr = `(${expr})`;
      }
    } else {
      for (const [key, value] of Object.entries(conditions)) {
        if (value !== undefined) {
          const {expression} = Condition.from(value).build(key, this);

          this.addCondition(expression);
        }
      }

      expr = `${this.conditions.join(' AND ')}`;
    }

    return expr || undefined;
  }

  protected addValue(value: unknown, prefix = ''): string {
    return super.addValue(value, `cond_${prefix}`);
  }

  addCondition(condition: string): void {
    this.conditions.push(condition);
  }
}
