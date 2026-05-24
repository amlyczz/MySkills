---
name: proxy
description: >
  网络代理配置。所有需要外网访问的 skill 必须引用此 skill，
  确保 curl / gh / pip / npm / git 等工具走代理。
triggers:
  - 网络配置
  - 代理设置
  - 科学上网
  - proxy
tools_allowed:
  - run_terminal_cmd
  - read_file
---

# Proxy — 网络代理配置

## 环境变量

WSL 环境已配置全局代理环境变量：

```bash
ALL_PROXY=socks5://172.28.0.1:10808
HTTP_PROXY=http://172.28.0.1:10808
HTTPS_PROXY=http://172.28.0.1:10808
```

> Mac 环境使用 `127.0.0.1:7890`。

## 各工具代理配置

### curl（自动）

继承 `ALL_PROXY` / `HTTP_PROXY` 环境变量，无需额外配置。

> **注意**：不要在循环中同时发起多个并发连接，SOCKS5 代理可能限流。推荐按顺序单次下载，或在前一次下载完成后发起下一次。

### gh（GitHub CLI）

`gh` CLI 自动使用 `HTTPS_PROXY` / `ALL_PROXY` 环境变量。

如果遇到代理错误，可显式设置：

```bash
export HTTPS_PROXY=http://172.28.0.1:10808
```

### Python requests / urllib

自动读取环境变量 `HTTP_PROXY` / `HTTPS_PROXY`。

### npm install

```bash
npm config set proxy http://172.28.0.1:10808
npm config set https-proxy http://172.28.0.1:10808
```

### git

```bash
git config --global http.proxy http://172.28.0.1:10808
git config --global https.proxy http://172.28.0.1:10808
```

### pip / uv

```bash
# pip 自动读取 HTTP_PROXY 环境变量
# uv 读取 ALL_PROXY 环境变量
```

## 验证代理

```bash
# 验证 curl
curl -sI https://raw.githubusercontent.com | head -1

# 验证 gh
gh api repos/bytedance/Lance --jq '.stargazers_count'
```

## 注意事项

- 大文件（>1MB）下载时请使用 `--max-time 120` 设置充足超时时间
- `raw.githubusercontent.com` 需走代理，不能 `--noproxy`
- 不要批量并行下载，每次只下载一个文件并确认成功后继续下一个
- 如果下载返回 14 bytes 或空文件，说明代理请求失败，重试即可
