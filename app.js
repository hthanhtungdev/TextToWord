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

// ===== TẠO FILE DOCX BẰNG TÍNH NĂNG NHẸ (không cần thư viện nặng) =====
function generateDocxBlob(text) {
    // Tạo file .docx đơn giản bằng HTML -> Blob
    // Microsoft Word có thể mở file HTML với đuôi .doc
    var lines = text.split('\n');
    var htmlContent = '';

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        if (line.trim() === '') {
            htmlContent += '<p>&nbsp;</p>';
            continue;
        }

        if (line.indexOf('# ') === 0) {
            htmlContent += '<h1>' + escapeHtml(line.substring(2)) + '</h1>';
            continue;
        }

        if (line.indexOf('## ') === 0) {
            htmlContent += '<h2>' + escapeHtml(line.substring(3)) + '</h2>';
            continue;
        }

        if (/^\s*[\*\-]\s+/.test(line)) {
            htmlContent += '<li>' + escapeHtml(line.replace(/^\s*[\*\-]\s+/, '')) + '</li>';
            continue;
        }

        htmlContent += '<p>' + escapeHtml(line) + '</p>';
    }

    // Wrap li tags in ul
    htmlContent = htmlContent.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

    var fullHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.5;}h1{font-size:16pt;font-weight:bold;}h2{font-size:14pt;font-weight:bold;}p{margin:6pt 0;}ul{margin:6pt 0 6pt 20pt;}</style></head><body>' + htmlContent + '</body></html>';

    var blob = new Blob([fullHtml], { type: 'application/msword' });
    return blob;
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== DOWNLOAD FILE (cả PC và Mobile) =====
function downloadFile() {
    var text = contentArea.value.trim();
    if (!text) return;

    var blob = generateDocxBlob(text);
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'document.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ Đã tải file Word thành công!');
}

// ===== NÚT COPY (Mobile) =====
copyBtn.addEventListener('click', function() {
    downloadFile();
});

// ===== NÚT DOWNLOAD (PC) =====
downloadBtn.addEventListener('click', function() {
    downloadFile();
});
