import express from "express";
import { client } from "./db.js";
import { readFileSync } from "node:fs";
import { ServerSentEventGenerator } from "@starfederation/datastar-sdk";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  const { rows } = await client.execute(
    "SELECT * FROM notes ORDER BY created_at DESC",
  );
  const notesItemsHtml = rows
    .map(
      (row) => `<li id="note-${row.id}">
      <h2>${row.title}</h2>
      <p>${row.body}</p>
    </li>`,
    )
    .join("");
  const html = readFileSync("public/index.html", "utf-8").replace(
    '<ul id="notes"></ul>',
    `<ul id="notes">${notesItemsHtml}</ul>`,
  );
  res.send(html);
});

app.post("/notes", async (req, res) => {
  const { signals } = await ServerSentEventGenerator.readSignals(req);
  const { title, body } = signals;
  const result = await client.execute({
    sql: "INSERT INTO notes (title, body) VALUES (?, ?)",
    args: [title, body],
  });
  const id = result.lastInsertRowid;
  const liHtml = `<li id="note-${id}">
      <h2>${title}</h2>
      <p>${body}</p>
    </li>`;
  await ServerSentEventGenerator.stream(req, res, async (stream) => {
    stream.patchElements(liHtml, { selector: "#notes", mode: "prepend" });
  });
});

app.use(express.static("public"));

app.get("/sse", (req, res) => {
  res.header({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(
    `event: datastar-patch-signals\ndata: signals ${JSON.stringify({ message: "Hello from the server!" })}\n\n`,
  );
  res.end();
});

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
