# dynamodb-expressions
Zero-dependency library of helpers for creating DynamoDB expressions without the hassle of maintaining `ExpressionAttributeValues`, escaping reserved attribute names, dealing with `#param`, `:value` etc! 🎉

## Introduction
This module enables building complex DynamoDB expressions (update expressions or condition expressions) using a simple syntax,
with TypeScript typing.
A condition string is built from attributes, and attribute names and values are handled and added to the supplied params.

## Update expressions

A simple update of attributes `foo` and `bar`:

```

await ddb.update(buildUpdateParams({
  params: {
    TableName: 'my-stuff',
    Key: {id: '42'},
  },
  attributes: {
    foo: 42,
    bar: 'HELLO'
  }
}));
```
Note that `buildUpdateParams` will add `UpdateExpression`, `ExpressionAttributeNames` and `ExpressionAttributeValues` to the given params and return the combined object.
If `ExpressionAttributeNames` or `ExpressionAttributeValues` already exists in the given `params`, they will be built upon, meaning you can combine calls to `buildUpdateParams` and e.g. `buildConditionParams`.

Alternatively you may of course add your other params separately:

```
await ddb.update({
  TableName: 'my-stuff',
  Key: {id: '42'},
  ...buildUpdateParams({
    attributes: {
      foo: 42,
      bar: 'HELLO'
    }
  })
};
```

The library offers a simple syntax for producing complex conditions.

Examples of more advanced operations:

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

You may also use the (legacy) function `buildUpdateExpression`, which returns the `UpdateExpression` as a single string. However, to obtain the `ExpressionAttributeNames` and `ExpressionAttributeValues` you must pass an in/out object which you then manually merge, since it contains `ExpressionAttributeNames` and `ExpressionAttributeValues` after the call to `buildUpdateExpression()` has returned:

```
const params = {};

await ddb.update(
  TableName: 'my-stuff',
  Key: {id: '42'},
  UpdateExpression: buildUpdateExpression({
    foo: 42,
    bar: 'HELLO'
  }, params),
  ...params
};
```

### Update operators:

All operators supported by DynamoDB as per https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html are included:
* SET
* REMOVE
* ADD
* DELETE

Nested attributes, lists, sets and built-in DynamoDB functions such as `list_append`, `if_not_exists` etc are supported.

## Condition expressions

This is very similar to update expressions, but may instead produce `ConditionExpression` or `KeyConditionExpression` values.

```
await ddb.query(buildKeyConditionParams({
  params: {
    TableName: 'my-stuff',
    IndexName: 'my-index',
  },
  conditions: {
    foo: 42, // foo = 42
    bar: Condition.gt(4), // bar > 4
    baz: Condition.between(7, 12) // baz BETWEEN 7, 12
    qux: Condition.in([1, 2, 4]) // qux IN (1, 2, 4)
    str: Condition.beginsWith('foo') // begins_with(str, 'foo')
  }
}));
```

Alternatively:

```
await ddb.query({
  TableName: 'my-stuff',
  IndexName: 'my-index',
  ...buildKeyConditionParams({
    conditions: {
      foo: 42, // foo = 42
      bar: Condition.gt(4), // bar > 4
      baz: Condition.between(7, 12) // baz BETWEEN 7, 12
      qux: Condition.in([1, 2, 4]) // qux IN (1, 2, 4)
      str: Condition.beginsWith('foo') // begins_with(str, 'foo')
    }
  });
});
```

Legacy function with manual passing of `params`:

```
const params = {};

const ConditionExpression = buildConditionExpression({
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
  
### Condition operators:

The operators and functions described at https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html are all supported:

* Arithmetic 
  * `=`
  * `<>`
  * `<`
  * `<=`
  * `>`
  * `>=`
* Value sets
  * `IN`
* Value ranges 
  * `BETWEEN`
* Boolean operators
  * `AND`
  * `OR`
  * `NOT`
* Functions:
  * `attribute_exists` 
  * `attribute_not_exists` 
  * `attribute_type` 
  * `begins_with` 
  * `contains`
  * `size`
  


