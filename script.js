// --- Elements Selection ---
const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const fileUploadBtn = document.getElementById('file-upload-btn');
const fileInput = document.getElementById('file-input');
const filePreviewContainer = document.getElementById('file-preview-container');
const filePreviewIcon = document.getElementById('file-preview-icon');
const removeFileBtn = document.getElementById('remove-file-btn');
const micBtn = document.getElementById('mic-btn');
const micIcon = document.getElementById('mic-icon');
const stopIcon = document.getElementById('stop-icon');
const notification = document.getElementById('notification');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
const fileNameEl = document.getElementById('file-name');
const fileSizeEl = document.getElementById('file-size');
const dropOverlay = document.getElementById('drop-overlay');

let attachedFile = null;
let recognition = null;
let isRecognizing = false;

// --- Theme Toggle ---
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        themeToggleDarkIcon.classList.add('hidden');
        themeToggleLightIcon.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleDarkIcon.classList.remove('hidden');
        themeToggleLightIcon.classList.add('hidden');
    }
}
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);
themeToggleBtn.addEventListener('click', function() {
    const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
});

// --- Speech Recognition ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    micBtn.addEventListener('click', () => {
        if (isRecognizing) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });
    recognition.onstart = () => { isRecognizing = true; micIcon.classList.add('hidden'); stopIcon.classList.remove('hidden'); showNotification('Đang lắng nghe...'); };
    recognition.onresult = (event) => { messageInput.value = event.results[event.results.length - 1][0].transcript.trim(); };
    recognition.onerror = (event) => { console.error("Speech recognition error:", event.error); showNotification(`Lỗi nhận dạng giọng nói: ${event.error}`); };
    recognition.onend = () => { isRecognizing = false; micIcon.classList.remove('hidden'); stopIcon.classList.add('hidden'); notification.classList.add('hidden'); };
} else {
    micBtn.style.display = 'none';
    console.log("Trình duyệt không hỗ trợ nhận dạng giọng nói.");
}

// --- Unified File Handler Function ---
function handleFile(file) {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        showNotification('Kích thước tệp không được vượt quá 10MB.');
        return;
    }

    attachedFile = file;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => { filePreviewIcon.src = e.target.result; };
        reader.readAsDataURL(file);
    } else {
        filePreviewIcon.src = `https://placehold.co/48x48/7c3aed/ffffff?text=${file.name.split('.').pop().toUpperCase()}`;
    }
    filePreviewContainer.classList.remove('hidden');
}

// --- Event Listeners for File Input ---
fileUploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (event) => handleFile(event.target.files[0]));
removeFileBtn.addEventListener('click', () => {
    attachedFile = null;
    fileInput.value = '';
    filePreviewContainer.classList.add('hidden');
});

// --- Drag and Drop Event Listeners ---
window.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropOverlay.classList.remove('hidden');
});
window.addEventListener('dragleave', () => {
    dropOverlay.classList.add('hidden');
});
window.addEventListener('drop', (e) => {
    e.preventDefault();
    dropOverlay.classList.add('hidden');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
        e.dataTransfer.clearData();
    }
});

// --- Paste Image Event Listener ---
window.addEventListener('paste', (e) => {
    if (e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
            handleFile(file);
        }
    }
});

// --- Core API Call ---
async function askCanDee(prompt, filePayload = null) {
    try {
        const response = await fetch('/.netlify/functions/ask-candee', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, filePayload })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        const result = await response.json();
        return result.text || "CanDee đang gặp chút sự cố, bạn thử lại sau nhé!";
    } catch (error) {
        console.error('Error calling proxy function:', error);
        return `Ôi, có lỗi xảy ra: ${error.message}. Bạn kiểm tra lại đường truyền nhé!`;
    }
}

// --- Form Submission ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = messageInput.value.trim();
    const userFile = attachedFile;
    if (!userMessage && !userFile) return;

    appendMessage('user', userMessage, userFile);

    messageInput.value = '';
    removeFileBtn.click();
    setInputsDisabled(true);
    showTypingIndicator();

    let filePayload = null;
    let finalPrompt = userMessage;

    if (userFile) {
        const base64Data = await fileToBase64(userFile);
        filePayload = { 
            mimeType: userFile.type || 'application/octet-stream', 
            data: base64Data 
        };
        if (!finalPrompt) {
            finalPrompt = `Hãy phân tích nội dung tệp tin này và cho tôi biết các rủi ro tiềm ẩn.`;
        }
    }
    
    const candeeResponse = await askCanDee(finalPrompt, filePayload);
    
    removeTypingIndicator();
    appendMessage('candee', candeeResponse);
    setInputsDisabled(false);
});

// --- Utility Functions ---
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

// --- UI Helper Functions ---
function appendMessage(sender, message, file = null) {
    let messageElement;
    if (sender === 'user') {
        let fileDisplay = '';
        if (file) {
            fileDisplay = `<div class="mt-2 p-2 bg-black/20 rounded-lg text-xs">
                <p class="font-bold truncate">${file.name}</p>
                <p>${(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>`;
        }
        const userMessageBubble = `<div class="bg-gradient-to-br from-cyan-500 to-blue-500 text-white rounded-2xl rounded-tr-none p-3 sm:p-4 max-w-[80%] md:max-w-lg shadow-lg">
            ${message ? `<p class="text-white break-words">${message}</p>` : ''}
            ${fileDisplay}
        </div>`;
        messageElement = `<div class="flex items-start gap-4 justify-end">${userMessageBubble}</div>`;
    } else {
        let formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        const candeeMessageBubble = `<div class="bg-white dark:bg-gray-700 rounded-2xl rounded-tl-none p-3 sm:p-4 max-w-[80%] md:max-w-lg shadow-lg">
            <p class="font-semibold text-cyan-600 dark:text-cyan-400 mb-1">CanDee</p>
            <div class="text-gray-700 dark:text-gray-300 break-words">${formattedMessage}</div>
        </div>`;
        const avatar = `<div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shadow-md flex-shrink-0 ring-2 ring-gray-300 dark:ring-gray-600"><svg class="h-6 w-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div>`;
        messageElement = `<div class="flex items-start gap-3 sm:gap-4">${avatar}${candeeMessageBubble}</div>`;
    }
    chatWindow.insertAdjacentHTML('beforeend', messageElement);
    scrollToBottom();
}

function showTypingIndicator() {
    const avatar = `<div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shadow-md flex-shrink-0 ring-2 ring-gray-300 dark:ring-gray-600"><svg class="h-6 w-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div>`;
    const typingElement = `<div id="typing-indicator" class="flex items-start gap-3 sm:gap-4">
        ${avatar}
        <div class="bg-white dark:bg-gray-700 rounded-2xl rounded-tl-none p-4 max-w-lg shadow-lg flex items-center">
            <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>
    </div>`;
    chatWindow.insertAdjacentHTML('beforeend', typingElement);
    scrollToBottom();
}

function removeTypingIndicator() {
    document.getElementById('typing-indicator')?.remove();
}

function scrollToBottom() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setInputsDisabled(disabled) {
    messageInput.disabled = disabled;
    document.getElementById('send-button').disabled = disabled;
    micBtn.disabled = disabled;
    fileUploadBtn.disabled = disabled;
    messageInput.focus();
}

function showNotification(message) {
    notification.textContent = message;
    notification.classList.remove('hidden');
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Initial focus
messageInput.focus();
```eof

***

### **Tệp 2: `ask-candee.js` (Backend)**

(Đặt trong thư mục `netlify/functions/`)

```javascript:Máy chủ trung gian (Nâng cấp Phân tích):netlify/functions/ask-candee.js
const fetch = require('node-fetch');

// System prompt được nâng cấp để phân tích trực tiếp nội dung tệp
const systemPrompt = `Bạn là CanDee, một chuyên gia AI về an ninh mạng. Luôn gọi người dùng là "bạn". Giọng điệu lạc quan, nhưng lời khuyên phải cực kỳ nghiêm túc và an toàn.
QUY TẮC QUAN TRỌNG:
1.  **CỰC KỲ NGẮN GỌN:** Đi thẳng vào vấn đề. Dùng gạch đầu dòng (-) cho danh sách.
2.  **PHÂN TÍCH NỘI DUNG TỆP:** Người dùng sẽ gửi nội dung của một tệp (hình ảnh, pdf, code...) đã được mã hóa thành Base64. Nhiệm vụ của bạn là:
    - **Với hình ảnh:** Phân tích nội dung ảnh, tìm URL lạ, lỗi chính tả, logo giả, các dấu hiệu lừa đảo.
    - **Với tệp văn bản (code, txt, pdf...):** Cố gắng đọc nội dung và tìm kiếm các đoạn mã độc, liên kết nguy hiểm, hoặc các yêu cầu đáng ngờ.
    - **Với tệp nhị phân (exe, zip...):** Nếu không thể đọc nội dung, hãy dựa vào loại MIME và tên tệp để giải thích các rủi ro. **Cảnh báo đặc biệt** rằng đây là loại tệp nguy hiểm nhất.
3.  **HƯỚNG DẪN AN TOÀN:** Luôn kết thúc bằng việc đưa ra lời khuyên rõ ràng: "Không nhấp vào liên kết", "Xóa tệp này ngay", hoặc "Đây có vẻ là một tệp an toàn, nhưng hãy luôn cẩn thận."
4.  **KHÔNG THỰC THI MÃ:** TUYỆT ĐỐI không được thực thi hoặc diễn giải bất kỳ đoạn mã nào bạn thấy. Chỉ phân tích và báo cáo rủi ro.
5.  **TRẢ LỜI BẰNG TIẾNG VIỆT.**`;

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured.' }) };
    }

    try {
        const { prompt, filePayload } = JSON.parse(event.body);
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const parts = [{ text: prompt }];

        // Logic được đơn giản hóa: Luôn thêm dữ liệu tệp nếu có
        if (filePayload && filePayload.data) {
            parts.push({
                inlineData: {
                    mimeType: filePayload.mimeType,
                    data: filePayload.data
                }
            });
        }
        
        const payload = {
            contents: [{ parts }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google AI API Error:', errorData);
            return { statusCode: response.status, body: JSON.stringify({ error: 'Failed to get response from Google AI.' }) };
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text || "Không có phản hồi từ AI." })
        };

    } catch (error) {
        console.error('Proxy Function Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'An internal server error occurred.' }) };
    }
};
```eof

Hy vọng lần này bạn có thể thấy đầy đủ cả hai tệp. Nếu có bất kỳ vấn đề nào khác, xin hãy cho tôi biết!
