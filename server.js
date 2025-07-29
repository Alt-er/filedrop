const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const PORT = process.env.PORT || 8035;

// 配置文件存储目录
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, 'uploads');

// 确保存储目录存在
fs.ensureDirSync(STORAGE_PATH);

// 安全检查：确保路径在允许范围内
function isPathSafe(requestedPath) {
  const normalizedPath = path.normalize(requestedPath);
  const resolvedPath = path.resolve(STORAGE_PATH, normalizedPath);
  return resolvedPath.startsWith(path.resolve(STORAGE_PATH));
}

// 配置 multer 文件上传
const storage = multer.diskStorage({
  destination: (req, _, cb) => {
    const uploadPath = req.body.path || '';
    const fullPath = path.join(STORAGE_PATH, uploadPath);
    
    if (!isPathSafe(fullPath)) {
      return cb(new Error('Invalid path'));
    }
    
    fs.ensureDirSync(fullPath);
    cb(null, fullPath);
  },
  filename: (_, file, cb) => {
    // 处理中文文件名编码问题
    let originalName = file.originalname;
    
    // 尝试不同的编码转换方式
    try {
      // 方法1: 从latin1转换到utf8
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch (e) {
      try {
        // 方法2: 直接使用原始名称
        originalName = decodeURIComponent(escape(file.originalname));
      } catch (e2) {
        // 方法3: 保持原始名称
        originalName = file.originalname;
      }
    }
    
    cb(null, originalName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 4 * 1024 * 1024 * 1024, // 4GB 文件大小限制
    fieldSize: 10 * 1024 * 1024        // 10MB 字段大小限制
  }
});

// 中间件
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// 设置字符编码
app.use((_, res, next) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});

// 设置基础路径为 /filedrop
const router = express.Router();

// 静态文件服务 - 在 /filedrop 路径下提供
app.use('/filedrop', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

// 获取文件列表
router.get('/api/files', async (req, res) => {
  try {
    const requestedPath = req.query.path || '';
    const fullPath = path.join(STORAGE_PATH, requestedPath);
    
    if (!isPathSafe(fullPath)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }

    const items = await fs.readdir(fullPath);
    const result = [];

    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const itemStats = await fs.stat(itemPath);
      result.push({
        name: item, // 确保名称正确编码
        path: path.posix.join(requestedPath, item),
        isDirectory: itemStats.isDirectory(),
        size: itemStats.size,
        modified: itemStats.mtime
      });
    }

    // 设置正确的编码头
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建目录
router.post('/api/mkdir', async (req, res) => {
  try {
    const { path: requestedPath, name } = req.body;
    const parentPath = path.join(STORAGE_PATH, requestedPath || '');
    const newDirPath = path.join(parentPath, name);
    
    if (!isPathSafe(newDirPath)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    await fs.ensureDir(newDirPath);
    res.json({ success: true, message: 'Directory created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 上传文件
router.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      // 处理multer错误
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          error: '文件太大，最大支持 4GB' 
        });
      }
      if (err.code === 'LIMIT_FIELD_VALUE') {
        return res.status(413).json({ 
          error: '字段值太大，最大支持 10MB' 
        });
      }
      return res.status(500).json({ error: err.message });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: '没有上传文件' });
      }
      
      res.json({ 
        success: true, 
        message: '文件上传成功',
        filename: req.file.filename 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// 下载文件
router.get('/api/download', (req, res) => {
  try {
    const requestedPath = req.query.path;
    if (!requestedPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const fullPath = path.join(STORAGE_PATH, requestedPath);
    
    if (!isPathSafe(fullPath)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot download directory' });
    }

    // 获取原始文件名
    const fileName = path.basename(fullPath);
    
    // 设置正确的响应头，确保文件名正确传递
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    res.download(fullPath, fileName);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除文件或目录
router.delete('/api/delete', async (req, res) => {
  try {
    const requestedPath = req.query.path;
    if (!requestedPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const fullPath = path.join(STORAGE_PATH, requestedPath);
    
    if (!isPathSafe(fullPath)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File or directory not found' });
    }

    await fs.remove(fullPath);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取下载命令
router.get('/api/download-commands', (req, res) => {
  try {
    const requestedPath = req.query.path;
    if (!requestedPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    // 优先使用 X-Forwarded-Host 和 X-Forwarded-Proto (nginx 代理设置)
    const forwardedHost = req.get('X-Forwarded-Host');
    const forwardedProto = req.get('X-Forwarded-Proto');
    
    // 如果有代理头信息，使用代理的信息；否则使用原始信息
    const host = forwardedHost || req.get('host');
    const protocol = forwardedProto || (req.secure ? 'https' : 'http');
    
    const downloadUrl = `${protocol}://${host}/filedrop/api/download?path=${encodeURIComponent(requestedPath)}`;
    
    // 获取文件名
    const fileName = path.basename(requestedPath);
    
    const commands = {
      wget: `wget -c -O "${fileName}" "${downloadUrl}"`,
      curl: `curl -L -o "${fileName}" "${downloadUrl}"`
    };
    
    res.json({ commands, url: downloadUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 挂载路由到 /filedrop 路径
app.use('/filedrop', router);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Storage path: ${STORAGE_PATH}`);
  console.log(`Access URL: http://localhost:${PORT}/filedrop`);
});