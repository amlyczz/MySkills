#!/usr/bin/env bash
# video-pipeline 一键启动脚本
# 用法: ./start.sh          (启动前后端)
#       ./start.sh backend   (仅启动后端)
#       ./start.sh frontend  (仅启动前端)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[dev]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }

# 自动检测代理配置
if [ -z "$HTTP_PROXY" ] && [ -z "$http_proxy" ]; then
    if uname -r | grep -qi "microsoft"; then
        export HTTP_PROXY="http://172.28.0.1:10808"
        export HTTPS_PROXY="http://172.28.0.1:10808"
        log "检测到 WSL 环境，自动配置代理 172.28.0.1:10808"
    elif [ "$(uname)" = "Darwin" ]; then
        export HTTP_PROXY="http://127.0.0.1:7890"
        export HTTPS_PROXY="http://127.0.0.1:7890"
        log "检测到 macOS 环境，自动配置代理 127.0.0.1:7890"
    fi
fi

start_backend() {
    log "启动后端 (FastAPI on :18274)..."
    cd "$SCRIPT_DIR/backend"

    # 检查 .env
    if [ ! -f .env ]; then
        warn ".env 不存在，从 .env.example 复制..."
        cp .env.example .env
        warn "请编辑 backend/.env 填入真实的 API KEY 和数据库 URL"
    fi

    # 检查 venv
    if [ ! -d .venv ]; then
        log "安装 Python 依赖..."
        uv sync
    fi

    uv run python -m src.main
}

start_frontend() {
    log "启动前端 (Vite on :15392)..."
    cd "$SCRIPT_DIR/frontend"

    # 检查 node_modules
    if [ ! -d node_modules ]; then
        log "安装前端依赖..."
        npm install
    fi

    npm run dev
}

case "${1:-all}" in
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    all)
        log "同时启动前后端..."
        # 后端在后台启动
        (start_backend) &
        BACKEND_PID=$!
        # 前端在后台启动
        (start_frontend) &
        FRONTEND_PID=$!

        echo ""
        log "后端 PID: $BACKEND_PID (http://localhost:18274)"
        log "前端 PID: $FRONTEND_PID (http://localhost:15392)"
        echo ""
        log "按 Ctrl+C 停止所有服务"

        # 捕获退出信号，杀掉子进程
        trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
        wait
        ;;
    *)
        echo "用法: $0 [backend|frontend|all]"
        exit 1
        ;;
esac
