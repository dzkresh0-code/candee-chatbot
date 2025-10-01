const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const imageUploadBtn = document.getElementById('image-upload-btn');
const imageInput = document.getElementById('image-input');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');
const micBtn = document.getElementById('mic-btn');

let attachedFile = null;

// --- Speech Recognition ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    micBtn.addEventListener('click', () => {
        recognition.start();
        micBtn.classList.add('mic-listening');
    });
    recognition.onresult = (event) => {
        messageInput.value = event.results[event.results.length - 1][0].transcript.trim();
    };
    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        micBtn.classList.remove('mic-listening');
    };
    recognition.onend = () => micBtn.classList.remove('mic-listening');
} else {
    micBtn.style.display = 'none';
}

// --- Image Handling ---
imageUploadBtn.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        attachedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});
removeImageBtn.addEventListener('click', () => {
    attachedFile = null;
    imageInput.value = '';
    imagePreviewContainer.classList.add('hidden');
});

// --- Core Functions ---
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

async function askCanDee(prompt, image = null) {
    try {
        const response = await fetch('/.netlify/functions/ask-candee', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, image })
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

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = messageInput.value.trim();
    const userImageFile = attachedFile;
    if (!userMessage && !userImageFile) return;

    const userImageForDisplay = userImageFile ? URL.createObjectURL(userImageFile) : null;
    appendMessage('user', userMessage, userImageForDisplay);

    messageInput.value = '';
    removeImageBtn.click();
    setInputsDisabled(true);
    showTypingIndicator();

    let imagePayload = null;
    if (userImageFile) {
        const base64Data = await fileToBase64(userImageFile);
        imagePayload = { mimeType: userImageFile.type, data: base64Data };
    }
    
    const candeeResponse = await askCanDee(userMessage || "Hãy phân tích hình ảnh này.", imagePayload);
    
    removeTypingIndicator();
    appendMessage('candee', candeeResponse);
    setInputsDisabled(false);
});

// --- UI Helper Functions ---
function appendMessage(sender, message, imageSrc = null) {
    let messageElement;
    if (sender === 'user') {
        messageElement = `<div class="flex items-start gap-4 justify-end"><div class="bg-indigo-500 rounded-lg rounded-tr-none p-4 max-w-lg shadow-lg">${imageSrc ? `<img src="${imageSrc}" class="rounded-md mb-2 max-w-xs">` : ''}${message ? `<p class="text-white">${message}</p>` : ''}</div></div>`;
    } else {
        let formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        messageElement = `<div class="flex items-start gap-4"><div class="plana-avatar w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shadow-md flex-shrink-0 ring-2 ring-gray-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div><div class="bg-gray-700 rounded-lg rounded-tl-none p-4 max-w-lg shadow-lg"><p class="font-semibold text-indigo-400 mb-1">CanDee</p><div class="text-gray-300">${formattedMessage}</div></div></div>`;
    }
    chatWindow.insertAdjacentHTML('beforeend', messageElement);
    scrollToBottom();
}

function showTypingIndicator() {
    const typingElement = `<div id="typing-indicator" class="flex items-start gap-4"><div class="plana-avatar w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shadow-md flex-shrink-0 ring-2 ring-gray-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div><div class="bg-gray-700 rounded-lg rounded-tl-none p-4 max-w-lg shadow-lg flex items-center"><div class="typing-indicator"><span></span><span></span><span></span></div></div></div>`;
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
    imageUploadBtn.disabled = disabled;
}

messageInput.focus();
