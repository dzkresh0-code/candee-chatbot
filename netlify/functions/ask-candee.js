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
