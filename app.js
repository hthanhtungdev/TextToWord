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
    }, 2500);
}

// ===== COPY (Mobile) =====
copyBtn.addEventListener('click', function() {
    var text = contentArea.value.trim();
    if (!text) return;

    // Cách copy hoạt động trên mọi mobile
    var textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '1px';
    textArea.style.height = '1px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        showToast('Đã copy thành công! Dán vào Word nhé.');
        copyBtn.querySelector('.btn-text').textContent = 'Đã copy ✓';
        setTimeout(function() {
            copyBtn.querySelector('.btn-text').textContent = 'Sao chép văn bản';
        }, 2000);
    } catch (err) {
        showToast('Không copy được, hãy chọn thủ công.');
    }

    document.body.removeChild(textArea);
});

// ===== DOWNLOAD (PC) - load thư viện khi cần =====
downloadBtn.addEventListener('click', function() {
    downloadBtn.disabled = true;
    downloadBtn.querySelector('.btn-text').textContent = 'Đang tạo...';

    // Load docx + FileSaver nếu chưa có
    if (typeof docx === 'undefined') {
        var s1 = document.createElement('script');
        s1.src = 'https://unpkg.com/docx@8.2.0/build/index.umd.js';
        s1.onload = function() {
            var s2 = document.createElement('script');
            s2.src = 'https://unpkg.com/file-saver@2.0.5/dist/FileSaver.min.js';
            s2.onload = function() { generateDocx(); };
            s2.onerror = function() { handleDownloadError(); };
            document.body.appendChild(s2);
        };
        s1.onerror = function() { handleDownloadError(); };
        document.body.appendChild(s1);
    } else {
        generateDocx();
    }
});

function handleDownloadError() {
    showToast('Lỗi tải thư viện, thử lại nhé.');
    downloadBtn.querySelector('.btn-text').textContent = 'Tải file .docx';
    downloadBtn.disabled = contentArea.value.trim().length === 0;
}

function generateDocx() {
    try {
        var text = contentArea.value;
        var lines = text.split('\n');
        var children = [];

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];

            if (line.trim() === '') {
                children.push(new docx.Paragraph({ children: [] }));
                continue;
            }

            if (line.indexOf('# ') === 0) {
                children.push(new docx.Paragraph({
                    children: [new docx.TextRun({ text: line.substring(2), bold: true, size: 32, font: 'Times New Roman' })],
                    heading: docx.HeadingLevel.HEADING_1,
                    spacing: { before: 240, after: 120 }
                }));
                continue;
            }

            if (/^\s*[\*\-]\s+/.test(line)) {
                children.push(new docx.Paragraph({
                    children: [new docx.TextRun({ text: line.replace(/^\s*[\*\-]\s+/, ''), size: 24, font: 'Times New Roman' })],
                    bullet: { level: 0 },
                    spacing: { line: 360 }
                }));
                continue;
            }

            children.push(new docx.Paragraph({
                children: [new docx.TextRun({ text: line, size: 24, font: 'Times New Roman' })],
                spacing: { line: 360, before: 60, after: 60 }
            }));
        }

        var doc = new docx.Document({
            sections: [{ properties: {}, children: children }]
        });

        docx.Packer.toBlob(doc).then(function(blob) {
            saveAs(blob, 'document.docx');
            showToast('Đã tải file thành công!');
            resetDownloadBtn();
        });
    } catch (err) {
        console.error(err);
        showToast('Có lỗi, thử lại nhé.');
        resetDownloadBtn();
    }
}

function resetDownloadBtn() {
    downloadBtn.querySelector('.btn-text').textContent = 'Tải file .docx';
    downloadBtn.disabled = contentArea.value.trim().length === 0;
}
