// popup.js handles the UI and sends messages to the background script.
document.addEventListener('DOMContentLoaded', () => {
  const languageSelect = document.getElementById('language-select');
  const keywordInput = document.getElementById('keyword-input');
  const promptInput = document.getElementById('prompt-input');
  const translateButton = document.getElementById('translate-button');
  const messageBox = document.getElementById('message-box');
  const sourceSelectorInput = document.getElementById('source-selector-input');
  const translationResultContainer = document.getElementById('translation-result-container');
  const translationResultTextarea = document.getElementById('translation-result');
  const copyButton = document.getElementById('copy-button');

  // Default prompt template
  const showMessage = (message, isError = false) => {
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    messageBox.className = isError 
      ? 'p-2 text-sm text-center text-red-700 bg-red-200 rounded-md' 
      : 'p-2 text-sm text-center text-gray-600 bg-gray-200 rounded-md';
    setTimeout(() => {
      messageBox.style.display = 'none';
    }, 5000); // Hide message after 5 seconds
  };

  // Save user preferences to local storage
  const saveSettings = async () => {
    const language = languageSelect.value;
    const keywords = keywordInput.value;
    const sourceSelector = sourceSelectorInput.value;
    const prompt = promptInput.value;
    await chrome.storage.local.set({ language, keywords, sourceSelector, [`prompt-${language}`]: prompt });
  };

  // Load user preferences from local storage
  const loadSettings = async () => {
    const { language, keywords, sourceSelector } = await chrome.storage.local.get(['language', 'keywords', 'sourceSelector']);
    console.log('載入本地儲存設定:', { language, keywords, sourceSelector });
    
    // Set values from local storage or use defaults
    languageSelect.value = language || 'zh-TW';
    keywordInput.value = keywords || '';
    sourceSelectorInput.value = sourceSelector || '.ProseMirror';

    // Load custom prompt for the selected language
    const currentLanguage = languageSelect.value;
    const storedPromptResult = await chrome.storage.local.get([`prompt-${currentLanguage}`]);
    const storedPrompt = storedPromptResult[`prompt-${currentLanguage}`];
    console.log(`載入語言 ${currentLanguage} 的提示詞:`, storedPrompt);

    // Use stored prompt if it exists, otherwise use the appropriate default template
    if (storedPrompt) {
      promptInput.value = storedPrompt;
    } else {
      let defaultPrompt;
      switch (currentLanguage) {
        case 'zh-TW':
          defaultPrompt = `你是一位專業的繁體中文（臺灣）在地化翻譯專家，精通英文，專門為科技媒體和論壇撰寫內容。我會提供一段英文內容給你翻譯成繁體中文（臺灣）。

1. 翻譯時，請務必使用符合台灣 macOS 使用者習慣的詞彙，例如：「應用程式」、「垃圾桶」、「終端機」、「設定檔」、「磁碟空間」、「強制結束」、「指令列」等。
2. 翻譯的語氣請偏向口語化、自然，像是 Mobile01 或 Dcard 科技版上的文章風格，讓讀者感覺親切易懂，避免生硬的書面語或翻譯腔。
3. 保持原有內容的架構、重點和資訊完整性，但可以根據中文的表達習慣，自由調整句子和插入的關鍵詞的流暢度、語序和字詞。
4. 若有不自然的術語或偏向中國大陸的用法（如：內存、軟件），請改為台灣常見的說法（如：記憶體、軟體）。
5. 請確保將我提供的關鍵詞**自然、流暢地融入**翻譯結果中，讓讀者感覺不到是刻意插入的。請在不影響語意流暢的前提下，盡可能地使用這些關鍵詞，並根據台灣用法正確調整其大小寫和格式。

請嚴格遵守以下格式規範：

1. **保留原文所有 Markdown 和 MDX 格式**（包括標題、列表、連結、圖片、粗體、斜體、自定義組件如:summary、:toc 等），
   並**保留與原文完全相同的空行、換行符、縮進和段落結構**。
2. 不要翻譯 HTML 標籤本身，只翻譯標籤內的文字內容。

以下是需要翻譯的內容：
\`\`\`
\${sourceContent}
\`\`\`

以下是需要自然融入譯文的關鍵詞：
\`\`\`
\${keywords}
\`\`\`
`;
          break;
        default:
          // For other languages, provide a generic prompt template
          defaultPrompt = `You are a professional translator. I will provide you with content to translate.

1. Translate the source content into the target language.
2. Maintain the original Markdown and MDX formatting, including headings, lists, links, images, bold/italic text, and custom components like :summary and :toc.
3. Preserve all original line breaks, indentation, and paragraph structure.
4. Translate all text within HTML tags, but do not translate the tags themselves.
5. Naturally incorporate the provided keywords into the translated text, ensuring a smooth and readable result.

Here is the content to be translated:
\`\`\`
\${sourceContent}
\`\`\`

Here are the keywords to be included naturally:
\`\`\`
\${keywords}
\`\`\`
`;
          break;
      }
      promptInput.value = defaultPrompt;
    }
  };

  const checkStoredResults = async () => {
    const { lastTranslatedContent, lastTranslationError } = await chrome.storage.local.get(['lastTranslatedContent', 'lastTranslationError']);
    
    if (lastTranslatedContent) {
      translationResultTextarea.value = lastTranslatedContent;
      translationResultContainer.classList.remove('hidden');
      showMessage('偵測到上次的翻譯結果！', false);
      // 清除本地儲存，避免下次打開時重複顯示
      await chrome.storage.local.remove('lastTranslatedContent');
    } else if (lastTranslationError) {
      showMessage(`偵測到上次的翻譯錯誤: ${lastTranslationError}`, true);
      // 清除本地儲存
      await chrome.storage.local.remove('lastTranslationError');
    }
  };

  languageSelect.addEventListener('change', () => {
    loadSettings();
  });
  languageSelect.addEventListener('change', saveSettings);
  keywordInput.addEventListener('input', saveSettings);
  sourceSelectorInput.addEventListener('input', saveSettings);
  promptInput.addEventListener('input', saveSettings);
  
  // 頁面載入時先載入設定並檢查是否有上次的結果
  loadSettings();
  checkStoredResults();


  // Handle the click event of the copy button
  copyButton.addEventListener('click', () => {
    translationResultTextarea.select();
    document.execCommand('copy');
    showMessage('翻譯結果已複製到剪貼板！', false);
  });
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'translationComplete') {
      translationResultTextarea.value = request.translatedContent;
      translationResultContainer.classList.remove('hidden');
      showMessage('翻譯完成！', false);
      translateButton.disabled = false;
      translateButton.textContent = '翻譯';
    } else if (request.action === 'translationError') {
      console.error('翻譯過程中發生錯誤:', request.error);
      showMessage(`發生錯誤: ${request.error}`, true);
      translateButton.disabled = false;
      translateButton.textContent = '翻譯';
    }
  });


  // Handle the click event of the translate button
  translateButton.addEventListener('click', async () => {
    translateButton.disabled = true;
    translateButton.textContent = '翻譯中...';
    showMessage('正在獲取內容...', false);
    translationResultContainer.classList.add('hidden');

    // 在開始新翻譯前清除舊的結果
    await chrome.storage.local.remove(['lastTranslatedContent', 'lastTranslationError']);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    try {
      const sourceSelector = sourceSelectorInput.value;
      
      // Step 1: Inject script to get the source content from the active tab
      const sourceContentResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        // 修正內容擷取邏輯，以更好地保留空行和排版
        func: (selector) => {
          let extractedText = '';
          const selection = window.getSelection();

          if (selection && selection.toString().trim() !== '') {
            // 如果有選取文字，直接使用
            extractedText = selection.toString();
          } else if (selector) {
            // 如果沒有選取文字，則根據選擇器尋找元素
            const editor = document.querySelector(selector);
            if (editor) {
              // 檢查元素是否為 textarea 或輸入框，直接使用其值
              if (editor.value !== undefined) {
                extractedText = editor.value;
              } else {
                // 如果是可編輯的 div，則取得 innerHTML
                let htmlContent = editor.innerHTML;

                // 針對常見區塊元素，在結尾處加上兩個換行符以模擬段落空行
                const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote'];
                blockTags.forEach(tag => {
                  // 替換標籤的結尾，確保段落間有空行
                  htmlContent = htmlContent.replace(new RegExp(`</${tag}>`, 'g'), '\n\n');
                });

                // 將 <br> 替換成單一換行
                htmlContent = htmlContent.replace(/<br\s*\/?>/g, '\n');
                
                // 創建一個臨時元素來獲取純文本，同時保留我們添加的換行符
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlContent;
                extractedText = tempDiv.textContent || tempDiv.innerText || '';
              }
            }
          }

          // 清理多餘的空白和換行，確保開頭和結尾沒有多餘的空行
          extractedText = extractedText.replace(/\n{3,}/g, '\n\n').trim();

          console.log('已擷取並處理的內容:', extractedText);
          return extractedText;
        },
        args: [sourceSelector]
      });

      const sourceContent = sourceContentResult[0]?.result;
      
      if (!sourceContent || sourceContent.trim() === '') {
        throw new Error(`未找到翻譯內容。請嘗試在頁面上選取文字，或檢查您的選擇器是否正確。`);
      }
      
      console.log('即將發送的源內容:', sourceContent);

      showMessage('內容獲取成功，正在發送翻譯請求...', false);
      
      const language = languageSelect.value;
      const keywords = keywordInput.value;
      const promptTemplate = promptInput.value;

      // Send the translation request to the background script
      chrome.runtime.sendMessage({
        action: 'translate',
        sourceContent,
        language,
        keywords,
        promptTemplate
      });

    } catch (error) {
      console.error('翻譯過程中發生錯誤:', error);
      showMessage(`發生錯誤: ${error.message}`, true);
      translateButton.disabled = false;
      translateButton.textContent = '翻譯';
    }
  });
});