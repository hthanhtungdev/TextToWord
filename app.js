const contentArea = document.getElementById('doc-content');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');
const actionHint = document.getElementById('action-hint');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toast-text');

// Enable/disable buttons
contentArea.addEventListener('input', () => {
    const hasContent = contentArea.value.trim().length > 0;
    downloadBtn.disabled = !hasContent;
    copyBtn.disabled = !hasContent;
    actionHint.textContent = hasContent ? 'Sẵn sàng xuất file' : 'Nhập nội dung để bắt đầu';
});

// Show toast notification
function showToast(message) {
    toastText.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hidden');
    }, 2500);
}

// ===== COPY TO CLIPBOARD (Mobile) =====
copyBtn.addEventListener('click', async () => {
    const text = contentArea.value.trim();
    if (!text) return;

    try {
        await navigator.clipboard.writeText(text);
        showToast('✅ Đã copy thành công! Dán vào Word được rồi.');
        
        // Đổi nút thành trạng thái thành công
        copyBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span class="btn-text">Đã copy ✓</span>`;
        
        // Reset sau 2 giây
        setTimeout(() => {
            copyBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span class="btn-text">Sao chép văn bản</span>`;
        }, 2000);
    } catch (err) {
        // Fallback cho trình duyệt cũ
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('✅ Đã copy thành công! Dán vào Word được rồi.');
    }
});

// ===== DOWNLOAD DOCX (PC) =====
async function createWordDocument() {
    const text = contentArea.value;
    const lines = text.split('\n');
    const children = [];

    for (const line of lines) {
        if (line.trim() === '') {
            children.push(new docx.Paragraph({ children: [] }));
            continue;
        }

        if (line.startsWith('# ')) {
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

    const doc = new docx.Document({
        sections: [{ properties: {}, children: children }]
    });

    const blob = await docx.Packer.toBlob(doc);
    saveAs(blob, 'document.docx');
    showToast('✅ Đã tải file thành công!');
}

downloadBtn.addEventListener('click', async () => {
    try {
        downloadBtn.disabled = true;
        downloadBtn.querySelector('.btn-text').textContent = 'Đang tạo...';
        await createWordDocument();
    } catch (err) {
        console.error('Lỗi:', err);
        showToast('❌ Có lỗi xảy ra, thử lại nhé.');
    } finally {
        downloadBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span class="btn-text">Tải file .docx</span>`;
        downloadBtn.disabled = contentArea.value.trim().length === 0;
    }
});

// Ctrl+Enter shortcut
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!downloadBtn.disabled && window.innerWidth > 768) {
            downloadBtn.click();
        } else if (!copyBtn.disabled) {
            copyBtn.click();
        }
    }
});
