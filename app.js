const contentArea = document.getElementById('doc-content');
const fileNameInput = document.getElementById('file-name');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');
const formatBtn = document.getElementById('format-btn');
const actionHint = document.getElementById('action-hint');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toast-text');

// ===== GEMINI API KEY =====
// Dùng Gemini free tier
const GEMINI_API_KEY = 'AIzaSyA8MKKhJEHSBMZHaFnJC7gEMSxWBfJOqMk';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY;

// Enable/disable buttons
contentArea.addEventListener('input', function() {
    var hasContent = contentArea.value.trim().length > 0;
    downloadBtn.disabled = !hasContent;
    copyBtn.disabled = !hasContent;
    formatBtn.disabled = !hasContent;
    actionHint.textContent = hasContent ? 'Sẵn sàng xuất' : 'Nhập nội dung để bắt đầu';
});

// Show toast
function showToast(message) {
    toastText.textContent = message;
    toast.className = 'toast show';
    setTimeout(function() {
        toast.className = 'toast hidden';
    }, 3000);
}

// ===== AI SẮP XẾP VĂN BẢN =====
formatBtn.addEventListener('click', async function() {
    var text = contentArea.value.trim();
    if (!text) return;

    formatBtn.classList.add('loading');
    formatBtn.querySelector('.btn-text').textContent = '⏳ Đang sắp xếp...';
    formatBtn.disabled = true;

    try {
        var prompt = 'Bạn là trợ lý định dạng văn bản. Hãy sắp xếp lại đoạn văn bản sau thành dạng có cấu trúc rõ ràng để xuất ra file Word đẹp. Quy tắc:\n' +
            '- Nhận diện tiêu đề chính, đặt trên 1 dòng riêng với # ở đầu\n' +
            '- Nhận diện tiêu đề phụ, đặt trên 1 dòng riêng với ## ở đầu\n' +
            '- Nhận diện các mục liệt kê, đặt mỗi mục 1 dòng với * ở đầu\n' +
            '- Các đoạn văn bản thường thì tách riêng bằng dòng trống\n' +
            '- Giữ nguyên nội dung, KHÔNG thêm bớt ý, KHÔNG dịch, KHÔNG giải thích\n' +
            '- Chỉ trả về văn bản đã sắp xếp, không thêm gì khác\n\n' +
            'Văn bản cần sắp xếp:\n' + text;

        var response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        var data = await response.json();

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            var result = data.candidates[0].content.parts[0].text;
            // Loại bỏ markdown code block nếu AI wrap lại
            result = result.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim();
            contentArea.value = result;
            contentArea.dispatchEvent(new Event('input'));
            showToast('✅ Đã sắp xếp xong!');
        } else {
            showToast('❌ AI không phản hồi, thử lại nhé.');
        }
    } catch (err) {
        console.error(err);
        showToast('❌ Lỗi kết nối AI, kiểm tra mạng nhé.');
    }

    formatBtn.classList.remove('loading');
    formatBtn.querySelector('.btn-text').textContent = '✨ AI Sắp xếp văn bản';
    formatBtn.disabled = contentArea.value.trim().length === 0;
});

// ===== HELPER FUNCTIONS =====
function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getFileName() {
    var name = fileNameInput.value.trim();
    if (!name) name = 'document';
    name = name.replace(/[\\/:*?"<>|]/g, '');
    return name;
}

// ===== TẠO HTML CHO FILE WORD =====
function buildWordHtml(text) {
    var lines = text.split('\n');
    var html = '';

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        if (line.trim() === '') {
            html += '<p style="font-family:Times New Roman,serif;font-size:12pt;">&nbsp;</p>';
            continue;
        }

        if (line.indexOf('# ') === 0 && line.indexOf('## ') !== 0) {
            html += '<h1 style="font-family:Times New Roman,serif;font-size:16pt;font-weight:bold;">' + escapeHtml(line.substring(2)) + '</h1>';
            continue;
        }

        if (line.indexOf('## ') === 0 && line.indexOf('### ') !== 0) {
            html += '<h2 style="font-family:Times New Roman,serif;font-size:14pt;font-weight:bold;">' + escapeHtml(line.substring(3)) + '</h2>';
            continue;
        }

        if (line.indexOf('### ') === 0) {
            html += '<h3 style="font-family:Times New Roman,serif;font-size:13pt;font-weight:bold;">' + escapeHtml(line.substring(4)) + '</h3>';
            continue;
        }

        if (/^\s*[\*\-]\s+/.test(line)) {
            html += '<p style="font-family:Times New Roman,serif;font-size:12pt;margin-left:20px;">• ' + escapeHtml(line.replace(/^\s*[\*\-]\s+/, '')) + '</p>';
            continue;
        }

        if (/^\s*\d+[\.\)]\s+/.test(line)) {
            html += '<p style="font-family:Times New Roman,serif;font-size:12pt;margin-left:20px;">' + escapeHtml(line) + '</p>';
            continue;
        }

        html += '<p style="font-family:Times New Roman,serif;font-size:12pt;line-height:1.5;">' + escapeHtml(line) + '</p>';
    }

    return '<html><head><meta charset="utf-8"></head><body>' + html + '</body></html>';
}

// ===== SHARE FILE (Mobile) =====
async function copyAsDocFile() {
    var text = contentArea.value.trim();
    if (!text) return;

    var html = buildWordHtml(text);
    var fullHtml = '<html><head><meta charset="utf-8"></head><body>' + html + '</body></html>';

    try {
        var fileBlob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword' });
        var file = new File([fileBlob], getFileName() + '.doc', { type: 'application/msword' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file]
            });
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

    var html = buildWordHtml(text);
    var fullHtml = '<html><head><meta charset="utf-8"></head><body>' + html + '</body></html>';
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

// Mobile: share
copyBtn.addEventListener('click', function() {
    copyAsDocFile();
});

// PC: download
downloadBtn.addEventListener('click', function() {
    downloadDocFile();
});

// Ctrl+Enter shortcut
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (window.innerWidth > 768 && !downloadBtn.disabled) {
            downloadDocFile();
        } else if (!copyBtn.disabled) {
            copyAsDocFile();
        }
    }
});
