const STORAGE_KEY = 'workshop_files';
let works = [];
let currentPreviewWork = null;

// DOM 元素
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

// 初始化
function init() {
    loadWorks();
    renderList();
    bindEvents();
}

// 从 localStorage 加载数据
function loadWorks() {
    const data = localStorage.getItem(STORAGE_KEY);
    works = data ? JSON.parse(data) : [];
}

// 保存到 localStorage
function saveWorks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
}

// 渲染列表
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

// 上传处理
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
        const work = {
            uploader: uploader,
            filename: file.name,
            content: content,
            size: content.length,
            uploadTime: Date.now()
        };

        works.unshift(work);
        saveWorks();
        renderList();

        // 重置表单
        uploaderNameInput.value = '';
        fileInput.value = '';
        
        alert('上传成功！');
    };
    reader.readAsText(file);
});

// 预览
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

// 点击遮罩关闭
previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) {
        closePreview();
    }
});

// 下载
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

// 删除
function deleteWork(index) {
    if (confirm('确定要删除这个作品吗？')) {
        works.splice(index, 1);
        saveWorks();
        renderList();
    }
}

// 清空全部
clearBtn.addEventListener('click', () => {
    if (works.length === 0) return;
    if (confirm('确定要清空所有作品吗？此操作不可恢复。')) {
        works = [];
        saveWorks();
        renderList();
    }
});

// HTML 转义防注入
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 绑定事件
function bindEvents() {
    // 键盘 ESC 关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePreview();
        }
    });
}

// 启动
init();