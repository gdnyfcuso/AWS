#!/bin/bash
# 测试前端代理和城市数据API

API_URL="http://localhost:5173/api/v1"

echo "=== 测试前端代理 ==="
echo ""

# 测试北京
echo "测试北京数据..."
BEIJING=$(curl -s "$API_URL/map/cities/beijing/geography")
BEIJING_LANDMARKS=$(echo "$BEIJING" | jq '.landmarks | length')
BEIJING_ROADS=$(echo "$BEIJING" | jq '.roads | length')
echo "北京地标: $BEIJING_LANDMARKS (预期: 12)"
echo "北京道路: $BEIJING_ROADS (预期: 6)"
if [ "$BEIJING_LANDMARKS" = "12" ] && [ "$BEIJING_ROADS" = "6" ]; then
  echo "✅ 北京数据正确"
else
  echo "❌ 北京数据错误"
  exit 1
fi

# 测试上海
echo ""
echo "测试上海数据..."
SHANGHAI=$(curl -s "$API_URL/map/cities/shanghai/geography")
SHANGHAI_LANDMARKS=$(echo "$SHANGHAI" | jq '.landmarks | length')
SHANGHAI_ROADS=$(echo "$SHANGHAI" | jq '.roads | length')
echo "上海地标: $SHANGHAI_LANDMARKS (预期: 9)"
echo "上海道路: $SHANGHAI_ROADS (预期: 6)"
if [ "$SHANGHAI_LANDMARKS" = "9" ] && [ "$SHANGHAI_ROADS" = "6" ]; then
  echo "✅ 上海数据正确"
else
  echo "❌ 上海数据错误"
  exit 1
fi

# 测试杭州
echo ""
echo "测试杭州数据..."
HANGZHOU=$(curl -s "$API_URL/map/cities/hangzhou/geography")
HANGZHOU_LANDMARKS=$(echo "$HANGZHOU" | jq '.landmarks | length')
HANGZHOU_ROADS=$(echo "$HANGZHOU" | jq '.roads | length')
echo "杭州地标: $HANGZHOU_LANDMARKS (预期: 6)"
echo "杭州道路: $HANGZHOU_ROADS (预期: 2)"
if [ "$HANGZHOU_LANDMARKS" = "6" ] && [ "$HANGZHOU_ROADS" = "2" ]; then
  echo "✅ 杭州数据正确"
else
  echo "❌ 杭州数据错误"
  exit 1
fi

# 测试广州
echo ""
echo "测试广州数据..."
GUANGZHOU=$(curl -s "$API_URL/map/cities/guangzhou/geography")
GUANGZHOU_LANDMARKS=$(echo "$GUANGZHOU" | jq '.landmarks | length')
GUANGZHOU_ROADS=$(echo "$GUANGZHOU" | jq '.roads | length')
GUANGZHOU_RIVERS=$(echo "$GUANGZHOU" | jq '.rivers | length')
echo "广州地标: $GUANGZHOU_LANDMARKS (预期: 3)"
echo "广州道路: $GUANGZHOU_ROADS (预期: 1)"
echo "广州河流: $GUANGZHOU_RIVERS (预期: 1)"
if [ "$GUANGZHOU_LANDMARKS" = "3" ] && [ "$GUANGZHOU_ROADS" = "1" ] && [ "$GUANGZHOU_RIVERS" = "1" ]; then
  echo "✅ 广州数据正确"
else
  echo "❌ 广州数据错误"
  exit 1
fi

# 验证坐标居中（所有城市坐标应该在合理范围内）
echo ""
echo "=== 验证坐标居中 ==="

check_centered() {
  local city=$1
  local data=$2
  local first_lm=$(echo "$data" | jq '.landmarks[0]')
  local x=$(echo "$first_lm" | jq '.x')
  local z=$(echo "$first_lm" | jq '.z')

  # 坐标应该在 [-200, 200] 范围内
  if (( $(echo "$x < 200 && $x > -200" | bc -l) )) && (( $(echo "$z < 200 && $z > -200" | bc -l) )); then
    echo "✅ $city 坐标居中 (x=$x, z=$z)"
    return 0
  else
    echo "❌ $city 坐标未居中 (x=$x, z=$z)"
    return 1
  fi
}

check_centered "北京" "$BEIJING"
check_centered "上海" "$SHANGHAI"
check_centered "杭州" "$HANGZHOU"
check_centered "广州" "$GUANGZHOU"

echo ""
echo "=== 所有测试通过！ ==="
echo ""
echo "前端服务: http://localhost:5173"
echo "后端服务: http://100.64.0.131:3000"
echo ""
echo "下一步：在浏览器中打开 http://100.64.0.131:5173 测试城市切换功能"
