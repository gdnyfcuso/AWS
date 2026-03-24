#!/bin/bash
# Docker 镜像构建和推送脚本

set -e

echo "=========================================="
echo "  AI Virtual World - Docker 镜像构建"
echo "=========================================="

# 配置
REGISTRY="${DOCKER_REGISTRY:-registry.cn-hangzhou.aliyuncs.com}"
NAMESPACE="${DOCKER_NAMESPACE:-aivworld}"
VERSION="${VERSION:-latest}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo ""
echo "📋 配置信息:"
echo "  Registry: $REGISTRY"
echo "  Namespace: $NAMESPACE"
echo "  Version: $VERSION"
echo ""

# 登录 Docker Registry (如果需要)
if [ -n "$DOCKER_USERNAME" ] && [ -n "$DOCKER_PASSWORD" ]; then
    echo "🔐 登录 Docker Registry..."
    echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin $REGISTRY
fi

# 构建前端镜像
echo ""
echo "🔨 构建前端镜像..."
docker build -t $REGISTRY/$NAMESPACE/frontend:$VERSION \
    -t $REGISTRY/$NAMESPACE/frontend:latest \
    -f frontend/Dockerfile \
    frontend/

# 构建后端镜像
echo ""
echo "🔨 构建后端镜像..."
docker build -t $REGISTRY/$NAMESPACE/backend:$VERSION \
    -t $REGISTRY/$NAMESPACE/backend:latest \
    -f backend/Dockerfile \
    backend/

# 推送镜像
if [ -n "$DOCKER_USERNAME" ]; then
    echo ""
    echo "📤 推送镜像到 Registry..."

    echo "推送前端镜像..."
    docker push $REGISTRY/$NAMESPACE/frontend:$VERSION
    docker push $REGISTRY/$NAMESPACE/frontend:latest

    echo "推送后端镜像..."
    docker push $REGISTRY/$NAMESPACE/backend:$VERSION
    docker push $REGISTRY/$NAMESPACE/backend:latest
fi

echo ""
echo "=========================================="
echo "  镜像构建完成!"
echo "=========================================="
echo ""
echo "📦 构建的镜像:"
echo "  $REGISTRY/$NAMESPACE/frontend:$VERSION"
echo "  $REGISTRY/$NAMESPACE/backend:$VERSION"
echo ""
echo "📌 使用方法:"
echo "  在 docker-compose.yml 中引用:"
echo "    image: $REGISTRY/$NAMESPACE/frontend:$VERSION"
echo "    image: $REGISTRY/$NAMESPACE/backend:$VERSION"
echo ""

# 显示镜像大小
echo "📊 镜像大小:"
docker images $REGISTRY/$NAMESPACE/frontend --format "  frontend: {{.Size}}"
docker images $REGISTRY/$NAMESPACE/backend --format "  backend: {{.Size}}"
