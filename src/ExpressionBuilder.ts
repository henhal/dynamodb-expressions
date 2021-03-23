export type Params = {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, unknown>;
};

export abstract class ExpressionBuilder<A extends Record<string, unknown>> {
  constructor(readonly params: Partial<Params>) {
  }

  addName(path: string, prefix = ''): string {
    this.params.ExpressionAttributeNames = this.params.ExpressionAttributeNames || {};

    return path.split('.').map(part => {
      const [key, ...elements] = part.split('[');
      const escapedName = `#${prefix}${key}`;
      this.params.ExpressionAttributeNames![escapedName] = key;
      prefix += `${part}_`;

      return [escapedName, ...elements].join('[');
    }).join('.');
  }

  addValue(path: string, value: unknown, prefix = ''): string {
    this.params.ExpressionAttributeValues = this.params.ExpressionAttributeValues || {};

    const escapedValue = `:${prefix}${path.replace(/[.\[\]]/g, '_')}`;
    this.params.ExpressionAttributeValues[escapedValue] = value;

    return escapedValue;
  }

  abstract build(attributes: A): string | undefined;
}