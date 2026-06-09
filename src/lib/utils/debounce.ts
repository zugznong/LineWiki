export function debounce<A extends any[]>(fn: (...args: A) => void, delayMs: number): (...args: A) => void {
  let timer: any;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delayMs);
  };
}
