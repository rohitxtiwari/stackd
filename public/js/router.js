import { state } from './state.js';
import { renderLanding, renderExplore, renderDashboard, renderStartupDetail, renderUserProfile, renderLogin, renderRegister } from './ui.js';

const routes = {
  '/': { page: 'landing', render: renderLanding },
  '/explore': { page: 'explore', render: renderExplore },
  '/dashboard': { page: 'dashboard', render: renderDashboard },
  '/login': { page: 'login', render: renderLogin },
  '/register': { page: 'register', render: renderRegister },
  '/startup/:id': { page: 'detail', render: renderStartupDetail },
  '/user/:id': { page: 'user-profile', render: renderUserProfile }
};

export function navigate(path, push = true) {
  // Find matching route
  let route = routes[path];
  let params = {};

  if (!route) {
    // Check for dynamic routes
    for (const r in routes) {
      if (r.includes(':')) {
        const parts = r.split('/');
        const pathParts = path.split('/');
        if (parts.length === pathParts.length) {
          const id = pathParts[parts.indexOf(':id')];
          if (id) {
            route = routes[r];
            params.id = id;
            break;
          }
        }
      }
    }
  }

  if (!route) {
    console.error('Route not found:', path);
    return navigate('/');
  }

  // Update state
  state.prevPage = document.querySelector('.page.active')?.id?.replace('page-','') || 'explore';
  
  // DOM update
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + route.page)?.classList.add('active');

  // Push history
  if (push) {
    history.pushState({ path }, '', path);
  }

  // Render
  if (params.id) {
    route.render(params.id);
  } else {
    route.render();
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

export function initRouter() {
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.path) {
      navigate(e.state.path, false);
    } else {
      navigate(window.location.pathname, false);
    }
  });

  // Handle initial route
  navigate(window.location.pathname, false);
}
