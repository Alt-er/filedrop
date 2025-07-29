FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制应用代码
COPY . .

# 创建上传目录
RUN mkdir -p uploads

# 暴露端口
EXPOSE 8035

# 设置环境变量
ENV NODE_ENV=production
ENV STORAGE_PATH=/app/uploads
ENV PORT=8035

# 启动应用
CMD ["npm", "start"]