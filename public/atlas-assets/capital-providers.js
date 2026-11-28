import { escapeHTML as escape, safeURL } from './domain.js';

export async function fetchCapitalDiscovery(config) {
  const response = await fetch(config.supabaseURL + '/rest/v1/rpc/kc_capital_discovery', {
    method: 'POST',
    headers: { apikey: config.publishableKey, 'Content-Type': 'application/json' },
    body: '{}',
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error('Capital provider profiles could not be loaded.');
  const discovery = await response.json();
  if (!Array.isArray(discovery.profiles) || !Array.isArray(discovery.sectors)) {
    throw Error('Capital provider profiles could not be loaded.');
  }
  return discovery;
}

function sourceLink(url, label, className = '') {
  const safe = safeURL(url);
  return safe ? `<a class="${className}" href="${escape(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>` : '';
}

export function providerDetails(profile, { showResearch = false } = {}) {
  if (!profile) return '';
  const sector = [...new Set([profile.sector, ...profile.sectors].filter(Boolean))].join(', ');
  const facts = [['Stage', profile.stage], ['Sector', sector], ['Check size', profile.check]]
    .filter(([, value]) => value);
  return `<section class="capital-profile-details">
    ${profile.focus ? `<p>${escape(profile.focus)}</p>` : ''}
    ${facts.length ? `<dl>${facts.map(([label, value]) =>
      `<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>` : ''}
    <div class="capital-profile-links">
      ${sourceLink(profile.website, 'Visit website', 'primary capital-website')}
      ${showResearch ? `<button type="button" class="secondary" data-capital-research="${escape(profile.entity_id)}">Research history</button>` : ''}
      ${sourceLink(profile.source_url, 'Provider source')}
    </div>
  </section>`;
}

export function capitalDirectory(discovery) {
  const heading = '<div class="section-head"><h2>Capital providers</h2></div>';
  if (!discovery) return heading + '<p role="alert">The provider directory is unavailable. Use Refresh data to retry.</p>';
  return heading + `<p>Explore documented criteria and confirm current availability with each provider.</p>
    <div class="toolbar capital-profile-filters">
      <label>Search capital providers <input type="search" id="capital-provider-search"></label>
      <details id="capital-sector-picker">
        <summary>Documented sector <span id="capital-sector-count"></span></summary>
        <div class="capital-sector-options">
          <label>Search sectors <input type="search" id="capital-sector-search"></label>
          <fieldset><legend>Choose sectors</legend>
            ${discovery.sectors.map(sector =>
              `<label><input type="checkbox" value="${escape(sector)}"> ${escape(sector)}</label>`).join('')}
          </fieldset>
          <div class="capital-sector-actions">
            <button type="button" class="secondary" id="capital-sector-clear">Clear sectors</button>
            <button type="button" class="secondary" id="capital-sector-done">Done</button>
          </div>
        </div>
      </details>
    </div>
    <p class="count" id="capital-profile-count" role="status"></p>
    <div class="cards" id="capital-profile-results"></div>`;
}

export function mountCapitalDirectory(root, discovery, openResearch) {
  const results = root.querySelector('#capital-profile-results');
  if (!results) return;
  const search = root.querySelector('#capital-provider-search');
  const picker = root.querySelector('#capital-sector-picker');
  const sectorSearch = root.querySelector('#capital-sector-search');
  const checkboxes = [...picker.querySelectorAll('input[type="checkbox"]')];
  const matches = (value, term) => value.toLowerCase().includes(term.trim().toLowerCase());

  function renderResults() {
    const selected = checkboxes.filter(input => input.checked).map(input => input.value);
    const profiles = discovery.profiles.filter(profile =>
      (!selected.length || selected.some(sector => profile.sectors.includes(sector))) &&
      matches([profile.name, profile.type, profile.city, profile.state, profile.focus,
        profile.stage, profile.sector, ...profile.sectors].filter(Boolean).join(' '), search.value)
    );
    root.querySelector('#capital-sector-count').textContent = selected.length ? `(${selected.length} selected)` : '';
    root.querySelector('#capital-profile-count').textContent = `${profiles.length} matching providers`;
    results.innerHTML = profiles.map(profile => `<article class="capital-profile-card">
      <h3>${escape(profile.name)}</h3>
      <p>${[profile.type, [profile.city, profile.state].filter(Boolean).join(', ')].filter(Boolean).map(escape).join(' · ')}</p>
      ${providerDetails(profile, { showResearch: true })}
    </article>`).join('') || '<p>No matching providers.</p>';
  }

  search.addEventListener('input', renderResults);
  picker.addEventListener('change', renderResults);
  sectorSearch.addEventListener('input', () => {
    checkboxes.forEach(input => { input.closest('label').hidden = !matches(input.value, sectorSearch.value); });
  });
  root.querySelector('#capital-sector-clear').addEventListener('click', () => {
    checkboxes.forEach(input => { input.checked = false; });
    renderResults();
  });
  function closePicker() {
    picker.open = false;
    picker.querySelector('summary').focus();
  }
  root.querySelector('#capital-sector-done').addEventListener('click', closePicker);
  picker.addEventListener('keydown', event => {
    if (event.key === 'Escape' && picker.open) closePicker();
  });
  results.addEventListener('click', event => {
    const button = event.target.closest('[data-capital-research]');
    if (button) openResearch(button.dataset.capitalResearch);
  });
  renderResults();
}
