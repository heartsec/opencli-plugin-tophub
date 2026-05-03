/**
 * Tophub node list — DOM scraping.
 *
 * Lists source/category nodes from Tophub category pages such as /c/news or
 * /c/news?q=南方周末. Each node URL can then be used to inspect one concrete
 * leaderboard on tophub.today.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { CliError } from '@jackwener/opencli/errors';

const BASE_URL = 'https://tophub.today';

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildNodesUrl(args) {
  const explicitUrl = cleanText(args.url);
  if (explicitUrl) {
    if (/^https?:\/\//i.test(explicitUrl)) return explicitUrl;
    return new URL(explicitUrl, BASE_URL).href;
  }

  const category = cleanText(args.category) || 'news';
  const query = cleanText(args.query || args.q);
  const url = new URL(`/c/${category}`, BASE_URL);
  if (query) url.searchParams.set('q', query);
  return url.href;
}

cli({
  site: 'tophub',
  name: 'nodes',
  description: '今日热榜节点列表（信源/榜单分类/节点链接）',
  domain: 'tophub.today',
  strategy: Strategy.PUBLIC,
  browser: true,
  args: [
    { name: 'category', type: 'string', default: 'news', help: 'Tophub category slug, e.g. news, tech, ent, finance' },
    { name: 'query', type: 'string', default: '', help: 'Filter query, e.g. 南方周末, 抖音, 微博' },
    { name: 'q', type: 'string', default: '', help: 'Alias of --query' },
    { name: 'url', type: 'string', default: '', help: 'Explicit Tophub category/search URL, e.g. /c/news?q=南方周末' },
    { name: 'limit', type: 'int', default: 0, help: 'Max nodes to return; 0 means all rendered nodes' },
    { name: 'scrolls', type: 'int', default: 30, help: 'Max scroll attempts for lazy-loaded category pages' },
  ],
  columns: ['category', 'query', 'source', 'board', 'node_id', 'node_hash', 'node_url', 'item_count', 'updated_at', 'first_title'],
  func: async (page, args) => {
    const pageUrl = buildNodesUrl(args);
    const limit = Math.max(Number(args.limit) || 0, 0);
    const maxScrolls = Math.max(Number(args.scrolls) || 0, 0);
    await page.goto(pageUrl);
    await page.wait({ selector: '.cc-cd', timeout: 10000 });

    let stableRounds = 0;
    let previousCount = 0;
    for (let i = 0; i < maxScrolls && stableRounds < 3; i += 1) {
      const currentCount = Number(await page.evaluate('document.querySelectorAll(".cc-cd").length')) || 0;
      stableRounds = currentCount === previousCount ? stableRounds + 1 : 0;
      previousCount = currentCount;
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise(resolve => setTimeout(resolve, 700));
    }

    const nodes = await page.evaluate(`
      (() => {
        const cleanText = value => String(value || '').replace(/\\s+/g, ' ').trim();
        const toAbsoluteUrl = href => {
          if (!href) return '';
          try { return new URL(href, location.origin).href; } catch (_) { return href; }
        };

        return Array.from(document.querySelectorAll('.cc-cd')).map(card => {
          const nodeHref = card.querySelector('.cc-cd-is a')?.getAttribute('href') || '';
          const nodeUrl = toAbsoluteUrl(nodeHref);
          const nodeHash = nodeHref.split('/n/')[1]?.split(/[?#]/)[0] || '';
          const nodeId = card.id?.replace(/^node-/, '') || card.querySelector('[nodeid]')?.getAttribute('nodeid') || '';
          const items = Array.from(card.querySelectorAll('.cc-cd-cb-l > a'));

          return {
            source: cleanText(card.querySelector('.cc-cd-lb')?.textContent),
            board: cleanText(card.querySelector('.cc-cd-sb-st')?.textContent),
            node_id: nodeId,
            node_hash: nodeHash,
            node_url: nodeUrl,
            item_count: items.length,
            updated_at: cleanText(card.querySelector('.i-h span')?.textContent),
            first_title: cleanText(card.querySelector('.cc-cd-cb-l > a .t')?.textContent),
          };
        }).filter(node => node.source && node.board && node.node_url);
      })()
    `);

    const rows = (Array.isArray(nodes) ? nodes : []).map(node => ({
      category: cleanText(args.category) || 'news',
      query: cleanText(args.query || args.q),
      source: cleanText(node.source),
      board: cleanText(node.board),
      node_id: cleanText(node.node_id),
      node_hash: cleanText(node.node_hash),
      node_url: cleanText(node.node_url),
      item_count: node.item_count,
      updated_at: cleanText(node.updated_at),
      first_title: cleanText(node.first_title),
    }));

    if (rows.length === 0) {
      throw new CliError('NO_DATA', 'Could not retrieve Tophub nodes', 'Use a category/search page such as /c/news?q=南方周末, not a concrete /n/<hash> node page');
    }

    return limit > 0 ? rows.slice(0, limit) : rows;
  },
});

export { buildNodesUrl };