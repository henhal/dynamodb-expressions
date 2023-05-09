import {SetValue, UpdateAction, UpdateAttributes} from '../src/UpdateAction';
import {UpdateExpressionBuilder} from '../src/UpdateExpressionBuilder';
import {Operand} from '../src/Operand';

function matchExpression(action: UpdateAttributes<unknown>, exprPattern: RegExp, names: Record<string, string>, values: unknown[]) {
  const builder = new UpdateExpressionBuilder({});
  const expr = builder.build(action);

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
describe('Update action tests', () => {
  it('Should build a simple SET update action', () => {
    matchExpression(
        {a: 42, b: 'foo'},
        /^SET #a = (:val_.*), #b = (:val_.*)$/,
        {'#a': 'a', '#b': 'b'},
        [42, 'foo']);

  });

  it('Should build an ADD number update action', () => {
    matchExpression(
        {a: 42, b: UpdateAction.add(5)},
        /^SET #a = (:val_.*) ADD #b (:val_.*)$/,
        {'#a': 'a', '#b': 'b'},
        [42, 5]);
  });

  it('Should build an ADD set update action', () => {
    const v = new Set([5, 7]);
    matchExpression(
        {a: 42, b: UpdateAction.add(v)},
        /^SET #a = (:val_.*) ADD #b (:val_.*)$/,
        {'#a': 'a', '#b': 'b'},
        [42, v]);
  });

  it('Should build a REMOVE update action', () => {
    matchExpression(
        {a: 42, b: UpdateAction.remove()},
        /^SET #a = (:val_.*) REMOVE #b$/,
        {'#a': 'a', '#b': 'b'},
        [42]);
  });

  it('Should build a DELETE update action', () => {
    const v = new Set([5]);
    matchExpression(
        {a: 42, b: UpdateAction.delete(v)},
        /^SET #a = (:val_.*) DELETE #b (:val_.*)$/,
        {'#a': 'a', '#b': 'b'},
        [42, v]);
  });

  it('Should build a SET update action with if_not_exists function', () => {
    matchExpression(
        {a: 42, b: UpdateAction.set(SetValue.ifNotExists('a', 5))},
        /^SET #a = (:val_.*), #b = if_not_exists\(#a, (:val_.*)\)$/,
        {'#a': 'a', '#b': 'b'},
        [42, 5]);
  });

  it('Should build a SET update action referring to size of other attribute', () => {
    matchExpression(
        {a: 42, b: Operand.size('c')},
        /^SET #a = (:val_.*), #b = size\((.*)\)$/,
        {'#a': 'a', '#b': 'b', '#c': 'c'},
        [42]);
  });

  it('Should build an empty update action', () => {
    const builder = new UpdateExpressionBuilder({});
    const expr = builder.build({});

    expect(expr).toBeUndefined();
  });

  it('Should use list_append function in a SET expression with path as first argument', () => {
    matchExpression(
        {a: UpdateAction.set(SetValue.append('a', ['B', 'C']))},
        /^SET #a = list_append\(#a, (:val_.*)\)$/,
        {'#a': 'a'},
        [['B', 'C']]);
  });

  it('Should use list_append function in a SET expression with path as second argument', () => {
    matchExpression(
        {a: UpdateAction.set(SetValue.append(['B', 'C'], 'a'))},
        /^SET #a = list_append\((:val_.*), #a\)$/,
        {'#a': 'a'},
        [['B', 'C']]);
  });

  it('Should use list_append function in a SET expression with path as both arguments', () => {
    matchExpression(
        {a: UpdateAction.set(SetValue.append('a', 'b'))},
        /^SET #a = list_append\(#a, #b\)$/,
        {'#a': 'a', '#b': 'b'},
        []);
  });

  it('Should use if_not_exists function in a SET expression', () => {
    matchExpression(
        {a: UpdateAction.set(SetValue.ifNotExists('a', 42))},
        /^SET #a = if_not_exists\(#a, (:val_.*)\)$/,
        {'#a': 'a'},
        [42]);
  });

  it('Should use nested functions in a SET expression', () => {
    matchExpression(
        {a: UpdateAction.set(SetValue.append(SetValue.ifNotExists('b', ['A']), ['B', 'C']))},
        /^SET #a = list_append\(if_not_exists\(#b, (:val_.*)\), (:val_.*)\)$/,
        {'#a': 'a', '#b': 'b'},
        [['A'], ['B', 'C']]);
  });
});
