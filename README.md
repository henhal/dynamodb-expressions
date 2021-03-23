# dynamodb-expressions
Helpers for creating DynamoDB expressions

This module enables building complex DynamoDB expressions (update expressions or condition expressions) using a simple syntax,
with TypeScript typing.
A condition string is built from attributes, and attribute names and values are handled and added to the supplied params.

## Update expressions

A simple update of attributes `foo` and `bar`:

```
const params = {};

const UpdateExpression = buildUpdateExpression({
  foo: 42,
  bar: 'HELLO'
}, params);

// The expression and the params may now form an update request:
await ddb.update({
  TableName: 'my-stuff',
  Key: {id: '42'},
  UpdateExpression
  ...params
};
```

More advanced operations:

```
{
  foo: 42, // set scalar value
  bar: UpdateAction.remove(), // remove attribute
  baz: UpdateAction.add(1), // increment number by 1
  mySet: UpdateAction.add(new Set([4])), // add 4 to mySet
  myOtherSet: UpdateAction.delete(new Set([5, 7])), // remove 5 and 7 from myOtherSet
  myList: UpdateAction.set(SetValue.append([1, 2])), // append 1, 2 to myList
  qux: UpdateAction.set(SetValue.ifNotExists('qux', 42)), // Set qux to 42 if it doesn't exist 
}
```

## Condition expessions

```
const params = {};

const ConditionExpression = buildUpdateExpression({
  foo: 42, // foo = 42
  bar: Condition.gt(4), // bar > 4
  baz: Condition.between(7, 12) // baz BETWEEN 7, 12
  qux: Condition.in([1, 2, 4]) // qux IN (1, 2, 4)
  str: Condition.beginsWith('foo') // begins_with(str, 'foo')
}, params);

await ddb.query({
  TableName: 'my-stuff',
  IndexName: 'my-index',
  KeyConditionExpression,
  ...params
});
```
  


