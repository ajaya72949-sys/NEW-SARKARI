// Homepage page customization is stored only in this browser.
(() => {
  const form = document.querySelector('#homepage-settings-form');
  if (!form) return;
  const storageKey = 'new-sarkari-updates-homepage-settings';
  const status = document.querySelector('#homepage-settings-status');
  const defaults = {
    siteName: 'NEW SARKARI UPDATES',
    siteSubtitle: 'WWW.NEWSARKARIUPDATES.COM',
    pageHeading: 'Sarkari Updates 2026 – Jobs, Results, Admit Cards & More',
    welcomeText: 'Welcome to New SARKARI UPDATES — government job and exam information in one place.',
    announcements: 'Government Recruitment Notifications 2026\nAdmit Card and Exam Date Updates\nLatest Exam Results\nAnswer Keys and Response Sheets',
    disclaimer: 'New SARKARI UPDATES is an independent information portal and is not a government organization. Always verify dates, eligibility and application links on the relevant official website.',
    primaryColor: '#ae173d',
    headingColor: '#071c91',
    showTicker: true,
    showFeatured: true,
    showTools: true,
    showUpdates: true,
    showDisclaimer: true
  };
  const readSettings = () => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; }
    catch (error) { return { ...defaults }; }
  };
  const fillForm = (settings) => Object.entries(defaults).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);
    if (!field) return;
    if (field.type === 'checkbox') field.checked = settings[name] !== false;
    else field.value = settings[name] ?? value;
  });
  fillForm(readSettings());
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const settings = Object.fromEntries(Object.keys(defaults).map((name) => {
      const field = form.elements.namedItem(name);
      return [name, field.type === 'checkbox' ? field.checked : field.value.trim()];
    }));
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
      status.textContent = 'Homepage customization saved in this browser. Refresh the homepage to preview.';
    } catch (error) {
      status.textContent = 'Could not save homepage customization in this browser.';
    }
  });
  document.querySelector('#homepage-settings-reset').addEventListener('click', () => {
    try {
      localStorage.removeItem(storageKey);
      fillForm(defaults);
      status.textContent = 'Homepage defaults restored. Refresh the homepage to see the default design.';
    } catch (error) {
      status.textContent = 'Could not restore homepage defaults.';
    }
  });
})();

// Homepage logo settings are saved only in this browser.
(() => {
  const form = document.querySelector('#branding-admin-form');
  if (!form) return;
  const storageKey = 'new-sarkari-updates-branding';
  const status = document.querySelector('#branding-status');
  const defaults = { headerImageUrl: '', headerClickUrl: '', footerImageUrl: '', footerClickUrl: '' };
  const readSettings = () => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; }
    catch (error) { return { ...defaults }; }
  };
  const fillForm = (settings) => Object.entries(settings).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);
    if (field) field.value = value;
  });
  fillForm(readSettings());
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const settings = Object.fromEntries(Object.keys(defaults).map((name) => [name, form.elements.namedItem(name).value.trim()]));
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
      status.textContent = 'Logo settings saved in this browser. Refresh the homepage to see the changes.';
    } catch (error) {
      status.textContent = 'Could not save logo settings in this browser.';
    }
  });
  document.querySelector('#branding-reset').addEventListener('click', () => {
    try {
      localStorage.removeItem(storageKey);
      fillForm(defaults);
      status.textContent = 'Custom logos removed. The default site branding will be shown.';
    } catch (error) {
      status.textContent = 'Could not remove the saved logo settings.';
    }
  });
})();

// Social ticker links are managed locally from the separate admin page.
(() => {
  const form = document.querySelector('#social-admin-form');
  if (!form) return;
  const storageKey = 'new-sarkari-updates-social-links';
  const rows = document.querySelector('#social-admin-links');
  const status = document.querySelector('#social-admin-status');
  const speedInput = form.elements.namedItem('speed');
  const enabledInput = form.elements.namedItem('enabled');

  const addRow = (label = '', url = '') => {
    const row = document.createElement('div');
    row.className = 'social-admin-row';
    const labelInput = document.createElement('input');
    labelInput.className = 'local-tool-input';
    labelInput.type = 'text';
    labelInput.placeholder = 'Name (e.g. Telegram)';
    labelInput.setAttribute('aria-label', 'Social link name');
    labelInput.value = label;
    const urlInput = document.createElement('input');
    urlInput.className = 'local-tool-input';
    urlInput.type = 'url';
    urlInput.placeholder = 'https://...';
    urlInput.setAttribute('aria-label', 'Social link URL');
    urlInput.value = url;
    const removeButton = document.createElement('button');
    removeButton.className = 'image-secondary-button social-admin-remove';
    removeButton.type = 'button';
    removeButton.textContent = 'Delete';
    removeButton.addEventListener('click', () => row.remove());
    row.append(labelInput, urlInput, removeButton);
    rows.append(row);
  };

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    speedInput.value = String(Math.min(90, Math.max(10, Number(saved.speed) || 30)));
    enabledInput.checked = saved.enabled !== false;
    if (Array.isArray(saved.links)) saved.links.forEach((link) => addRow(link.label || '', link.url || ''));
  } catch (error) {
    status.textContent = 'Could not read saved social links.';
  }

  document.querySelector('#social-admin-add').addEventListener('click', () => {
    addRow();
    rows.lastElementChild.querySelector('input').focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const links = Array.from(rows.querySelectorAll('.social-admin-row')).map((row) => ({
      label: row.querySelector('input[type="text"]').value.trim(),
      url: row.querySelector('input[type="url"]').value.trim()
    })).filter((link) => link.label || link.url);
    if (links.some((link) => !link.label || !/^https?:\/\//i.test(link.url))) {
      status.textContent = 'Every link needs a name and a valid http:// or https:// URL.';
      return;
    }
    const speed = Math.min(90, Math.max(10, Number(speedInput.value) || 30));
    try {
      localStorage.setItem(storageKey, JSON.stringify({ links, speed, enabled: enabledInput.checked }));
      status.textContent = 'Social links saved in this browser. Refresh the homepage to preview.';
    } catch (error) {
      status.textContent = 'Could not save social links in this browser.';
    }
  });

  document.querySelector('#social-admin-reset').addEventListener('click', () => {
    try {
      localStorage.removeItem(storageKey);
      rows.replaceChildren();
      speedInput.value = '30';
      enabledInput.checked = true;
      status.textContent = 'All social links removed. Save to keep the empty ticker settings.';
    } catch (error) {
      status.textContent = 'Could not remove the saved social links.';
    }
  });
})();

// Recruitment admin editor. Changes are saved only in this browser.
(() => {
  const page = document.querySelector('[data-recruitment-admin]');
  if (!page) return;

  const storageKey = 'new-sarkari-updates-railway-defence-notice';
  const template = {
    title: 'Railway and Defence Recruitment Updates',
    organization: 'Railway & Defence Recruitment',
    postDate: 'Not provided',
    updatedAt: 'Not provided',
    shortInfo: 'Recruitment details have not been published yet. Add verified information from the official notification using the Admin page.',
    vacancies: 'Recruitment details to be added | — | Add verified vacancy and eligibility information in Admin.',
    importantDates: 'Application start date | Verify official notification\nLast date to apply | Verify official notification\nExam date | To be announced by the recruiting authority',
    applicationFee: 'Check the official notification for category-wise application fees.',
    ageLimit: 'Check the official notification for age limits and relaxation rules.',
    eligibility: 'Post-wise education and other eligibility criteria must be confirmed from the official notification.',
    selectionProcess: 'Refer to the official notification for the complete selection process.',
    howToApply: 'Read the official notification carefully.\nUse the recruiting authority’s official website to apply.\nConfirm eligibility, dates and documents before submitting the application.',
    noticeDetails: 'No specific vacancy is being claimed on this template page. Add and verify notice details in Admin before sharing an active recruitment update.',
    applyUrl: '',
    officialUrl: ''
  };
  const form = page.querySelector('#recruitment-admin-form');
  const status = page.querySelector('#admin-status');
  const readNotice = () => {
    try {
      return { ...template, ...JSON.parse(localStorage.getItem(storageKey) || '{}') };
    } catch (error) {
      return { ...template };
    }
  };
  const fillForm = (notice) => {
    Object.entries(notice).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);
      if (field) field.value = value;
    });
  };

  fillForm(readNotice());
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const notice = Object.fromEntries(Array.from(form.elements)
      .filter((field) => field.name)
      .map((field) => [field.name, field.value.trim()]));
    try {
      localStorage.setItem(storageKey, JSON.stringify(notice));
      status.textContent = 'Notice saved in this browser. Open the detail page to preview your changes.';
    } catch (error) {
      status.textContent = 'Could not save in this browser. Check local storage availability.';
    }
  });

  page.querySelector('#admin-reset').addEventListener('click', () => {
    try {
      localStorage.removeItem(storageKey);
      fillForm(template);
      status.textContent = 'Template restored. Save notice to keep this version in this browser.';
    } catch (error) {
      status.textContent = 'Could not restore the template.';
    }
  });
})();
