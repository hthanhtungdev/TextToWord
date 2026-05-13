const contentArea = document.getElementById('doc-content');
const fileNameInput = document.getElementById('file-name');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');
const actionHint = document.getElementById('action-hint');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toast-text');

// Enable/disable buttons
contentArea.addEventListener('input', function() {
    var hasContent = contentArea.value.trim().length > 0;
    downloadBtn.disabled = !hasContent;
    copyBtn.disabled = !hasContent;
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

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== TẠO NỘI DUNG HTML =====
function buildWordHtml(text) {
    var lines = text.split('\n');
    var html = '';

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        if (line.trim() === '') {
            html += '<p style="font-family:Times New Roman,serif;font-size:12pt;">&nbsp;</p>';
            continue;
        }

        if (line.indexOf('# ') === 0) {
            html += '<h1 style="font-family:Times New Roman,serif;font-size:16pt;font-weight:bold;">' + escapeHtml(line.substring(2)) + '</h1>';
            continue;
        }

        if (line.indexOf('## ') === 0) {
            html += '<h2 style="font-family:Times New Roman,serif;font-size:14pt;font-weight:bold;">' + escapeHtml(line.substring(3)) + '</h2>';
            continue;
        }

        if (/^\s*[\*\-]\s+/.test(line)) {
            html += '<p style="font-family:Times New Roman,serif;font-size:12pt;margin-left:20px;">• ' + escapeHtml(line.replace(/^\s*[\*\-]\s+/, '')) + '</p>';
            continue;
        }

        html += '<p style="font-family:Times New Roman,serif;font-size:12pt;line-height:1.5;">' + escapeHtml(line) + '</p>';
    }

    return html;
}

// Get file name
function getFileName() {
    var name = fileNameInput.value.trim();
    if (!name) name = 'document';
    // Remove invalid characters
    name = name.replace(/[\\/:*?"<>|]/g, '');
    return name;
}

// ===== COPY FILE .DOC VÀO CLIPBOARD (dạng file) =====
async function copyAsDocFile() {
    var text = contentArea.value.trim();
    if (!text) return;

    var html = buildWordHtml(text);
    var fullHtml = '<html><head><meta charset="utf-8"></head><body>' + html + '</body></html>';

    try {
        // Tạo blob file .doc
        var fileBlob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword' });
        var file = new File([fileBlob], getFileName() + '.doc', { type: 'application/msword' });

        // Thử share file (hoạt động tốt trên mobile)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file]
            });
            showToast('✅ Đã chia sẻ file Word!');
        } else {
            // Fallback: tải file về
            var url = URL.createObjectURL(fileBlob);
            var a = document.createElement('a');
            a.href = url;
            a.download = getFileName() + '.doc';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 100);
            showToast('✅ Đã tải file Word!');
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            // Fallback: tải file
            var fileBlob2 = new Blob(['\ufeff' + fullHtml], { type: 'application/msword' });
            var url2 = URL.createObjectURL(fileBlob2);
            var a2 = document.createElement('a');
            a2.href = url2;
            a2.download = getFileName() + '.doc';
            document.body.appendChild(a2);
            a2.click();
            document.body.removeChild(a2);
            setTimeout(function() { URL.revokeObjectURL(url2); }, 100);
            showToast('✅ Đã tải file Word!');
        }
    }
}

// ===== TẢI FILE (PC) =====
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

// Mobile: dùng Share API để gửi file trực tiếp
copyBtn.addEventListener('click', function() {
    copyAsDocFile();
});

// PC: tải file
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
