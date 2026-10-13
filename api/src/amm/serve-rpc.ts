/**
 * Minimal JSON-RPC client over the `midnight serve` DApp-Connector
 * WebSocket (Node built-in WebSocket, no `ws` dependency).
 *
 * Extracted from node.ts so preprod.ts can share the same wallet-funding
 * path: `balanceUnsealedTransaction` adds the wallet's coin inputs (the
 * sponsor /balance-only path cannot fund shielded receives).
 * @module
 */

export interface ServeRpcCall {
  call<T>(method: string, params?: Record<string, unknown>): Promise<T>;
}

export class ServeRpc implements ServeRpcCall {
  private ws: WebSocket | undefined;
  private nextId = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic promise resolution, mirrors node.ts
  private readonly pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();

  async connect(url: string, timeoutMs = 5_000): Promise<void> {
    await new Promise<void>((resolveConnect, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`mn serve connect timeout after ${timeoutMs}ms at ${url}`));
      }, timeoutMs);
      const ws = new WebSocket(url);
      const onError = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error(`mn serve unreachable at ${url} (is 'midnight serve' running?)`));
      };
      ws.addEventListener('error', onError, { once: true });
      ws.addEventListener(
        'open',
        () => {
          if (settled) {
            ws.close();
            return;
          }
          settled = true;
          clearTimeout(timer);
          ws.removeEventListener('error', onError);
          this.ws = ws;
          ws.addEventListener('message', (event) => this.onMessage(event));
          ws.addEventListener('close', () => {
            for (const { reject: rejectPending } of this.pending.values()) rejectPending(new Error('mn serve connection closed'));
            this.pending.clear();
          });
          resolveConnect();
        },
        { once: true },
      );
    });
  }

  get connected(): boolean {
    return this.ws !== undefined && this.ws.readyState === WebSocket.OPEN;
  }

  private onMessage(event: MessageEvent): void {
    const handle = (text: string): void => {
      let message: { id?: number; result?: unknown; error?: { message?: string } };
      try {
        message = JSON.parse(text);
      } catch {
        return;
      }
      if (typeof message.id !== 'number') return;
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message || JSON.stringify(message.error)));
      else waiter.resolve(message.result);
    };
    if (typeof event.data === 'string') handle(event.data);
    else if (event.data instanceof Blob) void event.data.text().then(handle);
  }

  call<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const ws = this.ws;
    if (!ws) return Promise.reject(new Error('mn serve RPC not connected'));
    const id = ++this.nextId;
    return new Promise<T>((resolveCall, reject) => {
      this.pending.set(id, { resolve: resolveCall, reject });
      ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
    });
  }

  close(): void {
    this.ws?.close();
    this.ws = undefined;
  }
}
