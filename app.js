const contentArea = document.getElementById('doc-content');
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

// ===== CHUYỂN TEXT THÀNH HTML CÓ ĐỊNH DẠNG =====
function textToFormattedHtml(text) {
    var lines = text.split('\n');
    var html = '';

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        if (line.trim() === '') {
            html += '<br>';
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
            html += '<p style="font-family:Times New Roman,serif;font-size:12pt;margin:4px 0 4px 20px;">• ' + escapeHtml(line.replace(/^\s*[\*\-]\s+/, '')) + '</p>';
            continue;
        }

        html += '<p style="font-family:Times New Roman,serif;font-size:12pt;line-height:1.5;margin:4px 0;">' + escapeHtml(line) + '</p>';
    }

    return html;
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== COPY RICH TEXT (HTML) VÀO CLIPBOARD =====
// Khi dán vào Word/Google Docs sẽ giữ định dạng
function copyRichText() {
    var text = contentArea.value.trim();
    if (!text) return;

    var html = textToFormattedHtml(text);

    // Dùng Clipboard API với HTML mime type
    if (navigator.clipboard && navigator.clipboard.write) {
        var htmlBlob = new Blob([html], { type: 'text/html' });
        var textBlob = new Blob([text], { type: 'text/plain' });
        var item = new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob
        });
        navigator.clipboard.write([item]).then(function() {
            showToast('✅ Đã copy! Dán vào Word sẽ có định dạng.');
            copyBtn.querySelector('.btn-text').textContent = 'Đã copy ✓';
            setTimeout(function() {
                copyBtn.querySelector('.btn-text').textContent = 'Copy định dạng Word';
            }, 2000);
        }).catch(function() {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

// Fallback cho trình duyệt không hỗ trợ ClipboardItem
function fallbackCopy(text) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast('✅ Đã copy! Dán vào Word nhé.');
    copyBtn.querySelector('.btn-text').textContent = 'Đã copy ✓';
    setTimeout(function() {
        copyBtn.querySelector('.btn-text').textContent = 'Copy định dạng Word';
    }, 2000);
}

// ===== NÚT COPY (Mobile) =====
copyBtn.addEventListener('click', function() {
    copyRichText();
});

// ===== NÚT DOWNLOAD (PC) =====
downloadBtn.addEventListener('click', function() {
    var text = contentArea.value.trim();
    if (!text) return;

    var html = textToFormattedHtml(text);
    var fullHtml = '<html><head><meta charset="utf-8"></head><body>' + html + '</body></html>';
    var blob = new Blob([fullHtml], { type: 'application/msword' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'document.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ Đã tải file Word!');
});

// Ctrl+Enter shortcut
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (window.innerWidth > 768 && !downloadBtn.disabled) {
            downloadBtn.click();
        } else if (!copyBtn.disabled) {
            copyBtn.click();
        }
    }
});
