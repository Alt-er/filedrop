class FileManager {
    constructor() {
        this.currentPath = '';
        this.allFiles = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.initDragDrop();
        this.loadFiles();
        this.bindSearchEvent();
    }

    bindEvents() {
        // 上传文件
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('uploadModal').style.display = 'block';
        });

        // 新建目录
        document.getElementById('createDirBtn').addEventListener('click', () => {
            document.getElementById('createDirModal').style.display = 'block';
        });

        // 刷新
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadFiles();
        });

        // 模态框关闭
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // 上传确认
        document.getElementById('uploadConfirmBtn').addEventListener('click', () => {
            this.uploadFiles();
        });

        // 创建目录确认
        document.getElementById('createDirConfirmBtn').addEventListener('click', () => {
            this.createDirectory();
        });

        // 复制命令按钮
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-btn')) {
                const targetId = e.target.getAttribute('data-target');
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    this.copyToClipboard(targetElement.textContent, e.target);
                }
            }
        });

        // Enter 键确认创建目录
        document.getElementById('dirNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createDirectory();
            }
        });
    }

    bindSearchEvent() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            // 简单的input事件绑定
            searchInput.addEventListener('input', (e) => {
                this.filterFiles(e.target.value);
            });
        }
    }

    initDragDrop() {
        const dragOverlay = document.getElementById('dragOverlay');
        let dragCounter = 0;
        
        // 页面级别的拖拽事件
        document.addEventListener('dragenter', (e) => {
            // 只有当拖拽的是文件时才处理
            if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
            // 排除搜索框及其父容器
            if (e.target.closest('.search-input') || e.target.closest('.drag-hint-right')) return;
            
            e.preventDefault();
            dragCounter++;
            dragOverlay.classList.add('show');
        });

        document.addEventListener('dragover', (e) => {
            // 只有当拖拽的是文件时才处理
            if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
            // 排除搜索框及其父容器
            if (e.target.closest('.search-input') || e.target.closest('.drag-hint-right')) return;
            
            e.preventDefault();
        });

        document.addEventListener('dragleave', (e) => {
            // 只有当拖拽的是文件时才处理
            if (!e.dataTransfer || !e.dataTransfer.types.includes('Files')) return;
            // 排除搜索框及其父容器
            if (e.target.closest('.search-input') || e.target.closest('.drag-hint-right')) return;
            
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                dragOverlay.classList.remove('show');
            }
        });

        // 文件放置
        document.addEventListener('drop', (e) => {
            // 排除搜索框及其父容器
            if (e.target.closest('.search-input') || e.target.closest('.drag-hint-right')) return;
            
            e.preventDefault();
            dragCounter = 0;
            dragOverlay.classList.remove('show');
            
            // 优先使用 webkitGetAsEntry API（更准确）
            if (e.dataTransfer.items && e.dataTransfer.items[0] && e.dataTransfer.items[0].webkitGetAsEntry) {
                const items = Array.from(e.dataTransfer.items);
                const files = [];
                let folderCount = 0;
                
                // 使用 webkitGetAsEntry API 来准确判断文件和文件夹
                items.forEach(item => {
                    if (item.kind === 'file') {
                        const entry = item.webkitGetAsEntry();
                        if (entry) {
                            if (entry.isDirectory) {
                                folderCount++;
                                console.log(`忽略文件夹: ${entry.name}`);
                            } else if (entry.isFile) {
                                // 获取文件对象
                                const file = item.getAsFile();
                                if (file) {
                                    files.push(file);
                                    console.log(`添加文件: ${file.name}`);
                                }
                            }
                        }
                    }
                });
                
                if (files.length > 0) {
                    // 如果有被过滤掉的文件夹，给用户提示
                    if (folderCount > 0) {
                        alert(`已忽略 ${folderCount} 个文件夹。系统只支持上传文件，不支持上传文件夹。`);
                    }
                    this.uploadFilesDirectly(files);
                } else if (folderCount > 0) {
                    alert('只能上传文件，不能上传文件夹。');
                }
            } else {
                // 回退到旧的方法（兼容性处理）
                const files = Array.from(e.dataTransfer.files);
                const validFiles = this.filterValidFiles(files);
                
                if (validFiles.length > 0) {
                    if (files.length > validFiles.length) {
                        const folderCount = files.length - validFiles.length;
                        alert(`已忽略 ${folderCount} 个文件夹。系统只支持上传文件，不支持上传文件夹。`);
                    }
                    this.uploadFilesDirectly(validFiles);
                } else if (files.length > 0) {
                    alert('只能上传文件，不能上传文件夹。');
                }
            }
        });
    }

    // 过滤文件，排除文件夹
    filterValidFiles(files) {
        return files.filter(file => {
            // 文件夹的特征：
            // 1. size为0且type为空字符串
            // 2. 或者type明确包含目录信息
            // 但要注意空文件也是size为0，所以需要综合判断
            
            // 如果有明确的type，说明是文件
            if (file.type && file.type !== '') {
                return true;
            }
            
            // 如果没有type但有size，可能是某些特殊文件
            if (file.size > 0) {
                return true;
            }
            
            // 如果size为0且type为空，很可能是文件夹
            // 但也可能是空文件，通过文件名来进一步判断
            if (file.name && file.name.includes('.')) {
                // 有扩展名的通常是文件（即使是空文件）
                return true;
            }
            
            // 其他情况认为是文件夹
            return false;
        });
    }

    async loadFiles() {
        try {
            document.getElementById('fileListContent').innerHTML = '<div class="loading">加载中...</div>';
            
            const response = await fetch(`/filedrop/api/files?path=${encodeURIComponent(this.currentPath)}`);
            const files = await response.json();

            if (!response.ok) {
                throw new Error(files.error || '加载文件失败');
            }

            this.renderFiles(files);
            this.updateBreadcrumb();
            this.allFiles = files;
        } catch (error) {
            document.getElementById('fileListContent').innerHTML = `<div class="empty-state">加载失败: ${error.message}</div>`;
        }
    }

    renderFiles(files) {
        const fileListContent = document.getElementById('fileListContent');
        
        if (files.length === 0) {
            fileListContent.innerHTML = '<div class="empty-state">此目录为空</div>';
            return;
        }

        // 按类型和名称排序（目录在前）
        files.sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) {
                return b.isDirectory - a.isDirectory;
            }
            return a.name.localeCompare(b.name);
        });

        const html = files.map(file => {
            const fileSize = file.isDirectory ? '' : this.formatFileSize(file.size);
            const modifiedDate = new Date(file.modified).toLocaleString('zh-CN');
            
            // 构建文件详细信息，避免文件夹显示多余的竖杠
            let fileDetails = '';
            if (file.isDirectory) {
                fileDetails = `修改时间: ${modifiedDate}`;
            } else {
                fileDetails = `${fileSize} | 修改时间: ${modifiedDate}`;
            }
            
            return `
                <div class="file-item">
                    <div class="file-icon ${file.isDirectory ? 'folder' : 'file'}"></div>
                    <div class="file-info">
                        <div class="file-name" onclick="fileManager.${file.isDirectory ? 'navigateToDirectory' : 'showDownloadCommands'}('${file.path}')">${file.name}</div>
                        <div class="file-details">${fileDetails}</div>
                    </div>
                    <div class="file-actions">
                        ${!file.isDirectory ? `<button class="btn btn-primary" onclick="fileManager.downloadFile('${file.path}')">下载</button>` : ''}
                        <button class="btn btn-danger" onclick="fileManager.deleteItem('${file.path}', ${file.isDirectory})">删除</button>
                    </div>
                </div>
            `;
        }).join('');

        fileListContent.innerHTML = html;
    }

    filterFiles(searchTerm) {
        if (!searchTerm.trim()) {
            this.renderFiles(this.allFiles);
            return;
        }
        
        const filteredFiles = this.allFiles.filter(file => 
            file.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.renderFiles(filteredFiles);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        const pathParts = this.currentPath.split('/').filter(part => part);
        
        let html = '<span class="breadcrumb-item" onclick="fileManager.navigateToPath(\'\')">🏠 根目录</span>';
        
        let currentPath = '';
        pathParts.forEach((part) => {
            currentPath += '/' + part;
            // 在每个路径项前添加分隔符，而不是作为伪元素
            html += '<span class="breadcrumb-separator"> / </span>';
            html += `<span class="breadcrumb-item" onclick="fileManager.navigateToPath('${currentPath.substring(1)}')">${part}</span>`;
        });
        
        breadcrumb.innerHTML = html;
    }

    navigateToDirectory(path) {
        this.currentPath = path;
        this.loadFiles();
    }

    navigateToPath(path) {
        this.currentPath = path;
        this.loadFiles();
    }

    async uploadFiles() {
        const fileInput = document.getElementById('fileInput');
        const files = Array.from(fileInput.files);
        
        if (files.length === 0) {
            alert('请选择要上传的文件');
            return;
        }

        const validFiles = this.filterValidFiles(files);
        
        if (validFiles.length === 0) {
            alert('选择的都是文件夹，请选择文件进行上传。');
            return;
        }
        
        // 如果有被过滤掉的文件夹，给用户提示
        if (files.length > validFiles.length) {
            const folderCount = files.length - validFiles.length;
            if (!confirm(`已忽略 ${folderCount} 个文件夹。系统只支持上传文件。是否继续上传 ${validFiles.length} 个文件？`)) {
                return;
            }
        }

        await this.uploadFilesDirectly(validFiles);
        
        // 清空文件输入框并关闭模态框
        fileInput.value = '';
        document.getElementById('uploadModal').style.display = 'none';
    }

    async uploadFilesDirectly(files) {
        const progressDiv = document.getElementById('uploadProgress');
        const modal = document.getElementById('uploadModal');
        
        // 如果模态框没有显示，显示它来显示进度
        if (modal.style.display === 'none' || !modal.style.display) {
            modal.style.display = 'block';
        }
        
        progressDiv.style.display = 'block';
        progressDiv.innerHTML = '准备上传...';

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append('path', this.currentPath);
                formData.append('file', file);

                progressDiv.innerHTML = `上传进度: ${i + 1}/${files.length} - ${file.name}`;

                const response = await fetch('/filedrop/api/upload', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || '上传失败');
                }
            }

            progressDiv.innerHTML = '上传完成！';
            setTimeout(() => {
                modal.style.display = 'none';
                progressDiv.style.display = 'none';
                this.loadFiles();
            }, 1000);
            
        } catch (error) {
            progressDiv.innerHTML = `上传失败: ${error.message}`;
            setTimeout(() => {
                progressDiv.style.display = 'none';
            }, 3000);
        }
    }

    async createDirectory() {
        const dirName = document.getElementById('dirNameInput').value.trim();
        
        if (!dirName) {
            alert('请输入目录名称');
            return;
        }

        try {
            const response = await fetch('/filedrop/api/mkdir', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: this.currentPath,
                    name: dirName
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || '创建目录失败');
            }

            document.getElementById('createDirModal').style.display = 'none';
            document.getElementById('dirNameInput').value = '';
            this.loadFiles();
            
        } catch (error) {
            alert(`创建目录失败: ${error.message}`);
        }
    }

    async downloadFile(path) {
        try {
            // 直接使用 window.open 或创建 a 标签来下载
            const downloadUrl = `/filedrop/api/download?path=${encodeURIComponent(path)}`;
            
            // 创建隐藏的 a 标签来触发下载
            const link = document.createElement('a');
            link.href = downloadUrl;
            
            // 从路径中提取文件名，确保中文文件名正确处理
            const fileName = path.split('/').pop();
            link.download = fileName;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            alert(`下载失败: ${error.message}`);
        }
    }

    async deleteItem(path, isDirectory) {
        const itemType = isDirectory ? '目录' : '文件';
        if (!confirm(`确定要删除这个${itemType}吗？\n${path}`)) {
            return;
        }

        try {
            const response = await fetch(`/filedrop/api/delete?path=${encodeURIComponent(path)}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || '删除失败');
            }

            this.loadFiles();
            
        } catch (error) {
            alert(`删除失败: ${error.message}`);
        }
    }

    async showDownloadCommands(path) {
        try {
            const response = await fetch(`/filedrop/api/download-commands?path=${encodeURIComponent(path)}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '获取下载命令失败');
            }

            document.getElementById('wgetCommand').textContent = result.commands.wget;
            document.getElementById('curlCommand').textContent = result.commands.curl;
            document.getElementById('directUrl').textContent = result.url;
            document.getElementById('downloadCommandsModal').style.display = 'block';
            
        } catch (error) {
            alert(`获取下载命令失败: ${error.message}`);
        }
    }

    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            
            const originalText = button.textContent;
            button.textContent = '✅ 已复制！';
            button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            
            setTimeout(() => {
                button.textContent = originalText;
                // 恢复原来的样式类
                if (button.classList.contains('btn-primary')) {
                    button.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                } else {
                    button.style.background = 'linear-gradient(135deg, #f093fb, #f5576c)';
                }
            }, 2000);
            
        } catch (error) {
            // 如果浏览器不支持 Clipboard API，使用旧方法
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            alert('命令已复制到剪贴板');
        }
    }
}

// 初始化文件管理器
const fileManager = new FileManager();