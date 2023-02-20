import {ConditionSet} from './Condition';

export type LogicalOperator = 'AND' | 'OR';
const OPERATOR = Symbol('OPERATOR');
const OPERANDS = Symbol('OPERANDS');

/**
 * A composite condition using AND or OR operator to combine multiple sub-conditions.
 */
export class CompositeCondition<T> {
  private readonly [OPERATOR]: LogicalOperator;
  private readonly [OPERANDS]: Array<ConditionSet<T>> = [];

  constructor(operator: LogicalOperator, operands: Array<ConditionSet<T>>) {
    this[OPERATOR] = operator;
    this[OPERANDS] = operands;
  }

  get operator(): LogicalOperator {
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