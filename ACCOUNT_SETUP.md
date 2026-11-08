# 配置账号与跨设备同步

这个站点是纯静态前端，**没有服务器**，所以账号要靠 Supabase（免费）来做。
配好之后：错题本、闪卡进度、编辑内容、练习成绩、自定义题目会存到你的账号，换设备登录就能恢复。

> 前 3 步建议在**电脑**上做（手机上注册、跑 SQL 会比较难受）。
> 全程免费，不需要信用卡。

---

## 一、注册并创建项目

1. 打开 https://supabase.com ，用 GitHub 账号或邮箱注册
2. 点 **New project**
   - Name：`biolab`
   - Database Password：随便设一个，**记下来**
   - Region：选 **Southeast Asia (Singapore)** 或 **Northeast Asia (Tokyo)**，国内访问相对快
3. 等 1—2 分钟，项目初始化完成

---

## 二、填配置

1. 左侧 **Project Settings**（齿轮）→ **API**
2. 复制两个值：
   - **Project URL** → 形如 `https://abcdefgh.supabase.co`
   - **anon / public** 那个 key（很长的一串 `eyJ...`）
3. 打开仓库里的 `supabase-config.js`，填进去：

```js
window.SUPABASE_CONFIG = {
  url: "https://abcdefgh.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
  table: "user_data"
};
```

> `anon` key 是**设计上就公开**的浏览器密钥，放在前端没问题。
> 千万不要把 `service_role` key 放进来——那个能绕过一切权限。

---

## 三、建表

1. 左侧 **SQL Editor** → **New query**
2. 把仓库里 `supabase-setup.sql` 的全部内容粘进去
3. 点 **Run**，看到 `Success` 就行

它只做三件事：建 `user_data` 表、开启行级安全（每人只能读写自己那行）、加一个自动更新时间戳的触发器。

---

## 四、调整认证设置（很关键）

1. **Authentication → Providers → Email**
   - 建议把 **Confirm email** 关掉
   - 不关的话，每次注册都要去邮箱点确认链接才能登录
2. **Authentication → URL Configuration**
   - **Site URL** 填你的站点地址：`https://pengyulin123.github.io/bio-lab/`
   - **Redirect URLs** 加上同一个地址

---

## 五、开始用

刷新页面，右上角出现「登录」：

- 点它 → 「去注册」→ 填邮箱和密码（至少 6 位）
- 注册成功后自动登录，本机现有数据会上传到云端
- 换一台设备登录同一个账号，点「从云端恢复」即可拉回

登录后头像按钮里有三个操作：

| 按钮 | 作用 |
|---|---|
| 立即同步 | 把当前本机数据推上去 |
| 从云端恢复 | 用云端覆盖本机 |
| 退出登录 | 退出，**本机和云端数据都不会删** |

登录状态下每 20 秒自动检查一次，有变化就静默上传。

---

## 六、同步哪些数据

| 数据 | 是否同步 |
|---|---|
| 知识点 / 术语 / 章节的编辑改动 | ✅ |
| 页面文案改动 | ✅ |
| 闪卡「已掌握」记录 | ✅ |
| 错题本 | ✅ |
| 练习成绩历史 | ✅ |
| 自定义题库 | ✅ |
| 学习计划打卡 | ✅ |
| 资料库上传的文件（PDF/Word） | ❌ 文件太大，只存在本机 |

同步的是**个人覆盖层**，不会把 3.7MB 的书籍正文复制进数据库。

---

## 七、出问题了怎么办

| 现象 | 原因 | 处理 |
|---|---|---|
| 点登录提示"还没有配置" | `supabase-config.js` 没填或没上传 | 填好重新上传 |
| 注册后登不进去 | 邮箱没确认 | 去邮箱点链接，或按第四步关掉 Confirm email |
| 提示"连不上服务器" | URL 写错，或网络访问不了 supabase.co | 检查 URL；换网络再试 |
| 登录成功但数据没恢复 | 云端本来就没数据 | 在旧设备上点「立即同步」再换设备 |
| 一直转圈没反应 | anon key 贴错了（少了字符） | 重新复制完整 key |

**国内访问提醒**：supabase.co 在国内部分网络下会慢或不通。如果登录一直失败，
先确认能不能打开 `https://supabase.com`，打不开就是网络问题，不是配置问题。

---

## 八、安全说明

- 行级安全（RLS）保证了：任何用户登录后，只能读写 `user_id = 自己的 uid` 那一行，
  看不到别人的数据
- 密码由 Supabase 的认证服务加密存储，前端不保存密码
- 前端只保存 `access_token` / `refresh_token`，存在浏览器 localStorage，
  退出登录会清除
- 如果要在多人共用的电脑上使用，用完记得退出
