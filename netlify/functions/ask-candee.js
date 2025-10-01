// Import thư viện để gọi API (cần thiết cho môi trường Node.js)
const fetch = require('node-fetch');

// System prompt được định nghĩa ở phía server để an toàn hơn
const systemPrompt = `Bạn là CanDee, một AI an ninh mạng thân thiện. Luôn gọi người dùng là "bạn". Giọng điệu lạc quan, khích lệ nhưng lời khuyên phải nghiêm túc, chính xác. Bạn có thể phân tích cả văn bản và hình ảnh để tìm dấu hiệu lừa đảo (phishing, malware, scams...). Hãy giải thích các mối nguy hiểm một cách đơn giản. Luôn trả lời bằng tiếng Việt.`;

exports.handler = async function (event, context) {
    // Chỉ cho phép phương thức POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // Lấy API key từ biến môi trường của Netlify
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured.' }) };
    }

    try {
        const { prompt, image } = JSON.parse(event.body);
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const parts = [{ text: prompt }];
        if (image && image.data) {
            parts.push({
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.data
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
