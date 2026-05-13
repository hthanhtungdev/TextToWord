const contentArea = document.getElementById('doc-content');
const downloadBtn = document.getElementById('download-btn');

// Enable/disable button
contentArea.addEventListener('input', () => {
    downloadBtn.disabled = contentArea.value.trim().length === 0;
});

// Create Word document
async function createWordDocument() {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;
    const text = contentArea.value;
    const lines = text.split('\n');
    const children = [];

    for (const line of lines) {
        // Empty line
        if (line.trim() === '') {
            children.push(new Paragraph({ children: [] }));
            continue;
        }

        // Heading
        if (line.startsWith('# ')) {
            children.push(new Paragraph({
                children: [new TextRun({ text: line.substring(2), bold: true, size: 32, font: 'Times New Roman' })],
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 240, after: 120 }
            }));
            continue;
        }

        // Bullet
        if (/^\s*[\*\-]\s+/.test(line)) {
            children.push(new Paragraph({
                children: [new TextRun({ text: line.replace(/^\s*[\*\-]\s+/, ''), size: 24, font: 'Times New Roman' })],
                bullet: { level: 0 },
                spacing: { line: 360 }
            }));
            continue;
        }

        // Normal paragraph
        children.push(new Paragraph({
            children: [new TextRun({ text: line, size: 24, font: 'Times New Roman' })],
            spacing: { line: 360, before: 60, after: 60 }
        }));
    }

    const doc = new Document({
        sections: [{ children }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'document.docx');
}

// Download click
downloadBtn.addEventListener('click', async () => {
    try {
        downloadBtn.disabled = true;
        downloadBtn.querySelector('span') 
            ? downloadBtn.querySelector('span').textContent = 'Đang tạo...'
            : downloadBtn.textContent = 'Đang tạo...';

        await createWordDocument();
    } catch (err) {
        console.error(err);
        alert('Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
        downloadBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Tải file .docx`;
        downloadBtn.disabled = contentArea.value.trim().length === 0;
    }
});

// Ctrl+Enter shortcut
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !downloadBtn.disabled) {
        downloadBtn.click();
    }
});
