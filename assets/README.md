# 诺斯塔之塔插画与生成记录

本次使用内置 imagegen 生成/编辑三张实际游戏插画，并人工检查构图、时代对应和浏览器显示。不是用 CSS/SVG 冒充生成贴图。UI 的地图与纹理、边框由 HTML/CSS 表现；本包没有为每个房间绘制独立插画。

- `nousta-cover.png`：双时态高塔封面，1536×1024。
- `nousta-past.png`：暖光、完整楼梯与哥布林时期的塔内环境，1536×1024。
- `nousta-present.png`：以上一张为编辑参考，保留同一视点与建筑结构，转换为冷色荒塔，1536×1024。

这些 AI 生成插画作为本项目塔篇新增内容按 CC BY-SA 4.0 发布。原模组署名与许可见 ../docs/NOUSTA.md。没有复制原作地图图片进游戏。

`tower-art.json` 是构建输入。`build.mjs` 将 PNG 内嵌到单文件 HTML 的背景属性；不依赖 CDN 或运行时图片请求。大数据 URI 不存进 CSS 自定义变量，避免浏览器丢弃超长变量。原图未裁剪或改写，实际页面用 CSS cover 布局。文件约 14 MB，包含全部插画、字体与引擎。

## 最终提示词

### 封面（新生成）

Use case: illustration-story. Asset type: final wide landscape cover illustration for a standalone Chinese fantasy narrative puzzle game, Nousta's Tower. Create a beautiful hand-painted dark storybook game illustration, NOT a UI mockup. A tall narrow medieval stone tower, seen in three-quarter view at dusk above a misty forest; one continuous architecture subtly shifts across time: its left side alive with warm amber windows, intact carved timber and tiny distant goblin silhouettes, its right side weathered ivy stone and cold moonlit blue-grey ruins. At the top under cramped wooden rafters a restrained glimpse of a copper-red dragon's curled silhouette and watchful eye, suggesting a creature too large for a small tower, no combat. Foreground a worn spiral staff with a small pale cyan glow rests by the stone threshold, distant tiny anonymous cloaked traveller for scale. Rich ink outlines, layered gouache, engraved crosshatching and tactile paper grain, high craft indie game key art, atmospheric depth, restrained gold and petrol blue palette, legible central silhouette. Compose wide approximately 1536x1024, tower occupies middle-right, generous shadowy negative space at left for real HTML title overlay. No letters, no labels, no logo, no watermark, no modern objects. Detailed illustration intended as a real game asset.

### 过去（新生成）

Use case: illustration-story. Asset type: wide in-game environment illustration, the PAST of Nousta's Tower, an atmospheric standalone narrative puzzle game. A medieval stone tower interior looking across a spiral stairwell and three visible small landings: warm amber lamplight, intact oak beams, shelves of herbs and old dragon-rearing books, a floating bead of black ink near an arcane wall mark, worn copper serving trays and a shield on the far wall. Glimpse of distant goblin silhouettes working far away, no close people. The eye follows a narrow rising stairway into mysterious darkness above. Dense hand-drawn ink engraving and painted gouache, tactile weathered paper, muted brass/copper, deep umber shadows, subtle dust. Beautiful hand-crafted fantasy indie game scene, not glossy 3D, not UI, no lettering or captions or numbers, no logos. Wide landscape 1536x1024, readable important shapes centered so can be used as a shallow panoramic banner, rich but not cluttered, no modern items.

### 现在（编辑过去图）

Edit this final game illustration to show the SAME tower stairwell centuries later in the PRESENT. Preserve exactly the architectural viewpoint, spiral stair orientation and placement, central bridge/landings, left bookshelf mass, right shield hooks, painterly ink/gouache engraved texture and wide 1536x1024 composition. The amber lamps are now extinguished, all goblins gone. Cold diffuse blue-grey moonlight streams through small broken openings, ivy threads through empty shelves, most books and trays have decayed, shield is missing leaving its silhouette on soot-dark wall. The same wall rune is faintly visible with a small suspended black ink bead. Keep the walkway and stairs traversable with rubble at sides only. Quiet haunted exploration atmosphere, subtle silver dust, soft teal-grey light with tiny faded old bronze details. No dragon, no people, no text, no letters or captions or watermark. This is a paired past/present environment illustration for the same narrative puzzle game.
