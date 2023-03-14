import { Libp2p } from "libp2p";
import { Level } from "level";
import { MessageSend } from "./types /types.js";
import { db } from "./db.js";

export function uint8ArrayToString(buf: Uint8Array) {
  return new TextDecoder().decode(buf);
}
export function uint8ArrayFromString(str: string) {
  return new TextEncoder().encode(str);
}

export async function connect(someNode: Libp2p, anotherNode: Libp2p) {
  await someNode.peerStore.addressBook.set(
    anotherNode.peerId,
    anotherNode.getMultiaddrs()
  );
  const res = await someNode.dial(anotherNode.peerId);
  // console.log(
  //   someNode.peerId.toString(),
  //   "connected to",
  //   res.remotePeer.toString()
  // );
  return res;
}

export async function sendMessage(
  node: Libp2p,
  message: MessageSend,
  topic: string,
  nodeDB: Level<string, string>
) {
  node.pubsub
    .publish(topic, uint8ArrayFromString(JSON.stringify(message)))
    .catch((err) => {
      console.error(err);
    });
  await save(nodeDB, "messageSend", JSON.stringify(message));
}
export async function receivedMessage(
  node: Libp2p,
  nodeDB: Level<string, string>
) {
  await node.pubsub.addEventListener("message", async (evt) => {
    // console.log(
    //   `${node.peerId} received: ${uint8ArrayToString(
    //     evt.detail.data
    //   )} on topic ${evt.detail.topic}\n`
    // );
    const allMessages: string[] = [];
    const nodeMessage: string[] = [];
    for (let i = 0; i < db.length; i++) {
      if (db[i] !== nodeDB) {
        const res = await get(db[i], "messageSend");
        for (const message of res) {
          allMessages.push(message);
        }
      } else {
        const res = await get(db[i], "messageReceived");
        for (const message of res) {
          nodeMessage.push(message);
        }
      }
    }
    const uniqueAllMessages = [...new Set(allMessages)];
    const uniqueNodeMessages = [...new Set(nodeMessage)];
    const syncData = sync(uniqueAllMessages, uniqueNodeMessages);
    await save(nodeDB, "messageReceived", JSON.stringify(syncData));
  });
}

export async function subscribe(node: Libp2p, topic: string) {
  await node.pubsub.subscribe(topic);
}
export async function save(
  nodeDB: Level<string, string>,
  key: string,
  data: string
) {
  const savedMessages = await get(nodeDB, key);
  const checkData = JSON.parse(data);
  if (checkData.length > 0) {
    for (const message of checkData) {
      savedMessages.push(message);
    }
  } else {
    savedMessages.push(data);
  }
  const uniqueSavedMessages = [...new Set(savedMessages)];

  await nodeDB.put(key, JSON.stringify(uniqueSavedMessages));
}

export const get = async (DB: Level, key: string) => {
  const res: string[] = [];
  const data = await DB.iterator({ limit: 100 }).all();
  data.forEach((data) => {
    if (data[0] === key) {
      JSON.parse(data[1]).forEach((e: string) => {
        res.push(e);
      });
    }
  });
  return res;
};

export async function hasSubscription(
  node1: Libp2p,
  node2: Libp2p,
  topic: string
) {
  while (true) {
    const subs = node1.pubsub.getSubscribers(topic);
    if (subs.map((peer) => peer.toString()).includes(node2.peerId.toString())) {
      return;
    }
    // wait for subscriptions to propagate
    await delay(100);
  }
}

export async function delay(ms: number) {
  await new Promise<any>((resolve: any) => {
    setTimeout(() => resolve(), ms);
  });
}

function sync(allMessages: string[], nodeMessage: string[]) {
  if (allMessages.length === 0) {
    return [""];
  } else if (nodeMessage.length === 0) {
    return allMessages;
  }
  const latestNodeMessageTimeStamp = JSON.parse(
    nodeMessage[nodeMessage.length - 1]
  ).id;
  const latestAllMessageTimeStamp = JSON.parse(
    allMessages[allMessages.length - 1]
  ).id;
  if (latestNodeMessageTimeStamp !== latestAllMessageTimeStamp) {
    const newMessages = allMessages.filter(
      (message) => JSON.parse(message).id > latestNodeMessageTimeStamp
    );
    for (const newMessage of newMessages) {
      nodeMessage.push(newMessage);
    }
  } else {
    return allMessages;
  }
  return nodeMessage;
}
