# 文件管理系统

一个基于 Node.js 和 Express 的简单文件上传下载管理系统，支持 Docker 部署。

## 功能特性

- 文件上传和下载（支持拖拽上传）
- 目录创建和删除
- 文件和目录删除
- 路径安全限制（仅在配置的目录内操作）
- 点击文件自动生成 wget 下载命令
- 现代化响应式 Web 界面
- Docker 容器化部署
- 基础路径支持（/filedrop）

## 快速开始

### 使用 Docker Compose（推荐）

1. 克隆项目：
```bash
git clone <repository-url>
cd filedrop
```

2. 启动服务：
```bash
docker-compose up -d
```

3. 访问应用：
打开浏览器访问 `http://localhost:3000/filedrop`

### 本地开发

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm start
```

3. 访问应用：
打开浏览器访问 `http://localhost:8035/filedrop`

## Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /filedrop {
        proxy_pass http://localhost:8035;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 环境变量

- `PORT`: 服务端口（默认: 8035）
- `STORAGE_PATH`: 文件存储路径（默认: ./uploads）

## API 接口

所有 API 接口都在 `/filedrop` 路径下：

- `GET /filedrop/api/files?path=<path>` - 获取文件列表
- `POST /filedrop/api/upload` - 上传文件
- `GET /filedrop/api/download?path=<path>` - 下载文件
- `POST /filedrop/api/mkdir` - 创建目录
- `DELETE /filedrop/api/delete?path=<path>` - 删除文件或目录
- `GET /filedrop/api/wget?path=<path>` - 获取 wget 命令

## 安全特性

- 路径遍历保护
- 仅允许在配置的存储目录内操作
- 输入验证和错误处理

## 项目结构

```
filedrop/
├── server.js          # 后端服务器
├── package.json       # 项目配置
├── Dockerfile         # Docker 配置
├── docker-compose.yml # Docker Compose 配置
├── public/            # 前端文件
│   ├── index.html
│   ├── style.css
│   └── script.js
└── uploads/           # 文件存储目录
```

## 许可证

MIT License