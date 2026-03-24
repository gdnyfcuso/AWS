#!/bin/bash
# SSL 证书设置脚本 (使用 Let's Encrypt)

set -e

echo "=========================================="
echo "  AI Virtual World - SSL 证书设置"
echo "=========================================="

# 配置
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.production"

# 检查环境变量文件
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
fi

CERT_EMAIL="${CERT_EMAIL:-admin@aivworld.com}"
SSL_DIR="$PROJECT_ROOT/nginx/ssl"

# 创建 SSL 目录
mkdir -p "$SSL_DIR"

echo ""
echo "📋 配置信息:"
echo "  证书邮箱: $CERT_EMAIL"
echo "  SSL 目录: $SSL_DIR"
echo ""

# 检查 Certbot
if ! command -v certbot &> /dev/null; then
    echo "📦 安装 Certbot..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y certbot
    elif command -v yum &> /dev/null; then
        sudo yum install -y certbot
    else
        echo "❌ 错误: 无法自动安装 Certbot"
        echo "请手动安装 Certbot: https://certbot.eff.org/"
        exit 1
    fi
fi

# 检查域名是否解析
echo ""
echo "🔍 检查域名解析..."
DOMAINS=("www.aivworld.com" "aivworld.com" "api.aivworld.com")
for domain in "${DOMAINS[@]}"; do
    if dig +short "$domain" | grep -qE "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$"; then
        echo "  ✅ $domain 已解析"
    else
        echo "  ⚠️  $domain 未解析或解析到非 IP 地址"
    fi
done

echo ""
echo "⚠️  请确保:"
echo "  1. 域名已正确解析到此服务器"
echo "  2. 80 和 443 端口已开放"
echo "  3. 没有其他服务占用 80 端口 (用于验证)"
echo ""

read -p "是否继续获取证书? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

# 获取证书
echo ""
echo "🔐 获取 SSL 证书..."

# 为前端域名获取证书
sudo certbot certonly --standalone \
    -d www.aivworld.com \
    -d aivworld.com \
    --email "$CERT_EMAIL" \
    --agree-tos \
    --non-interactive \
    --keep-until-expiring

# 为 API 域名获取证书
sudo certbot certonly --standalone \
    -d api.aivworld.com \
    --email "$CERT_EMAIL" \
    --agree-tos \
    --non-interactive \
    --keep-until-expiring

# 复制证书到项目目录
echo ""
echo "📋 复制证书..."
sudo cp /etc/letsencrypt/live/www.aivworld.com/fullchain.pem "$SSL_DIR/"
sudo cp /etc/letsencrypt/live/www.aivworld.com/privkey.pem "$SSL_DIR/"
sudo cp /etc/letsencrypt/live/www.aivworld.com/chain.pem "$SSL_DIR/"

# 设置权限
sudo chown -R $USER:$USER "$SSL_DIR"
chmod 644 "$SSL_DIR"/*.pem

echo ""
echo "✅ SSL 证书设置完成!"
echo ""
echo "📁 证书位置: $SSL_DIR"
echo ""
echo "📌 证书自动续期:"
echo "  Certbot 已自动设置续期任务"
echo "  可以使用 'sudo certbot renew --dry-run' 测试续期"
echo ""
