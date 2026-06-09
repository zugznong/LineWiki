export type Result<S, F extends Error = Error> = Success<S, F> | Failure<S, F>;

class Success<S, F extends Error> {
  constructor(private readonly val: S) {}
  public isOk(): this is Success<S, F> { return true; }
  public isFailure(): this is Failure<S, F> { return false; }
  public unwrap(): S { return this.val; }
  public unwrapOrDefault(fallback: S): S { return this.val; }
  public unwrapErr(): never { throw new Error('Cannot unwrap error from success Result'); }
  public map<T>(fn: (val: S) => T): Result<T, F> { return success(fn(this.val)); }
}

class Failure<S, F extends Error> {
  constructor(private readonly err: F) {}
  public isOk(): this is Success<S, F> { return false; }
  public isFailure(): this is Failure<S, F> { return true; }
  public unwrap(): never { throw this.err; }
  public unwrapOrDefault(fallback: S): S { return fallback; }
  public unwrapErr(): F { return this.err; }
  public map<T>(fn: (val: S) => T): Result<T, F> { return failure(this.err); }
}

export function success<S, F extends Error = Error>(value: S): Result<S, F> {
  return new Success<S, F>(value);
}

export function failure<S, F extends Error = Error>(error: F): Result<S, F> {
  return new Failure<S, F>(error);
}

