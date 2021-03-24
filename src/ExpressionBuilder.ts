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

  addName(path: string, prefix = ''): string {
    const names = this.params.ExpressionAttributeNames = this.params.ExpressionAttributeNames || {};

    return path.split('.').map(part => {
      const [key, ...elements] = part.split('[');
      const escapedName = addUniqueMapping(names, `#${prefix}${key}`, key);
      prefix += `${part}_`;

      return [escapedName, ...elements].join('[');
    }).join('.');
  }

  addValue(path: string, value: unknown, prefix = ''): string {
    const values = this.params.ExpressionAttributeValues = this.params.ExpressionAttributeValues || {};

    return addUniqueMapping(values, `:${prefix}${path.replace(/[.\[\]]/g, '_')}`, value)
  }

  abstract build(attributes: A): string | undefined;
}