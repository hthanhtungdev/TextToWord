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

// ===== AI APIs =====
// Dùng Gemini với nhiều keys xoay vòng
const GEMINI_API_KEYS = [
    'AIzaSyDtBFE0SpS871QL7FCfwLBNjXjkLn4g3QQ',
    'AIzaSyAuRhdMA-icS7yJtdY0x4dCLIsyW0K5j6w',
    'AIzaSyBsbHLHVajXTjMH76wPC4Y70IBtYUnbXGw',
    'AIzaSyCAKkxbmUe0th5Az2rjYcbHG3WYktgNn1A'
];
var currentKeyIndex = 0;

function getGeminiUrl() {
    var key = GEMINI_API_KEYS[currentKeyIndex];
    return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key;
}

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
    setTimeout(function() { toast.className = 'toast hidden'; }, 3000);
}

// ===== AUTO AI KHI PASTE (đã tắt) =====

// ===== GỌI AI API =====
async function callAI(prompt) {
    // Chỉ dùng Gemini, xoay key
    for (var attempt = 0; attempt < GEMINI_API_KEYS.length; attempt++) {
        var url = getGeminiUrl();
        try {
            var resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        maxOutputTokens: 8192
                    }
                })
            });

            if (resp.status === 429 || resp.status === 400 || resp.status === 403) {
                currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
                await new Promise(function(r) { setTimeout(r, 300); });
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

// ===== AI SẮP XẾP VĂN BẢN =====
formatBtn.addEventListener('click', async function() {
    var text = contentArea.value.trim();
    if (!text) return;

    // Loading state
    formatBtn.classList.add('loading');
    formatBtn.querySelector('.btn-text').textContent = 'Đang sắp xếp...';
    formatBtn.disabled = true;

    var prompt = 'Bạn là trợ lý tạo tài liệu Word chuyên nghiệp. Hãy nhận đoạn văn bản dưới đây và trả về MỘT đoạn HTML hoàn chỉnh để mở bằng Microsoft Word đẹp nhất có thể.\n\n' +
        'YÊU CẦU ĐỊNH DẠNG HTML:\n' +
        '- Dùng <h1> căn giữa, in đậm, cỡ 18pt cho tiêu đề chính\n' +
        '- Dùng <h2> in đậm, cỡ 14pt cho tiêu đề phụ\n' +
        '- Dùng <h3> in đậm, cỡ 13pt cho tiêu đề nhỏ\n' +
        '- Dùng <ul><li> cho danh sách\n' +
        '- Dùng <table border="1"> cho dữ liệu dạng bảng\n' +
        '- Dùng <p> cho đoạn văn, line-height 1.6\n' +
        '- Font: Times New Roman, cỡ 13pt\n' +
        '- Margin body: 2.5cm\n' +
        '- GIỮ NGUYÊN TOÀN BỘ nội dung, không thêm không bớt\n' +
        '- CHỈ trả về HTML, bắt đầu từ <html>, KHÔNG giải thích gì\n\n' +
        'VĂN BẢN:\n' + text;

    var result = await callAI(prompt);

    if (result) {
        result = result.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
        
        // Nếu AI trả về HTML trực tiếp -> dùng luôn làm file Word
        if (result.indexOf('<') !== -1 && (result.indexOf('<h1') !== -1 || result.indexOf('<p') !== -1 || result.indexOf('<html') !== -1)) {
            // AI trả HTML -> lưu trực tiếp thành file Word
            var htmlContent = result;
            if (htmlContent.indexOf('<html') === -1) {
                htmlContent = '<html><head><meta charset="utf-8"></head><body style="margin:40px;">' + htmlContent + '</body></html>';
            }
            var blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
            var fileName = getFileName();
            
            // Mobile: share, PC: download
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
            // AI trả text thuần -> hiển thị trong textarea
            if (result.length < text.length * 0.4) {
                showToast('⚠️ AI trả về thiếu, giữ nguyên văn bản.');
            } else {
                contentArea.value = result;
                contentArea.dispatchEvent(new Event('input'));
                showToast('✅ Đã sắp xếp xong! Bấm tải file.');
            }
        }
        contentArea.dispatchEvent(new Event('input'));
        showToast('✅ Đã sắp xếp xong!');
    } else {
        showToast('❌ AI đang bận, đợi 1 phút rồi thử lại.');
    }

    // Reset button
    formatBtn.classList.remove('loading');
    formatBtn.querySelector('.btn-text').textContent = '✨ AI tạo file Word';
    formatBtn.disabled = contentArea.value.trim().length === 0;
});

// ===== HELPER =====
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

// ===== TẠO HTML CHO FILE WORD =====
function buildWordHtml(text) {
    var lines = text.split('\n');
    var html = '';
    var inTable = false;
    var tableRows = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        // Bắt đầu bảng
        if (line.trim() === '[TABLE]') {
            inTable = true;
            tableRows = [];
            continue;
        }

        // Kết thúc bảng
        if (line.trim() === '[/TABLE]') {
            inTable = false;
            if (tableRows.length > 0) {
                html += '<table style="border-collapse:collapse;width:100%;font-family:Times New Roman,serif;font-size:12pt;margin:12px 0;">';
                for (var r = 0; r < tableRows.length; r++) {
                    var cells = tableRows[r].split('|');
                    html += '<tr>';
                    for (var c = 0; c < cells.length; c++) {
                        var tag = r === 0 ? 'th' : 'td';
                        var bgStyle = r === 0 ? 'background:#f0f0f0;font-weight:bold;' : '';
                        html += '<' + tag + ' style="border:1px solid #333;padding:8px;' + bgStyle + '">' + escapeHtml(cells[c].trim()) + '</' + tag + '>';
                    }
                    html += '</tr>';
                }
                html += '</table>';
            }
            continue;
        }

        // Trong bảng
        if (inTable) {
            if (line.trim()) tableRows.push(line);
            continue;
        }

        // Dòng trống
        if (line.trim() === '') {
            html += '<p style="font-family:Times New Roman,serif;font-size:12pt;">&nbsp;</p>';
            continue;
        }

        // Heading 1
        if (/^#\s+/.test(line) && !/^##/.test(line)) {
            html += '<h1 style="font-family:Times New Roman,serif;font-size:16pt;font-weight:bold;text-align:center;">' + escapeHtml(line.replace(/^#\s+/, '')) + '</h1>';
            continue;
        }

        // Heading 2 (bao gồm cả "1. ## Heading" hoặc "## Heading")
        if (/^((\d+[\.\)]?\s*)?##\s+|##\s+)/.test(line)) {
            var h2Text = line.replace(/^(\d+[\.\)]?\s*)?##\s+/, '').trim();
            html += '<h2 style="font-family:Times New Roman,serif;font-size:14pt;font-weight:bold;">' + escapeHtml(h2Text) + '</h2>';
            continue;
        }

        // Heading 3 (bao gồm "### Heading")
        if (/^###\s+/.test(line)) {
            html += '<h3 style="font-family:Times New Roman,serif;font-size:13pt;font-weight:bold;">' + escapeHtml(line.replace(/^###\s+/, '')) + '</h3>';
            continue;
        }

        // Bullet
        if (/^\s*[\*\-]\s+/.test(line)) {
            html += '<p style="font-family:Times New Roman,serif;font-size:12pt;margin-left:24px;line-height:1.5;">&#8226; ' + escapeHtml(line.replace(/^\s*[\*\-]\s+/, '')) + '</p>';
            continue;
        }

        // Numbered list
        if (/^\s*\d+[\.\)]\s+/.test(line)) {
            html += '<p style="font-family:Times New Roman,serif;font-size:12pt;margin-left:24px;line-height:1.5;">' + escapeHtml(line) + '</p>';
            continue;
        }

        // Normal paragraph
        html += '<p style="font-family:Times New Roman,serif;font-size:12pt;line-height:1.5;">' + escapeHtml(line) + '</p>';
    }

    return '<html><head><meta charset="utf-8"></head><body style="margin:40px;">' + html + '</body></html>';
}

// ===== DOWNLOAD BLOB HELPER =====
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

// ===== SHARE FILE (Mobile) =====
async function copyAsDocFile() {
    var text = contentArea.value.trim();
    if (!text) return;

    var fullHtml = buildWordHtml(text);

    try {
        var fileBlob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword' });
        var file = new File([fileBlob], getFileName() + '.doc', { type: 'application/msword' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
            showToast('✅ Đã chia sẻ file Word!');
        } else {
            downloadDocFile();
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            downloadDocFile();
        }
    }
}

// ===== DOWNLOAD FILE (PC) =====
function downloadDocFile() {
    var text = contentArea.value.trim();
    if (!text) return;

    var fullHtml = buildWordHtml(text);
    var blob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = getFileName() + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 100);
    showToast('✅ Đã tải file Word!');
}

// Events
copyBtn.addEventListener('click', function() { copyAsDocFile(); });
downloadBtn.addEventListener('click', function() { downloadDocFile(); });

// Ctrl+Enter
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (window.innerWidth > 768 && !downloadBtn.disabled) {
            downloadDocFile();
        } else if (!copyBtn.disabled) {
            copyAsDocFile();
        }
    }
});
