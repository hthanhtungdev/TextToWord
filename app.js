const contentArea = document.getElementById('doc-content');
const downloadBtn = document.getElementById('download-btn');

// Enable/disable button
contentArea.addEventListener('input', () => {
    downloadBtn.disabled = contentArea.value.trim().length === 0;
});

// Create Word document
async function createWordDocument() {
    const text = contentArea.value;
    const lines = text.split('\n');
    const children = [];

    for (const line of lines) {
        // Empty line
        if (line.trim() === '') {
            children.push(new docx.Paragraph({ children: [] }));
            continue;
        }

        // Heading
        if (line.startsWith('# ')) {
            children.push(new docx.Paragraph({
                children: [new docx.TextRun({ text: line.substring(2), bold: true, size: 32, font: 'Times New Roman' })],
                heading: docx.HeadingLevel.HEADING_1,
                spacing: { before: 240, after: 120 }
            }));
            continue;
        }

        // Bullet
        if (/^\s*[\*\-]\s+/.test(line)) {
            children.push(new docx.Paragraph({
                children: [new docx.TextRun({ text: line.replace(/^\s*[\*\-]\s+/, ''), size: 24, font: 'Times New Roman' })],
                bullet: { level: 0 },
                spacing: { line: 360 }
            }));
            continue;
        }

        // Normal paragraph
        children.push(new docx.Paragraph({
            children: [new docx.TextRun({ text: line, size: 24, font: 'Times New Roman' })],
            spacing: { line: 360, before: 60, after: 60 }
        }));
    }

    const doc = new docx.Document({
        sections: [{
            properties: {},
            children: children
        }]
    });

    const blob = await docx.Packer.toBlob(doc);
    saveAs(blob, 'document.docx');
}

// Download click
downloadBtn.addEventListener('click', async () => {
    try {
        downloadBtn.disabled = true;
        const btnText = downloadBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Đang tạo...';

        await createWordDocument();
    } catch (err) {
        console.error('Lỗi tạo file:', err);
        alert('Có lỗi xảy ra: ' + err.message);
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
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !downloadBtn.disabled) {
        downloadBtn.click();
    }
});
