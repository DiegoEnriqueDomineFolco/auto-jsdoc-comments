# 🧪 JSDocBlock Comments — Automated JSDoc Generator

**GitBook Link:**
[https://app.gitbook.com/o/WHsMpH7qEeKdKSPXN6Rx/s/Je5bfCaoBSm8ax8SmGwU/automated-jsdoc-block-comments](https://app.gitbook.com/o/WHsMpH7qEeKdKSPXN6Rx/s/Je5bfCaoBSm8ax8SmGwU/automated-jsdoc-block-comments)

## ✨ Context

Script to automatically generate **uniform JSDoc block comments** inside JS (and basic TS) files.

It analyzes your source code, detects declarations (functions, arrows, constants, classes, types, interfaces), and inserts consistent JSDoc blocks above each symbol.

Everything is modular, commented, scalable and refactor-friendly.
Inside every file you will find important comments to understand the internal logic.

To check what the matching algorithm is catching, look inside:

```js
helpers.mjs
const declarationsPatterns
```

---

## 📁 Files (main scripts)

```
generate-comments-jsdoc.mjs        ← generates auto comments
degenerate-comments-jsdoc.mjs      ← removes auto comments
helpers.mjs                        ← helper fns (parsing, mappings, inference)
utils.mjs                          ← common utilities (fs, diff, comment detection)
config.mjs                         ← config values
```

Example source reference:
[https://github.com/real-token/realt-admin-dashboard-v3/tree/auto-jsdoc-comments/scripts/generate](https://github.com/real-token/realt-admin-dashboard-v3/tree/auto-jsdoc-comments/scripts/generate)

---

## 🔍 Before / After Example

**Before**

```js
export const sum = (a, b = 0) => a + b;
```

**After**

```js
/** Automated Testing Block - Do Not Change
 * Details about: sum.
 * @param {number} a
 * @param {number} b (default: 0)
 * @returns {number}
 * @export
 */
export const sum = (a, b = 0) => a + b;
```

---

## 📦 Installation

Just copy the folder with the scripts into your repo, something like:

```
./scripts/comments
./someFolder/someWhere/whatever/etc
```

No dependencies.
No build.
Just Node.

---

## ⚙️ Configuration (package.json)

Add your commands inside `"scripts"`:

```json
"scripts": {
  "generate:comments": "node scripts/generate/generate-comments-jsdoc.mjs",
  "degenerate:comments": "node scripts/generate/degenerate-comments-jsdoc.mjs",

  // IMPORTANT
  // You can name the command whatever you want.
  // Only mandatory part is the "node" execution:
  "whateverYouWant": "node someFolder/someWhere/whatever/etc/NAME_OF_THE_FILE.mjs"
}
```

✔ Rename commands as you wish.
✔ Paths should match your project structure.
✔ Only required part is:

```json
"xXxXx": "node your/path/file.mjs"
```

---

## 🚀 Auto-generate comments

Run:

```bash
npm run generate:comments
```

The script will:

1. Detect all declarations
2. Clean previous generated blocks
3. Encode your manual comments
4. Insert fresh JSDoc blocks
5. Decode back your manual comments
6. Add a global header
7. Save (or diff, if dryRun = true)

That’s it! ^_^

---

## ♻️ Remove generated comments

```bash
npm run degenerate:comments
```

This removes **only** the generated blocks (detected via `flagCodeBlocks`).

---

## 🧩 Config File

Inside `config.mjs` you’ll find:

* `baseDir`: root or single file
* `excludeFolders`: folders to skip
* `validExtensions`: only `.js` deeply, `.ts` basic level
* `dryRun`: simulate changes (true) or write to disk (false)
* `flagCodeBlocks`: string used to detect generated blocks

**Important:** If you change `flagCodeBlocks`, update it in both scripts.

---

## 📌 Roadmap

* Deeper TypeScript support
* Multi-line arrow inference
* Smart descriptions based on parameter names
* Custom templates
* CLI version (global install)
* Auto test generator (based on signatures)

---

## ❤️ Notes

This project was made with love, curiosity, and a desire to automate repetitive dev tasks.

If it helps you, I’m happy.
If you improve it, even better.
Enjoy and bless your coding journey 🙏✨
