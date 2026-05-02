# opencli-plugin-tophub

Tophub adapters for OpenCLI

## Install

```bash
opencli plugin install github:heartsec/opencli-plugin-tophub
```

## Commands

| Command | Type | Description |
|---------|------|-------------|
| `tophub/hot` | JavaScript | 今日热榜热点链接（抖音/微博/微信/知乎） |

## Usage

```bash
# All default platforms: douyin,weibo,weixin,zhihu
opencli tophub hot

# Limit items per board
opencli tophub hot --limit 3

# Select platforms
opencli tophub hot --platform douyin,weibo

# Machine-readable output
opencli tophub hot --format json
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
