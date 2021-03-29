export type Params = {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, unknown>;
};

function addUniqueMapping(values: Record<string, unknown>, key: string, value: unknown) {
  let uniqueKey = key;

  while (uniqueKey in values && values[uniqueKey] !== value) {
    // key exists and has different value, append random
    uniqueKey = `${key}_${Math.floor(Math.random() * 1000)}`;
  }
  values[uniqueKey] = value;
  return uniqueKey;
}

export abstract class ExpressionBuilder<A extends Record<string, unknown>> {
  constructor(readonly params: Partial<Params>) {
  }

  addOperand(operand: unknown, defaultType: 'name' | 'value', prefix = '') {
    if (typeof operand === 'string') {
      if (operand[0] === ':') {
        // Explicit literal, needed if value contains #
        return this.addValue(operand.substring(1), prefix);
      } else if (operand.includes('#')) {
        // Expression with attribute names
        return operand.replace(/#[^)]+/, s => this.addName(s.substring(1), prefix));
      }
    }

    if (defaultType === 'name') {
      // Raw name where name is expected unless : is used
      return this.addName(String(operand), prefix);
    } else {
      // Raw value where value is expected unless # is used
      return this.addValue(operand, prefix);
    }

    //   const names = operand.match(/#([^)]+)/);
    //
    //   if (names) {
    //     names
    //   }
    //     type = 'value';
    //     operand = operand.substring(1);
    //   } else if ({
    //     return operand.replace(/#[^)]+/, this.s => s.substring(1))
    //     type = 'name';
    //     operand = operand.substring(1);
    //   } else
    // }
    //
    // if (type === 'name') {
    //   return this.addName(String(operand), prefix);
    // } else {
    //   return this.addValue('', operand, prefix);
    // }
  }

  protected addName(path: string, prefix = ''): string {
    const names = this.params.ExpressionAttributeNames = this.params.ExpressionAttributeNames || {};

    // foo => literal foo
    // :foo => literal foo
    // :#foo => literal #foo
    // #foo => attribute name foo
    // #size(foo) => size(attribute name foo)


    return path.split('.').map(part => {
      const [key, ...elements] = part.split('[');
      const escapedName = addUniqueMapping(names, `#${prefix}${key}`, key);
      prefix += `${part}_`;

      return [escapedName, ...elements].join('[');
    }).join('.');
  }

  protected addValue(value: unknown, prefix = ''): string {
    const values = this.params.ExpressionAttributeValues = this.params.ExpressionAttributeValues || {};

    return addUniqueMapping(values, `:${prefix}`, value)
  }

  abstract build(attributes: A): string | undefined;
}