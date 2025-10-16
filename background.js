// background.js acts as a service worker to handle the API calls.
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'translate') {
    const { sourceContent, language, keywords, promptTemplate } = request;

    console.log('背景腳本接收到的源內容:', sourceContent);

    // ⚠️ IMPORTANT: 請將你的 Google AI Studio API 密鑰填入這裡
    const API_KEY = "AIzaSyAPcJsjqBC1Y0J72lBM6OhlcGyCxvWC7J8";

    // Google AI Studio 可用模型列表 (可依需求更換)
    const MODEL_NAME = "gemini-2.5-flash"; // 或 gemini-2.5-pro, gemini-2.0-flash 等

    try {
      if (!API_KEY) {
        throw new Error('API 密鑰為空，請在 background.js 中填入你的 API 密鑰。');
      }

      const targetLanguageMapping = {
        'zh-TW': '繁體中文 (臺灣)',
        'ja': '日語',
        'de': '德語',
        'pt-BR': '巴西葡萄牙語',
        'nl': '荷蘭語',
        'pl': '波蘭語',
        'fr': '法語',
        'es': '西班牙語',
        'it': '意大利語'
      };
      const targetLanguageName = targetLanguageMapping[language] || language;

      // 建立 prompt
      const prompt = promptTemplate
        .replace(/\$\{targetLanguageName\}/g, targetLanguageName)
        .replace(/\$\{sourceContent\}/g, sourceContent)
        .replace(/\$\{keywords\}/g, keywords);

      // API URL
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

      const payload = {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95
        }
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = `Google AI Studio API 請求失敗，狀態碼: ${response.status}`;
        if (errorData.error && errorData.error.message) {
          errorMessage += ` - ${errorData.error.message}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const translatedContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!translatedContent) {
        throw new Error('翻譯失敗，未收到有效內容。');
      }

      // 回傳給 popup.js 並儲存到 local storage
      chrome.runtime.sendMessage({
        action: 'translationComplete',
        translatedContent
      });
      await chrome.storage.local.set({ lastTranslatedContent: translatedContent });

    } catch (error) {
      console.error('翻譯過程中發生錯誤:', error);
      chrome.runtime.sendMessage({
        action: 'translationError',
        error: error.message
      });
      await chrome.storage.local.set({ lastTranslationError: error.message });
    }
  }
});