import { polyfill } from 'es6-promise';
polyfill();

export function next(handler: (...args: any[]) => any) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(handler());
    }, 0);
  });
}
