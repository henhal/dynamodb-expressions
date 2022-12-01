export namespace Operand {
  /**
   * Get the attribute path for the size of an attribute.
   * Example:
   *
   * const conditions = {
   *   a: 42,
   *   [Operand.size('b')]: Condition.gt(4)
   * }
   *
   * This creates a condition like '#a = 42 AND size(#b) > 4'
   * @param path
   */
  export function size(path: string): string {
    return `size(#${path})`;
  }

  /**
   * Get the attribute path for the attribute with the given name, useful when comparing an attribute to another
   * attribute.
   * Example:
   *
   * const conditions = {
   *   a: Condition.gt(Operand.get('b'))
   * }
   *
   * This creates a condition like '#a > #b'
   * @param path
   */
  export function get(path: string): string {
    return `#${path}`;
  }
}