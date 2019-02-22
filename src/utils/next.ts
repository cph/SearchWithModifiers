export function next(handler: (...args: any[]) => any) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(handler());
    }, 0);
  });
}
