const MarkdownIt = require('markdown-it');

/**
 * 创建支持CJK加粗的markdown-it实例
 * @returns {MarkdownIt} 配置好的markdown-it实例
 */
function createMarkdownRenderer() {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: false
  });

  // 禁用默认的 emphasis 规则(它对中文支持不好)
  md.disable(['emphasis']);

  // 添加自定义的加粗处理规则，完美支持中文
  function customBold(state, silent) {
    const start = state.pos;
    const marker = state.src.charCodeAt(start);

    // 必须是 * (42)
    if (marker !== 0x2A /* * */) {
      return false;
    }

    // 必须是 **
    if (state.src.charCodeAt(start + 1) !== 0x2A) {
      return false;
    }

    // 查找结束的 **
    let pos = start + 2;
    while (pos < state.posMax) {
      if (state.src.charCodeAt(pos) === 0x2A &&
          state.src.charCodeAt(pos + 1) === 0x2A) {
        // 找到了结束标记

        if (!silent) {
          const token_o = state.push('strong_open', 'strong', 1);
          token_o.markup = '**';

          const token_t = state.push('text', '', 0);
          token_t.content = state.src.slice(start + 2, pos);

          const token_c = state.push('strong_close', 'strong', -1);
          token_c.markup = '**';
        }

        state.pos = pos + 2;
        return true;
      }
      pos++;
    }

    return false;
  }

  // 在默认的 emphasis 规则之前添加自定义规则
  md.inline.ruler.before('emphasis', 'custom_bold', customBold);

  return md;
}

module.exports = { createMarkdownRenderer };
