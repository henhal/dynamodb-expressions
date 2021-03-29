export class Operand {
  static size(path: string): string {
    return `size(#${path})`;
  }

  static get(path: string): string {
    return `#${path}`;
  }
}