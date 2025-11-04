const { expect } = require('chai');
const { createMarkdownRenderer } = require('../lib/markdown-renderer');

describe('Markdown Renderer - CJK Bold Support', function() {
  let md;

  beforeEach(function() {
    md = createMarkdownRenderer();
  });

  describe('中文书名号场景', function() {
    it('应该正确渲染 **《书名》**', function() {
      const input = '**《沙丘2》**';
      const output = md.render(input).trim();
      expect(output).to.equal('<p><strong>《沙丘2》</strong></p>');
    });

    it('应该正确渲染多个连续的书名加粗', function() {
      const input = '还看了**《坚如磐石》**和**《年会不能停》**';
      const output = md.render(input).trim();
      expect(output).to.equal('<p>还看了<strong>《坚如磐石》</strong>和<strong>《年会不能停》</strong></p>');
    });

    it('应该正确渲染行首的书名加粗', function() {
      const input = '**《周处除三害》**很合我胃口';
      const output = md.render(input).trim();
      expect(output).to.equal('<p><strong>《周处除三害》</strong>很合我胃口</p>');
    });
  });

  describe('中英文混合场景', function() {
    it('应该正确渲染包含英文的中文加粗', function() {
      const input = '**《头脑特工队2》**（Inside Out 2）';
      const output = md.render(input).trim();
      expect(output).to.equal('<p><strong>《头脑特工队2》</strong>（Inside Out 2）</p>');
    });

    it('应该正确渲染包含英文引号的加粗', function() {
      const input = '**黄西的脱口秀专场"This Asian Hates Asian Hate"**';
      const output = md.render(input).trim();
      expect(output).to.equal('<p><strong>黄西的脱口秀专场&quot;This Asian Hates Asian Hate&quot;</strong></p>');
    });

    it('应该正确渲染英文电影名', function() {
      const input = '看了1997年尼古拉斯·凯奇的**《空中监狱》**（Con Air）';
      const output = md.render(input).trim();
      expect(output).to.equal('<p>看了1997年尼古拉斯·凯奇的<strong>《空中监狱》</strong>（Con Air）</p>');
    });
  });

  describe('纯中文场景', function() {
    it('应该正确渲染纯中文加粗', function() {
      const input = '这是**中文**加粗';
      const output = md.render(input).trim();
      expect(output).to.equal('<p>这是<strong>中文</strong>加粗</p>');
    });

    it('应该正确渲染句首中文加粗', function() {
      const input = '**罗大佑的"同学会"巡回演唱会**是最难忘的';
      const output = md.render(input).trim();
      expect(output).to.equal('<p><strong>罗大佑的&quot;同学会&quot;巡回演唱会</strong>是最难忘的</p>');
    });

    it('应该正确渲染句中中文加粗', function() {
      const input = '我看了**巴黎奥运会闭幕式**的现场';
      const output = md.render(input).trim();
      expect(output).to.equal('<p>我看了<strong>巴黎奥运会闭幕式</strong>的现场</p>');
    });
  });

  describe('复杂标点场景', function() {
    it('应该正确渲染包含冒号的加粗', function() {
      const input = '**《007：幽灵党》**（Spectre）';
      const output = md.render(input).trim();
      expect(output).to.equal('<p><strong>《007：幽灵党》</strong>（Spectre）</p>');
    });

    it('应该正确渲染包含顿号的加粗', function() {
      const input = '**《疯狂的赛车》**和**《天下无贼》**';
      const output = md.render(input).trim();
      expect(output).to.equal('<p><strong>《疯狂的赛车》</strong>和<strong>《天下无贼》</strong></p>');
    });
  });

  describe('边界情况', function() {
    it('应该保留普通文本不变', function() {
      const input = '这是普通文本';
      const output = md.render(input).trim();
      expect(output).to.equal('<p>这是普通文本</p>');
    });

    it('应该正确处理单个星号', function() {
      const input = '这是*单个星号*的文本';
      const output = md.render(input).trim();
      // 由于我们禁用了emphasis,单个*应该保持原样
      expect(output).to.equal('<p>这是*单个星号*的文本</p>');
    });

    it('应该正确处理未闭合的双星号', function() {
      const input = '这是**未闭合的加粗';
      const output = md.render(input).trim();
      expect(output).to.equal('<p>这是**未闭合的加粗</p>');
    });

    it('应该正确处理空的加粗标记', function() {
      const input = '这是****空的加粗';
      const output = md.render(input).trim();
      // 空的加粗标记应该被渲染为空的strong
      expect(output).to.equal('<p>这是<strong></strong>空的加粗</p>');
    });

    it('应该正确处理多个段落', function() {
      const input = '第一段**加粗**文本\n\n第二段**加粗**文本';
      const output = md.render(input).trim();
      expect(output).to.equal('<p>第一段<strong>加粗</strong>文本</p>\n<p>第二段<strong>加粗</strong>文本</p>');
    });
  });

  describe('实际文章中的真实案例', function() {
    it('案例1: 《沙丘2》', function() {
      const input = '如果一定要有一个的话，我会选择**《沙丘2》**。';
      const output = md.render(input).trim();
      expect(output).to.equal('<p>如果一定要有一个的话，我会选择<strong>《沙丘2》</strong>。</p>');
    });

    it('案例2: 《黑铁的鱼影》', function() {
      const input = '照例看了每年的柯南剧场版**《黑铁的鱼影》**。';
      const output = md.render(input).trim();
      expect(output).to.equal('<p>照例看了每年的柯南剧场版<strong>《黑铁的鱼影》</strong>。</p>');
    });

    it('案例3: 《代号：白》', function() {
      const input = '间谍过家家剧场版**《代号：白》**比柯南更适合成年人';
      const output = md.render(input).trim();
      expect(output).to.equal('<p>间谍过家家剧场版<strong>《代号：白》</strong>比柯南更适合成年人</p>');
    });

    it('案例4: 《卧虎藏龙》', function() {
      const input = '第一次看李安的**《卧虎藏龙》**。';
      const output = md.render(input).trim();
      expect(output).to.equal('<p>第一次看李安的<strong>《卧虎藏龙》</strong>。</p>');
    });

    it('案例5: 《胡桃夹子》', function() {
      const input = '冬天在波士顿歌剧院看了节日限定的芭蕾**《胡桃夹子》**。';
      const output = md.render(input).trim();
      expect(output).to.equal('<p>冬天在波士顿歌剧院看了节日限定的芭蕾<strong>《胡桃夹子》</strong>。</p>');
    });
  });
});
