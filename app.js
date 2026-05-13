// ===== INIT =====
AOS.init({ once: true, easing: 'ease-out-cubic', duration: 600 });

const contentArea = document.getElementById('doc-content');
const fileNameInput = document.getElementById('file-name');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');
const actionHint = document.getElementById('action-hint');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toast-text');

// ===== GROQ API =====
const GROQ_API_KEY = ['gsk_cD9YcE10twnGmnfMbE7M', 'WGdyb3FYEv8n3Az7aaFA', 'gaYJVhVLQgXL'].join('');
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ===== ENABLE/DISABLE BUTTONS =====
contentArea.addEventListener('input', function() {
    var hasContent = contentArea.value.trim().length > 0;
    downloadBtn.disabled = !hasContent;
    copyBtn.disabled = !hasContent;
    actionHint.textContent = hasContent ? 'Sẵn sàng xuất' : 'Nhập nội dung để bắt đầu';
});

// ===== TOAST =====
function showToast(message) {
    toastText.textContent = message;
    toast.className = 'toast show';
    setTimeout(function() { toast.className = 'toast hidden'; }, 3500);
}

// ===== GỌI GROQ API =====
async function callAI(text) {
    var prompt = 'Tạo tài liệu HTML chuyên nghiệp từ văn bản sau, định dạng GIỐNG HỆT mẫu sau:\n\n' +
        'MẪU ĐỊNH DẠNG CẦN TUÂN THEO:\n' +
        '- Tiêu đề chính: <h1> cỡ 24pt, in đậm, font Arial\n' +
        '- Phần lớn (I, II, III): <h2> cỡ 18pt, in đậm\n' +
        '- Mục con (1, 2, 3): <h3> cỡ 14pt, in đậm\n' +
        '- Có đoạn mở đầu giới thiệu ngắn cho mỗi phần\n' +
        '- Bullet list dùng <ul><li> với label in đậm: <strong>Label:</strong> nội dung\n' +
        '- Sub-list lồng nhau: <ul><li> bên trong <li> cha, dùng circle style\n' +
        '- Số liệu so sánh dùng <table> có header nền xám, border, padding 10px\n' +
        '- Font: Times New Roman 13pt, line-height 1.8\n' +
        '- Body margin: 2.5cm\n\n' +
        'YÊU CẦU:\n' +
        '- Trả về HTML hoàn chỉnh từ <html> đến </html>\n' +
        '- Có <style> trong <head> cho tất cả CSS\n' +
        '- GIỮ NGUYÊN toàn bộ nội dung, không thêm không bớt\n' +
        '- CHỈ trả HTML, không giải thích\n\n' +
        'Văn bản:\n' + text;

    try {
        var resp = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + GROQ_API_KEY
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Bạn là trợ lý tạo tài liệu Word. Chỉ trả về HTML thuần túy, không giải thích.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 8192,
                temperature: 0.3
            })
        });

        if (!resp.ok) return null;

        var data = await resp.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
            var result = data.choices[0].message.content;
            result = result.replace(/^```html?\n?/gm, '').replace(/\n?```$/gm, '').trim();
            return result;
        }
    } catch (err) {
        console.error('AI error:', err);
    }
    return null;
}

// ===== TẠO FILE WORD (AI format + tải/chia sẻ) =====
async function createAndExport(mode) {
    var text = contentArea.value.trim();
    if (!text) return;

    // Hiện loading trên nút
    var btn = mode === 'share' ? copyBtn : downloadBtn;
    var originalText = btn.querySelector('.btn-text').textContent;
    btn.querySelector('.btn-text').textContent = 'Đang tạo...';
    btn.disabled = true;

    // Gọi AI format
    var htmlContent = await callAI(text);

    if (!htmlContent || htmlContent.indexOf('<') === -1) {
        // AI lỗi -> dùng format đơn giản
        htmlContent = buildSimpleHtml(text);
        showToast('⚠️ AI bận, dùng format cơ bản.');
    }

    // Đảm bảo HTML hợp lệ
    if (htmlContent.indexOf('<html') === -1) {
        htmlContent = '<html><head><meta charset="utf-8"></head><body style="font-family:Times New Roman,serif;font-size:13pt;line-height:1.8;margin:2.5cm;">' + htmlContent + '</body></html>';
    }

    // Tạo blob
    var blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    var fileName = getFileName();

    if (mode === 'share') {
        try {
            var file = new File([blob], fileName + '.doc', { type: 'application/msword' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file] });
                showToast('✅ Đã chia sẻ file Word!');
            } else {
                downloadBlob(blob, fileName);
            }
        } catch(e) {
            if (e.name !== 'AbortError') downloadBlob(blob, fileName);
        }
    } else {
        downloadBlob(blob, fileName);
    }

    // Reset nút
    btn.querySelector('.btn-text').textContent = originalText;
    btn.disabled = contentArea.value.trim().length === 0;
}

// ===== HELPERS =====
function getFileName() {
    var name = fileNameInput.value.trim();
    if (!name) name = 'document';
    return name.replace(/[\\/:*?"<>|]/g, '');
}

function downloadBlob(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 100);
    showToast('✅ Đã tải file Word!');
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format đơn giản (fallback khi AI lỗi)
function buildSimpleHtml(text) {
    var lines = text.split('\n');
    var html = '';
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.trim() === '') { html += '<p>&nbsp;</p>'; continue; }
        if (/^###\s+/.test(line)) { html += '<h3>' + escapeHtml(line.replace(/^###\s+/, '')) + '</h3>'; continue; }
        if (/^(\d+[\.\)]?\s*)?##\s+/.test(line)) { html += '<h2>' + escapeHtml(line.replace(/^(\d+[\.\)]?\s*)?##\s+/, '')) + '</h2>'; continue; }
        if (/^#\s+/.test(line)) { html += '<h1>' + escapeHtml(line.replace(/^#\s+/, '')) + '</h1>'; continue; }
        if (/^\s*[\*\-]\s+/.test(line)) { html += '<li>' + escapeHtml(line.replace(/^\s*[\*\-]\s+/, '')) + '</li>'; continue; }
        html += '<p>' + escapeHtml(line) + '</p>';
    }
    return '<html><head><meta charset="utf-8"><style>body{font-family:Times New Roman,serif;font-size:13pt;line-height:1.8;margin:2.5cm;}h1{font-size:24pt;font-weight:bold;}h2{font-size:18pt;font-weight:bold;}h3{font-size:14pt;font-weight:bold;}li{margin-left:24px;margin-bottom:6px;}</style></head><body>' + html + '</body></html>';
}

// ===== EVENTS =====
downloadBtn.addEventListener('click', function() { createAndExport('download'); });
copyBtn.addEventListener('click', function() { createAndExport('share'); });

document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (window.innerWidth > 768 && !downloadBtn.disabled) createAndExport('download');
        else if (!copyBtn.disabled) createAndExport('share');
    }
});
