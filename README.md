# Branch Chat (Gemini) 🌿

Branch Chat is a Chrome extension that lets you select part of a ChatGPT conversation and open a focused Gemini side chat about that excerpt. The original conversation stays visible while the branch continues in a movable panel.

## Features

- **Branch from selected text** — Select any text in a ChatGPT conversation and click **Branch 🌿** to start a separate Gemini conversation from that point.
- **Floating branch icon** — Use the floating 🌿 button for quick access while browsing ChatGPT.
- **Independent branch chats** — Explore a different question or idea without changing the original ChatGPT conversation.
- **Saved chat history** — Branch conversations are stored locally in Chrome and remain available when you return.
- **Rename branches** — Give each saved branch a custom name to keep conversations organized.
- **Voice input** — Use your microphone to speak messages instead of typing them.
- **Markdown and math support** — Responses can display formatted text, tables, code blocks, and KaTeX mathematical expressions.
- **Personal Gemini API key** — Connect the extension using your own Gemini API key from Google AI Studio.
- **Local storage** — Your API key and branch history are stored in your current Chrome profile.
- **Context menu fallback** — Right-click selected text and choose **Branch 🌿** if the selection button does not appear.

## Install

1. Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/api-keys). Sign in, click **Create API key**, and copy the key.
2. On this GitHub page, click **Code → Download ZIP**.
3. Find the downloaded ZIP file and **extract it**. Keep the extracted folder somewhere permanent, such as Documents. Do not select the ZIP file in Chrome.
4. Open Chrome and go to `chrome://extensions`.
5. Turn on **Developer mode** (top right), then click **Load unpacked**.
6. Select the **extracted folder containing `manifest.json`**. If extraction created two nested folders, open the outer folder and select the inner one containing `manifest.json`.
7. Close all Chrome windows, reopen Chrome, and open ChatGPT.
8. Select text in a ChatGPT conversation and click **Branch 🌿**. In the branch panel, click **⚙︎**, paste your Gemini API key, and save it. If **Branch 🌿** does not appear, refresh the ChatGPT tab.

Keep your extracted folder on your computer—Chrome loads the extension from there. Never share your API key or upload it to GitHub.

Do not share or commit your key. It is saved in `chrome.storage.local` for the current Chrome profile.

## Data handling

When you send a branch message, the extension sends the selected excerpt, available recent ChatGPT context, branch messages, and an inherited image when available to Google's Gemini API over HTTPS. The API key and saved branches are kept in Chrome local extension storage. Read [PRIVACY.md](PRIVACY.md).

## Project structure

```text
background.js       Gemini API streaming
content-script.js   Selection UI, side panel and saved branches
manifest.json       Manifest V3 configuration
icons/              Extension icons
lib/katex/          Bundled math renderer
```

## Development

After changing source files, reload the extension at `chrome://extensions` and refresh ChatGPT. Check JavaScript syntax with:

```powershell
node --check background.js
node --check content-script.js
```

## Limitations

ChatGPT page updates may require selector or positioning changes. Gemini availability and quotas depend on each user's Google AI Studio project. Branches stay on the local Chrome profile. This project is not affiliated with or endorsed by OpenAI or Google.

## License

The extension source is under the [MIT License](LICENSE). Bundled KaTeX files retain their own MIT license; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
