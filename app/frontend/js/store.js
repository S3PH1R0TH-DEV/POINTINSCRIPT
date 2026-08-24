// ============================================================
//  Stockage local (brouillons + cache) — POINTINSCRIPT
//  La synchronisation des rapports est gérée nativement par Firestore
//  (persistance hors-ligne) ; ici on garde les brouillons et le cache.
// ============================================================
const Store = (() => {
  const DRAFT_KEY = 'insc_drafts';          // brouillons par date
  const CACHE_KEY = 'admin_cache';          // dernier point consolidé (consultation hors-ligne)
  const LASTSEEN_KEY = 'admin_last_seen';   // timestamp (ms) du dernier point vu

  function getDrafts() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; } catch (e) { return {}; }
  }
  function setDraft(date, data) {
    const d = getDrafts();
    d[date] = data;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  }
  function getDraft(date) { return getDrafts()[date] || null; }

  function getCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
  }
  function setCache(v) { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); }

  function getLastSeen() { return Number(localStorage.getItem(LASTSEEN_KEY)) || 0; }
  function setLastSeen(ms) { localStorage.setItem(LASTSEEN_KEY, String(ms)); }

  return { getDrafts, setDraft, getDraft, getCache, setCache, getLastSeen, setLastSeen };
})();
