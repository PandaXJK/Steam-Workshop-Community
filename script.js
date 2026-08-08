let works = [];
let currentPreviewWork = null;

const uploaderNameInput = document.getElementById('uploaderName');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const workList = document.getElementById('workList');
const workCount = document.getElementById('workCount');
const clearBtn = document.getElementById('clearBtn');
const previewModal = document.getElementById('previewModal');
const previewTitle = document.getElementById('previewTitle');
const previewContent = document.getElementById('previewContent');
const previewUploader = document.getElementById('previewUploader');
const downloadBtn = document.getElementById('downloadBtn');

function init() {
    loadWorks();
    bindEvents();
}

// 从数据库加载
function loadWorks() {
    fetch('/api/works')
        .then(res => res.json())
        .then(data => {
            works = data;
            renderList();
        });
}

function renderList() {
    workCount.textContent = works.length;
    
    if (works.length === 0) {
        workList.innerHTML = '<div class="empty-tip">暂无作品，快来上传第一个吧～</div>';
        return;
    }
    workList.innerHTML = works.map((work, index) => `
        <div class="work-item">
            <div class="work-info">
                <h3>${escapeHtml(work.filename)}</h3>
                <span class="meta">上传者：${escapeHtml(work.uploader)} · ${work.size} 字节</span>
            </div>
            <div class="work-actions">
                <button class="action-btn" onclick="previewWork(${index})">预览</button>
                <button class="action-btn" onclick="downloadWork(${index})">下载</button>
                <button class="action-btn delete" onclick="deleteWork(${index})">删除</button>
            </div>
        </div>
    `).join('');
}

// 上传
uploadBtn.addEventListener('click', () => {
    const uploader = uploaderNameInput.value.trim();
    const file = fileInput.files[0];
    if (!uploader) {
        alert('请填写上传者昵称');
        return;
    }
    if (!file) {
        alert('请选择 TXT 文件');
        return;
    }
    if (!file.name.toLowerCase().endsWith('.txt')) {
        alert('只支持 TXT 格式文件');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uploader: uploader,
                filename: file.name,
                content: content
            })
        })
        .then(res => res.json())
        .then(() => {
            loadWorks();
            uploaderNameInput.value = '';
            fileInput.value = '';
            alert('上传成功！');
        });
    };
    reader.readAsText(file);
});

function previewWork(index) {
    currentPreviewWork = works[index];
    previewTitle.textContent = currentPreviewWork.filename;
    previewContent.textContent = currentPreviewWork.content;
    previewUploader.textContent = `上传者：${currentPreviewWork.uploader}`;
    previewModal.classList.add('show');
}

function closePreview() {
    previewModal.classList.remove('show');
    currentPreviewWork = null;
}

previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) {
        closePreview();
    }
});

function downloadWork(index) {
    const work = works[index];
    downloadTxtFile(work.filename, work.content);
}

downloadBtn.addEventListener('click', () => {
    if (currentPreviewWork) {
        downloadTxtFile(currentPreviewWork.filename, currentPreviewWork.content);
    }
});

function downloadTxtFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function deleteWork(index) {
    if (confirm('确定要删除这个作品吗？')) {
        const workId = works[index].id;
        fetch(`/api/delete/${workId}`, { method: 'DELETE' })
            .then(() => loadWorks());
    }
}

clearBtn.addEventListener('click', () => {
    if (works.length === 0) return;
    if (confirm('确定要清空所有作品吗？此操作不可恢复。')) {
        fetch('/api/clear', { method: 'DELETE' })
            .then(() => loadWorks());
    }
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function bindEvents() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePreview();
        }
    });
}

init();