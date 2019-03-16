export function throttle(time: number, fn: any, context: any) {
    let start = 0;
    let timer = null;
    return function (...args: any[]) {
        let now = Date.now();
        if (now - start > time) {
            fn.apply(context, args);
            start = now;
        }
    }
}