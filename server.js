import express from "express";
import { client } from "./db.js";
import { readFileSync } from "node:fs";
import { ServerSentEventGenerator } from "@starfederation/datastar-sdk";

const app = express();
const PORT = process.env.PORT || 3000;

function renderNoteHtml({ id, title, body }) {
  return /* html */ `<li id="note-${id}">
      <h2>${title}</h2>
      <p>${body}</p>
      <button type="button" data-on:click="@get('/notes/${id}/edit')">Edit</button>
      <button type="button" data-on:click="@delete('/notes/${id}')">Delete</button>
    </li>`;
}

function renderNoteEditHtml({ id, title, body }) {
  return /* html */ `<li id="note-${id}">
      <input type="text" data-bind="title_${id}" value="${title}" />
      <textarea data-bind="body_${id}">${body}</textarea>
      <button type="button" data-on:click="@put('/notes/${id}')">Save</button>
      <button type="button" data-on:click="@get('/notes/${id}')">Cancel</button>
    </li>`;
}

// Get all notes
app.get("/", async (req, res) => {
  const { rows } = await client.execute(
    "SELECT * FROM notes ORDER BY created_at DESC",
  );
  const notesItemsHtml = rows.map(renderNoteHtml).join("");
  const html = readFileSync("public/index.html", "utf-8").replace(
    '<ul id="notes"></ul>',
    `<ul id="notes">${notesItemsHtml}</ul>`,
  );
  res.send(html);
});

// Get one note
app.get("/notes/:id", async (req, res) => {
  const id = Number(req.params.id);
  const result = await client.execute({
    sql: "SELECT * FROM notes WHERE id = (?)",
    args: [id],
  });
  const liHtml = renderNoteHtml(result.rows[0]);
  await ServerSentEventGenerator.stream(req, res, async (stream) => {
    stream.patchElements(liHtml);
  });
});

// Note: Add
app.post("/notes", async (req, res) => {
  const { signals } = await ServerSentEventGenerator.readSignals(req);
  const { title, body } = signals;
  const result = await client.execute({
    sql: "INSERT INTO notes (title, body) VALUES (?, ?)",
    args: [title, body],
  });
  const id = result.lastInsertRowid;
  const liHtml = renderNoteHtml({ id, title, body });
  await ServerSentEventGenerator.stream(req, res, async (stream) => {
    stream.patchElements(liHtml, { selector: "#notes", mode: "prepend" });
  });
});

// Note: Save Edit
app.put("/notes/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { signals } = await ServerSentEventGenerator.readSignals(req);
  const title = signals[`title_${id}`];
  const body = signals[`body_${id}`];
  const result = await client.execute({
    sql: "UPDATE notes SET title = ?, body = ? WHERE id = ?",
    args: [title, body, id],
  });
  const liHtml = renderNoteHtml({ id, title, body });
  await ServerSentEventGenerator.stream(req, res, async (stream) => {
    stream.patchElements(liHtml);
  });
});

// Note: Delete
app.delete("/notes/:id", async (req, res) => {
  const id = Number(req.params.id);
  const result = await client.execute({
    sql: "DELETE FROM notes WHERE id = ?",
    args: [id],
  });
  await ServerSentEventGenerator.stream(req, res, (stream) => {
    stream.patchElements("", { selector: `#note-${id}`, mode: "remove" });
  });
});

// Note: Edit
app.get("/notes/:id/edit", async (req, res) => {
  const id = Number(req.params.id);
  const result = await client.execute({
    sql: "SELECT * FROM notes WHERE id = (?)",
    args: [id],
  });
  const liHtml = renderNoteEditHtml(result.rows[0]);
  await ServerSentEventGenerator.stream(req, res, async (stream) => {
    stream.patchElements(liHtml);
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
