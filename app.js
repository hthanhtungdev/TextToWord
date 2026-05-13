// ===== INIT =====
AOS.init({ once: true, easing: 'ease-out-cubic', duration: 600 });

const contentArea = document.getElementById('doc-content');
const fileNameInput = document.getElementById('file-name');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');
const formatBtn = document.getElementById('format-btn');
const actionHint = document.getElementById('action-hint');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toast-text');

// ===== GEMINI API KEYS (xoay vòng) =====
const GEMINI_API_KEYS = [
    'AIzaSyDtBFE0SpS871QL7FCfwLBNjXjkLn4g3QQ',
    'AIzaSyAuRhdMA-icS7yJtdY0x4dCLIsyW0K5j6w',
    'AIzaSyBsbHLHVajXTjMH76wPC4Y70IBtYUnbXGw',
    'AIzaSyCAKkxbmUe0th5Az2rjYcbHG3WYktgNn1A'
];
var currentKeyIndex = 0;

// ===== ENABLE/DISABLE BUTTONS =====
contentArea.addEventListener('input', function() {
    var hasContent = contentArea.value.trim().length > 0;
    downloadBtn.disabled = !hasContent;
    copyBtn.disabled = !hasContent;
    formatBtn.disabled = !hasContent;
    actionHint.textContent = hasContent ? 'Sẵn sàng xuất' : 'Nhập nội dung để bắt đầu';
});

// ===== TOAST =====
function showToast(message) {
    toastText.textContent = message;
    toast.className = 'toast show';
    setTimeout(function() { toast.className = 'toast hidden'; }, 3500);
}

// ===== GỌI GEMINI API =====
async function callGemini(prompt) {
    for (var attempt = 0; attempt < GEMINI_API_KEYS.length; attempt++) {
        var key = GEMINI_API_KEYS[currentKeyIndex];
        var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + key;
        
        try {
            var resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 8192 }
                })
            });

            if (resp.status === 429 || resp.status === 403) {
                currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
                await new Promise(function(r) { setTimeout(r, 500); });
                continue;
            }

            var data = await resp.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            }
        } catch (err) {
            currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
            continue;
        }
    }
    return null;
}

// ===== AI TẠO FILE WORD =====
formatBtn.addEventListener('click', async function() {
    var text = contentArea.value.trim();
    if (!text) return;

    formatBtn.classList.add('loading');
    formatBtn.querySelector('.btn-text').textContent = 'Đang tạo file Word...';
    formatBtn.disabled = true;

    var prompt = 'Tạo tài liệu HTML đẹp từ văn bản sau để mở bằng Microsoft Word. Yêu cầu:\n' +
        '- Trả về HTML hoàn chỉnh bắt đầu từ <html>\n' +
        '- Font: Times New Roman 13pt, line-height 1.6\n' +
        '- Tiêu đề chính: <h1> căn giữa, 18pt, in đậm\n' +
        '- Tiêu đề phụ: <h2> 14pt in đậm\n' +
        '- Danh sách: <ul><li>\n' +
        '- Bảng: <table border="1" cellpadding="8"> nếu có dữ liệu phù hợp\n' +
        '- Body margin: 2.5cm\n' +
        '- GIỮ NGUYÊN toàn bộ nội dung, KHÔNG thêm KHÔNG bớt\n' +
        '- CHỈ trả về HTML, KHÔNG giải thích\n\n' + text;

    var result = await callGemini(prompt);

    if (result) {
        // Loại bỏ markdown code block
        result = result.replace(/^```html?\n?/gm, '').replace(/```$/gm, '').trim();

        // Đảm bảo là HTML hợp lệ
        var htmlContent = result;
        if (htmlContent.indexOf('<html') === -1) {
            htmlContent = '<html><head><meta charset="utf-8"></head><body style="font-family:Times New Roman,serif;font-size:13pt;margin:2.5cm;">' + htmlContent + '</body></html>';
        }

        // Tạo file Word và tải/chia sẻ
        var blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
        var fileName = getFileName();

        if (window.innerWidth <= 768 && navigator.canShare) {
            try {
                var file = new File([blob], fileName + '.doc', { type: 'application/msword' });
                if (navigator.canShare({ files: [file] })) {
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
    } else {
        showToast('❌ AI đang bận, đợi 1 phút rồi thử lại.');
    }

    formatBtn.classList.remove('loading');
    formatBtn.querySelector('.btn-text').textContent = '✨ AI tạo file Word';
    formatBtn.disabled = contentArea.value.trim().length === 0;
});

// ===== HELPERS =====
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

// ===== TẠO HTML CHO FILE WORD (nút tải thủ công, không qua AI) =====
function buildWordHtml(text) {
    var lines = text.split('\n');
    var html = '';

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        if (line.trim() === '') { html += '<p>&nbsp;</p>'; continue; }
        if (/^###\s+/.test(line)) { html += '<h3>' + escapeHtml(line.replace(/^###\s+/, '')) + '</h3>'; continue; }
        if (/^(\d+[\.\)]?\s*)?##\s+/.test(line)) { html += '<h2>' + escapeHtml(line.replace(/^(\d+[\.\)]?\s*)?##\s+/, '')) + '</h2>'; continue; }
        if (/^#\s+/.test(line)) { html += '<h1 style="text-align:center;">' + escapeHtml(line.replace(/^#\s+/, '')) + '</h1>'; continue; }
        if (/^\s*[\*\-]\s+/.test(line)) { html += '<p style="margin-left:24px;">&#8226; ' + escapeHtml(line.replace(/^\s*[\*\-]\s+/, '')) + '</p>'; continue; }
        if (/^\s*\d+[\.\)]\s+/.test(line)) { html += '<p style="margin-left:24px;">' + escapeHtml(line) + '</p>'; continue; }
        html += '<p>' + escapeHtml(line) + '</p>';
    }

    return '<html><head><meta charset="utf-8"><style>body{font-family:Times New Roman,serif;font-size:13pt;line-height:1.6;margin:2.5cm;}h1{font-size:18pt;font-weight:bold;}h2{font-size:14pt;font-weight:bold;}h3{font-size:13pt;font-weight:bold;}</style></head><body>' + html + '</body></html>';
}

// ===== DOWNLOAD/SHARE (nút tải thủ công) =====
function downloadDocFile() {
    var text = contentArea.value.trim();
    if (!text) return;
    var blob = new Blob(['\ufeff' + buildWordHtml(text)], { type: 'application/msword' });
    downloadBlob(blob, getFileName());
}

async function shareDocFile() {
    var text = contentArea.value.trim();
    if (!text) return;
    var blob = new Blob(['\ufeff' + buildWordHtml(text)], { type: 'application/msword' });
    try {
        var file = new File([blob], getFileName() + '.doc', { type: 'application/msword' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
            showToast('✅ Đã chia sẻ file Word!');
        } else { downloadDocFile(); }
    } catch (err) {
        if (err.name !== 'AbortError') downloadDocFile();
    }
}

// Events
copyBtn.addEventListener('click', function() { shareDocFile(); });
downloadBtn.addEventListener('click', function() { downloadDocFile(); });

document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (window.innerWidth > 768 && !downloadBtn.disabled) downloadDocFile();
        else if (!copyBtn.disabled) shareDocFile();
    }
});
