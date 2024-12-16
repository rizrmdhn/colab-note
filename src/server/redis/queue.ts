class MessageQueue<T> {
  private queue: T[] = [];
  private resolvers: ((value: T) => void)[] = [];

  enqueue(item: T): void {
    const resolver = this.resolvers.shift();
    if (resolver) {
      resolver(item);
    } else {
      this.queue.push(item);
    }
  }

  async dequeue(): Promise<T> {
    const item = this.queue.shift();
    if (item !== undefined) {
      return item;
    }
    return new Promise<T>((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  clear(): void {
    this.queue = [];
    this.resolvers = [];
  }
}
export default MessageQueue;
