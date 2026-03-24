#!/bin/bash
# 测试环境部署脚本

set -e

echo "=========================================="
echo "  AI Virtual World - 测试环境部署"
echo "=========================================="

# 配置
TEST_IP="${TEST_IP:-100.64.0.131}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo ""
echo "📋 配置信息:"
echo "  测试环境 IP: $TEST_IP"
echo "  项目路径: $PROJECT_ROOT"
echo ""

# 检查 Docker 和 Docker Compose
echo "🔍 检查环境..."
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ 错误: Docker Compose 未安装"
    exit 1
fi
echo "✅ Docker 环境检查通过"

# 停止现有容器
echo ""
echo "🛑 停止现有容器..."
cd "$PROJECT_ROOT"
docker-compose -f docker-compose.yml down 2>/dev/null || true

# 构建镜像
echo ""
echo "🔨 构建 Docker 镜像..."
docker-compose -f docker-compose.yml build --no-cache

# 启动服务
echo ""
echo "🚀 启动服务..."
docker-compose -f docker-compose.yml up -d

# 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo "📊 服务状态:"
docker-compose -f docker-compose.yml ps

# 显示日志
echo ""
echo "📝 最近日志 (按 Ctrl+C 退出):"
docker-compose -f docker-compose.yml logs --tail=20 -f

# 等待用户按键
read -p "按 Enter 查看完整日志或 Ctrl+C 退出..."

echo ""
echo "=========================================="
echo "  部署完成!"
echo "=========================================="
echo ""
echo "🌐 访问地址:"
echo "  前端: http://$TEST_IP"
echo "  后端: http://$TEST_IP:3000"
echo "  API 文档: http://$TEST_IP:3000/api/v1"
echo ""
echo "📌 常用命令:"
echo "  查看日志: docker-compose -f docker-compose.yml logs -f"
echo "  停止服务: docker-compose -f docker-compose.yml down"
echo "  重启服务: docker-compose -f docker-compose.yml restart"
echo ""
