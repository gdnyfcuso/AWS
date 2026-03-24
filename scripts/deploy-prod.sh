#!/bin/bash
# 生产环境部署脚本

set -e

echo "=========================================="
echo "  AI Virtual World - 生产环境部署"
echo "=========================================="

# 配置
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.production"

# 检查环境变量文件
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ 错误: 环境变量文件不存在: $ENV_FILE"
    echo "请先复制 .env.production.example 并配置生产环境变量"
    exit 1
fi

# 加载环境变量
source "$ENV_FILE"

# 验证必要的环境变量
echo ""
echo "🔍 验证配置..."
if [ "$POSTGRES_PASSWORD" = "CHANGE_THIS_PASSWORD_NOW" ]; then
    echo "❌ 错误: 请修改生产环境密码"
    exit 1
fi

if [ "$API_SECRET_KEY" = "CHANGE_THIS_SECRET_KEY_NOW" ]; then
    echo "❌ 错误: 请修改生产环境密钥"
    exit 1
fi
echo "✅ 配置验证通过"

# 检查 SSL 证书
echo ""
echo "🔐 检查 SSL 证书..."
SSL_DIR="$PROJECT_ROOT/nginx/ssl"
if [ ! -f "$SSL_DIR/fullchain.pem" ] || [ ! -f "$SSL_DIR/privkey.pem" ]; then
    echo "⚠️  SSL 证书不存在"
    echo ""
    echo "请先获取 SSL 证书:"
    echo "  1. 确保域名已解析到此服务器"
    echo "  2. 运行: ./scripts/setup-ssl.sh"
    echo ""
    read -p "是否现在设置 SSL 证书? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        bash "$PROJECT_ROOT/scripts/setup-ssl.sh"
    else
        echo "❌ 未检测到 SSL 证书，无法部署生产环境"
        exit 1
    fi
fi
echo "✅ SSL 证书检查通过"

# 停止现有容器
echo ""
echo "🛑 停止现有容器..."
cd "$PROJECT_ROOT"
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# 拉取最新代码 (可选)
read -p "是否拉取最新代码? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📥 拉取最新代码..."
    git pull
fi

# 构建镜像
echo ""
echo "🔨 构建 Docker 镜像..."
docker-compose -f docker-compose.prod.yml build --no-cache

# 启动服务
echo ""
echo "🚀 启动服务..."
docker-compose -f docker-compose.prod.yml up -d

# 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 15

# 检查服务状态
echo ""
echo "📊 服务状态:"
docker-compose -f docker-compose.prod.yml ps

# 运行数据库迁移
echo ""
echo "🗄️  运行数据库迁移..."
docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy || echo "⚠️  数据库迁移跳过或已执行"

echo ""
echo "=========================================="
echo "  生产环境部署完成!"
echo "=========================================="
echo ""
echo "🌐 访问地址:"
echo "  前端: https://www.aivworld.com"
echo "  后端: https://api.aivworld.com"
echo ""
echo "📌 常用命令:"
echo "  查看日志: docker-compose -f docker-compose.prod.yml logs -f"
echo "  停止服务: docker-compose -f docker-compose.prod.yml down"
echo "  重启服务: docker-compose -f docker-compose.prod.yml restart"
echo "  数据库迁移: docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy"
echo ""
