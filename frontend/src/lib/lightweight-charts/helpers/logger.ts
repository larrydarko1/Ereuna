export function warn(msg: string): void {
    if (process.env.NODE_ENV === 'development') {
        console.warn(msg);
    }
}
