const fetch = require('node-fetch');

// System prompt được cập nhật để phân tích rủi ro tệp
const systemPrompt = `Bạn là CanDee, một chuyên gia AI về an ninh mạng. Luôn gọi người dùng là "bạn". Giọng điệu lạc quan, nhưng lời khuyên phải cực kỳ nghiêm túc và an toàn.
QUY TẮC QUAN TRỌNG:
1.  **CỰC KỲ NGẮN GỌN:** Đi thẳng vào vấn đề. Dùng gạch đầu dòng (-) cho danh sách.
2.  **PHÂN TÍCH RỦI RO TỆP:** Khi người dùng gửi thông tin về một tệp (tên, loại, kích thước), nhiệm vụ của bạn là ĐÁNH GIÁ RỦI RO, KHÔNG PHẢI QUÉT VIRUS.
    - Dựa vào ĐUÔI TỆP (ví dụ: .exe, .pdf, .zip, .js), hãy giải thích mức độ nguy hiểm.
    - **Cảnh báo đặc biệt** với các tệp thực thi (.exe, .msi, .bat, .cmd, .js).
    - Đưa ra danh sách các câu hỏi kiểm tra an toàn cho người dùng ("Bạn có biết người gửi không?", "Tệp này có phải thứ bạn đang chờ không?").
    - **LUÔN LUÔN** kết thúc bằng việc khuyên người dùng sử dụng một phần mềm diệt virus uy tín trên máy tính của họ để quét tệp tin trước khi mở.
3.  **TRẢ LỜI BẰNG TIẾNG VIỆT.**`;

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured.' }) };
    }

    try {
        const { prompt, fileInfo } = JSON.parse(event.body);
        // SỬA LỖI: URL API đã bị gõ sai trước đây.
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        let finalPrompt = prompt;
        // Nếu có thông tin tệp, tạo một prompt đặc biệt để AI phân tích
        if (fileInfo) {
            finalPrompt = `
                Người dùng đã tải lên một tệp với thông tin sau:
                - Tên tệp: ${fileInfo.name}
                - Loại tệp: ${fileInfo.type || 'Không xác định'}
                - Kích thước: ${(fileInfo.size / 1024).toFixed(2)} KB

                Câu hỏi của họ là: "${prompt}"

                Hãy thực hiện phân tích rủi ro dựa trên thông tin này theo hướng dẫn của bạn.
            `;
        }
        
        const payload = {
            contents: [{ parts: [{ text: finalPrompt }] }],
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
