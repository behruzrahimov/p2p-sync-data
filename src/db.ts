import { Level } from "level";
const dbBob = new Level("./db/dbBob");
const dbAlice = new Level("./db/dbAlice");
const dbJack = new Level("./db/dbJack");

export const db = [dbBob, dbAlice, dbJack];
