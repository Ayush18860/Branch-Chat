# Branch Chat (Gemini) 🌿

Branch Chat is a Chrome extension that lets you select part of a ChatGPT conversation and open a focused Gemini side chat about that excerpt. The original conversation stays visible while the branch continues in a movable panel.

## Features

- Select conversation text and click **Branch 🌿**.
- Continue in a movable, resizable Gemini side panel.
- Reopen, rename, and delete locally saved branches.
- Use the floating leaf or right-click selection menu as alternate entry points.
- Render Markdown, tables, and KaTeX math.
- Use your own Gemini API key; no key is included in this repository.

## Install

1. Download this repository as a ZIP and extract it.
2. Open `chrome://extensions`.
3. Enable **Developer mode** and click **Load unpacked**.
4. Select the folder containing `manifest.json`.
5. Refresh ChatGPT.
6. Select text, click **Branch 🌿**, then use **?** to enter a key from [Google AI Studio](https://aistudio.google.com/api-keys).

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
