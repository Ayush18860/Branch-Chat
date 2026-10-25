// A browser-owned fallback works even when ChatGPT changes its selection UI.
const BRANCH_MENU_ID = 'branch-chat-selected-text';
function installBranchMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: BRANCH_MENU_ID,
      title: 'Branch 🌿',
      contexts: ['selection'],
      documentUrlPatterns: ['https://chatgpt.com/*', 'https://chat.openai.com/*']
    });
  });
}
chrome.runtime.onInstalled.addListener(installBranchMenu);
chrome.runtime.onStartup.addListener(installBranchMenu);
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== BRANCH_MENU_ID || !tab?.id || !info.selectionText?.trim()) return;
  chrome.tabs.sendMessage(tab.id, {
    type: 'BRANCH_CHAT_SELECTION',
    selectionText: info.selectionText
  }, { frameId: info.frameId ?? 0 }).catch((error) => {
    console.warn('[Branch Chat] Refresh this ChatGPT tab after loading the extension.', error.message);
  });
});

// Background service worker — Gemini API variant.
//
// content-script.js is IDENTICAL between this and the Groq version —
// it only knows "send {type, apiKey, messages}, get back
// {type: chunk/done/error}". This file is the only place that
// actually speaks Gemini's specific request/response format, which
// is meaningfully different from Groq's OpenAI-compatible one:
// different message shape (contents/parts instead of messages/
// content), different auth (API key as a URL param, not a Bearer
// header), and a different streaming response format.

const MODEL = "gemini-3.1-flash-lite";
// NOTE: Gemini model availability has been volatile — several other
// model IDs (gemini-2.0-flash, gemini-2.5-flash, gemini-2.5-flash-lite)
// stopped working for this project earlier in its development. This
// was the last CONFIRMED WORKING model at that time. If this stops
// working, check https://ai.google.dev/gemini-api/docs/models for
// the current recommended Flash/Flash-Lite model.
const API_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "chatStream") return;

  port.onMessage.addListener((message) => {
    if (message.type !== "CHAT_COMPLETION_STREAM") return;
    streamCompletion(port, message.apiKey, message.messages);
  });
});

// Converts our internal {role, content} message format into Gemini's
// {contents: [{role, parts}]} shape. `content` can be a plain string,
// or (for messages with an attached image) an array like
// [{type: "text", text}, {type: "image_url", image_url: {url}}] —
// the same shape used for the Groq/OpenAI-compatible version, so
// content-script.js doesn't need to know which provider is active.
function convertMessagesToGeminiFormat(messages) {
  const systemMessage = messages.find((m) => m.role === "system");
  const turns = messages.filter((m) => m.role !== "system");

  const contents = turns.map((m) => {
    const role = m.role === "assistant" ? "model" : "user";
    let parts;

    if (typeof m.content === "string") {
      parts = [{ text: m.content }];
    } else if (Array.isArray(m.content)) {
      parts = m.content.map((part) => {
        if (part.type === "text") return { text: part.text };
        if (part.type === "image_url") {
          // Our stored image is a data URL: "data:image/png;base64,XXXX".
          // Gemini wants the mime type and raw base64 separated out.
          const match = part.image_url.url.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) {
            return { inline_data: { mime_type: match[1], data: match[2] } };
          }
          return { text: "[image could not be processed]" };
        }
        return { text: "" };
      });
    } else {
      parts = [{ text: String(m.content) }];
    }

    return { role, parts };
  });

  const body = { contents };
  if (systemMessage) {
    body.systemInstruction = { parts: [{ text: systemMessage.content }] };
  }
  return body;
}

async function streamCompletion(port, apiKey, messages) {
  if (!apiKey) {
    port.postMessage({
      type: "error",
      error: "No API key set. Click the ⚙ button in the Subchat panel to add your free Gemini key.",
    });
    return;
  }

  try {
    const body = convertMessagesToGeminiFormat(messages);
    // alt=sse gives us Server-Sent Events for streaming, matching
    // the incremental "chunk" delivery content-script.js expects.
    const url = `${API_ENDPOINT_BASE}/${MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const msg =
        errorBody?.error?.message || `Request failed with status ${response.status}`;
      port.postMessage({ type: "error", error: msg });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep any incomplete trailing line for next round

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const data = trimmed.slice(5).trim();
        if (!data) continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (delta) port.postMessage({ type: "chunk", content: delta });
        } catch {
          // Incomplete/partial JSON mid-stream — safe to skip, the
          // rest arrives in a following chunk.
        }
      }
    }

    port.postMessage({ type: "done" });
  } catch (error) {
    port.postMessage({ type: "error", error: error.message });
  }
}
