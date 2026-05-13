// ===== INIT =====
AOS.init({ once: true, easing: 'ease-out-cubic', duration: 600 });

const contentArea = document.getElementById('doc-content');
const fileNameInput = document.getElementById('file-name');
const styleSelect = document.getElementById('doc-style');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');
const formatBtn = document.getElementById('format-btn');
const actionHint = document.getElementById('action-hint');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toast-text');
const aiPopup = document.getElementById('ai-popup');
const aiYes = document.getElementById('ai-yes');
const aiNo = document.getElementById('ai-no');

// ===== GEMINI API =====
const GEMINI_API_KEY = 'AIzaSyAAZdbQyosFx3T6hbCVltw43D0NdKFA2ss';
const GEMINI_MODELS = [
    'gemini-flash-latest',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash'
];

function getGeminiUrl(model) {
    return 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + GEMINI_API_KEY;
}

// ===== WORD STYLES =====
const STYLES = {
    default: {
        font: 'Times New Roman',
        size: '12pt',
        titleSize: '16pt',
        h2Size: '14pt',
        lineHeight: '1.5',
        align: 'left'
    },
    report: {
        font: 'Times New Roman',
        size: '13pt',
        titleSize: '18pt',
        h2Size: '15pt',
        lineHeight: '1.5',
        align: 'justify'
    },
    letter: {
        font: 'Times New Roman',
        size: '12pt',
        titleSize: '14pt',
        h2Size: '13pt',
        lineHeight: '1.8',
        align: 'left'
    },
    modern: {
        font: 'Arial',
        size: '11pt',
        titleSize: '16pt',
        h2Size: '13pt',
        lineHeight: '1.4',
        align: 'left'
    }
};

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

// ===== AUTO AI KHI PASTE =====
var justPasted = false;
contentArea.addEventListener('paste', function() {
    justPasted = true;
    setTimeout(function() {
        if (justPasted && contentArea.value.trim().length > 50) {
            aiPopup.classList.remove('hidden');
        }
        justPasted = false;
    }, 300);
});

aiYes.addEventListener('click', function() {
    aiPopup.classList.add('hidden');
    formatBtn.click();
});

aiNo.addEventListener('click', function() {
    aiPopup.classList.add('hidden');
});

// ===== GỌI GEMINI API =====
async function callGemini(prompt) {
    for (var i = 0; i < GEMINI_MODELS.length; i++) {
        var url = getGeminiUrl(GEMINI_MODELS[i]);
        try {
            var response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (response.status === 429) {
                console.log('Model ' + GEMINI_MODELS[i] + ' rate limit, thử model khác...');
                await new Promise(function(r) { setTimeout(r, 1000); });
                continue;
            }

            var data = await response.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            }
        } catch (err) {
            console.error('Lỗi model ' + GEMINI_MODELS[i] + ':', err);
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

    var prompt = 'Bạn là trợ lý định dạng văn bản. Hãy sắp xếp lại đoạn văn bản sau thành dạng có cấu trúc rõ ràng để xuất ra file Word đẹp. Quy tắc:\n' +
        '- Nhận diện tiêu đề chính, đặt trên 1 dòng riêng với # ở đầu\n' +
        '- Nhận diện tiêu đề phụ, đặt trên 1 dòng riêng với ## ở đầu\n' +
        '- Nhận diện các mục liệt kê, đặt mỗi mục 1 dòng với * ở đầu\n' +
        '- Các đoạn văn bản thường thì tách riêng bằng dòng trống\n' +
        '- Giữ nguyên nội dung, KHÔNG thêm bớt ý, KHÔNG dịch, KHÔNG giải thích\n' +
        '- Chỉ trả về văn bản đã sắp xếp, không thêm gì khác\n\n' +
        'Văn bản cần sắp xếp:\n' + text;

    var result = await callGemini(prompt);

    if (result) {
        result = result.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
        contentArea.value = result;
        contentArea.dispatchEvent(new Event('input'));
        showToast('✅ Đã sắp xếp xong!');
    } else {
        showToast('❌ AI đang bận, đợi 1 phút rồi thử lại.');
    }

    // Reset button
    formatBtn.classList.remove('loading');
    formatBtn.querySelector('.btn-text').textContent = '✨ AI Sắp xếp văn bản';
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
    var style = STYLES[styleSelect.value] || STYLES.default;
    var lines = text.split('\n');
    var html = '';

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var baseStyle = 'font-family:' + style.font + ',serif;';

        if (line.trim() === '') {
            html += '<p style="' + baseStyle + 'font-size:' + style.size + ';">&nbsp;</p>';
            continue;
        }

        if (line.indexOf('# ') === 0 && line.indexOf('## ') !== 0) {
            html += '<h1 style="' + baseStyle + 'font-size:' + style.titleSize + ';font-weight:bold;text-align:center;margin-bottom:12px;">' + escapeHtml(line.substring(2)) + '</h1>';
            continue;
        }

        if (line.indexOf('## ') === 0 && line.indexOf('### ') !== 0) {
            html += '<h2 style="' + baseStyle + 'font-size:' + style.h2Size + ';font-weight:bold;margin-top:10px;">' + escapeHtml(line.substring(3)) + '</h2>';
            continue;
        }

        if (line.indexOf('### ') === 0) {
            html += '<h3 style="' + baseStyle + 'font-size:' + style.size + ';font-weight:bold;font-style:italic;">' + escapeHtml(line.substring(4)) + '</h3>';
            continue;
        }

        if (/^\s*[\*\-]\s+/.test(line)) {
            html += '<p style="' + baseStyle + 'font-size:' + style.size + ';margin-left:24px;line-height:' + style.lineHeight + ';">• ' + escapeHtml(line.replace(/^\s*[\*\-]\s+/, '')) + '</p>';
            continue;
        }

        if (/^\s*\d+[\.\)]\s+/.test(line)) {
            html += '<p style="' + baseStyle + 'font-size:' + style.size + ';margin-left:24px;line-height:' + style.lineHeight + ';">' + escapeHtml(line) + '</p>';
            continue;
        }

        html += '<p style="' + baseStyle + 'font-size:' + style.size + ';line-height:' + style.lineHeight + ';text-align:' + style.align + ';">' + escapeHtml(line) + '</p>';
    }

    // Thêm header cho style báo cáo
    var headerHtml = '';
    if (styleSelect.value === 'report') {
        headerHtml = '<div style="text-align:center;margin-bottom:24px;border-bottom:2px solid #333;padding-bottom:12px;">' +
            '<p style="font-family:Times New Roman,serif;font-size:11pt;color:#555;">BÁO CÁO / TIỂU LUẬN</p></div>';
    } else if (styleSelect.value === 'letter') {
        var today = new Date();
        var dateStr = 'Ngày ' + today.getDate() + ' tháng ' + (today.getMonth() + 1) + ' năm ' + today.getFullYear();
        headerHtml = '<p style="font-family:Times New Roman,serif;font-size:12pt;text-align:right;margin-bottom:20px;">' + dateStr + '</p>';
    }

    return '<html><head><meta charset="utf-8"></head><body style="margin:40px;">' + headerHtml + html + '</body></html>';
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
