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

// ===== AI APIs =====
// Dùng Pollinations AI (miễn phí, không key, không giới hạn) làm chính
// Gemini làm backup
const GEMINI_API_KEYS = [
    'AIzaSyDtBFE0SpS871QL7FCfwLBNjXjkLn4g3QQ',
    'AIzaSyAuRhdMA-icS7yJtdY0x4dCLIsyW0K5j6w',
    'AIzaSyBsbHLHVajXTjMH76wPC4Y70IBtYUnbXGw',
    'AIzaSyCAKkxbmUe0th5Az2rjYcbHG3WYktgNn1A'
];
var currentKeyIndex = 0;

function getGeminiUrl() {
    var key = GEMINI_API_KEYS[currentKeyIndex];
    return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + key;
}

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

// ===== AUTO AI KHI PASTE (đã tắt) =====

// ===== GỌI AI API =====
// Thử Pollinations trước (miễn phí, không giới hạn), nếu lỗi thì dùng Gemini
async function callAI(prompt) {
    // 1. Thử Pollinations AI (không cần key)
    try {
        var response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: 'You are a text formatting assistant. Only return the formatted text. No explanations, no reasoning, no JSON, no markdown code blocks. Just output the restructured Vietnamese text directly.' },
                    { role: 'user', content: prompt }
                ],
                model: 'openai',
                seed: 42,
                jsonMode: false
            })
        });

        if (response.ok) {
            var text = await response.text();
            // Pollinations trả về JSON với reasoning -> bỏ qua, dùng Gemini
            if (text.startsWith('{') || text.indexOf('"reasoning"') !== -1 || text.indexOf('"role":"assistant"') !== -1) {
                console.log('Pollinations trả JSON reasoning, bỏ qua...');
                // Không dùng Pollinations, chuyển sang Gemini
            } else if (text && text.length > 10) {
                return text;
            }
        }
    } catch (err) {
        console.log('Pollinations lỗi, thử Gemini...');
    }

    // 2. Fallback: Gemini (xoay key)
    for (var attempt = 0; attempt < GEMINI_API_KEYS.length; attempt++) {
        var url = getGeminiUrl();
        try {
            var resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (resp.status === 429 || resp.status === 400 || resp.status === 403) {
                currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
                await new Promise(function(r) { setTimeout(r, 300); });
                continue;
            }

            var data = await resp.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            }
        } catch (err) {
            currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
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

    var prompt = 'Bạn là trợ lý định dạng văn bản chuyên nghiệp. Hãy sắp xếp lại đoạn văn bản sau thành dạng có cấu trúc đẹp, rõ ràng để xuất ra file Word chuyên nghiệp. Quy tắc:\n' +
        '- Nhận diện tiêu đề chính, đặt trên 1 dòng riêng với # ở đầu\n' +
        '- Nhận diện tiêu đề phụ/mục, đặt trên 1 dòng riêng với ## ở đầu\n' +
        '- Nhận diện các mục liệt kê, đặt mỗi mục 1 dòng với * ở đầu\n' +
        '- Nếu có dữ liệu dạng so sánh hoặc nhiều cột thông tin, hãy tạo bảng dùng cú pháp:\n' +
        '  [TABLE]\n' +
        '  Cột 1 | Cột 2 | Cột 3\n' +
        '  Dữ liệu 1 | Dữ liệu 2 | Dữ liệu 3\n' +
        '  [/TABLE]\n' +
        '- Đánh số thứ tự các phần lớn (1. 2. 3.)\n' +
        '- Các đoạn văn bản thường thì tách riêng bằng dòng trống\n' +
        '- Giữ nguyên nội dung, KHÔNG thêm bớt ý, KHÔNG dịch, KHÔNG giải thích thêm\n' +
        '- Chỉ trả về văn bản đã sắp xếp, không thêm gì khác\n\n' +
        'Văn bản cần sắp xếp:\n' + text;

    var result = await callAI(prompt);

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
    var lines = text.split('\n');
    var html = '';
    var inTable = false;
    var tableRows = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        // Bắt đầu bảng
        if (line.trim() === '[TABLE]') {
            inTable = true;
            tableRows = [];
            continue;
        }

        // Kết thúc bảng
        if (line.trim() === '[/TABLE]') {
            inTable = false;
            if (tableRows.length > 0) {
                html += '<table style="border-collapse:collapse;width:100%;font-family:Times New Roman,serif;font-size:12pt;margin:12px 0;">';
                for (var r = 0; r < tableRows.length; r++) {
                    var cells = tableRows[r].split('|');
                    html += '<tr>';
                    for (var c = 0; c < cells.length; c++) {
                        var tag = r === 0 ? 'th' : 'td';
                        var bgStyle = r === 0 ? 'background:#f0f0f0;font-weight:bold;' : '';
                        html += '<' + tag + ' style="border:1px solid #333;padding:8px;' + bgStyle + '">' + escapeHtml(cells[c].trim()) + '</' + tag + '>';
                    }
                    html += '</tr>';
                }
                html += '</table>';
            }
            continue;
        }

        // Trong bảng
        if (inTable) {
            if (line.trim()) tableRows.push(line);
            continue;
        }

        // Dòng trống
        if (line.trim() === '') {
            html += '<p style="font-family:Times New Roman,serif;font-size:12pt;">&nbsp;</p>';
            continue;
        }

        // Heading 1
        if (line.indexOf('# ') === 0 && line.indexOf('## ') !== 0) {
            html += '<h1 style="font-family:Times New Roman,serif;font-size:16pt;font-weight:bold;text-align:center;">' + escapeHtml(line.substring(2)) + '</h1>';
            continue;
        }

        // Heading 2
        if (line.indexOf('## ') === 0 && line.indexOf('### ') !== 0) {
            html += '<h2 style="font-family:Times New Roman,serif;font-size:14pt;font-weight:bold;">' + escapeHtml(line.substring(3)) + '</h2>';
            continue;
        }

        // Heading 3
        if (line.indexOf('### ') === 0) {
            html += '<h3 style="font-family:Times New Roman,serif;font-size:13pt;font-weight:bold;">' + escapeHtml(line.substring(4)) + '</h3>';
            continue;
        }

        // Bullet
        if (/^\s*[\*\-]\s+/.test(line)) {
            html += '<p style="font-family:Times New Roman,serif;font-size:12pt;margin-left:24px;line-height:1.5;">&#8226; ' + escapeHtml(line.replace(/^\s*[\*\-]\s+/, '')) + '</p>';
            continue;
        }

        // Numbered list
        if (/^\s*\d+[\.\)]\s+/.test(line)) {
            html += '<p style="font-family:Times New Roman,serif;font-size:12pt;margin-left:24px;line-height:1.5;">' + escapeHtml(line) + '</p>';
            continue;
        }

        // Normal paragraph
        html += '<p style="font-family:Times New Roman,serif;font-size:12pt;line-height:1.5;">' + escapeHtml(line) + '</p>';
    }

    return '<html><head><meta charset="utf-8"></head><body style="margin:40px;">' + html + '</body></html>';
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
