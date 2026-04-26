export const EMOJIS = { 
  'AI / ML':'🤖',
  'Fintech':'💳',
  'Health':'🏥',
  'Climate':'🌿',
  'SaaS':'📊',
  'Consumer':'🛍️',
  'EdTech':'📚',
  'Web3':'⛓️' 
};

export const BADGE_COLORS = { 
  'AI / ML':'badge-purple',
  'Fintech':'badge-teal',
  'Health':'badge-coral',
  'Climate':'badge-teal',
  'SaaS':'badge-blue',
  'Consumer':'badge-gold',
  'EdTech':'badge-blue',
  'Web3':'badge-purple',
  'Idea':'badge-gold',
  'Pre-seed':'badge-gold',
  'Seed':'badge-teal',
  'Series A':'badge-blue',
  'Series B':'badge-purple' 
};

export const LOGO_BG = ['#E1F5EE','#EEEDFE','#FAECE7','#E6F1FB','#FAEEDA','#FBEAF0'];

export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; 
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

export function cardBg(index) {
  return LOGO_BG[index % LOGO_BG.length];
}
