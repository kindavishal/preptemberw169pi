// Fetch a GitHub list endpoint across pages (GitHub caps per_page at 100),
// stopping at the first short page or `maxPages`. `fetchPath` is the caller's
// own request helper, so each route keeps its headers and token handling.
// `pathBase` must already contain a query string and `per_page=100`.
export async function ghPaginate(fetchPath, pathBase, maxPages = 4) {
  const items = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetchPath(`${pathBase}&page=${page}`);
    if (!res.ok) return { ok: false, status: res.status, items };
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) break;
    items.push(...arr);
    if (arr.length < 100) break;
  }
  return { ok: true, items };
}
