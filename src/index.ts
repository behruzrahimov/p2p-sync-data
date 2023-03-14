import {
  connect,
  sendMessage,
  receivedMessage,
  subscribe,
  hasSubscription,
  get,
} from "./utils.js";
import { createNode } from "./nodeLibp2p.js";
import { db } from "./db.js";
import { MessageSend } from "./types /types.js";
export async function start() {
  const topic = "news";
  const [nodeBob, nodeAlice, nodeJack] = await Promise.all([
    createNode(),
    createNode(),
    createNode(),
  ]);

  await connect(nodeBob, nodeAlice);
  await connect(nodeAlice, nodeJack);
  await connect(nodeJack, nodeBob);

  await receivedMessage(nodeBob, db[0]);
  await subscribe(nodeBob, topic);

  await receivedMessage(nodeAlice, db[1]);
  await subscribe(nodeAlice, topic);

  await receivedMessage(nodeJack, db[2]);
  await subscribe(nodeJack, topic);

  await hasSubscription(nodeBob, nodeAlice, topic);
  await hasSubscription(nodeAlice, nodeJack, topic);

  const messageBob: MessageSend = {
    id: Date.now(),
    from: "Bob",
    message: "Hello everyone my name is Bob!",
  };
  await sendMessage(nodeBob, messageBob, topic, db[0]);

  const messageAlice: MessageSend = {
    id: Date.now(),
    from: "Alice",
    message: "Hello everyone my name is Alice!",
  };
  await sendMessage(nodeAlice, messageAlice, topic, db[1]);

  const messageJack: MessageSend = {
    id: Date.now(),
    from: "Jack",
    message: "Hello everyone my name is Jack!",
  };
  await sendMessage(nodeJack, messageJack, topic, db[2]);

  console.log("messagesSend");
  console.log("Bob", await get(db[0], "messageSend"));
  console.log("Alice", await get(db[1], "messageSend"));
  console.log("Jack", await get(db[2], "messageSend"));
  console.log("\n");
  console.log("messagesReceived");
  console.log("Bob", await get(db[0], "messageReceived"));
  console.log("Alice", await get(db[1], "messageReceived"));
  console.log("Jack", await get(db[2], "messageReceived"));

  process.exit();
}
