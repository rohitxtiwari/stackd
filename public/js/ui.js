import { state } from './state.js';
import { apiFetch, accessToken, refreshToken, setTokens, clearTokens } from './api.js';
import { EMOJIS, BADGE_COLORS, LOGO_BG, showToast, cardBg } from './utils.js';
import { navigate } from './router.js';

export function updateAuthNav() {
  const u = state.user;
  const navAuth = document.getElementById('navAuth');
  const navUser = document.getElementById('navUser');
  const dashNavBtn = document.getElementById('dashNavBtn');
  
  if (navAuth) navAuth.style.display = u ? 'none' : 'flex';
  if (navUser) {
    navUser.style.display = u ? 'flex' : 'none';
    if (u) {
      document.getElementById('navUserName').innerHTML = `${u.name} ${u.isVerified ? '<span style="color:var(--blue);font-size:12px;margin-left:4px;">✅</span>' : ''}`;
      document.getElementById('navAvatar').textContent = u.name.charAt(0).toUpperCase();
      if (dashNavBtn) dashNavBtn.style.display = 'block';
    } else {
      if (dashNavBtn) dashNavBtn.style.display = 'none';
    }
  }
}

export function startupCardHTML(s, large = false) {
  const idx = state.startups.indexOf(s) === -1 ? 0 : state.startups.indexOf(s);
  const em = EMOJIS[s.industry] || '🚀';
  return `<div class="${large ? 'startup-card-lg' : 'startup-card'}" onclick="app.openStartup('${s._id}')">
    <div class="card-header">
      <div class="card-logo" style="background:${cardBg(idx)}">${em}</div>
      <div>
        <div class="card-title" style="display:flex;align-items:center;gap:4px;">
          ${s.name} ${s.isVerified ? '<span style="color:var(--blue);font-size:14px;">✅</span>' : ''}
        </div>
        <div class="card-tagline">${s.tagline}</div>
      </div>
    </div>
    ${large ? `<div class="card-desc">${s.description?.slice(0, 100) || s.desc?.slice(0, 100) || ''}...</div>` : ''}
    <div class="card-footer">
      <span class="badge ${BADGE_COLORS[s.industry] || 'badge-teal'}">${s.industry}</span>
      <span class="badge ${BADGE_COLORS[s.fundingStage] || 'badge-gold'}">${s.fundingStage}</span>
      <div class="card-stats">
        <span class="card-stat">♥ ${(s.likes || []).length}</span>
        <span class="card-stat">👁 ${((s.views || 0) / 1000).toFixed(1)}k</span>
      </div>
    </div>
  </div>`;
}

export function renderLanding() {
  const container = document.getElementById('landingCards');
  if (!container) return;
  const trending = [...state.startups].sort((a, b) => ((b.likes || []).length) - ((a.likes || []).length)).slice(0, 4);
  container.innerHTML = trending.map(s => startupCardHTML(s)).join('');
}

export async function renderExplore() {
  const filterRow = document.getElementById('filterRow');
  if (!filterRow) return;
  const stages = ['All stages', 'Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B'];
  const industries = ['All industries', 'AI / ML', 'Fintech', 'Health', 'Climate', 'SaaS', 'EdTech', 'Consumer', 'Web3'];
  
  filterRow.innerHTML = stages.map(s =>
    `<div class="filter-chip ${(!state.filterStage && s === 'All stages') || (state.filterStage === s) ? 'active' : ''}" onclick="app.setStageFilter('${s}')">${s}</div>`
  ).join('') + industries.map(i =>
    `<div class="filter-chip ${(!state.filterIndustry && i === 'All industries') || (state.filterIndustry === i) ? 'active' : ''}" onclick="app.setIndFilter('${i}')">${i}</div>`
  ).join('');
  
  await filterStartups();
}

export async function filterStartups() {
  state.search = document.getElementById('searchInput')?.value || '';
  const q = new URLSearchParams();
  if (state.search) q.append('search', state.search);
  if (state.filterIndustry && state.filterIndustry !== 'All industries') q.append('industry', state.filterIndustry);
  if (state.filterStage && state.filterStage !== 'All stages') q.append('fundingStage', state.filterStage);
  
  const res = await apiFetch('/startups?' + q.toString());
  let results = [];
  if (res.success) {
    results = res.startups || res.data.startups || res.data || [];
  }
  const grid = document.getElementById('exploreGrid');
  if (!grid) return;
  if (results.length === 0) { 
    grid.innerHTML = '<div class="no-results" style="grid-column:1/-1">No startups match your filters.</div>'; 
    return; 
  }
  grid.innerHTML = results.map(s => startupCardHTML(s, true)).join('');
}

export async function renderStartupDetail(id, incView = true) {
  state.currentStartup = id;
  const res = await apiFetch(`/startups/${id}${incView ? '' : '?inc=false'}`);
  if (!res.success) return;
  const s = res.startup || res.data.startup || res.data;
  
  // Sync back to global state
  const globalIdx = state.startups.findIndex(x => x._id === s._id);
  if (globalIdx !== -1) state.startups[globalIdx] = s;
  
  const commentsRes = await apiFetch(`/interactions/comments/${id}`);
  state.comments = commentsRes.success ? (commentsRes.comments || commentsRes.data.comments || commentsRes.data) : [];
  
  const idx = state.startups.findIndex(x => x._id === id);
  const em = EMOJIS[s.industry] || '🚀';
  
  const liked = state.user && s.likes ? s.likes.includes(state.user._id) : state.likedStartups.has(id);
  const bookmarked = state.user && state.user.bookmarks ? 
    state.user.bookmarks.some(b => (b._id || b) === id) : 
    state.bookmarkedStartups.has(id);
  
  const backTo = state.prevPage === 'dashboard' ? '/dashboard' : '/explore';
  const backLabel = state.prevPage === 'dashboard' ? 'Back to dashboard' : 'Back to explore';
  
  const detailContent = document.getElementById('detailContent');
  if (!detailContent) return;
  
  detailContent.innerHTML = `
    <button class="detail-back" onclick="app.navigate('${backTo}')">← ${backLabel}</button>
    <div class="detail-hero">
      <div class="detail-logo-row">
        <div class="detail-logo" style="background:${cardBg(idx >= 0 ? idx : 0)}">${em}</div>
        <div>
          <div class="detail-title" style="display:flex;align-items:center;gap:8px;">
            ${s.name} ${s.isVerified ? '<span style="color:var(--blue);font-size:18px;">✅</span>' : ''}
          </div>
          <div class="detail-tagline">${s.tagline}</div>
        </div>
      </div>
      
      <div class="role-tabs" style="margin-top:20px;margin-bottom:0;">
        <div class="role-tab active" id="tab-info" onclick="app.switchDetailTab('info')">Overview</div>
        <div class="role-tab" id="tab-deck" onclick="app.switchDetailTab('deck')">Pitch Deck</div>
      </div>

      <div id="detail-info-content">
        <div class="detail-badges" style="margin-top:20px;">
          <span class="badge ${BADGE_COLORS[s.industry] || 'badge-teal'}">${s.industry}</span>
          <span class="badge ${BADGE_COLORS[s.fundingStage] || 'badge-gold'}">${s.fundingStage}</span>
          <span class="badge badge-gold">📍 ${s.location || 'Remote'}</span>
        </div>
        <div class="detail-desc">${s.description || s.desc || ''}</div>
        ${s.website ? `<div style="margin-top:16px"><a href="${s.website}" target="_blank" style="font-size:13px; color:var(--accent)">Visit website →</a></div>` : ''}
        <button class="btn-secondary" style="margin-top:16px;padding:6px 12px;font-size:12px;" onclick="app.openMessageModal('${s.founder?._id || s.founder}', '${s.founder?.name || 'Founder'}')">✉️ Message Founder</button>
      </div>

      <div id="detail-deck-content" style="display:none;margin-top:20px;">
        ${s.pitchDeckUrl ? `
          <iframe src="${s.pitchDeckUrl}" style="width:100%;height:400px;border-radius:var(--r);border:none;"></iframe>
        ` : `
          <div class="empty-state" style="padding:40px 0;">
            <div class="big">📂</div>
            <p>Pitch deck is private or not uploaded yet.<br>Request access via message.</p>
          </div>
        `}
      </div>
    </div>
    <div class="detail-metrics">
      <div class="metric-card"><div class="metric-label">TOTAL VIEWS</div><div class="metric-val">${(s.views || 0).toLocaleString()}</div></div>
      <div class="metric-card"><div class="metric-label">UPVOTES</div><div class="metric-val" id="metricLikes">${(s.likes || []).length}</div></div>
      <div class="metric-card"><div class="metric-label">COMMENTS</div><div class="metric-val">${state.comments.length}</div></div>
    </div>
    <div class="detail-actions">
      <button class="action-btn ${liked ? 'liked' : ''}" id="likeBtn" onclick="app.toggleLike('${id}')">
        ${liked ? '♥ Liked' : '♡ Upvote'} (<span id="btnLikes">${(s.likes || []).length}</span>)
      </button>
      <button class="action-btn ${bookmarked ? 'bookmarked' : ''}" id="bmBtn" onclick="app.toggleBookmark('${id}')">
        ${bookmarked ? '★ Saved' : '☆ Save'}
      </button>
      ${state.user?.role === 'investor' ? `
        <button class="action-btn ${state.user.dealFlow?.some(d => (d.startup?._id || d.startup) === id) ? 'bookmarked' : ''}" onclick="app.addToDealFlow('${id}')">
          ${state.user.dealFlow?.some(d => (d.startup?._id || d.startup) === id) ? '📈 Tracking' : '📈 Track Deal'}
        </button>
      ` : ''}
    </div>
    <div class="comments-section">
      <div style="font-size:14px;font-weight:600;margin-bottom:14px;">Discussion</div>
      ${state.user ? `<div class="comment-input-row">
        <input class="comment-input" id="commentInput" placeholder="Share your thoughts...">
        <button class="btn-primary" style="font-size:12px;padding:8px 14px;" onclick="app.postComment('${id}')">Post</button>
      </div>` : `<div style="font-size:13px;color:var(--text3);margin-bottom:16px;padding:12px;background:var(--bg2);border-radius:var(--r);">
        <button onclick="app.navigate('/login')" style="background:none;border:none;color:var(--accent);cursor:pointer;font-family:var(--font);font-size:13px;font-weight:500;">Sign in</button> to join the discussion
      </div>`}
      <div id="commentsList">${state.comments.length === 0 ? '<div style="font-size:13px;color:var(--text3);padding:12px 0;">Be the first to comment</div>' : state.comments.map(c => commentHTML(c)).join('')}</div>
    </div>`;
}

export function commentHTML(c) {
  const userName = c.user?.name || 'Unknown';
  const initials = userName.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['#E1F5EE', '#EEEDFE', '#FAECE7', '#E6F1FB'];
  const bg = colors[userName.length % colors.length];
  return `<div class="comment"><div class="comment-avatar" style="background:${bg}">${initials}</div><div class="comment-body"><div class="comment-meta"><span style="cursor:pointer;color:var(--accent)" onclick="app.navigate('/user/${c.user?._id || c.user}')">${userName}</span> <span style="font-weight:400;color:var(--text3);font-size:11px;margin-left:6px;">${new Date(c.createdAt).toLocaleDateString()}</span></div><div class="comment-text">${c.content}</div></div></div>`;
}

export async function renderDashboard() {
  if (!state.user) { navigate('/login'); return; }
  const u = state.user;
  document.getElementById('dashRoleLabel').textContent = u.role.toUpperCase();
  document.getElementById('dashWelcome').innerHTML = `Welcome back, ${u.name.split(' ')[0]} ${u.isVerified ? '<span style="color:var(--blue);font-size:16px;margin-left:4px;">✅</span>' : ''}`;
  
  const isFounder = u.role === 'founder';
  const isInvestor = u.role === 'investor';
  const isAdmin = u.role === 'admin';
  
  document.getElementById('dnListings').style.display = isFounder ? 'flex' : 'none';
  document.getElementById('dnSaved').style.display = isInvestor ? 'flex' : 'none';
  document.getElementById('dnDealflow').style.display = isInvestor ? 'flex' : 'none';
  document.getElementById('dnUsers').style.display = isAdmin ? 'flex' : 'none';
  
  const dashNewBtn = document.getElementById('dashNewBtn');
  if (dashNewBtn) dashNewBtn.style.display = isFounder ? 'block' : 'none';

  if (isFounder) {
    let mine = state.startups.filter(s => s.founder === u._id || (s.founder?._id === u._id));
    const totalViews = mine.reduce((a, s) => a + (s.views || 0), 0);
    const totalLikes = mine.reduce((a, s) => a + (s.likes || []).length, 0);
    document.getElementById('dashMetrics').innerHTML = `
      <div class="dash-metric"><div class="dash-metric-label">STARTUPS LISTED</div><div class="dash-metric-val">${mine.length}</div></div>
      <div class="dash-metric"><div class="dash-metric-label">TOTAL VIEWS</div><div class="dash-metric-val">${totalViews.toLocaleString()}</div></div>
      <div class="dash-metric"><div class="dash-metric-label">UPVOTES</div><div class="dash-metric-val">${totalLikes}</div></div>`;
    document.getElementById('dashRecentContent').innerHTML = `<div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--text2);">RECENT ACTIVITY</div>` + mine.slice(0, 3).map(s => `
      <div class="listing-row" onclick="app.openStartup('${s._id}')">
        <div class="listing-logo" style="background:${cardBg(state.startups.indexOf(s))}">${EMOJIS[s.industry] || '🚀'}</div>
        <div class="listing-info">
          <div class="listing-name" style="display:flex;align-items:center;gap:4px;">${s.name} ${s.isVerified ? '<span style="color:var(--blue);font-size:11px;">✅</span>' : ''}</div>
          <div class="listing-sub">${s.views || 0} views · ${(s.likes || []).length} likes</div>
        </div>
        <span class="badge ${BADGE_COLORS[s.fundingStage] || 'badge-teal'}">${s.fundingStage}</span>
      </div>`).join('');
  } else if (isInvestor) {
    const res = await apiFetch('/interactions/bookmarks');
    let saved = res.success ? (res.bookmarks || res.data.bookmarks || res.startups || res.data) : [];
    
    // Smart recommendations based on industry interests + popularity
    const recommended = state.startups
      .filter(s => !saved.some(b => (b._id || b) === s._id))
      .sort((a,b) => {
        const aInt = u.interests?.includes(a.industry) ? 1 : 0;
        const bInt = u.interests?.includes(b.industry) ? 1 : 0;
        if (aInt !== bInt) return bInt - aInt;
        return ((b.likes || []).length) - ((a.likes || []).length);
      })
      .slice(0, 3);

    document.getElementById('dashMetrics').innerHTML = `
      <div class="dash-metric"><div class="dash-metric-label">SAVED</div><div class="dash-metric-val">${saved.length}</div></div>
      <div class="dash-metric"><div class="dash-metric-label">MESSAGES</div><div class="dash-metric-val">${state.messages.length}</div></div>
      <div class="dash-metric"><div class="dash-metric-label">INTERESTS</div><div class="dash-metric-val">${u.interests?.length || 0}</div></div>`;
    
    document.getElementById('dashRecentContent').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div>
          <div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--text2);">RECENTLY SAVED</div>
          ${saved.length ? saved.slice(0, 3).map(s => `
            <div class="listing-row" onclick="app.openStartup('${s._id}')">
              <div class="listing-logo" style="background:${cardBg(0)}">${EMOJIS[s.industry] || '🚀'}</div>
              <div class="listing-info">
                <div class="listing-name" style="display:flex;align-items:center;gap:4px;">${s.name} ${s.isVerified ? '<span style="color:var(--blue);font-size:11px;">✅</span>' : ''}</div>
                <div class="listing-sub">${s.fundingStage}</div>
              </div>
            </div>`).join('') : '<div style="font-size:12px;color:var(--text3)">No saved startups</div>'}
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--text2);">RECOMMENDED FOR YOU</div>
          ${recommended.map(s => `
            <div class="listing-row" onclick="app.openStartup('${s._id}')">
              <div class="listing-logo" style="background:${cardBg(state.startups.indexOf(s))}">${EMOJIS[s.industry] || '🚀'}</div>
              <div class="listing-info">
                <div class="listing-name" style="display:flex;align-items:center;gap:4px;">${s.name} ${s.isVerified ? '<span style="color:var(--blue);font-size:11px;">✅</span>' : ''}</div>
                <div class="listing-sub">${s.industry}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    
    renderDealflow();
  } else if (isAdmin) {
    const usersRes = await apiFetch('/users');
    if (usersRes.success) state.allUsers = usersRes.users || usersRes.data.users || usersRes.data;
    document.getElementById('dashMetrics').innerHTML = `
      <div class="dash-metric"><div class="dash-metric-label">TOTAL STARTUPS</div><div class="dash-metric-val">${state.startups.length}</div></div>
      <div class="dash-metric"><div class="dash-metric-label">TOTAL USERS</div><div class="dash-metric-val">${state.allUsers.length}</div></div>`;
    document.getElementById('dashRecentContent').innerHTML = '';
  }
  
  renderMyListings(); renderSaved(); renderLiked(); renderAdminUsers(); renderProfile();
  
  if (state.user) {
    document.getElementById('set-name').value = u.name || '';
    document.getElementById('set-bio').value = u.bio || '';
    document.getElementById('set-location').value = u.location || '';
    document.getElementById('set-website').value = u.website || '';
    app.fetchInbox();
  }
  app.showDash('overview');
}

export function renderMyListings() {
  if (!state.user) return;
  const mine = state.startups.filter(s => s.founder === state.user._id || (s.founder?._id === state.user._id));
  const el = document.getElementById('myListings');
  if (!el) return;
  if (mine.length === 0) { el.innerHTML = '<div class="empty-state"><div class="big">🚀</div><p>No startups listed yet.<br>Click "+ New startup" to get started.</p></div>'; return; }
  el.innerHTML = mine.map(s => `
    <div class="listing-row">
      <div class="listing-logo" style="background:${cardBg(0)}">${EMOJIS[s.industry] || '🚀'}</div>
      <div class="listing-info">
        <div class="listing-name" style="display:flex;align-items:center;gap:4px;">${s.name} ${s.isVerified ? '<span style="color:var(--blue);font-size:11px;">✅</span>' : ''}</div>
        <div class="listing-sub">${s.views || 0} views · ${(s.likes || []).length} likes · ${s.fundingStage}</div>
      </div>
      <div class="listing-actions">
        <button class="icon-btn" onclick="app.openStartup('${s._id}')">View</button>
        <button class="icon-btn" onclick="app.openEditStartup('${s._id}')">Edit</button>
        <button class="icon-btn danger" onclick="app.deleteStartup('${s._id}')">Delete</button>
      </div>
    </div>`).join('');
}

export async function renderSaved() {
  const el = document.getElementById('savedListings');
  if (!el) return;
  const res = await apiFetch('/interactions/bookmarks');
  const saved = res.success ? (res.bookmarks || res.data.bookmarks || res.startups || res.data) : [];
  if (saved.length === 0) { el.innerHTML = '<div class="empty-state"><div class="big">☆</div><p>No saved startups yet.<br>Explore and bookmark ones you like.</p></div>'; return; }
  el.innerHTML = saved.map(s => `
    <div class="listing-row" onclick="app.openStartup('${s._id}')">
      <div class="listing-logo" style="background:${cardBg(0)}">${EMOJIS[s.industry] || '🚀'}</div>
      <div class="listing-info">
        <div class="listing-name" style="display:flex;align-items:center;gap:4px;">${s.name} ${s.isVerified ? '<span style="color:var(--blue);font-size:11px;">✅</span>' : ''}</div>
        <div class="listing-sub">${s.tagline}</div>
      </div>
    </div>`).join('');
}

export function renderAdminUsers() {
  const el = document.getElementById('adminUsers');
  if (!el) return;
  el.innerHTML = state.allUsers.map(u => `<div class="listing-row"><div class="nav-avatar" style="width:34px;height:34px;font-size:13px;">${u.name.charAt(0)}</div><div class="listing-info"><div class="listing-name">${u.name}</div><div class="listing-sub">${u.email} · ${u.role}</div></div><span class="badge ${u.role === 'founder' ? 'badge-teal' : u.role === 'investor' ? 'badge-purple' : 'badge-coral'}">${u.role}</span></div>`).join('');
}

export function renderProfile() {
  const el = document.getElementById('profileContent');
  if (!el || !state.user) return;
  const u = state.user;
  el.innerHTML = `<div style="background:var(--bg);border:0.5px solid var(--border);border-radius:var(--rl);padding:24px;">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
      <div class="nav-avatar" style="width:56px;height:56px;font-size:22px;">${u.name.charAt(0)}</div>
      <div><div style="font-size:18px;font-weight:700;">${u.name}</div><div style="font-size:13px;color:var(--text2);margin-top:4px;">${u.email}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="dash-metric"><div class="dash-metric-label">ROLE</div><div style="font-size:14px;font-weight:600;margin-top:4px;">${u.role.charAt(0).toUpperCase() + u.role.slice(1)}</div></div>
      <div class="dash-metric"><div class="dash-metric-label">MEMBER SINCE</div><div style="font-size:14px;font-weight:600;margin-top:4px;">${new Date(u.createdAt).toLocaleDateString()}</div></div>
    </div>
  </div>`;
}

export function renderDealflow() {
  const el = document.getElementById('dealflowContent');
  if (!el || !state.user) return;
  const df = state.user.dealFlow || [];
  if (df.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="big">📈</div>
        <p>Your deal flow is empty.<br>Start adding startups to track your investment pipeline.</p>
      </div>`;
    return;
  }
  const statuses = ['Interested', 'In Diligence', 'Invested', 'Passed'];
  el.innerHTML = `
    <div class="dealflow-table">
      ${df.map(item => `
        <div class="listing-row">
          <div class="listing-info">
            <div class="listing-name">${item.startup?.name || 'Startup'}</div>
            <div class="listing-sub" style="display:flex;align-items:center;gap:8px;">
              <span>${item.notes || 'No notes added'}</span>
              <button class="icon-btn" style="font-size:10px;padding:2px 4px;" onclick="app.editDealNotes('${item.startup?._id}', '${(item.notes || '').replace(/'/g, "\\'")}')">Edit</button>
            </div>
          </div>
          <div class="listing-actions">
            <select class="form-select" style="font-size:12px;padding:4px 8px;width:auto;" onchange="app.updateDealStatus('${item.startup?._id}', this.value)">
              ${statuses.map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
      `).join('')}
    </div>`;
}

export function renderStartupProfile(s) {
  // Logic for individual startup profile if needed
}

export async function renderUserProfile(userId) {
  const res = await apiFetch(`/users/${userId}`);
  if (!res.success) return showToast('User not found');
  const u = res.user || res.data.user || res.data;
  const el = document.getElementById('userProfileContent');
  if (!el) return;
  
  el.innerHTML = `
    <div style="background:var(--bg);border:0.5px solid var(--border);border-radius:var(--rl);padding:32px;text-align:center;">
      <div class="nav-avatar" style="width:80px;height:80px;font-size:32px;margin:0 auto 16px;">${u.name[0]}</div>
      <div style="font-size:24px;font-weight:700;">${u.name}</div>
      <div style="font-size:14px;color:var(--text2);margin-top:4px;">${u.role.toUpperCase()}</div>
      ${u.bio ? `<div style="margin-top:16px;font-size:14px;">${u.bio}</div>` : ''}
      <div style="margin-top:24px;display:flex;justify-content:center;gap:12px;">
        ${u.website ? `<a href="${u.website}" target="_blank" class="btn-secondary" style="text-decoration:none">Website</a>` : ''}
        <button class="btn-primary" onclick="app.openMessageModal('${u._id}', '${u.name}')">Message</button>
      </div>
    </div>
  `;
}

export function renderLogin() {
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPwd').value = '';
}

export function renderRegister() {
  document.getElementById('regName').value = '';
  document.getElementById('regEmail').value = '';
  document.getElementById('regPwd').value = '';
}

export function renderLiked() {
  const el = document.getElementById('likedListings');
  if (!el) return;
  const liked = state.startups.filter(s => state.likedStartups.has(s._id));
  if (liked.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="big">♥</div><p>You haven\'t upvoted any startups yet.</p></div>';
    return;
  }
  el.innerHTML = liked.map(s => `
    <div class="listing-row" onclick="app.openStartup('${s._id}')">
      <div class="listing-logo" style="background:${cardBg(0)}">${EMOJIS[s.industry] || '🚀'}</div>
      <div class="listing-info">
        <div class="listing-name" style="display:flex;align-items:center;gap:4px;">${s.name} ${s.isVerified ? '<span style="color:var(--blue);font-size:11px;">✅</span>' : ''}</div>
        <div class="listing-sub">${s.tagline}</div>
      </div>
      <div class="listing-actions">
        <span class="badge badge-coral">Liked</span>
      </div>
    </div>
  `).join('');
}
