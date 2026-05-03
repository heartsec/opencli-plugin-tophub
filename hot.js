/**
 * Tophub hot lists — DOM scraping.
 *
 * Scrapes rendered cards from tophub.today category/search pages and returns
 * the original outbound hot-item links.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { CliError } from '@jackwener/opencli/errors';

const PLATFORM_MAP = {
  douyin: '抖音',
  dy: '抖音',
  '抖音': '抖音',
  weibo: '微博',
  wb: '微博',
  '微博': '微博',
  weixin: '微信',
  wx: '微信',
  wechat: '微信',
  '微信': '微信',
  zhihu: '知乎',
  zh: '知乎',
  '知乎': '知乎',
  nanfangzhoumo: '南方周末',
  nfzm: '南方周末',
  '南方周末': '南方周末',
};

const DEFAULT_PLATFORMS = ['抖音', '微博', '微信', '知乎'];
const SUPPORTED_PLATFORMS = [...DEFAULT_PLATFORMS, '南方周末'];
const BASE_URL = 'https://tophub.today';

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizePlatforms(value) {
  if (!value || String(value).toLowerCase() === 'all') return DEFAULT_PLATFORMS;

  const platforms = String(value)
    .split(/[，,>\s]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => PLATFORM_MAP[item.toLowerCase()] || PLATFORM_MAP[item] || item);

  const unknown = platforms.filter(platform => !SUPPORTED_PLATFORMS.includes(platform));
  if (unknown.length > 0) {
    throw new CliError(
      'INVALID_ARGUMENT',
      `Unknown platform: ${unknown.join(', ')}`,
      `Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}; aliases: douyin,weibo,weixin,zhihu,nanfangzhoumo`
    );
  }

  return [...new Set(platforms)];
}

function buildCategoryUrl(platform) {
  return `${BASE_URL}/c/news?q=${encodeURIComponent(platform)}`;
}

cli({
  site: 'tophub',
  name: 'hot',
  description: '今日热榜热点链接（抖音/微博/微信/知乎/南方周末）',
  domain: 'tophub.today',
  strategy: Strategy.PUBLIC,
  browser: true,
  args: [
    {
      name: 'platform',
      type: 'string',
      default: 'douyin,weibo,weixin,zhihu',
      help: 'Platforms: all, douyin,weibo,weixin,zhihu,nanfangzhoumo or Chinese names separated by comma',
    },
    { name: 'limit', type: 'int', default: 0, help: 'Max items per board; 0 means all rendered items' },
  ],
  columns: ['platform', 'board', 'rank', 'title', 'heat', 'url', 'updated_at', 'node_id', 'item_id'],
  func: async (page, args) => {
    const platforms = normalizePlatforms(args.platform);
    const limit = Math.max(Number(args.limit) || 0, 0);
    const rows = [];

    for (const platform of platforms) {
      const pageUrl = buildCategoryUrl(platform);
      await page.goto(pageUrl);
      await page.wait({ selector: '.cc-cd', timeout: 10000 });

      const cards = await page.evaluate(`
        (() => {
          const cleanText = value => String(value || '').replace(/\\s+/g, ' ').trim();
          const toAbsoluteUrl = href => {
            if (!href) return '';
            try { return new URL(href, location.origin).href; } catch (_) { return href; }
          };

          return Array.from(document.querySelectorAll('.cc-cd')).map(card => {
            const source = cleanText(card.querySelector('.cc-cd-lb')?.textContent);
            const board = cleanText(card.querySelector('.cc-cd-sb-st')?.textContent);
            const nodeId = card.id?.replace(/^node-/, '') || card.querySelector('[nodeid]')?.getAttribute('nodeid') || '';
            const updatedAt = cleanText(card.querySelector('.i-h span')?.textContent);

            const items = Array.from(card.querySelectorAll('.cc-cd-cb-l > a')).map(link => ({
              rank: cleanText(link.querySelector('.s')?.textContent),
              title: cleanText(link.querySelector('.t')?.textContent),
              heat: cleanText(link.querySelector('.e')?.textContent),
              url: toAbsoluteUrl(link.getAttribute('href') || ''),
              item_id: link.getAttribute('itemid') || '',
            })).filter(item => item.title && item.url);

            return { source, board, node_id: nodeId, updated_at: updatedAt, items };
          });
        })()
      `);

      const matchedCards = Array.isArray(cards)
        ? cards.filter(card => cleanText(card.source) === platform && Array.isArray(card.items))
        : [];

      for (const card of matchedCards) {
        const items = limit > 0 ? card.items.slice(0, limit) : card.items;
        for (const item of items) {
          rows.push({
            platform,
            board: cleanText(card.board),
            rank: item.rank,
            title: item.title,
            heat: item.heat,
            url: item.url,
            updated_at: cleanText(card.updated_at),
            node_id: cleanText(card.node_id),
            item_id: cleanText(item.item_id),
          });
        }
      }
    }

    if (rows.length === 0) {
      throw new CliError('NO_DATA', 'Could not retrieve Tophub hot items', 'Tophub may have changed its DOM structure');
    }

    return rows;
  },
});

export { buildCategoryUrl, normalizePlatforms };