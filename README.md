# opencli-plugin-tophub

Tophub adapters for OpenCLI

## Install

```bash
opencli plugin install github:heartsec/opencli-plugin-tophub
```

## Commands

| Command | Type | Description |
|---------|------|-------------|
| `tophub/hot` | JavaScript | 今日热榜热点链接（抖音/微博/微信/知乎/南方周末） |
| `tophub/nodes` | JavaScript | 今日热榜节点列表（信源/榜单分类/节点链接） |

## Usage

```bash
# All default platforms: douyin,weibo,weixin,zhihu
opencli tophub hot

# Limit items per board
opencli tophub hot --limit 3

# Select platforms
opencli tophub hot --platform douyin,weibo

# Nanfang Zhoumo
opencli tophub hot --platform nanfangzhoumo

# Machine-readable output
opencli tophub hot --format json

# List nodes from a category/search entry page
opencli tophub nodes --query 南方周末
opencli tophub nodes --category news --query 抖音 --format csv
opencli tophub nodes --category news --scrolls 50 --format csv
opencli tophub nodes --url 'https://tophub.today/c/news?q=南方周末' --format json
```

## Development

```bash
# Install locally for development (symlinked, changes reflect immediately)
opencli plugin install file://$PWD

# Verify commands are registered
opencli list | grep tophub

# Run a command
opencli tophub hot --limit 1
```
