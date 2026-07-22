// ========== 配置区：替换成你自己的信息 ==========
const SUPABASE_URL = "https://nrraezafykxlfxfozczo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bfoHvgNPpdnY5E25q_-NTQ_leOuGKVJ";
const BUCKET_NAME = "swc";
// ==============================================

// 初始化 Supabase 客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// DOM 元素（和原页面完全对应，不用改）
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

let works = [];
let currentPreviewWork = null;

// 初始化
function init() {
    loadWorks();
    bindEvents();
}

// 从云端数据库加载所有作品
async function loadWorks() {
    const { data, error } = await supabase
        .from("works")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("加载作品失败：", error);
        alert("加载作品列表失败，请刷新页面重试");
        return;
    }

    works = data;
    renderList();
}

// 渲染列表（样式和原版完全一致）
function renderList() {
    workCount.textContent = works.length;
    
    if (works.length === 0) {
        workList.innerHTML = '<div class="empty-tip">暂无作品，快来上传第一个吧～</div>';
        return;
    }

    workList.innerHTML = works.map((work) => `
        <div class="work-item" data-id="${work.id}">
            <div class="work-info">
                <h3>${escapeHtml(work.filename)}</h3>
                <span class="meta">上传者：${escapeHtml(work.uploader)}</span>
            </div>
            <div class="work-actions">
                <button class="action-btn" onclick="previewWork(${work.id})">预览</button>
                <button class="action-btn" onclick="downloadWork(${work.id})">下载</button>
                <button class="action-btn delete" onclick="deleteWork(${work.id})">删除</button>
            </div>
        </div>
    `).join('');
}

// 上传处理
uploadBtn.addEventListener('click', async () => {
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

    uploadBtn.disabled = true;
    uploadBtn.textContent = "上传中...";

    try {
        // 1. 生成唯一文件名，防止重名覆盖
        const storageFileName = `${Date.now()}_${file.name}`;

        // 2. 上传文件到存储桶
        const { error: uploadError } = await supabase
            .storage
            .from(BUCKET_NAME)
            .upload(storageFileName, file, {
                cacheControl: "3600",
                upsert: false
            });

        if (uploadError) throw uploadError;

        // 3. 获取文件公开链接
        const { data: { publicUrl } } = supabase
            .storage
            .from(BUCKET_NAME)
            .getPublicUrl(storageFileName);

        // 4. 写入作品信息到数据库
        const { error: dbError } = await supabase
            .from("works")
            .insert([
                {
                    uploader: uploader,
                    filename: file.name,
                    file_url: publicUrl
                }
            ]);

        if (dbError) throw dbError;

        // 上传成功，重置表单并刷新列表
        alert('上传成功！');
        uploaderNameInput.value = '';
        fileInput.value = '';
        loadWorks();

    } catch (err) {
        console.error("上传失败：", err);
        alert("上传失败：" + err.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "上传到工坊";
    }
});

// 预览作品
async function previewWork(id) {
    const work = works.find(item => item.id === id);
    if (!work) return;

    currentPreviewWork = work;
    previewTitle.textContent = work.filename;
    previewUploader.textContent = `上传者：${work.uploader}`;
    previewContent.textContent = "加载中...";
    previewModal.classList.add('show');

    try {
        // 从云端拉取文件内容用于预览
        const res = await fetch(work.file_url);
        const text = await res.text();
        previewContent.textContent = text;
    } catch (err) {
        previewContent.textContent = "预览加载失败，请直接下载查看";
        console.error(err);
    }
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

// 下载作品
function downloadWork(id) {
    const work = works.find(item => item.id === id);
    if (!work) return;

    const a = document.createElement('a');
    a.href = work.file_url;
    a.download = work.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

downloadBtn.addEventListener('click', () => {
    if (currentPreviewWork) {
        downloadWork(currentPreviewWork.id);
    }
});

// 删除作品
async function deleteWork(id) {
    if (!confirm('确定要删除这个作品吗？')) return;

    try {
        const { error } = await supabase
            .from("works")
            .delete()
            .eq("id", id);

        if (error) throw error;
        loadWorks();
    } catch (err) {
        alert("删除失败：" + err.message);
        console.error(err);
    }
}

// 清空全部
clearBtn.addEventListener('click', async () => {
    if (works.length === 0) return;
    if (!confirm('确定要清空所有作品吗？此操作不可恢复。')) return;

    try {
        // 逐条删除（简单稳妥，适合小数据量）
        for (const work of works) {
            await supabase.from("works").delete().eq("id", work.id);
        }
        loadWorks();
    } catch (err) {
        alert("清空失败：" + err.message);
        console.error(err);
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