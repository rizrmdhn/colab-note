import type { FriendRequest } from "@/types/friend-request";
import type { Message } from "@/types/messages";
import EventEmitter, { on } from "node:events";

export interface MyEvents {
  addFriend: (userId: string, friend: FriendRequest) => void;
  sendMessage: (userId: string, message: Message) => void;
}
declare interface MyEventEmitter {
  on<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  off<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  once<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  emit<TEv extends keyof MyEvents>(
    event: TEv,
    ...args: Parameters<MyEvents[TEv]>
  ): boolean;
}

class MyEventEmitter extends EventEmitter {
  public toIterable<TEv extends keyof MyEvents>(
    event: TEv,
    opts: NonNullable<Parameters<typeof on>[2]>,
  ): AsyncIterable<Parameters<MyEvents[TEv]>> {
    return on(this, event, opts) as any;
  }
}

// In a real app, you'd probably use Redis or something
export const ee = new MyEventEmitter();
