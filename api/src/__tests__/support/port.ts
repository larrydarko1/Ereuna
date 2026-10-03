import type { Server } from 'node:http';

/** The port a test server is listening on. */
export function portOf(server: Server): number {
    const address = server.address();
    // A TCP listener reports an object; only a pipe or socket path reports a string
    if (address === null || typeof address === 'string') throw new Error('the test server is not on a TCP port');
    return address.port;
}
