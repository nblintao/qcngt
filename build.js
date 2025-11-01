const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');
const { Liquid } = require('liquidjs');
const sass = require('sass');

// 初始化markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false
});

// 重写 md.render 以支持 CJK 无空格加粗/斜体
// markdown-it 默认要求 emphasis 标记前后有空格或标点，这对中文不友好
const originalRender = md.render.bind(md);
md.render = function(src, env) {
  // 在 CJK 字符和 **/** 之间插入零宽空格，使 markdown-it 能正确识别
  // 匹配模式：CJK字符 + ** 或 * （开始标记）
  src = src.replace(/([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])\*\*/g, '$1\u200B**');
  src = src.replace(/([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])(\*[^\*])/g, '$1\u200B$2');

  // 匹配模式：** 或 * + CJK字符（结束标记）
  src = src.replace(/\*\*([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])/g, '**\u200B$1');
  src = src.replace(/([^\*]\*)([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])/g, '$1\u200B$2');

  return originalRender(src, env);
};

// 配置
const config = {
  title: '青菜年糕汤',
  description: '一箪一瓢，一期一会。以文会友，以友辅仁。',
  logo: '/android-chrome-512x512.png',
  author: '青菜年糕汤',
  lang: 'zh-CN',
  url: 'https://qcngt.com',
  google_analytics: 'UA-147274890-1',
  comments: true
};

// 目录配置
const dirs = {
  posts: '_posts',
  layouts: '_layouts',
  site: '_site',
  assets: 'assets'
};

// 初始化Liquid模板引擎
const liquid = new Liquid({
  root: dirs.layouts,
  extname: '.html',
  cache: false
});

// 注册自定义标签 - SEO标签
liquid.registerTag('seo', {
  parse: function (token) { },
  render: function (ctx) {
    const page = ctx.get(['page']);
    const site = ctx.get(['site']);

    const title = page.title ? `${page.title} | ${site.title}` : site.title;
    const description = page.description || site.description;
    const url = `${site.url}${page.url || ''}`;
    const author = page.author || site.author;

    return `<title>${escapeHtml(title)}</title>
<meta name="generator" content="Node.js Static Site Generator" />
<meta property="og:title" content="${escapeHtml(page.title || site.title)}" />
<meta name="author" content="${escapeHtml(author)}" />
<meta property="og:locale" content="${site.lang.replace('-', '_')}" />
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${url}" />
<meta property="og:url" content="${url}" />
<meta property="og:site_name" content="${escapeHtml(site.title)}" />
<meta property="og:type" content="article" />
<meta property="article:published_time" content="${page.date ? page.date.toISOString() : ''}" />
<meta name="twitter:card" content="summary" />
<meta property="twitter:title" content="${escapeHtml(page.title || site.title)}" />
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BlogPosting","author":{"@type":"Person","name":"${escapeHtml(author)}"},"dateModified":"${page.date ? page.date.toISOString() : ''}","datePublished":"${page.date ? page.date.toISOString() : ''}","description":"${escapeHtml(description)}","headline":"${escapeHtml(page.title || site.title)}","mainEntityOfPage":{"@type":"WebPage","@id":"${url}"},"publisher":{"@type":"Organization","logo":{"@type":"ImageObject","url":"${site.url}${site.logo}"},"name":"${escapeHtml(site.title)}"},"url":"${url}"}</script>`;
  }
});

// 注册自定义标签 - post_url
liquid.registerTag('post_url', {
  parse: function (token) {
    this.postSlug = token.args.trim();
  },
  render: function (ctx) {
    const slug = this.postSlug;
    // 从全局posts获取
    const allPosts = ctx.getAll().allPosts || [];
    // 查找匹配的文章：支持完整文件名（带日期）或仅slug
    const post = allPosts.find(p => {
      const postFileName = p.path.replace('_posts/', '').replace('.md', '');
      return postFileName === slug || p.id.includes(slug) || p.url.includes(slug);
    });
    return post ? post.url : '#';
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 添加自定义过滤器
liquid.filters.date = (date, format) => {
  if (!date) return '';

  // 处理 'now' 关键字，表示当前时间
  const d = date === 'now' ? new Date() : new Date(date);

  // 处理中文日期格式
  if (format === '%Y年%-m月%-d日') {
    return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
  }
  if (format === '%Y') {
    return d.getFullYear().toString();
  }
  if (format === 'new Date(%Y, %-m - 1, %-d)') {
    return `new Date(${d.getFullYear()}, ${d.getMonth()}, ${d.getDate()})`;
  }

  // 默认ISO格式
  return d.toISOString();
};

liquid.filters.strip_html = (str) => {
  return str.replace(/<[^>]*>/g, '');
};

liquid.filters.strip_newlines = (str) => {
  return str.replace(/\n/g, '');
};

liquid.filters.size = (str) => {
  return str ? str.length : 0;
};

liquid.filters.divided_by = (num, divisor) => {
  return num / divisor;
};

liquid.filters.round = (num, precision = 0) => {
  const multiplier = Math.pow(10, precision);
  return Math.round(num * multiplier) / multiplier;
};

liquid.filters.plus = (num, add) => {
  return Number(num) + Number(add);
};

liquid.filters.append = (str, suffix) => {
  return str + suffix;
};

liquid.filters.remove = (str, pattern) => {
  if (!str) return '';
  return str.replace(new RegExp(pattern, 'g'), '');
};

liquid.filters.relative_url = (url) => {
  return url;
};

liquid.filters.absolute_url = (url) => {
  return url;
};

// 读取所有文章
function readPosts() {
  const postsDir = dirs.posts;
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

  const posts = files.map(file => {
    const filePath = path.join(postsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data, content: markdown } = matter(content);

    // 从文件名解析日期
    const match = file.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)\.md$/);
    if (!match) return null;

    const [, year, month, day, slug] = match;
    const date = new Date(Date.UTC(year, month - 1, day));

    return {
      title: data.title || slug,
      date: date,
      author: data.author || config.author,
      comments: data.comments !== undefined ? data.comments : config.comments,
      content: markdown,
      html: null, // 将在第二遍处理时渲染
      url: `/${year}/${month}/${day}/${slug}.html`,
      id: `/${year}/${month}/${day}/${slug}`,
      path: `_posts/${file}`,
      fileName: file, // 保存文件名用于排序
      ...data
    };
  }).filter(Boolean);

  // 按日期排序（最新在前），同一天按文件名倒序排序（与 Jekyll 一致）
  // Jekyll 假设文件名中数字越大表示越晚发布，所以倒序排列
  posts.sort((a, b) => {
    const dateDiff = b.date - a.date;
    if (dateDiff !== 0) return dateDiff;
    // 同一天，按文件名倒序（数字大的在前）
    return b.fileName.localeCompare(a.fileName);
  });

  return posts;
}

// 渲染文章内容（在所有文章读取后，这样post_url可以找到所有文章）
async function renderPostContent(posts) {
  for (const post of posts) {
    // 先用Liquid渲染Markdown中的标签
    const renderedMarkdown = await liquid.parseAndRender(post.content, {
      allPosts: posts
    });
    // 再用markdown-it渲染HTML
    post.html = md.render(renderedMarkdown);
  }
}

// 生成文章页面
async function generatePostPages(posts) {
  console.log('生成文章页面...');

  for (const post of posts) {
    const urlParts = post.url.split('/').filter(Boolean);
    const outputDir = path.join(dirs.site, ...urlParts.slice(0, -1));
    await fs.ensureDir(outputDir);

    // 检查是否存在对应的图片
    const imageName = post.path.replace('_posts/', '').replace('.md', '.JPG');
    const imagePath = `/assets/images/${imageName}`;
    const imageExists = fs.existsSync(path.join('.', 'assets', 'images', imageName));

    // 渲染post布局
    const postHtml = await liquid.renderFile('post', {
      page: post,
      content: post.html,
      allPosts: posts
    });

    // 渲染default布局
    const html = await liquid.renderFile('default', {
      page: { ...post, exist_image_path: imageExists ? imagePath : null },
      content: postHtml,
      site: { ...config, url: config.url },
      allPosts: posts
    });

    const outputPath = path.join(dirs.site, ...urlParts);
    await fs.writeFile(outputPath, html);
  }

  console.log(`✓ 已生成 ${posts.length} 篇文章`);
}

// 生成首页
async function generateIndex(posts) {
  console.log('生成首页...');

  // 计算总字数（使用渲染后的 HTML，与 Jekyll 行为一致）
  let charCount = 0;
  for (const post of posts) {
    // 使用 post.html（渲染后的 HTML）而不是 post.content（原始 markdown）
    // Jekyll 的 strip_html | strip_newlines 只做这两个操作，不做其他转换
    let text = post.html
      .replace(/<[^>]*>/g, '')  // strip_html: 去除 HTML 标签
      .replace(/\n/g, '');       // strip_newlines: 去除换行符
    charCount += text.length;
  }

  // 读取index.html模板
  const indexTemplate = await fs.readFile('index.html', 'utf-8');
  const { content: templateContent } = matter(indexTemplate);

  // 准备模板变量
  const latestDate = `${posts[0].date.getUTCFullYear()}年${posts[0].date.getUTCMonth() + 1}月${posts[0].date.getUTCDate()}日`;
  const wordCount = (charCount / 10000).toFixed(1);

  // 渲染index模板
  const indexContent = await liquid.parseAndRender(templateContent, {
    latest_date: latestDate,
    word_count: wordCount,
    site: { posts }
  });

  // 渲染default布局
  const html = await liquid.renderFile('default', {
    page: { title: config.title, url: '/' },
    content: indexContent,
    site: { ...config, url: config.url }
  });

  await fs.writeFile(path.join(dirs.site, 'index.html'), html);
  console.log('✓ 已生成首页');
}

// 生成track.html页面
async function generateTrackPage(posts) {
  console.log('生成更新记录页面...');

  // 读取track.html模板
  const trackTemplate = await fs.readFile('track.html', 'utf-8');
  const { data: trackData, content: templateContent } = matter(trackTemplate);

  // 反转posts数组(从旧到新)
  const reversedPosts = [...posts].reverse();

  const postDates = reversedPosts.map(p =>
    `new Date(${p.date.getFullYear()}, ${p.date.getMonth()}, ${p.date.getDate()})`
  ).join(',\n    ');

  const postWordCounts = reversedPosts.map(p => {
    // 使用 post.html（渲染后的 HTML）而不是 post.content（原始 markdown）
    // 这样与 Jekyll 的行为一致
    const text = p.html.replace(/<[^>]*>/g, '').replace(/\n/g, '');
    return text.length;
  }).join(',\n    ');

  // 渲染track模板
  const trackContent = await liquid.parseAndRender(templateContent, {
    post_dates: postDates,
    post_word_counts: postWordCounts
  });

  // 渲染default布局
  const html = await liquid.renderFile('default', {
    page: { title: trackData.title || '更新记录', url: '/track.html' },
    content: trackContent,
    site: { ...config, url: config.url }
  });

  await fs.writeFile(path.join(dirs.site, 'track.html'), html);
  console.log('✓ 已生成更新记录页面');
}

// 生成search.html页面
async function generateSearchPage() {
  console.log('生成搜索页面...');

  // 读取search.html模板
  const searchTemplate = await fs.readFile('search.html', 'utf-8');
  const { data: searchData, content: searchContent } = matter(searchTemplate);

  // 渲染default布局
  const html = await liquid.renderFile('default', {
    page: { title: searchData.title || '中文互联网搜索', url: '/search.html' },
    content: searchContent,
    site: { ...config, url: config.url }
  });

  await fs.writeFile(path.join(dirs.site, 'search.html'), html);
  console.log('✓ 已生成搜索页面');
}

// 编译SCSS
async function compileScss() {
  console.log('编译SCSS...');

  const scssFile = path.join(dirs.assets, 'css', 'style.scss');
  const result = sass.compile(scssFile);

  const outputDir = path.join(dirs.site, dirs.assets, 'css');
  await fs.ensureDir(outputDir);
  await fs.writeFile(path.join(outputDir, 'style.css'), result.css);

  console.log('✓ 已编译CSS');
}

// 复制静态文件
async function copyStaticFiles() {
  console.log('复制静态文件...');

  // 复制根目录的静态文件
  const staticFiles = [
    'android-chrome-192x192.png',
    'android-chrome-512x512.png',
    'apple-touch-icon.png',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'favicon.ico',
    'browserconfig.xml',
    'site.webmanifest',
    'safari-pinned-tab.svg',
    'mstile-70x70.png',
    'mstile-144x144.png',
    'mstile-150x150.png',
    'mstile-310x150.png',
    'mstile-310x310.png',
    'CNAME'
  ];

  for (const file of staticFiles) {
    if (fs.existsSync(file)) {
      await fs.copy(file, path.join(dirs.site, file));
    }
  }

  // 复制assets目录(除了scss文件)
  const assetsDir = dirs.assets;
  if (fs.existsSync(assetsDir)) {
    await fs.copy(assetsDir, path.join(dirs.site, assetsDir), {
      filter: (src) => {
        return !src.endsWith('.scss');
      }
    });
  }

  console.log('✓ 已复制静态文件');
}

// 生成 Atom feed（与 Jekyll Feed 插件兼容）
async function generateFeed(posts) {
  console.log('生成RSS feed...');

  const now = new Date().toISOString();
  const feedXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${config.lang}">
  <link href="${config.url}/feed.xml" rel="self" type="application/atom+xml"/>
  <link href="${config.url}/" rel="alternate" type="text/html" hreflang="${config.lang}"/>
  <updated>${now}</updated>
  <id>${config.url}/feed.xml</id>
  <title type="html">${escapeXml(config.title)}</title>
  <subtitle>${escapeXml(config.description)}</subtitle>
  <author>
    <name>${escapeXml(config.author)}</name>
  </author>
${posts.slice(0, 10).map(post => {
  // 提取摘要（去除HTML标签）
  const summary = post.html.replace(/<[^>]*>/g, '').trim().substring(0, 200);
  return `  <entry>
    <title type="html">${escapeXml(post.title)}</title>
    <link href="${config.url}${post.url}" rel="alternate" type="text/html" title="${escapeXml(post.title)}"/>
    <published>${post.date.toISOString()}</published>
    <updated>${post.date.toISOString()}</updated>
    <id>${config.url}${post.id}</id>
    <content type="html" xml:base="${config.url}${post.url}"><![CDATA[
${post.html}
]]></content>
    <author>
      <name>${escapeXml(config.author)}</name>
    </author>
    <summary type="html"><![CDATA[
${summary}
]]></summary>
  </entry>`;
}).join('\n')}
</feed>`;

  await fs.writeFile(path.join(dirs.site, 'feed.xml'), feedXml);
  console.log('✓ 已生成RSS feed');
}

// 生成sitemap.xml
async function generateSitemap(posts) {
  console.log('生成sitemap...');

  const today = new Date().toISOString().split('T')[0];

  const urls = [
    // 首页
    { loc: `${config.url}/`, lastmod: posts[0].date.toISOString().split('T')[0], changefreq: 'weekly', priority: '1.0' },
    // 更新记录页
    { loc: `${config.url}/track.html`, lastmod: today, changefreq: 'monthly', priority: '0.8' },
    // 搜索页
    { loc: `${config.url}/search.html`, lastmod: today, changefreq: 'monthly', priority: '0.8' },
    // 所有文章
    ...posts.map(post => ({
      loc: `${config.url}${post.url}`,
      lastmod: post.date.toISOString().split('T')[0],
      changefreq: 'yearly',
      priority: '0.6'
    }))
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  await fs.writeFile(path.join(dirs.site, 'sitemap.xml'), sitemapXml);
  console.log('✓ 已生成sitemap');
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 主构建函数
async function build() {
  console.log('开始构建...\n');

  // 清空并创建输出目录
  await fs.emptyDir(dirs.site);

  // 读取所有文章
  const posts = readPosts();
  console.log(`找到 ${posts.length} 篇文章\n`);

  // 渲染文章内容（需要在所有文章读取后，这样post_url可以引用其他文章）
  await renderPostContent(posts);

  // 生成各种页面
  await generatePostPages(posts);
  await generateIndex(posts);
  await generateTrackPage(posts);
  await generateSearchPage();
  await generateFeed(posts);
  await generateSitemap(posts);

  // 编译样式
  await compileScss();

  // 复制静态文件
  await copyStaticFiles();

  console.log('\n构建完成! 输出目录: _site/');
}

// 运行构建
build().catch(err => {
  console.error('构建失败:', err);
  process.exit(1);
});
