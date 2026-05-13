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

// ===== AI TẠO FILE WORD (mở Gemini chat) =====
formatBtn.addEventListener('click', function() {
    var text = contentArea.value.trim();
    if (!text) return;

    var prompt = 'Hãy sắp xếp đoạn văn bản sau thành tài liệu Word đẹp, chuyên nghiệp với heading, bullet, bảng nếu cần. Giữ nguyên toàn bộ nội dung, chỉ định dạng lại. Xuất file Word cho tôi:\n\n' + text;

    // Mở Gemini chat với prompt
    var geminiUrl = 'https://gemini.google.com/app?q=' + encodeURIComponent(prompt);
    window.open(geminiUrl, '_blank');

    showToast('🔗 Đã mở Gemini! Nhận file Word từ đó.');
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

// ===== TẠO HTML CHO FILE WORD (tải thủ công) =====
function buildWordHtml(text) {
    var lines = text.split('\n');
    var html = '';

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        if (line.trim() === '') {
            html += '<p style="font-family:Times New Roman,serif;font-size:13pt;">&nbsp;</p>';
            continue;
        }

        // Heading 3
        if (/^###\s+/.test(line)) {
            html += '<h3 style="font-family:Times New Roman,serif;font-size:13pt;font-weight:bold;">' + escapeHtml(line.replace(/^###\s+/, '')) + '</h3>';
            continue;
        }

        // Heading 2
        if (/^(\d+[\.\)]?\s*)?##\s+/.test(line)) {
            var h2Text = line.replace(/^(\d+[\.\)]?\s*)?##\s+/, '').trim();
            html += '<h2 style="font-family:Times New Roman,serif;font-size:14pt;font-weight:bold;">' + escapeHtml(h2Text) + '</h2>';
            continue;
        }

        // Heading 1
        if (/^#\s+/.test(line)) {
            html += '<h1 style="font-family:Times New Roman,serif;font-size:16pt;font-weight:bold;text-align:center;">' + escapeHtml(line.replace(/^#\s+/, '')) + '</h1>';
            continue;
        }

        // Bullet
        if (/^\s*[\*\-]\s+/.test(line)) {
            html += '<p style="font-family:Times New Roman,serif;font-size:13pt;margin-left:24px;line-height:1.6;">&#8226; ' + escapeHtml(line.replace(/^\s*[\*\-]\s+/, '')) + '</p>';
            continue;
        }

        // Numbered
        if (/^\s*\d+[\.\)]\s+/.test(line)) {
            html += '<p style="font-family:Times New Roman,serif;font-size:13pt;margin-left:24px;line-height:1.6;">' + escapeHtml(line) + '</p>';
            continue;
        }

        // Normal
        html += '<p style="font-family:Times New Roman,serif;font-size:13pt;line-height:1.6;">' + escapeHtml(line) + '</p>';
    }

    return '<html><head><meta charset="utf-8"></head><body style="margin:2.5cm;">' + html + '</body></html>';
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
