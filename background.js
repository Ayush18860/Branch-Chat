
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

const MODEL = "gemini-3.1-flash-lite";

const API_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "chatStream") return;

  port.onMessage.addListener((message) => {
    if (message.type !== "CHAT_COMPLETION_STREAM") return;
    streamCompletion(port, message.apiKey, message.messages);
  });
});


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
      buffer = lines.pop(); 

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
         
        }
      }
    }

    port.postMessage({ type: "done" });
  } catch (error) {
    port.postMessage({ type: "error", error: error.message });
  }
}
