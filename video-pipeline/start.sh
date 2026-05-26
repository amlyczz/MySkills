#!/usr/bin/env bash
# video-pipeline 一键启动脚本
# 用法: ./start.sh          (启动前后端)
#       ./start.sh backend   (仅启动后端)
#       ./start.sh frontend  (仅启动前端)

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

    # 杀掉占用 18274 端口的旧进程
    if lsof -ti:18274 >/dev/null 2>&1; then
        log "检测到 18274 端口被占用，正在清理..."
        lsof -ti:18274 | xargs kill -9 2>/dev/null
        sleep 1
        log "旧进程已清理"
    fi

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

    exec uv run python -m src.main
}

start_frontend() {
    log "启动前端 (Vite on :15392)..."
    cd "$SCRIPT_DIR/frontend"

    # 检查 node_modules
    if [ ! -d node_modules ]; then
        log "安装前端依赖..."
        npm install
    fi

    exec npm run dev
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

        # 清理函数：杀掉子进程并退出
        _cleaned=0
        cleanup() {
            if [ "$_cleaned" = "1" ]; then return; fi
            _cleaned=1
            echo ""
            log "正在停止所有服务..."
            kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
            wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
            log "已停止"
            exit 0
        }
        trap cleanup SIGINT SIGTERM

        # 直接启动（不用子 shell），用 exec 替换保证信号传递
        start_backend &
        BACKEND_PID=$!
        start_frontend &
        FRONTEND_PID=$!

        echo ""
        log "后端 PID: $BACKEND_PID (http://localhost:18274)"
        log "前端 PID: $FRONTEND_PID (http://localhost:15392)"
        echo ""
        log "按 Ctrl+C 停止所有服务"

        wait
        ;;
    *)
        echo "用法: $0 [backend|frontend|all]"
        exit 1
        ;;
esac
