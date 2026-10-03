# site/ — 广告素材增长图鉴（本地完整版）

生成物，不要手改。源：`src/site/`（index.html / app.css / app.js）+ `docs/atlas/atlas.json`，构建脚本 `src/scripts/build_site.py`。

## 打开

`fetch` 在 `file://` 下不可用，必须起一个本地 http 服务：

```bash
cd site && python3 -m http.server 8000
# 浏览器打开 http://localhost:8000/#/
```

路由（hash，刷新可直达）：`#/` 精选 · `#/case/<note_id>` 详情 · `#/laws`、`#/laws/L01` 底层规律 · `#/algo`（可带锚点 `#/algo/arch`、`#/algo/exp-E9`）算法 · `#/library` 素材库 · `#/ref` 邻近参照入口 → `#/ref/cayson`（是Cayson）、`#/ref/screenstudio`（Screen Studio，X 平台演示视频），都不进统计。

也可以直接双击 `index.html`（file://）：数据从 `data/*.js` 镜像加载。

视频：`videos/` → `~/atlas-media/videos`、`videos-ss/` → `~/atlas-media/screenstudio` 是构建时建的软链，不是文件副本。构建时有 `<id>.mp4` 的视频案例才放播放器，其余显示「视频还没下载 · 在小红书看 ↗」；下载器补完后重跑 `build_site.py` 即可。

## 重建

数据链（atlas.json 只有 `build_atlas_data.py` 一个写入方）：

```bash
python3 src/scripts/build_atlas_data.py && python3 src/scripts/build_laws.py && \
python3 src/scripts/build_atlas_data.py && python3 src/scripts/render_case_md.py && python3 src/scripts/label_review.py
```

站点（iCloud：先在本地临时目录构建，再 rsync 回来）：

```bash
TMP=$(mktemp -d)
python3 src/scripts/build_site.py --out "$TMP/site" --covers <720px 封面目录，文件名 <note_id>.jpg>
# 没有 --covers 时沿用 --out/covers 里已有的 webp（先把 site/covers rsync 到 $TMP/site/covers）
rsync -a --delete "$TMP/site/" site/
```

单文件精选版（< 15 MB，给 Artifact 用；脚本不发布）：

```bash
python3 src/scripts/build_site.py --out "$TMP/site" --artifact "$TMP/atlas.html" --covers <同上>
```

## 内容与体量

- `data/core.json`：meta + 927 条精选的紧凑行（首屏只加载它）。
- `data/cases/00–63.json`：详情分片（`int(id[:8], 16) % 64`），点开案例时才加载。
- `data/laws.json`、`algo.json`、`ref.json`、`lists.json`：按路由加载。
- `data/library-0..3.json`：素材库 13,749 条，进 `#/library` 才加载；缩略图直接引用小红书原图链接（不缓存），加载失败显示「封面不可得」。
- `covers/<id>.webp`：精选层 914 张，360 px 宽、原比例；13 条封面不可得（广告专用笔记）用标题大字占位，首页默认隐藏、筛选「封面不可得」可见。
- `covers-ss/<id>.webp`：Screen Studio 40 张封面（从 `docs/reference/screenstudio/covers/` 复制）；`data/ss.json` 由 build_site 读 `screenstudio.json` 生成。

## 口径（页面上处处可见）

榜单只收录赢家 → 「赢家共性」；所有系数「相关，非因果」，附 R²；没有 GMV 数值；只看了封面和标题。是Cayson 167 条只在 `#/ref`，不进任何统计。

## Shared favorites (2026-10-04)

`#/favorites` is the shared cloud collection. Every gallery card, library material,
Screen Studio video and Cayson row has a star. Saving succeeds on the server before
navigation. Main favorites use existing cover annotations for the two axes;
unannotated entries remain in a separate section. Screen Studio keeps its own axes.

`api/favorites.js` uses the project's connected Vercel Blob store through OIDC
(`BLOB_STORE_ID`). Immutable per-operation records preserve cancellation history and
avoid whole-collection overwrite races. No browser-local favorites or credentials.
All visitors can add/remove, as this is a public shared collection. Exports are
available on the collection page. Blob retention survives normal redeployments;
do not disconnect/delete the store when deploying. The storage service's availability
and quota still apply; failures are shown and never acknowledged as saved.

`data/favorite-catalog.json` contains public display metadata and the allowed IDs.
When rebuilding the atlas, regenerate it and retain the API, favorites.js, navigation,
and star integration. Tests: `npm test`.
