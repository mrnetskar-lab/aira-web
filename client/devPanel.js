export class AiraDevPanel {
  constructor() {
    this.visible = false;
    this.el = null;
    this.activeTab = 'overview';

    window.__AIRA_DEV_MODE__ = false;

    document.addEventListener('keydown', (e) => {
      if (e.key === '§') this.toggle();
    });
  }

  toggle() {
    this.visible = !this.visible;
    window.__AIRA_DEV_MODE__ = this.visible;

    if (this.visible) this.create();
    else this.destroy();
  }

  create() {
    if (this.el) return;

    this.el = document.createElement('div');
    this.el.id = 'aira-dev-panel';

    Object.assign(this.el.style, {
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      height: '50%',
      background: '#0b1020',
      color: '#fff',
      zIndex: '9999',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      fontSize: '12px'
    });

    this.el.innerHTML = `
      <div style="padding:10px;display:flex;justify-content:space-between;">
        <strong>AIRA DEV</strong>
        <button id="aira-dev-close">Close</button>
      </div>

      <div style="display:flex;gap:8px;padding:6px;">
        <button data-tab="overview">Overview</button>
        <button data-tab="relationships">Relations</button>
        <button data-tab="aira">AIRA</button>
        <button data-tab="memory">Memory</button>
        <button data-tab="logs">Logs</button>
      </div>

      <div id="aira-dev-content" style="flex:1;overflow:auto;padding:10px;"></div>
    `;

    document.body.appendChild(this.el);

    this.el.querySelector('#aira-dev-close').onclick = () => this.toggle();

    this.el.querySelectorAll('[data-tab]').forEach(btn => {
      btn.onclick = () => {
        this.activeTab = btn.dataset.tab;
        this.fetchAndRender();
      };
    });

    this.fetchAndRender();
    this.interval = setInterval(() => this.fetchAndRender(), 1000);
  }

  destroy() {
    clearInterval(this.interval);
    this.el?.remove();
    this.el = null;
  }

  async fetchAndRender() {
    if (!this.el) return;

    try {
      const res = await fetch('/api/ai/state');
      const data = await res.json();
      this.render(this.activeTab, data);
    } catch {
      const content = this.el.querySelector('#aira-dev-content');
      if (content) content.innerHTML = '<pre>Failed to fetch state.</pre>';
    }
  }

  render(tab = 'overview', data = {}) {
    if (!this.el) return;

    const content = this.el.querySelector('#aira-dev-content');
    if (!content) return;

    const state = data.state || {};

    if (tab === 'overview') {
      content.innerHTML = `<pre>${JSON.stringify({
        tension: state.tension,
        turnCount: state.turnCount,
        location: state.location,
        focus: data.focus,
        memoryCount: data.memoryCount,
        issueCount: data.issueCount
      }, null, 2)}</pre>`;
    }

    if (tab === 'relationships') {
      content.innerHTML = `<pre>${JSON.stringify(state.relationships, null, 2)}</pre>`;
    }

    if (tab === 'aira') {
      content.innerHTML = `<pre>${JSON.stringify(state.aira, null, 2)}</pre>`;
    }

    if (tab === 'memory') {
      const res = fetch('/api/ai/state').then(r => r.json()).then(d => {
        content.innerHTML = `<pre>${JSON.stringify(d.state, null, 2)}</pre>`;
      });
    }

    if (tab === 'logs') {
      content.innerHTML = `<pre>Logs coming soon...</pre>`;
    }
  }
}
