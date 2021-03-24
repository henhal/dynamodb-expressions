import {buildConditionExpression, Condition, ConditionSet} from '../Condition';
import {ConditionExpressionBuilder} from '../ConditionExpressionBuilder';

function matchExpression(c: ConditionSet<unknown>, exprPattern: RegExp, names: Record<string, string>, values: unknown[]) {
  const builder = new ConditionExpressionBuilder({});
  const expr = builder.build(c);
  expect(expr).toBeDefined();
  expect(expr).toMatch(exprPattern);
  const result = expr?.match(exprPattern) ?? [];
  expect(result).toBeDefined();

  expect(builder.params.ExpressionAttributeNames).toEqual(names);

  const [, ...escapedValues] = result;
  expect(builder.params.ExpressionAttributeValues).toEqual(Object
      .fromEntries(escapedValues
      .map((v, i) => [v, values[i]])));

}
describe('Condition tests', () => {
  it('Should build a simple condition', () => {
    matchExpression(
        {a: 42, b: 'foo'},
        /#a = (:cond_.*) AND #b = (:cond_.*)/,
        {'#a': 'a', '#b': 'b'},
        [42, 'foo']);

  });

  it('Should build a composite condition', () => {
    matchExpression(
        Condition.composite().or({a: 42, b: 'foo'}, {a: 43, b: 'bar'}),
        /\(#a = (:cond_.*) AND #b = (:cond_.*) OR #a = (:cond_.*) AND #b = (:cond_.*)\)/,
        {'#a': 'a', '#b': 'b'},
        [42, 'foo', 43, 'bar']);
  });

  it('Should build a nested composite condition', () => {
    matchExpression(
        Condition.composite()
            .or({a: 42, b: 'foo'}, {a: 43, b: 'bar'})
            .and({a: 44, b: 'baz'}, {a: 45, b: 'qux'}),
        /\(\(#a = (:cond_.*) AND #b = (:cond_.*) OR #a = (:cond_.*) AND #b = (:cond_.*)\) AND #a = (:cond_.*) AND #b = (:cond_.*) AND #a = (:cond_.*) AND #b = (:cond_.*)\)/,
        {'#a': 'a', '#b': 'b'},
        [42, 'foo', 43, 'bar', 44, 'baz', 45, 'qux']);
  });


});