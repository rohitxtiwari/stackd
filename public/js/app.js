import { state } from './state.js';
import { apiFetch, accessToken, refreshToken, setTokens, clearTokens } from './api.js';
import { showToast, EMOJIS, BADGE_COLORS, LOGO_BG } from './utils.js';
import { navigate, initRouter } from './router.js';
import * as ui from './ui.js';

// Expose to window for inline HTML handlers
window.app = {
  navigate,
  showPage: navigate,
  selectRole,
  doLogin,
  doRegister,
  logout,
  setStageFilter,
  setIndFilter,
  filterStartups: ui.filterStartups,
  openStartup,
  toggleLike,
  toggleBookmark,
  postComment,
  addToDealFlow,
  updateDealStatus,
  editDealNotes,
  showDash,
  switchDetailTab,
  openNewStartupModal,
  closeModal,
  submitNewStartup,
  updateProfile,
  changePassword,
  openMessageModal,
  sendMessage,
  fetchInbox,
  readMessage,
  openEditStartup,
  submitEditStartup,
  deleteStartup
};

async function init() {
  if (accessToken) {
    const res = await apiFetch('/users/me');
    if (res.success) {
      state.user = res.user || res.data.user || res.data;
      if (state.user?.bookmarks) {
        state.bookmarkedStartups = new Set(state.user.bookmarks.map(b => typeof b === 'object' ? b._id : b));
      }
    } else {
      clearTokens();
    }
  }
  
  ui.updateAuthNav();
  await loadStartups();
  initRouter();
}

async function loadStartups() {
  const res = await apiFetch('/startups');
  if (res.success) {
    state.startups = res.startups || res.data.startups || res.data || [];
  }
}

function selectRole(r) {
  state.selectedRole = r;
  ['founder','investor','admin'].forEach(x => {
    const el = document.getElementById('role' + x.charAt(0).toUpperCase() + x.slice(1));
    if (el) el.classList.toggle('active', x === r);
  });
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPwd').value;
  if (!email || !password) return showToast('Please fill all fields');
  
  const res = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
  if (res.success) {
    setTokens(res.accessToken, res.refreshToken);
    await init();
    showToast('Welcome back!');
    navigate('/dashboard');
  } else {
    showToast(res.message || 'Login failed');
  }
}

async function doRegister() {
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPwd').value;
  if (!name || !email || !password) return showToast('Please fill all fields');
  
  const res = await apiFetch('/auth/register', { 
    method: 'POST', 
    body: { name, email, password, role: state.selectedRole } 
  });
  if (res.success) {
    setTokens(res.accessToken, res.refreshToken);
    await init();
    showToast('Welcome to Stackd!');
    navigate('/dashboard');
  } else {
    showToast(res.message || 'Registration failed');
  }
}

async function logout() {
  await apiFetch('/auth/logout', { method: 'POST' });
  clearTokens();
  state.user = null;
  state.bookmarkedStartups.clear();
  state.likedStartups.clear();
  ui.updateAuthNav();
  showToast('Signed out');
  navigate('/');
}

async function setStageFilter(s) {
  state.filterStage = s === 'All stages' ? null : s;
  await ui.renderExplore();
}

async function setIndFilter(i) {
  state.filterIndustry = i === 'All industries' ? null : i;
  await ui.renderExplore();
}

function openStartup(id) {
  navigate(`/startup/${id}`);
}

async function toggleLike(id) {
  if (!state.user) return showToast('Sign in to upvote');
  
  // Optimistic UI Update
  const likeBtn = document.getElementById('likeBtn');
  const countEl = document.getElementById('likeCount');
  if (likeBtn && countEl) {
    const isLiked = state.likedStartups.has(id);
    const count = parseInt(countEl.innerText);
    countEl.innerText = isLiked ? count - 1 : count + 1;
    likeBtn.innerText = isLiked ? '▲ Upvote' : '▲ Upvoted';
    likeBtn.classList.toggle('active');
  }

  const res = await apiFetch(`/interactions/like/${id}`, { method: 'POST' });
  if (res.success) {
    if (res.liked) state.likedStartups.add(id);
    else state.likedStartups.delete(id);
    // Background sync (silent refresh)
    ui.renderStartupDetail(id, false);
  }
}

async function toggleBookmark(id) {
  if (!state.user) return showToast('Sign in to save');
  const res = await apiFetch(`/interactions/bookmark/${id}`, { method: 'POST' });
  if (res.success) {
    if (res.bookmarked) {
      state.bookmarkedStartups.add(id);
      if (!state.user.bookmarks) state.user.bookmarks = [];
      if (!state.user.bookmarks.includes(id)) state.user.bookmarks.push(id);
    } else {
      state.bookmarkedStartups.delete(id);
      if (state.user.bookmarks) state.user.bookmarks = state.user.bookmarks.filter(b => (b._id || b) !== id);
    }
    ui.renderStartupDetail(id, false);
  }
}

async function postComment(id) {
  if (!state.user) return;
  const input = document.getElementById('commentInput');
  const text = input.value.trim();
  if (!text) return showToast('Write something first');
  
  // Optimistic UI Update
  const commentsList = document.getElementById('commentsList');
  if (commentsList) {
    const tempHtml = ui.commentHTML({
      user: state.user,
      content: text,
      createdAt: new Date().toISOString()
    });
    commentsList.insertAdjacentHTML('afterbegin', tempHtml);
  }

  input.value = '';
  const res = await apiFetch(`/interactions/comment/${id}`, { method: 'POST', body: { content: text } });
  if (res.success) {
    ui.renderStartupDetail(id, false);
  }
}

async function addToDealFlow(id) {
  if (!state.user) return showToast('Sign in to track deal flow');
  const res = await apiFetch(`/users/dealflow/${id}`, { method: 'POST' });
  if (res.success) {
    state.user.dealFlow = res.dealFlow;
    showToast('📈 Added to Deal Flow');
    ui.renderStartupDetail(id, false);
  } else {
    showToast(res.message || 'Could not add to Deal Flow');
  }
}

async function updateDealStatus(id, status) {
  const res = await apiFetch(`/users/dealflow/${id}`, { method: 'PUT', body: { status } });
  if (res.success) {
    state.user.dealFlow = res.dealFlow;
    showToast('Status updated');
    ui.renderDashboard();
  }
}

async function editDealNotes(id, currentNotes) {
  const notes = prompt('Enter your notes for this deal:', currentNotes);
  if (notes === null) return;
  const res = await apiFetch(`/users/dealflow/${id}`, { method: 'PUT', body: { notes } });
  if (res.success) {
    state.user.dealFlow = res.dealFlow;
    showToast('Notes updated');
    ui.renderDashboard();
  }
}

function showDash(section) {
  state.activeDash = section;
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.dash-nav-item').forEach(i => i.classList.remove('active'));
  document.getElementById('ds-'+section)?.classList.add('active');
  document.getElementById('dn'+section.charAt(0).toUpperCase()+section.slice(1))?.classList.add('active');
}

function switchDetailTab(tab) {
  document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-'+tab)?.classList.add('active');
  document.getElementById('detail-info-content').style.display = tab === 'info' ? 'block' : 'none';
  document.getElementById('detail-deck-content').style.display = tab === 'deck' ? 'block' : 'none';
}

function openNewStartupModal() {
  document.getElementById('newStartupModal').classList.add('open');
}

function closeModal(id) {
  document.getElementById(id || 'newStartupModal').classList.remove('open');
}

async function submitNewStartup() {
  const name = document.getElementById('nsName').value.trim();
  const tagline = document.getElementById('nsTagline').value.trim();
  const desc = document.getElementById('nsDesc').value.trim();
  const industry = document.getElementById('nsIndustry').value;
  const stage = document.getElementById('nsStage').value;
  const location = document.getElementById('nsLocation').value.trim();
  if (!name || !tagline || !desc) return showToast('Fill required fields');
  
  const fd = new FormData();
  fd.append('name', name); fd.append('tagline', tagline); fd.append('description', desc);
  fd.append('industry', industry); fd.append('fundingStage', stage); fd.append('location', location || 'Remote');
  
  const res = await apiFetch('/startups', { method: 'POST', body: fd });
  if (res.success) {
    closeModal('newStartupModal');
    showToast('🚀 Published!');
    await loadStartups();
    ui.renderDashboard();
  }
}

async function updateProfile() {
  const body = {
    name: document.getElementById('set-name').value,
    bio: document.getElementById('set-bio').value,
    location: document.getElementById('set-location').value,
    website: document.getElementById('set-website').value
  };
  const res = await apiFetch('/users/me', { method: 'PUT', body });
  if (res.success) {
    state.user = { ...state.user, ...body };
    showToast('Profile updated!');
    ui.updateAuthNav();
  }
}

async function changePassword() {
  const currentPassword = document.getElementById('set-old-pwd').value;
  const newPassword = document.getElementById('set-new-pwd').value;
  const res = await apiFetch('/users/me/password', { method: 'PUT', body: { currentPassword, newPassword } });
  if (res.success) {
    showToast('Password changed!');
    document.getElementById('set-old-pwd').value = '';
    document.getElementById('set-new-pwd').value = '';
  }
}

let currentMsgRecipient = null;
function openMessageModal(recipientId, recipientName) {
  if (!state.user) return showToast('Sign in first');
  currentMsgRecipient = recipientId;
  document.getElementById('msgTo').value = recipientName || 'Founder';
  document.getElementById('msgContent').value = '';
  document.getElementById('messageModal').classList.add('open');
}

async function sendMessage() {
  const content = document.getElementById('msgContent').value.trim();
  const res = await apiFetch('/interactions/message', { method: 'POST', body: { recipientId: currentMsgRecipient, content } });
  if (res.success) {
    showToast('Sent!');
    closeModal('messageModal');
  }
}

async function fetchInbox() {
  const res = await apiFetch('/interactions/messages');
  if (res.success) {
    state.messages = res.messages || res.data.messages || res.data || [];
    // Render logic moved to ui.js? No, I'll keep the DOM update here for now or move to ui.
    const inboxList = document.getElementById('inboxList');
    if (!inboxList) return;
    if (state.messages.length === 0) {
      inboxList.innerHTML = '<div class="empty-state"><div class="big">📬</div><p>Inbox is empty.</p></div>';
    } else {
      inboxList.innerHTML = state.messages.map(m => `
        <div class="listing-row" style="${m.read ? 'opacity:0.7' : 'font-weight:bold'}" onclick="app.readMessage('${m._id}')">
          <div class="nav-avatar">${(m.sender?.name || 'U')[0]}</div>
          <div class="listing-info">
            <div class="listing-name">${m.sender?.name} ${!m.read ? '<span style="color:var(--accent)">• New</span>' : ''}</div>
            <div class="listing-sub">${m.content.substring(0, 60)}...</div>
          </div>
          <div style="font-size:11px;color:var(--text3)">${new Date(m.createdAt).toLocaleDateString()}</div>
        </div>
      `).join('');
    }
  }
}

async function readMessage(id) {
  const m = state.messages.find(x => x._id === id);
  if (!m) return;

  // Mark as read in backend
  if (!m.read && m.recipient === state.user._id) {
    apiFetch(`/interactions/messages/${id}/read`, { method: 'PUT' });
    m.read = true;
    fetchInbox();
  }

  // Find thread
  const thread = state.messages
    .filter(msg => 
      (msg.parentMessage === (m.parentMessage || m._id)) || 
      (msg._id === (m.parentMessage || m._id)) ||
      (msg.parentMessage === m._id)
    )
    .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));

  const content = document.getElementById('viewMessageContent');
  if (!content) {
    // If we don't have the new container yet, just use the old modal style but grouped
    document.getElementById('vmContent').innerHTML = thread.map(msg => `
      <div style="margin-bottom:12px; padding:8px; background:var(--bg2); border-radius:var(--r)">
        <div style="font-size:11px; font-weight:600">${msg.sender?.name}</div>
        <div style="font-size:13px">${msg.content}</div>
      </div>
    `).join('');
    document.getElementById('viewMessageModal').classList.add('open');
    return;
  }

  content.innerHTML = `
    <div style="font-size:12px;color:var(--text3);margin-bottom:20px;">
      Conversation with ${m.sender?._id === state.user._id ? m.recipient?.name : m.sender?.name}
    </div>
    <div class="thread-container" style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;max-height:300px;overflow-y:auto;padding-right:8px;">
      ${thread.map(msg => `
        <div style="align-self: ${msg.sender?._id === state.user._id ? 'flex-end' : 'flex-start'}; max-width: 85%;">
          <div style="font-size:10px; color:var(--text3); margin-bottom:2px; text-align:${msg.sender?._id === state.user._id ? 'right' : 'left'}">
            ${msg.sender?.name} · ${new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
          </div>
          <div style="background: ${msg.sender?._id === state.user._id ? 'var(--accent)' : 'var(--bg2)'}; color: ${msg.sender?._id === state.user._id ? '#fff' : 'var(--text)'}; padding: 8px 12px; border-radius: 12px; font-size: 13px; line-height: 1.4;">
            ${msg.content}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="form-group">
      <textarea class="form-input" id="replyContent" placeholder="Write a reply..." style="height:60px; font-size:13px;"></textarea>
      <button class="btn-block" onclick="app.replyMessage('${m._id}', '${m.parentMessage || m._id}', '${m.sender?._id === state.user._id ? m.recipient?._id : m.sender?._id}')">Send Reply</button>
    </div>
  `;

  document.getElementById('viewMessageModal').classList.add('open');
}

async function replyMessage(origId, parentId, recipientId) {
  const content = document.getElementById('replyContent').value;
  if (!content) return;

  const res = await apiFetch('/interactions/message', {
    method: 'POST',
    body: { recipientId, content, parentMessage: parentId }
  });

  if (res.success) {
    showToast('Reply sent');
    closeModal('viewMessageModal');
    fetchInbox();
  }
}

let currentEditStartupId = null;
function openEditStartup(id) {
  const s = state.startups.find(x => x._id === id);
  if (!s) return;
  currentEditStartupId = id;
  document.getElementById('esName').value = s.name;
  document.getElementById('esTagline').value = s.tagline;
  document.getElementById('esDesc').value = s.description || s.desc || '';
  document.getElementById('esIndustry').value = s.industry;
  document.getElementById('esStage').value = s.fundingStage;
  document.getElementById('esLocation').value = s.location || '';
  document.getElementById('editStartupModal').classList.add('open');
}

async function submitEditStartup() {
  const body = {
    name: document.getElementById('esName').value,
    tagline: document.getElementById('esTagline').value,
    description: document.getElementById('esDesc').value,
    industry: document.getElementById('esIndustry').value,
    fundingStage: document.getElementById('esStage').value,
    location: document.getElementById('esLocation').value
  };
  const res = await apiFetch(`/startups/${currentEditStartupId}`, { method: 'PUT', body });
  if (res.success) {
    showToast('Updated');
    closeModal('editStartupModal');
    await loadStartups();
    ui.renderDashboard();
  }
}

async function deleteStartup(id) {
  if (!confirm('Are you sure?')) return;
  const res = await apiFetch(`/startups/${id}`, { method: 'DELETE' });
  if (res.success) {
    showToast('Deleted');
    await loadStartups();
    ui.renderDashboard();
  }
}

// Initial Run
init();
