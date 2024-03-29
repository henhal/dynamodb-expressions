# dynamodb-expressions
Zero-dependency library of helpers for creating DynamoDB expressions without the hassle of maintaining `ExpressionAttributeValues`, escaping reserved attribute names, dealing with `#param`, `:value` etc! 🎉

## BREAKING CHANGE in v3:

`Condition.and()` and `Condition.or()` now have a different meaning from before. 
* The old methods are moved to `ConditionSet` namespace, which is more consistent since they both return `ConditionSet`.
* The new methods return `Condition` which is in line with all other static methods on `Condition`, and enables easy 
  use of `AND`/`OR` conditions on a single attribute, with shorter syntax:

```
{
  a: 1
  b: Condition.or(2, 3)
  c: Condition.or(4, 5)
}

=> "a = 1 AND (b = 2 OR b = 3) AND (c = 4 OR c = 5)"
```

which using the old way of creating OR conditions would be

```
ConditionSet.and(
  {a: 1}, 
  ConditionSet.or({b: 2}, {b: 3}), 
  ConditionSet.or({c: 4}, {c: 5})
)

=> "a = 1 AND (b = 2 OR b = 3) AND (c = 4 OR c = 5)"
```

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
  myList: UpdateAction.set(SetValue.append('mylist', [1, 2])), // append 1, 2 to myList
  qux: UpdateAction.set(SetValue.ifNotExists('qux', 42)), // Set qux to 42 if it doesn't exist 
  abc: UpdateAction.set(SetValue.append(SetValue.ifNotExists('qux', ['hello']), ['world'])), // Set abc to the list stored in qux with 'world' appended to it; or if qux does not exist, default to a list containing 'hello' 
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

New in v3 is also the fact that `Condition` also has an `evaluate` method which can be used for supporting default values for missing attributes:

```
{
  x: Condition.in(['foo', 'bar']).withDefaultValue('foo')
}
```

This means that if the given default value matches the condition, records where the attribute is missing will also be included;
in other words, the complete condition will be `(#x IN (:foo, :bar) OR attribute_not_exists(#x))` since records without the attribute will be treated as if they had the value `foo`, which matches the condition.

A default value that doesn't match the condition will not affect it though:

```
{
  x: Condition.in(['foo', 'bar']).withDefaultValue('baz')
}
```

The condition will be`#x IN (:foo, :bar)` since records without the attribute will be treated as if they had the attribute value `baz`, which was not a value we wanted to match.


The `evaluate` method may also be used to locally evaluate a condition against a value, for testing or other purposes.

```
> const c = Condition.ge(42);
> console.log(c.evaluate(42))
true
> console.log(c.evaluate(41))
false
```

### Pitfalls

#### Name/Value ambiguities

Many functions or operations in update or condition expressions support literal values as well as paths to other attributes
of an item.
There are some cases where the library receives a string argument and has to "guess" if that value is a string literal or 
a path to an attribute, such as when applying a condition for `a` being less than or equal to `b`.
In such cases, it's possible to explicitly mark a value as a path or a value, by prepending a `#` to a path or a `:` to
a value. This also applies if a value contains a `#` character or a path contains a `:` character - then the strings _must_
be prepended ("escaped") with `#` or `:`, respectively. 
These prepended special characters are stripped away when the expressions are written.

Examples:

* Value of attribute `a` should be less than string literal `"b"`: `{a: Condition.lt('b')}`
* Value of attribute `a` should be less than the value of attribute `b`: `{a: Condition.lt('#b')}`
* Value of attribute `a` should be less than the value of attribute `:b`: `{a: Condition.lt('#:b')}`
* Value of attribute `a` should be less than string literal `"#b"`: `{a: Condition.lt(':#b')}`
* Value of attribute `a` should be less than string literal `":b"`: `{a: Condition.lt('::b')}`

If relying on implicit path/value detection, a condition will typically assume that operands are values unless a `#`
character is present, such as in `{a: Condition.between('a', 'z')}` where the operands are both string literals.

Note also that there are a few cases where _only_ paths are expected, but where `#` is not required, such as `SetValue.ifNotExists(path, defaultValue)`