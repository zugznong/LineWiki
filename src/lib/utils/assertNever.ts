export function assertNever(value: never): never {
  throw new Error(`Unhandled union pattern: ${JSON.stringify(value)}`);
}
