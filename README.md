# 我的导航

一个带账户体系和云端同步的个人网址导航应用。用户可按分类管理网站，搜索、导入浏览器书签或 JSON 备份，并在浏览器本地缓存与 MySQL 云端数据之间同步。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | Vue 3、Vite 5、原生 CSS |
| 后端 | NestJS 10、TypeScript |
| 数据库 | MySQL、Prisma 6 |
| 认证 | JWT、bcrypt |
| 包管理 | pnpm workspace |

## 功能

- 邮箱注册、登录和 JWT 鉴权。
- 分类与网址的新增、编辑、删除、移动及关键词搜索。
- 亮色/暗色主题与响应式侧边栏。
- JSON 备份导入/导出，以及浏览器书签 HTML 导入。
- 本地优先缓存：每位用户使用独立的 `localStorage` 数据。
- 云端整份导航数据同步，采用修订号乐观锁避免多设备或多标签页静默覆盖。
- 导入数据清洗、URL 白名单校验、请求限流与 API payload 校验。

## 项目结构

```text
.
├── apps/
│   ├── web/                  # Vue 前端
│   │   ├── src/components/   # 页面与交互组件
│   │   ├── src/utils/        # 本地存储、导入和 URL 处理
│   │   └── src/api/          # API 调用与 token 管理
│   └── api/                  # NestJS 服务
│       ├── prisma/           # Prisma schema 与数据库迁移
│       ├── src/modules/auth/ # 注册、登录、JWT 认证
│       └── src/modules/navigation/ # 导航数据读写与版本控制
├── package.json              # workspace 脚本
├── pnpm-workspace.yaml
└── .nvmrc                    # 推荐 Node.js 版本
```

## 环境要求

- Node.js 20 或更高版本（项目最低要求为 `18.12.0`）。
- pnpm `9.15.9` 或更高版本。
- MySQL 8+（需支持 JSON 字段）。

```bash
nvm use
node --version
pnpm --version
```

## 本地启动

### 1. 安装依赖

```bash
pnpm install --frozen-lockfile
```

### 2. 配置环境变量

创建 API 环境文件并按实际环境修改：

```bash
cp apps/api/.env.example apps/api/.env
```

`apps/api/.env`：

```dotenv
NODE_ENV=development
PORT=3001
WEB_ORIGIN=http://localhost:3000
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE
JWT_SECRET=replace-with-a-random-secret-of-at-least-32-characters
JWT_EXPIRES_IN=15m
```

可选地创建 `apps/web/.env`，为前端指定 API 地址：

```dotenv
VITE_API_BASE_URL=http://localhost:3001/api
```

### 3. 初始化数据库

生成 Prisma Client 并应用已有迁移：

```bash
pnpm db:generate
pnpm --filter @navigation/api exec prisma migrate deploy
```

开发数据库上创建新迁移时使用：

```bash
pnpm db:migrate
```

> `20260911000000_add_navigation_revision` 会新增导航数据修订号字段。部署包含同步功能的版本前必须应用该迁移。

### 4. 启动开发服务

```bash
pnpm dev
```

- 前端：`http://localhost:3000`
- API：`http://localhost:3001/api`
- 健康检查：`http://localhost:3001/api/health`
- Swagger：`http://localhost:3001/docs`

也可以独立启动：

```bash
pnpm dev:web
pnpm dev:api
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 并行启动前端和 API 开发服务 |
| `pnpm build` | 构建所有 workspace |
| `pnpm test` | 运行前端数据测试、API 构建和 API smoke test |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:migrate` | 在开发环境创建并应用 Prisma 迁移 |
| `pnpm --filter @navigation/api exec prisma migrate deploy` | 在部署环境应用已有迁移 |
| `pnpm --filter @navigation/api exec prisma migrate status` | 查看迁移状态 |

## API 概览

所有成功响应均采用如下信封结构：

```json
{
  "code": 0,
  "data": {},
  "message": "ok",
  "requestId": "..."
}
```

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| `GET` | `/api/health` | 否 | 健康检查 |
| `POST` | `/api/v1/auth/register` | 否 | 注册，返回 access token 和用户信息 |
| `POST` | `/api/v1/auth/login` | 否 | 登录，返回 access token 和用户信息 |
| `GET` | `/api/v1/auth/me` | Bearer token | 获取当前用户 |
| `GET` | `/api/v1/navigation` | Bearer token | 获取 `{ data, revision }` |
| `PUT` | `/api/v1/navigation` | Bearer token | 保存导航数据 |

认证接口按客户端 IP 在单进程内限制为每分钟 10 次请求。受保护接口需携带：

```http
Authorization: Bearer <access-token>
```

### 保存导航数据

保存接口请求体：

```json
{
  "revision": 3,
  "data": {
    "version": 1,
    "categories": [],
    "settings": {
      "theme": "light",
      "searchEngine": "google"
    }
  }
}
```

服务端只接受既定字段，限制导航数据最大 1MB、最多 500 个分类、每个分类最多 5000 个网址，并只允许 `http` / `https` URL。

`revision` 必须等于服务器当前版本。成功保存后返回递增后的版本；若返回 HTTP `409`，表示另一处已更新同一份数据。前端会停止后续云端写入并保留本地修改，用户刷新后可重新同步，避免旧数据覆盖新数据。

## 数据与安全说明

- 登录 token 存在浏览器 `localStorage` 中；生产环境应始终通过 HTTPS 访问应用。
- 导航数据同时写入按用户隔离的本地缓存和云端。网络不可用时仍可使用本地缓存。
- JSON 和书签 HTML 导入文件最大为 5MB；无效数据、重复 ID 和非 HTTP(S) 链接会被清洗或拒绝。
- API 使用 Helmet、压缩、全局 DTO 校验、1.1MB JSON 请求体限制和请求 ID 响应头。
- `apps/api/.env` 已被 Git 忽略，不应提交真实数据库地址或 JWT 密钥。

## 构建与部署

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @navigation/api exec prisma migrate deploy
pnpm build
```

构建产物位于：

- 前端：`apps/web/dist/`
- API：`apps/api/dist/`

API 使用如下命令启动：

```bash
pnpm --filter @navigation/api start
```

部署前请将 `WEB_ORIGIN` 设置为实际前端域名，将 `VITE_API_BASE_URL` 设置为实际 API 地址，并使用强随机的 `JWT_SECRET`。

## 测试

```bash
pnpm test
```

- 前端测试覆盖导航数据清洗、ID 去重、URL 安全校验、导入容量限制和书签解析。
- API smoke test 覆盖健康检查、未认证拒绝、参数校验与认证限流，需要可连接的 MySQL 数据库。
