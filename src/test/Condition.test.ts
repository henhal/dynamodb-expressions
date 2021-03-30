import {buildConditionExpression, Condition, ConditionSet} from '../Condition';
import {ConditionExpressionBuilder} from '../ConditionExpressionBuilder';
import {Operand} from '../Operand';

function matchExpression(c: ConditionSet<unknown>, exprPattern: RegExp, names: Record<string, string>, values: unknown[]) {
  const builder = new ConditionExpressionBuilder({});
  const expr = builder.build(c);
  expect(expr).toBeDefined();
  expect(expr).toMatch(exprPattern);
  const result = expr?.match(exprPattern) ?? [];
  expect(result).toBeDefined();

  expect(builder.params.ExpressionAttributeNames).toEqual(names);

  const [, ...escapedValues] = result;
  expect(builder.params.ExpressionAttributeValues).toEqual(values.length ? Object
      .fromEntries(escapedValues
      .map((v, i) => [v, values[i]])) : undefined);

}
describe('Condition tests', () => {
  it('Should build a simple condition', () => {
    matchExpression(
        {a: 42, b: 'foo'},
        /^#a = (:cond_.*) AND #b = (:cond_.*)$/,
        {'#a': 'a', '#b': 'b'},
        [42, 'foo']);

  });

  it('Should build a composite condition', () => {
    matchExpression(
        Condition.or({a: 42, b: 'foo'}, {a: 43, b: 'bar'}),
        /^\(#a = (:cond_.*) AND #b = (:cond_.*) OR #a = (:cond_.*) AND #b = (:cond_.*)\)$/,
        {'#a': 'a', '#b': 'b'},
        [42, 'foo', 43, 'bar']);
  });

  it('Should build a nested composite condition', () => {
    matchExpression(
        Condition
            .or({a: 42, b: 'foo'}, {a: 43, b: 'bar'})
            .and({a: 44, b: 'baz'}, {a: 45, b: 'qux'}),
        /^\(\(#a = (:cond_.*) AND #b = (:cond_.*) OR #a = (:cond_.*) AND #b = (:cond_.*)\) AND #a = (:cond_.*) AND #b = (:cond_.*) AND #a = (:cond_.*) AND #b = (:cond_.*)\)$/,
        {'#a': 'a', '#b': 'b'},
        [42, 'foo', 43, 'bar', 44, 'baz', 45, 'qux']);
  });

  it('Should build a deeply nested composite condition', () => {
    matchExpression(
        Condition
            .or({a: 42, b: 'foo'}, {a: 43, b: 'bar'})
            .and({a: 44, b: 'baz'}, {a: 45, b: 'qux'}, Condition.or({a: 46, b: 'quux'}, {a: 47, b: 'quuz'})),
        /^\(\(#a = (:cond_.*) AND #b = (:cond_.*) OR #a = (:cond_.*) AND #b = (:cond_.*)\) AND #a = (:cond_.*) AND #b = (:cond_.*) AND #a = (:cond_.*) AND #b = (:cond_.*) AND \(#a = (:cond_.*) AND #b = (:cond_.*) OR #a = (:cond_.*) AND #b = (:cond_.*)\)\)$/,
        {'#a': 'a', '#b': 'b'},
        [42, 'foo', 43, 'bar', 44, 'baz', 45, 'qux', 46, 'quux', 47, 'quuz']);
  });

  it('Should build a condition with explicit hash prefix on attribute name', () => {
    matchExpression(
        {'#a': Condition.lt(5)},
        /^#a < (:cond_.*)$/,
        {'#a': 'a'},
        [5]);
  });
  it('Should build a condition with size function', () => {
    matchExpression(
        {[Operand.size('a')]: Condition.lt(5)},
        /^size\(#a\) < (:cond_.*)$/,
        {'#a': 'a'},
        [5]);
  });
  it('Should build a condition with operand referring to attribute', () => {
    matchExpression(
        {'#a': Condition.lt(Operand.get('b'))},
        /^#a < #b$/,
        {'#a': 'a', '#b': 'b'},
        []);
  });

  it('Should build a condition with an escaped value including a #', () => {
    matchExpression(
        {'#a': Condition.eq(':#b')},
        /^#a = (:cond_.*)$/,
        {'#a': 'a'},
        ['#b']);
  });

  it('Should build a condition with an escaped value including a :', () => {
    matchExpression(
        {'#a': Condition.eq('::b')},
        /^#a = (:cond_.*)$/,
        {'#a': 'a'},
        [':b']);
  });

  it('Should build a condition with NOT', () => {
    matchExpression(
        {a: Condition.not(Condition.gt(5))},
        /^NOT \(#a > (:cond_.*)\)$/,
        {'#a': 'a'},
        [5]);
  });

  it('Should build a composite condition with empty operands', () => {
    matchExpression(
        Condition.and({a: 5}, Condition.or(Condition.and())),
        /^#a = (:cond_.*)$/,
        {'#a': 'a'},
        [5]);
  });

  it('Should build an empty condition', () => {
    const builder = new ConditionExpressionBuilder({});
    const expr = builder.build({});

    expect(expr).toBeUndefined();
  });

});
