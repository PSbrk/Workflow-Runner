# Workflow Runner

A local web app that turns a JSON description of a process into a clickable
chain of boxes. Define a process once as a **template**, then create as many
**instances** as you want — each instance is an independent run with its own
title, progress, and decision history.

Two ways to author a template:

1. **Have Claude write one for you.** Describe the process in plain language;
   Claude writes a `workflows/<id>.json` file matching the schema in this
   README. Reload and create an instance from it.
2. **Build it yourself in the app.** Click **+ New ▾** → **Workflow (template)**
   (or **Edit** on an existing template) — the built-in editor gives you a
   drag-drop canvas, a form-based step list, and a raw-JSON tab. Save writes
   the JSON file to disk for you.

## Templates vs instances

- **Template** = a workflow definition (a JSON file in `workflows/`).
  Templates are blueprints — you view and edit them but never "run" them
  directly. Progress is not tracked on a template.
- **Instance** = a live run of a template. When you create an instance from
  a template, the app **snapshots** the template's steps so future edits to
  the template don't disturb already-running instances. Each instance has
  its own title, trail, current position, and decision choices, and persists
  independently (in `localStorage`) so the program can close and reopen and
  resume exactly where you were. Many instances can exist at once, including
  several from the same template.

---

## Run it

Double-click **`WorkflowRunner.html`** in the project root. (Or open
`public/index.html` directly — `WorkflowRunner.html` just redirects there.)
A modern browser (Chrome, Edge, or Firefox) opens the app from disk via
`file://`. No install, no server, no Python required.

The first time you launch, the app seeds its template store with the
example workflows bundled in `public/builtin-workflows.js`. After that
everything you create, edit, or delete is your own — the bundled defaults
are not re-applied on subsequent launches.

> **Why no server?** Earlier versions of this app shipped with a small
> Python HTTP server (`server.py`) that read and wrote JSON files in
> `workflows/`. In this **client-side branch** the server is gone:
> templates live in your browser's `localStorage` instead, alongside
> instance state. That makes deployment to other machines a single-file
> drop — see "Deploying" below.

### Importing / Exporting templates

Because templates live in your browser, moving them between machines is a
deliberate step:

- **Export** in the top bar downloads every template in your store as
  one JSON file (named `workflow-templates-<timestamp>.json`).
- **Import** opens a file picker; pick a `.json` file produced by Export
  (or a single workflow JSON) and the app loads each entry into your
  store. Existing templates with the same `id` are replaced.

## Deploying to another Windows PC (no install required)

The whole app is now a folder of static files. To put it on another
machine:

1. Zip the entire `WorkflowRunner/` folder (or just the `public/`
   subfolder + the top-level `WorkflowRunner.html`).
2. Copy the zip anywhere on the target PC and unzip it.
3. Double-click `WorkflowRunner.html`. The default browser opens the
   app from `file://`. Bookmark it if you'll use it often.

The recipient sees the same example templates you do (they're baked
into `public/builtin-workflows.js`). Any templates *you* added on your
machine stay on your machine — to share them, click **Export** here and
**Import** there.

If you change the bundled examples and want recipients to get them on
their first launch, edit the workflows in your local app, then run
`setup-builtins.cmd` once (regenerates `public/builtin-workflows.js`
from the current `workflows/*.json` on disk) before zipping.

---

## Top bar

- **Workflow ▾** — picks a *template* (for the Edit button and for the
  default selection in the new-instance dialog).
- **Instance ▾** — lists every saved instance; picking one opens it as the
  active workspace. Completed instances are marked `✓`.
- **+ New ▾** opens a small menu with two choices:
  - **Workflow (template)** — opens the editor on a blank new template.
  - **Instance** — opens a small dialog that asks (1) which template to use
    and (2) what to title the instance. On confirm, a new instance is
    created from a snapshot of the chosen template and opened.
- **Edit** — opens the editor on the currently-selected template.
- **Reset** — clears progress on the currently-open instance (back to step 1).
- **Reload** — re-reads template files from disk.

The header above the runner shows the **instance title** prominently with
a smaller "from <template name>" subtitle, plus **Rename** and **Delete
instance** buttons.

## How a run feels — flashcard view

The runner shows **one card at a time** — whatever's waiting for your input
right now. Around it:

- **Trail** above the card: a compact breadcrumb of recent steps. Done steps
  appear as green pills; the wait-steps the engine walked through to reach the
  current card show as amber `⏸ <id>` pills; the current step is the blue
  pill with `▶`.
- **The card**:
  - For an `action`: a big **"Click to complete"** button.
  - For a `decision`: one button per option, with the full option text.
  - If the engine had to traverse `wait` steps to reach the card, a small
    "While waiting for: …" notice on the card surfaces what's pending.
- **Progress** below the card: `X of Y steps completed` plus a progress bar.
- When the workflow reaches `end`, the card flips to a green **"✓ Workflow
  complete"** card with a **"Run again"** button.

Progress is saved per **instance** in `localStorage`. **Reset** in the header
clears the open instance's progress. Closing the browser and reopening keeps
you on whichever instance was open and exactly where you left it.

### Reaching the end of an instance

When an instance reaches a terminal step, the card shows a green
"✓ Workflow complete" header followed by:

```
Confirm you have ended this workflow.
[Yes — delete this instance]   [No, keep it]
```

- **Yes** removes the instance permanently from the dropdown and from
  storage. If another instance exists, it becomes the active one;
  otherwise you land on the "No instances yet" empty state.
- **No** keeps the instance in its completed state. From then on the card
  shows a **Start again** button (and a small Delete this instance link).
  Start again resets the instance to step 1 and clears its trail, choices,
  and acknowledgement — so you can re-run the same instance from scratch.

### Renaming and switching

- Click **Rename** in the header to change the instance's title. The new
  title shows up in the header and in the Instance dropdown immediately.
  Titles are free-form and need not be unique.
- Switching to a different instance from the Instance dropdown keeps each
  instance's state intact — both their trails, choices, and cursor
  positions are preserved independently. Each instance picks up exactly
  where it left off.

---

## Building & editing in the app

Header buttons:

- **+ New** — opens the editor on a fresh workflow with one stub step.
- **Edit** — opens the editor on the currently-selected workflow.

The editor has three tabs (Canvas is the default):

- **Canvas** — drag-and-drop visual editor.
  - **Shape palette** at the top adds steps: square = action, circle =
    decision, diamond = wait.
  - **Drag a shape's body** to move it. Positions are persisted as
    `position: {x, y}` on each step.
  - **Hover a shape** to reveal the **+** handle below it and the **✕**
    handle in the top-right corner. Drag **+** to another shape (or to the
    green END node) to create a connection. Click **✕** to delete the
    shape.
  - **Auto type-conversion**: when you add a second outgoing connection to
    an Action, the app prompts you for option labels and auto-converts the
    Action into a Decision. Wait shapes are limited to one outgoing
    connection.
  - **Click an edge** to select it, then press **Delete** to remove it.
    Deleting the second-to-last edge on a Decision offers to convert it
    back to an Action.
  - **Double-click a shape's label** (or the shape body) to edit it
    inline. Double-click the **id** text to rename the step — all `next`
    and `goto` references update automatically.
  - **END node** is a fixed terminator (draggable). Any `next` or option
    `goto` of `"end"` draws an arrow to it.
- **Form** — each step is a card with ID, type, label, and a routing row
  (a *Next* dropdown for Action/Wait, or an *Options* list for Decision).
  Step cards have *↑* / *↓* buttons to reorder and *✕* to delete.
- **Raw JSON** — edit the workflow JSON directly. Live parse status;
  switching tabs applies the latest text.

While **Canvas** is active, the read-only Preview pane is hidden (the
canvas is itself the visual editor). Form and Raw JSON tabs show the live
preview on the right.

Live validation runs as you edit (same rules as the runner). Errors are
listed in a red panel under the ID/Title fields and **disable the Save
button** until fixed; warnings appear in yellow but don't block save.

Editor actions:

- **Save** — writes `workflows/<id>.json`. If you changed the id, the
  previous file is removed (the workflow is renamed on disk). Refuses on
  validation errors or on id collisions with another existing file.
- **Save as new…** — prompts for a new id and saves a copy without
  touching the original (duplicate).
- **Cancel** — discards changes and returns to the runner.
- **Delete workflow** — confirmation prompt, then removes the JSON file.

When you change a step's id in the Form view, every `next` and option
`goto` that referenced the old id is automatically rewritten to the new id
so existing routing stays intact. Steps whose target was deleted (and any
other broken references) show as **"⚠ broken reference"** in the routing
dropdown so you can spot them.

### Pill states in the trail

| State    | Visual                | Meaning                                                  |
|----------|----------------------|----------------------------------------------------------|
| done     | green pill            | completed; for a decision shows `s5 → Yes`               |
| waiting  | amber `⏸ <id>`        | a `wait` step the engine walked through to reach the card |
| current  | blue `▶ <id>`         | the active step the card represents                      |

Progress is saved per workflow in `localStorage`.

---

## The JSON schema

Each workflow lives in `workflows/<id>.json`:

```json
{
  "id": "<unique-id>",
  "title": "<display title>",
  "steps": [ ... ]
}
```

### Step types

There are **three** step types:

**`action`** — clickable. You complete it by clicking it.
```json
{ "id": "s2", "type": "action", "label": "Email the vendor" }
{ "id": "s2", "type": "action", "label": "Email the vendor", "next": "s5" }
```

**`wait`** — passive. The engine passes through it on the way to the next
clickable step. Marked **waiting** while pending, **done** when the next
action/decision after it is completed.
```json
{ "id": "s3", "type": "wait", "label": "Wait for vendor to respond" }
{ "id": "s3", "type": "wait", "label": "Wait for vendor to respond", "next": "s4" }
```

**`decision`** — presents selectable options; each option points to a step.
A decision has **no** `next` — routing is per option only.
```json
{
  "id": "s5",
  "type": "decision",
  "label": "Does the vendor accept the renewal terms as-is?",
  "options": [
    { "label": "Yes", "goto": "s6" },
    { "label": "No",  "goto": "s7" }
  ]
}
```

### Routing rules (how "the next step" is determined)

- **Default**: the next step is the next item in the array.
  ```json
  [
    { "id": "a", "type": "action", "label": "..." },
    { "id": "b", "type": "action", "label": "..." }   // a → b by default
  ]
  ```
- An `action` or `wait` step may set `"next": "<stepId>"` to override the
  default, or `"next": "end"` to terminate that path.
- A `decision` step has **no default next**. Each option provides
  `"goto": "<stepId>"` (or `"end"`).
- A `next` or `goto` may target an **earlier** step — that's a loop. The app
  draws loop-back arrows so you can see them.
- Branches may reconverge — different `next`/`goto` targets can land on the
  same step.
- Give a branch's last step an explicit `"next"` when it should not fall
  through to the next array item. (Otherwise you'll get the default — which
  may or may not be what you want.)

### Loop behavior (re-running a segment)

When you advance to a step that you have already completed during this run,
the app:

1. **Truncates** the trail at that target step.
2. Resets every step that was completed or skipped after it back to
   **pending**.
3. **Clears decision choices** within the looped segment.
4. Makes the target step the new active step.

Steps before the loop target keep their state. The example workflow's "No"
branch (`s7 → s3`) demonstrates this: choosing "No" sends you back to wait for
the vendor again, and you re-do `s4`, `s5`, …

---

## Validation

Every workflow is validated when it loads, and the server also validates
everything in `workflows/` at startup and prints the results in the console.

### Errors (BLOCKING — workflow refuses to run)

The app names the offending step ids and the rule that was broken, and will
not let you step through the workflow.

1. **Reference integrity.** Every `next` and every option `goto` must
   reference an existing step id or the literal string `"end"`.
2. **No auto-infinite loop.** Every loop (a directed cycle formed by
   `next` + `goto` links) **must contain at least one `action` or
   `decision` step**. A cycle composed only of `wait` steps would let the
   engine spin forever without ever stopping for user input. Such a workflow
   is rejected.

   *Why:* `action` and `decision` steps require user input each lap (and a
   decision can route out), so those loops are stoppable. A pure-wait loop
   can never be interrupted.

   Illegal:
   ```json
   { "id": "w1", "type": "wait", "label": "...", "next": "w2" }
   { "id": "w2", "type": "wait", "label": "...", "next": "w1" }
   ```
   Legal — the action makes the loop stoppable:
   ```json
   { "id": "w1", "type": "wait",   "label": "Wait" }
   { "id": "a1", "type": "action", "label": "Tap to check", "next": "w1" }
   ```

The app also rejects basic schema mistakes: duplicate step ids, missing
labels, decisions without options, decisions that carry a `next`, etc.

### Warnings (non-blocking — workflow still runs)

A warning banner is shown listing the issue so you can decide whether it's
intended.

1. **No path to completion.** Starting from the first step and following all
   routing options/branches, if **no** reachable path ever ends at `"end"`
   (or a terminal step with no next), the app warns that the workflow can
   never reach completion. This is allowed (a decision that always loops
   back is a valid, stoppable loop) but is often an authoring mistake — a
   missing "Yes → end" exit.

### Defensive guard

The internal routine that walks forward over consecutive `wait` steps to
find the active step refuses to revisit a step in a single walk and surfaces
an error rather than spin. Validation should make this unreachable, but the
guard is there anyway.

---

## Example: `workflows/ica-renewal.json`

This is the example shipped with the app. The "No" branch (`s7`) sets
`"next": "s3"`, sending the flow back to wait for the vendor again until the
user picks "Yes":

```json
{
  "id": "ica-renewal",
  "title": "ICA Renewal",
  "steps": [
    { "id": "s1", "type": "action",   "label": "Receive email from PM requesting ICA renewal" },
    { "id": "s2", "type": "action",   "label": "Email vendor using information provided by PM" },
    { "id": "s3", "type": "wait",     "label": "Wait for vendor to respond" },
    { "id": "s4", "type": "action",   "label": "Review vendor response" },
    { "id": "s5", "type": "decision", "label": "Does the vendor accept the renewal terms as-is?",
      "options": [
        { "label": "Yes", "goto": "s6" },
        { "label": "No",  "goto": "s7" }
      ] },
    { "id": "s6", "type": "action", "label": "Send finalized ICA to PM for signature", "next": "end" },
    { "id": "s7", "type": "action", "label": "Send counter-terms to vendor",           "next": "s3" }
  ]
}
```

---

## For Claude (authoring a new workflow)

When the user describes a process in plain language, write a new
`workflows/<id>.json` file using the schema above. Before saving, mentally
check:

- Every `next` and every option `goto` references a real step id or `"end"`.
- Decisions have an `options` array and no `next`.
- For each loop you introduce (a `next`/`goto` pointing to an earlier step),
  at least one of the steps in that cycle is an `action` or `decision` — not
  all `wait`. Otherwise the app will refuse to run it.
- At least one path leads to `"end"` (or be intentional about a "loop until
  picked" workflow — the warning is OK if intended).
- The first step in the array is the starting step.

Drop the file in `workflows/`. The user clicks "Reload files" (or restarts the
server) and the new workflow appears in the picker.

---

## File layout

```
WorkflowRunner/
├── server.py                    # stdlib-only static server, /api/workflows
├── start.cmd                    # Windows convenience launcher
├── README.md
├── workflows/                   # templates (JSON, on disk)
│   └── ica-renewal.json         # example
└── public/
    ├── index.html
    ├── styles.css
    ├── validator.js             # browser validator (mirrored by server.py)
    ├── app.js                   # flashcard runner: walk, click, persist
    ├── instances.js             # instance store (localStorage)
    ├── editor.js                # form + raw-JSON editor
    └── editor-canvas.js         # drag-drop visual editor (Canvas tab)
```

### Storage

- Templates live in `workflows/<id>.json` on disk. Authoring, editing,
  renaming, and validation behaviour are unchanged.
- Instances live in `localStorage`:
  - `wfri:<instance-id>` — full instance object (snapshot of template
    steps, plus title, trail, choices, cursor, completedAcknowledged,
    createdAt).
  - `wfri-open` — id of the currently-open instance (so reload resumes it).
- Each instance owns a deep copy of the template's `steps` array at
  creation time, so editing a template after the fact does **not** alter
  running instances.

### Optional step fields persisted by the canvas editor

Beyond the schema required by the validator, the canvas editor stores two
extra fields so the diagram round-trips on disk:

- `step.position = { x, y }` — pixel coordinates (centre of the shape) on
  the editor canvas.
- `workflow.endPosition = { x, y }` — position of the END terminator.

Workflows without these fields still load fine; the canvas auto-arranges
missing positions in flow order on first edit.

### Server endpoints

| Method | URL                          | Purpose                                          |
|-------:|------------------------------|--------------------------------------------------|
| GET    | `/api/workflows`             | List every JSON file in `workflows/`             |
| POST   | `/api/workflows`             | Create or update — body: `{workflow, originalFile?}`. If `originalFile` is supplied and differs from `<workflow.id>.json`, the old file is removed (rename). |
| DELETE | `/api/workflows/<file.json>` | Remove that file                                 |
