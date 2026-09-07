import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const SRC = 'src';
const WEB = process.argv.includes('--web');
const OUT = 'dist/index.html';

mkdirSync('build', { recursive: true });
mkdirSync('dist', { recursive: true });

// 按文件名顺序合并 src/ 下所有 .twee 文件
const files = readdirSync(SRC).filter((f) => f.endsWith('.twee')).sort();
if (files.length === 0) {
	console.error('src/ 下没有找到 .twee 文件');
	process.exit(1);
}
const merged = files.map((f) => readFileSync(`${SRC}/${f}`, 'utf8').trimEnd()).join('\n\n') + '\n';
writeFileSync('build/game.twee', merged, 'utf8');

// Offline embeds artwork; web loads same-origin artwork only when displayed.
const artManifestPath = 'assets/tower-art.json';
let artworkStyles = '';
if (existsSync(artManifestPath)) {
	const artworks = JSON.parse(readFileSync(artManifestPath, 'utf8'));
	if (!Array.isArray(artworks)) throw new Error('Artwork manifest must be an array');
	// Large image data URLs exceed some browsers' custom-property token limits.
	// Assign them directly to image properties with deterministic selectors.
	const artTargets = {
		'--tower-art': ['html .nousta-cover', 'linear-gradient(180deg, #0c1b2366, #0c1b2310 45%, #0c1b23bb)'],
		'--tower-art-past': ['.tower-shell[data-era="past"] .tower-heading', 'linear-gradient(180deg, #38271a33, #60432022 30%, #302920e8)'],
		'--tower-art-present': ['.tower-shell[data-era="present"] .tower-heading', 'linear-gradient(180deg, #101b2033, #101b2010 30%, #142326e8)']
	};
	const usedNames = new Set();
	const declarations = artworks.map((art) => {
		if (!art || typeof art.variable !== 'string' || !Object.hasOwn(artTargets, art.variable)
			|| typeof art.file !== 'string' || !/^assets\/[a-z0-9-]+\.(png|jpg|webp)$/.test(art.file)
			|| usedNames.has(art.variable)) throw new Error('Invalid or duplicate artwork entry');
		usedNames.add(art.variable);
		const data = readFileSync(art.file);
		const extension = art.file.split('.').at(-1);
		const mime = {png:'image/png', jpg:'image/jpeg', webp:'image/webp'}[extension];
		console.log(`  Artwork ${art.file}: ${Math.round(data.length / 1024)} KB`);
		const [selector, overlay] = artTargets[art.variable];
		let url = `data:${mime};base64,${data.toString('base64')}`;
		if (WEB) {
			mkdirSync('dist/assets', { recursive: true });
			copyFileSync(art.file, `dist/${art.file}`);
			url = art.file;
		}
		return `${selector} { background-image: ${overlay}, url("${url}"); }`;
	});
	artworkStyles = '\n\n:: 96-tower-art [stylesheet]\n' + declarations.join('\n') + '\n';
}

// ── 字体子集化（霞鹜文楷）────────────────────────────────────
// 收集游戏全部文本字符 + ASCII + 常用符号，生成 base64 内嵌 @font-face，
// 保持单文件 HTML 且不依赖外部 CDN。缺字体文件或 fonttools 时优雅跳过。
let mergedFinal = merged;
const fontOK = existsSync('vendor/fonts/LXGWWenKai-Regular.ttf');
if (fontOK && existsSync('vendor/fonts/LXGWWenKai-Medium.ttf')) {
	const EXTRA = [
		String.fromCharCode(...Array.from({ length: 95 }, (_, i) => 33 + i)), // ASCII 可见字符
		'，。、；：？！“”‘’（）《》〈〉【】〔〕—…·％＋－×÷＝℃°′″❤✔✘🎯✦☠☆★♦',
		'零一二三四五六七八九十百千万亿上中下左右前后',
	];
	const chars = new Set((merged + EXTRA.join('')));
	writeFileSync('build/font-chars.txt', [...chars].join(''), 'utf8');
	try {
		console.log('🔤 生成字体子集（LXGW WenKai）…');
		execSync('python3 scripts/subset_font.py build/font-chars.txt build/fontface.twee', { stdio: 'inherit' });
		let fontStyles = readFileSync('build/fontface.twee', 'utf8');
		if (WEB) {
			mkdirSync('dist/assets', { recursive: true });
			for (const name of ['Regular', 'Medium']) {
				const file = `wenkai-${name}.woff2`;
				copyFileSync(`build/${file}`, `dist/assets/${file}`);
				fontStyles = fontStyles.replace(/data:font\/woff2;base64,[A-Za-z0-9+/=]+/, `assets/${file}`);
			}
		}
		mergedFinal = merged + '\n\n' + fontStyles;
	} catch (e) {
		console.warn('⚠️  字体子集化失败（缺 fonttools/brotli?），使用系统字体回退：' + e.message.split('\n')[0]);
	}
} else {
	console.warn('⚠️  vendor/fonts 缺少字体文件，使用系统字体回退');
}
const hasEmbeddedFonts = mergedFinal !== merged;
mergedFinal += artworkStyles;
writeFileSync('build/game.twee', mergedFinal, 'utf8');

// 用 extwee 编译：Twee + SugarCube 格式 → 单文件 HTML
execSync(`npx extwee -c -i build/game.twee -o ${OUT} -s vendor/format.js`, {
	stdio: 'inherit',
});

console.log(`\n✔ 编译完成：${OUT}（合并了 ${files.length} 个源文件${hasEmbeddedFonts ? ' + 字体' : ''}${artworkStyles ? ' + 插画' : ''}）`);
console.log(WEB ? '  在线版：部署整个 dist 目录，图片和字体按需从同站加载。' : '  离线版：浏览器直接打开即可游玩；也可用 Twine 2 编辑器导入。');
