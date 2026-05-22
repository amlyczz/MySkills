#!/usr/bin/env bash
# proxy.sh — 设置代理环境变量
# 从 material-collector/proxy.json 读取配置，自动识别 macOS/WSL
# 用法: source "$(dirname "$0")/proxy.sh"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

eval "$(
  python3 -c "
import json, sys
p = json.load(open('$SCRIPT_DIR/proxy.json'))
key = 'mac' if sys.platform == 'darwin' else 'wsl'
h = p[key]['host']
port = p[key]['port']
url = f'http://{h}:{port}'
print(f'export http_proxy={url}')
print(f'export https_proxy={url}')
print(f'export HTTP_PROXY={url}')
print(f'export HTTPS_PROXY={url}')
"
)"
