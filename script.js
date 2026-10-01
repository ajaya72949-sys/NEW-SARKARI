const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('#main-nav');

if (menuToggle && mainNav) {
  const mobileMenu = window.matchMedia('(max-width: 700px)');
  const syncMenu = () => {
    const isMobile = mobileMenu.matches;
    menuToggle.setAttribute('aria-expanded', String(!isMobile));
    mainNav.classList.remove('is-open', 'is-collapsed');
  };
  syncMenu();
  mobileMenu.addEventListener('change', syncMenu);

  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    if (mobileMenu.matches) {
      mainNav.classList.toggle('is-open', !isOpen);
    } else {
      mainNav.classList.toggle('is-collapsed', isOpen);
    }
  });

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (mobileMenu.matches) mainNav.classList.remove('is-open');
      else mainNav.classList.add('is-collapsed');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Local-only image resizer with target file-size presets.
const imageFileInput = document.querySelector('#image-file-input');
if (imageFileInput) {
  const dropArea = document.querySelector('#image-drop-area');
  const workspace = document.querySelector('#image-workspace');
  const imagePreview = document.querySelector('#image-preview');
  const imageFileName = document.querySelector('#image-file-name');
  const imageFileInfo = document.querySelector('#image-file-info');
  const targetInput = document.querySelector('#image-target-kb');
  const targetLabel = document.querySelector('#image-target-label');
  const resizeButton = document.querySelector('#image-resize-button');
  const resizeLabel = document.querySelector('#image-resize-label');
  const spinner = document.querySelector('#image-resize-spinner');
  const progress = document.querySelector('#image-progress');
  const error = document.querySelector('#image-error');
  const result = document.querySelector('#image-result');
  const downloadLink = document.querySelector('#image-download');
  let sourceImage = null;
  let sourceUrl = '';
  let outputUrl = '';
  let sourceFile = null;
  let selectedTargetKB = 20;

  const setTarget = (value) => {
    selectedTargetKB = value;
    targetInput.value = String(value);
    targetLabel.textContent = `${value} KB`;
    document.querySelectorAll('.image-size-presets button').forEach((button) => {
      button.classList.toggle('is-selected', Number(button.dataset.imageKb) === value);
    });
    error.textContent = '';
    result.hidden = true;
  };

  const loadImageFile = (file) => {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      error.textContent = 'Choose a JPG, PNG, or WEBP image.';
      return;
    }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceFile = file;
    sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      sourceImage = image;
      imagePreview.src = sourceUrl;
      imageFileName.textContent = file.name;
      imageFileInfo.textContent = `${image.naturalWidth} × ${image.naturalHeight}px · ${(file.size / 1024).toFixed(1)} KB`;
      dropArea.hidden = true;
      workspace.hidden = false;
      resizeButton.disabled = false;
      result.hidden = true;
      error.textContent = '';
      setTarget(selectedTargetKB);
    };
    image.onerror = () => { error.textContent = 'This image could not be opened.'; };
    image.src = sourceUrl;
  };

  imageFileInput.addEventListener('change', () => loadImageFile(imageFileInput.files[0]));
  dropArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropArea.classList.add('is-dragging');
  });
  dropArea.addEventListener('dragleave', () => dropArea.classList.remove('is-dragging'));
  dropArea.addEventListener('drop', (event) => {
    event.preventDefault();
    dropArea.classList.remove('is-dragging');
    loadImageFile(event.dataTransfer.files[0]);
  });
  dropArea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      imageFileInput.click();
    }
  });
  document.querySelector('#image-change-button').addEventListener('click', () => {
    imageFileInput.value = '';
    imageFileInput.click();
  });

  document.querySelectorAll('.image-size-presets button').forEach((button) => {
    button.addEventListener('click', () => setTarget(Number(button.dataset.imageKb)));
  });
  document.querySelector('#image-set-target').addEventListener('click', () => {
    const value = Number(targetInput.value);
    if (!Number.isFinite(value) || value < 5 || value > 5000) {
      error.textContent = 'Enter a target size from 5 KB to 5000 KB.';
      return;
    }
    setTarget(value);
  });

  const canvasToJpeg = (canvas, quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  resizeButton.addEventListener('click', async () => {
    if (!sourceImage) return;
    const requestedKB = Number(targetInput.value);
    if (!Number.isFinite(requestedKB) || requestedKB < 5 || requestedKB > 5000) {
      error.textContent = 'Enter a target size from 5 KB to 5000 KB.';
      return;
    }
    setTarget(requestedKB);
    resizeButton.disabled = true;
    resizeLabel.textContent = 'Resizing…';
    spinner.hidden = false;
    progress.hidden = false;
    progress.textContent = 'Preparing image…';
    error.textContent = '';
    result.hidden = true;
    const limitBytes = selectedTargetKB * 1024;
    let scale = Math.min(1, 10000 / sourceImage.naturalWidth, 10000 / sourceImage.naturalHeight);
    let blob = null;

    try {
      for (let pass = 0; pass < 14; pass += 1) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(sourceImage.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(sourceImage.naturalHeight * scale));
        const context = canvas.getContext('2d');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

        for (let quality = 0.92; quality >= 0.28; quality = Math.round((quality - 0.12) * 100) / 100) {
          progress.textContent = `Compressing image… ${canvas.width} × ${canvas.height}px`;
          blob = await canvasToJpeg(canvas, quality);
          if (!blob || blob.size <= limitBytes) break;
        }
        if (blob && blob.size <= limitBytes) break;
        scale *= 0.82;
        if (scale * sourceImage.naturalWidth < 1 || scale * sourceImage.naturalHeight < 1) break;
      }

      if (!blob || blob.size > limitBytes) {
        throw new Error('Could not reach that file size without reducing the image too much. Try a larger target size.');
      }
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      outputUrl = URL.createObjectURL(blob);
      downloadLink.href = outputUrl;
      downloadLink.download = `${sourceFile.name.replace(/\.[^.]+$/, '') || 'image'}-resized.jpg`;
      document.querySelector('#image-original-result').textContent = `${(sourceFile.size / 1024).toFixed(1)} KB`;
      document.querySelector('#image-new-result').textContent = `${(blob.size / 1024).toFixed(1)} KB`;
      result.hidden = false;
      progress.hidden = true;
    } catch (resizeError) {
      error.textContent = resizeError.message || 'Could not resize this image in your browser.';
      progress.hidden = true;
    } finally {
      resizeButton.disabled = false;
      resizeLabel.textContent = 'Resize Image';
      spinner.hidden = true;
    }
  });

  document.querySelector('#image-another-button').addEventListener('click', () => {
    imageFileInput.value = '';
    sourceImage = null;
    sourceFile = null;
    workspace.hidden = true;
    dropArea.hidden = false;
    resizeButton.disabled = true;
    result.hidden = true;
    error.textContent = '';
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    sourceUrl = '';
    outputUrl = '';
    imagePreview.removeAttribute('src');
  });
}

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

// Apply locally saved homepage text, theme colors, and section visibility.
if (document.querySelector('#page-title')) {
  const defaults = {
    siteName: 'NEW SARKARI UPDATES',
    siteSubtitle: 'WWW.NEWSARKARIUPDATES.COM',
    pageHeading: 'Sarkari Updates 2026 – Jobs, Results, Admit Cards & More',
    welcomeText: 'Welcome to New SARKARI UPDATES — government job and exam information in one place.',
    announcements: 'Government Recruitment Notifications 2026\nAdmit Card and Exam Date Updates\nLatest Exam Results\nAnswer Keys and Response Sheets',
    disclaimer: 'New SARKARI UPDATES is an independent information portal and is not a government organization. Always verify dates, eligibility and application links on the relevant official website.',
    primaryColor: '#ae173d', headingColor: '#071c91',
    showTicker: true, showFeatured: true, showTools: true, showUpdates: true, showDisclaimer: true
  };
  let settings = { ...defaults };
  try { settings = { ...defaults, ...JSON.parse(localStorage.getItem('new-sarkari-updates-homepage-settings') || '{}') }; }
  catch (error) { /* Use the built-in homepage defaults. */ }

  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element && typeof value === 'string') element.textContent = value;
  };
  setText('.brand-title', settings.siteName);
  setText('#footer-brand-name', settings.siteName);
  setText('#site-subtitle', settings.siteSubtitle);
  setText('#page-title', settings.pageHeading);
  setText('#welcome-text', settings.welcomeText);
  setText('#disclaimer-text', settings.disclaimer);
  if (/^#[\da-f]{6}$/i.test(settings.primaryColor)) document.documentElement.style.setProperty('--red', settings.primaryColor);
  if (/^#[\da-f]{6}$/i.test(settings.headingColor)) document.documentElement.style.setProperty('--blue', settings.headingColor);

  const announcements = String(settings.announcements || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const ticker = document.querySelector('.ticker');
  const tickerLinks = document.querySelectorAll('.ticker-track a');
  if (ticker) ticker.hidden = settings.showTicker === false || announcements.length === 0;
  tickerLinks.forEach((link, index) => {
    if (announcements.length) link.textContent = announcements[index % announcements.length];
  });
  const visibility = [
    ['.featured-grid', 'showFeatured'], ['.tools-section', 'showTools'],
    ['.updates-grid', 'showUpdates'], ['#important', 'showDisclaimer'],
    ['#footer-brand', 'showDisclaimer'], ['.trademark-note', 'showDisclaimer']
  ];
  visibility.forEach(([selector, setting]) => {
    const element = document.querySelector(selector);
    if (!element) return;
    const isHidden = settings[setting] === false;
    element.hidden = isHidden;
    element.style.display = isHidden ? 'none' : '';
  });
}

// Apply locally saved homepage logo image and click-through links.
const brandingStorageKey = 'new-sarkari-updates-branding';
try {
  const branding = JSON.parse(localStorage.getItem(brandingStorageKey) || '{}');
  const setBrand = (linkId, imageId, imageUrl, clickUrl, wrapper) => {
    const link = document.getElementById(linkId);
    const image = document.getElementById(imageId);
    if (!link || !image || !/^https?:\/\//i.test(String(imageUrl || '').trim())) return false;
    image.src = imageUrl.trim();
    image.hidden = false;
    const hasClickUrl = /^https?:\/\//i.test(String(clickUrl || '').trim());
    link.href = hasClickUrl ? clickUrl.trim() : '#home';
    link.target = hasClickUrl ? '_blank' : '';
    if (hasClickUrl) link.rel = 'noopener noreferrer';
    else link.removeAttribute('rel');
    if (wrapper) wrapper.hidden = false;
    return true;
  };
  const headerHasImage = setBrand('header-brand-link', 'header-brand-image', branding.headerImageUrl, branding.headerClickUrl);
  const headerMark = document.querySelector('.brand-mark');
  if (headerHasImage && headerMark) {
    headerMark.classList.add('has-image');
    const initials = headerMark.querySelector('span');
    if (initials) initials.hidden = true;
  }
  const footerHasImage = setBrand('footer-brand-link', 'footer-brand-image', branding.footerImageUrl, branding.footerClickUrl, document.querySelector('#footer-brand'));
  const footerName = document.querySelector('#footer-brand-name');
  if (footerHasImage && footerName) footerName.hidden = true;
} catch (error) {
  // Keep the built-in brand mark if local settings cannot be read.
}

// Render locally configured social and website links in the scrolling header strip.
const socialTicker = document.querySelector('#social-ticker');
const socialTickerTrack = document.querySelector('#social-ticker-track');
if (socialTicker && socialTickerTrack) {
  try {
    const settings = JSON.parse(localStorage.getItem('new-sarkari-updates-social-links') || '{}');
    const links = Array.isArray(settings.links) ? settings.links.filter((entry) =>
      entry && typeof entry.label === 'string' && /^https?:\/\//i.test(String(entry.url || '').trim())
    ) : [];
    if (links.length) {
      const makeGroup = (isCopy = false) => {
        const group = document.createElement('div');
        group.className = 'social-ticker-group';
        if (isCopy) group.setAttribute('aria-hidden', 'true');
        links.forEach((entry, index) => {
          if (index) {
            const separator = document.createElement('span');
            separator.textContent = '•';
            group.append(separator);
          }
          const link = document.createElement('a');
          link.href = entry.url.trim();
          link.textContent = entry.label.trim() || 'Visit channel';
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          group.append(link);
        });
        return group;
      };
      socialTickerTrack.append(makeGroup(), makeGroup(true));
      socialTickerTrack.style.animationDuration = `${Math.min(90, Math.max(10, Number(settings.speed) || 30))}s`;
      if (settings.enabled === false) socialTickerTrack.style.animation = 'none';
      socialTicker.hidden = false;
    }
  } catch (error) {
    // Keep the social strip hidden if local settings cannot be read.
  }
}

// Editable Railway and Defence notice content (saved in this browser only).
const recruitmentStorageKey = 'new-sarkari-updates-railway-defence-notice';
const recruitmentTemplate = {
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

const getRecruitmentNotice = () => {
  try {
    return { ...recruitmentTemplate, ...JSON.parse(localStorage.getItem(recruitmentStorageKey) || '{}') };
  } catch (error) {
    return { ...recruitmentTemplate };
  }
};

const detailPage = document.querySelector('[data-recruitment-detail]');
if (detailPage) {
  const notice = getRecruitmentNotice();
  detailPage.querySelectorAll('[data-field]').forEach((element) => {
    const value = notice[element.dataset.field];
    element.textContent = value || 'Not provided';
  });

  const linesFor = (value) => String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  detailPage.querySelectorAll('[data-list]').forEach((list) => {
    linesFor(notice[list.dataset.list]).forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      list.append(item);
    });
    if (!list.children.length) {
      const item = document.createElement('li');
      item.textContent = 'Not provided';
      list.append(item);
    }
  });
  detailPage.querySelectorAll('[data-lines]').forEach((container) => {
    linesFor(notice[container.dataset.lines]).forEach((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      container.append(paragraph);
    });
    if (!container.children.length) container.textContent = 'Not provided';
  });
  detailPage.querySelectorAll('[data-table]').forEach((body) => {
    const rows = linesFor(notice[body.dataset.table]);
    rows.forEach((rowText) => {
      const row = document.createElement('tr');
      rowText.split('|').forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value.trim();
        row.append(cell);
      });
      body.append(row);
    });
    if (!body.children.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.textContent = 'Not provided';
      cell.colSpan = body.dataset.table === 'vacancies' ? 3 : 2;
      row.append(cell);
      body.append(row);
    }
  });
  detailPage.querySelectorAll('[data-link]').forEach((link) => {
    const value = String(notice[link.dataset.link] || '').trim();
    if (/^https?:\/\//i.test(value)) {
      link.href = value;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.hidden = false;
    }
  });
}



// Local-only signature crop, resize, and JPEG compression tool.
const signatureInput = document.querySelector('#signature-file');
if (signatureInput) {
  const editor = document.querySelector('#signature-editor');
  const dropArea = document.querySelector('#signature-drop-area');
  const preview = document.querySelector('#signature-preview');
  const previewContext = preview.getContext('2d');
  const widthInput = document.querySelector('#signature-width');
  const heightInput = document.querySelector('#signature-height');
  const unitInput = document.querySelector('#signature-unit');
  const dpiInput = document.querySelector('#signature-dpi');
  const ratioLock = document.querySelector('#signature-ratio');
  const status = document.querySelector('#signature-status');
  const download = document.querySelector('#signature-download');
  const info = document.querySelector('#signature-file-info');
  const cropToggle = document.querySelector('#signature-crop-toggle');
  const cropApply = document.querySelector('#signature-crop-apply');
  const cropHint = document.querySelector('#signature-crop-hint');
  let workingCanvas = document.createElement('canvas');
  let sourceUrl = '';
  let resultUrl = '';
  let targetWidthPx = 140;
  let targetHeightPx = 60;
  let selection = null;
  let dragStart = null;
  let cropMode = false;
  let lastEditedDimension = 'width';
  let sourceName = '';

  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  };

  const unitFactor = () => {
    const dpi = Math.max(1, Number(dpiInput.value) || 200);
    if (unitInput.value === 'in') return dpi;
    if (unitInput.value === 'cm') return dpi / 2.54;
    return 1;
  };

  const showDimensions = () => {
    const factor = unitFactor();
    widthInput.value = (targetWidthPx / factor).toFixed(unitInput.value === 'px' ? 0 : 2).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    heightInput.value = (targetHeightPx / factor).toFixed(unitInput.value === 'px' ? 0 : 2).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  };

  const readDimensions = (edited) => {
    const factor = unitFactor();
    const width = Number(widthInput.value) * factor;
    const height = Number(heightInput.value) * factor;
    if (edited === 'width' && Number.isFinite(width) && width > 0) {
      targetWidthPx = Math.round(width);
      if (ratioLock.checked && workingCanvas.height) targetHeightPx = Math.max(1, Math.round(targetWidthPx / (workingCanvas.width / workingCanvas.height)));
    } else if (edited === 'height' && Number.isFinite(height) && height > 0) {
      targetHeightPx = Math.round(height);
      if (ratioLock.checked && workingCanvas.width) targetWidthPx = Math.max(1, Math.round(targetHeightPx * (workingCanvas.width / workingCanvas.height)));
    } else {
      if (Number.isFinite(width) && width > 0) targetWidthPx = Math.round(width);
      if (Number.isFinite(height) && height > 0) targetHeightPx = Math.round(height);
    }
    showDimensions();
  };

  const drawPreview = () => {
    if (!workingCanvas.width || !workingCanvas.height) return;
    preview.width = workingCanvas.width;
    preview.height = workingCanvas.height;
    previewContext.clearRect(0, 0, preview.width, preview.height);
    previewContext.drawImage(workingCanvas, 0, 0);
    if (selection) {
      previewContext.fillStyle = 'rgba(10, 25, 45, .48)';
      previewContext.fillRect(0, 0, preview.width, preview.height);
      previewContext.clearRect(selection.x, selection.y, selection.width, selection.height);
      previewContext.drawImage(workingCanvas, selection.x, selection.y, selection.width, selection.height,
        selection.x, selection.y, selection.width, selection.height);
      previewContext.strokeStyle = '#1684ed';
      previewContext.lineWidth = Math.max(2, preview.width / 500);
      previewContext.strokeRect(selection.x, selection.y, selection.width, selection.height);
    }
  };

  const setCropMode = (enabled) => {
    cropMode = enabled;
    selection = null;
    cropToggle.setAttribute('aria-pressed', String(enabled));
    cropToggle.classList.toggle('is-active', enabled);
    cropHint.hidden = !enabled;
    preview.classList.toggle('is-cropping', enabled);
    cropApply.disabled = true;
    drawPreview();
    if (enabled) setStatus('Drag your finger or mouse over the image to select the crop area.');
  };

  const loadSignature = (file) => {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStatus('Choose a JPG, PNG, or WEBP image.', true);
      return;
    }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = URL.createObjectURL(file);
    sourceName = file.name;
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 6000 / image.naturalWidth, 6000 / image.naturalHeight);
      workingCanvas = document.createElement('canvas');
      workingCanvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      workingCanvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      workingCanvas.getContext('2d').drawImage(image, 0, 0, workingCanvas.width, workingCanvas.height);
      targetWidthPx = workingCanvas.width;
      targetHeightPx = workingCanvas.height;
      info.textContent = `${file.name} · ${image.naturalWidth} × ${image.naturalHeight}px · ${(file.size / 1024).toFixed(1)} KB`;
      dropArea.hidden = true;
      editor.hidden = false;
      download.hidden = true;
      setCropMode(false);
      showDimensions();
      drawPreview();
      setStatus('Choose a crop area if needed, set units and dimensions, then resize.');
    };
    image.onerror = () => setStatus('This image could not be opened.', true);
    image.src = sourceUrl;
  };

  signatureInput.addEventListener('change', () => loadSignature(signatureInput.files[0]));
  dropArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropArea.classList.add('is-dragging');
  });
  dropArea.addEventListener('dragleave', () => dropArea.classList.remove('is-dragging'));
  dropArea.addEventListener('drop', (event) => {
    event.preventDefault();
    dropArea.classList.remove('is-dragging');
    loadSignature(event.dataTransfer.files[0]);
  });

  cropToggle.addEventListener('click', () => setCropMode(!cropMode));
  preview.addEventListener('pointerdown', (event) => {
    if (!cropMode) return;
    event.preventDefault();
    const rect = preview.getBoundingClientRect();
    const x = Math.max(0, Math.min(preview.width, (event.clientX - rect.left) * preview.width / rect.width));
    const y = Math.max(0, Math.min(preview.height, (event.clientY - rect.top) * preview.height / rect.height));
    dragStart = { x, y };
    selection = { x, y, width: 0, height: 0 };
    preview.setPointerCapture(event.pointerId);
  });
  preview.addEventListener('pointermove', (event) => {
    if (!cropMode || !dragStart) return;
    const rect = preview.getBoundingClientRect();
    const x = Math.max(0, Math.min(preview.width, (event.clientX - rect.left) * preview.width / rect.width));
    const y = Math.max(0, Math.min(preview.height, (event.clientY - rect.top) * preview.height / rect.height));
    selection = {
      x: Math.round(Math.min(dragStart.x, x)),
      y: Math.round(Math.min(dragStart.y, y)),
      width: Math.round(Math.abs(x - dragStart.x)),
      height: Math.round(Math.abs(y - dragStart.y))
    };
    cropApply.disabled = selection.width < 2 || selection.height < 2;
    drawPreview();
  });
  const finishCropDrag = () => { dragStart = null; };
  preview.addEventListener('pointerup', finishCropDrag);
  preview.addEventListener('pointercancel', finishCropDrag);

  cropApply.addEventListener('click', () => {
    if (!selection || selection.width < 2 || selection.height < 2) return;
    const cropped = document.createElement('canvas');
    cropped.width = selection.width;
    cropped.height = selection.height;
    cropped.getContext('2d').drawImage(workingCanvas, selection.x, selection.y, selection.width, selection.height,
      0, 0, cropped.width, cropped.height);
    workingCanvas = cropped;
    selection = null;
    setCropMode(false);
    if (ratioLock.checked) {
      if (lastEditedDimension === 'height') targetWidthPx = Math.max(1, Math.round(targetHeightPx * workingCanvas.width / workingCanvas.height));
      else targetHeightPx = Math.max(1, Math.round(targetWidthPx * workingCanvas.height / workingCanvas.width));
    }
    showDimensions();
    setStatus('Crop applied. You can crop again or resize the signature.');
  });

  const rotate = (degrees) => {
    const rotated = document.createElement('canvas');
    rotated.width = workingCanvas.height;
    rotated.height = workingCanvas.width;
    const context = rotated.getContext('2d');
    context.translate(rotated.width / 2, rotated.height / 2);
    context.rotate(degrees * Math.PI / 180);
    context.drawImage(workingCanvas, -workingCanvas.width / 2, -workingCanvas.height / 2);
    workingCanvas = rotated;
    [targetWidthPx, targetHeightPx] = [targetHeightPx, targetWidthPx];
    setCropMode(false);
    showDimensions();
  };
  document.querySelector('#signature-rotate-left').addEventListener('click', () => rotate(-90));
  document.querySelector('#signature-rotate-right').addEventListener('click', () => rotate(90));

  widthInput.addEventListener('input', () => { lastEditedDimension = 'width'; readDimensions('width'); });
  heightInput.addEventListener('input', () => { lastEditedDimension = 'height'; readDimensions('height'); });
  unitInput.addEventListener('change', showDimensions);
  dpiInput.addEventListener('input', showDimensions);
  ratioLock.addEventListener('change', () => readDimensions(lastEditedDimension));

  const canvasToBlob = (canvas, quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  document.querySelector('#signature-process').addEventListener('click', async () => {
    const width = targetWidthPx;
    const height = targetHeightPx;
    const targetKB = Number(document.querySelector('#signature-size').value);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 10000 || height > 10000 || !Number.isFinite(targetKB) || targetKB <= 0) {
      setStatus('Enter valid dimensions up to 10000px and a target size greater than zero.', true);
      return;
    }
    setStatus('Resizing image…');
    download.hidden = true;
    const output = document.createElement('canvas');
    output.width = width;
    output.height = height;
    const context = output.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(workingCanvas, 0, 0, width, height);
    const maxBytes = targetKB * 1024;
    let quality = 0.92;
    let blob = await canvasToBlob(output, quality);
    while (blob && blob.size > maxBytes && quality > 0.1) {
      quality = Math.max(0.1, quality - 0.08);
      blob = await canvasToBlob(output, quality);
    }
    if (!blob) {
      setStatus('Could not create the resized image in this browser.', true);
      return;
    }
    if (blob.size > maxBytes) {
      setStatus(`Image is ${(blob.size / 1024).toFixed(1)} KB at minimum quality; increase the target size.`, true);
      return;
    }
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(blob);
    download.href = resultUrl;
    download.download = `${sourceName.replace(/\.[^.]+$/, '') || 'signature'}-resized.jpg`;
    download.hidden = false;
    setStatus(`Ready: ${width} × ${height}px · ${(blob.size / 1024).toFixed(1)} KB · JPEG`);
  });

  document.querySelector('#signature-reset').addEventListener('click', () => {
    signatureInput.value = '';
    editor.hidden = true;
    dropArea.hidden = false;
    download.hidden = true;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    sourceUrl = '';
    resultUrl = '';
    setStatus('');
  });
}

// Shared helpers and standalone local tools.
const readToolImage = (file) => new Promise((resolve, reject) => {
  if (!file || !file.type.startsWith('image/')) {
    reject(new Error('Choose a valid image file.'));
    return;
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be opened.')); };
  image.src = url;
});

const downloadToolBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const canvasBlob = (canvas, type = 'image/png', quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create the output file.')), type, quality);
});

const pdfInput = document.querySelector('#pdf-images');
if (pdfInput) {
  const status = document.querySelector('#pdf-status');
  const button = document.querySelector('#make-pdf');
  pdfInput.addEventListener('change', () => {
    document.querySelector('#pdf-file-list').textContent = pdfInput.files.length
      ? `${pdfInput.files.length} image(s) selected: ${Array.from(pdfInput.files, (file) => file.name).join(', ')}`
      : 'No images selected.';
  });

  button.addEventListener('click', async () => {
    const files = Array.from(pdfInput.files).filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type));
    if (!files.length) { status.textContent = 'Choose at least one JPG, PNG or WEBP image.'; return; }
    button.disabled = true;
    status.textContent = 'Creating your PDF…';
    try {
      const pages = [];
      for (const file of files) {
        const image = await readToolImage(file);
        const scale = Math.min(1, 1800 / image.naturalWidth, 1800 / image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        pages.push({ blob: await canvasBlob(canvas, 'image/jpeg', 0.9), width: canvas.width, height: canvas.height });
      }

      const objects = ['', '<< /Type /Catalog /Pages 2 0 R >>', ''];
      const pageIds = [];
      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        const pageId = 3 + index * 3;
        const imageId = pageId + 1;
        const contentId = pageId + 2;
        pageIds.push(`${pageId} 0 R`);
        const fit = Math.min(612 / page.width, 792 / page.height);
        const width = (page.width * fit).toFixed(2);
        const height = (page.height * fit).toFixed(2);
        const x = ((612 - Number(width)) / 2).toFixed(2);
        const y = ((792 - Number(height)) / 2).toFixed(2);
        const commands = `q ${width} 0 0 ${height} ${x} ${y} cm /Im0 Do Q`;
        const imageBytes = new Uint8Array(await page.blob.arrayBuffer());
        let binaryImage = '';
        for (let offset = 0; offset < imageBytes.length; offset += 8192) {
          binaryImage += String.fromCharCode(...imageBytes.subarray(offset, offset + 8192));
        }
        objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`;
        objects[imageId] = `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n${binaryImage}\nendstream`;
        objects[contentId] = `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`;
      }
      objects[2] = `<< /Type /Pages /Kids [${pageIds.join(' ')}] /Count ${pageIds.length} >>`;
      let pdf = '%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n';
      const offsets = [0];
      for (let id = 1; id < objects.length; id += 1) {
        offsets[id] = pdf.length;
        pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
      }
      const xrefOffset = pdf.length;
      pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
      for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
      pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
      const bytes = new Uint8Array(pdf.length);
      for (let index = 0; index < pdf.length; index += 1) bytes[index] = pdf.charCodeAt(index) & 255;
      downloadToolBlob(new Blob([bytes], { type: 'application/pdf' }), 'images.pdf');
      status.textContent = `PDF created with ${pages.length} page(s).`;
    } catch (error) {
      status.textContent = error.message || 'Could not create the PDF.';
    } finally {
      button.disabled = false;
    }
  });
}

const captionInput = document.querySelector('#caption-image');
if (captionInput) {
  const preview = document.querySelector('#caption-preview');
  captionInput.addEventListener('change', async () => {
    const file = captionInput.files[0];
    if (!file) { preview.hidden = true; return; }
    try {
      const image = await readToolImage(file);
      const previewCanvas = document.createElement('canvas');
      const scale = Math.min(1, 900 / image.naturalWidth, 900 / image.naturalHeight);
      previewCanvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      previewCanvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      previewCanvas.getContext('2d').drawImage(image, 0, 0, previewCanvas.width, previewCanvas.height);
      preview.src = previewCanvas.toDataURL('image/jpeg', 0.82);
      preview.hidden = false;
    } catch (error) {
      document.querySelector('#caption-status').textContent = error.message;
    }
  });
  document.querySelector('#caption-download').addEventListener('click', async () => {
    const status = document.querySelector('#caption-status');
    const file = captionInput.files[0];
    if (!file) { status.textContent = 'Choose a photo first.'; return; }
    try {
      const image = await readToolImage(file);
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 3000 / image.naturalWidth, 3000 / image.naturalHeight);
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const name = document.querySelector('#caption-name').value.trim();
      const rawDate = document.querySelector('#caption-date').value;
      const date = rawDate ? new Date(`${rawDate}T00:00:00`).toLocaleDateString() : '';
      const text = [name, date].filter(Boolean).join('  |  ');
      if (!text) { status.textContent = 'Enter a name/caption or choose a date.'; return; }
      const fontSize = Math.max(18, Math.round(canvas.width * 0.045));
      const band = Math.ceil(fontSize * 1.8);
      const y = document.querySelector('#caption-position').value === 'top' ? 0 : canvas.height - band;
      context.fillStyle = 'rgba(0, 0, 0, 0.58)';
      context.fillRect(0, y, canvas.width, band);
      context.fillStyle = '#fff';
      context.font = `700 ${fontSize}px Arial, sans-serif`;
      context.textBaseline = 'middle';
      context.fillText(text, Math.round(fontSize * 0.6), y + band / 2, canvas.width - fontSize * 1.2);
      downloadToolBlob(await canvasBlob(canvas, 'image/jpeg', 0.92), 'photo-with-name-date.jpg');
      status.textContent = 'Photo ready to download.';
    } catch (error) { status.textContent = error.message || 'Could not add the text to this photo.'; }
  });
}

const joinButton = document.querySelector('#join-download');
if (joinButton) {
  joinButton.addEventListener('click', async () => {
    const status = document.querySelector('#join-status');
    const photoFile = document.querySelector('#join-photo').files[0];
    const signFile = document.querySelector('#join-signature').files[0];
    if (!photoFile || !signFile) { status.textContent = 'Choose both a photo and a signature.'; return; }
    try {
      const [photo, signature] = await Promise.all([readToolImage(photoFile), readToolImage(signFile)]);
      const horizontal = document.querySelector('#join-layout').value === 'horizontal';
      const canvas = document.createElement('canvas');
      canvas.width = horizontal ? 1400 : 1000;
      canvas.height = horizontal ? 900 : 1400;
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      const drawContain = (image, x, y, width, height) => {
        const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
        const drawWidth = image.naturalWidth * scale;
        const drawHeight = image.naturalHeight * scale;
        context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
      };
      if (horizontal) {
        drawContain(photo, 20, 20, 680, 860);
        drawContain(signature, 720, 20, 660, 860);
      } else {
        drawContain(photo, 20, 20, 960, 960);
        drawContain(signature, 20, 1000, 960, 380);
      }
      downloadToolBlob(await canvasBlob(canvas, 'image/jpeg', 0.94), 'photo-sign-joined.jpg');
      status.textContent = 'Combined image ready to download.';
    } catch (error) { status.textContent = error.message || 'Could not join these images.'; }
  });
}

const ageButton = document.querySelector('#calculate-age');
if (ageButton) {
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  document.querySelector('#age-as-of').value = localToday;
  ageButton.addEventListener('click', () => {
    const result = document.querySelector('#age-result');
    const birthValue = document.querySelector('#age-dob').value;
    const endValue = document.querySelector('#age-as-of').value;
    if (!birthValue || !endValue) { result.textContent = 'Please enter both dates.'; return; }
    const birth = new Date(`${birthValue}T00:00:00Z`);
    const end = new Date(`${endValue}T00:00:00Z`);
    if (Number.isNaN(birth.getTime()) || Number.isNaN(end.getTime()) || birth > end) {
      result.textContent = 'Enter valid dates; the reference date must be on or after birth.';
      return;
    }
    let years = end.getUTCFullYear() - birth.getUTCFullYear();
    let months = end.getUTCMonth() - birth.getUTCMonth();
    let days = end.getUTCDate() - birth.getUTCDate();
    if (days < 0) {
      months -= 1;
      days += new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0)).getUTCDate();
    }
    if (months < 0) { years -= 1; months += 12; }
    result.textContent = `Age: ${years} years, ${months} months and ${days} days.`;
  });
}

const formatInput = document.querySelector('#format-image');
if (formatInput) {
  const quality = document.querySelector('#format-quality');
  quality.addEventListener('input', () => { document.querySelector('#format-quality-value').textContent = `${quality.value}%`; });
  document.querySelector('#format-download').addEventListener('click', async () => {
    const status = document.querySelector('#format-status');
    const file = formatInput.files[0];
    if (!file) { status.textContent = 'Choose an image first.'; return; }
    try {
      const image = await readToolImage(file);
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      const type = document.querySelector('#format-type').value;
      if (type === 'image/jpeg') {
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(image, 0, 0);
      const blob = await canvasBlob(canvas, type, Number(quality.value) / 100);
      const extension = type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp';
      const base = file.name.replace(/\.[^.]+$/, '') || 'image';
      downloadToolBlob(blob, `${base}.${extension}`);
      status.textContent = `Converted image is ready as ${extension.toUpperCase()}.`;
    } catch (error) { status.textContent = error.message || 'Could not convert this image.'; }
  });
}

// Editable details for homepage update links. Content is stored locally in this browser.
const updateSections = {
  result: { title: 'Result', items: ['Public service exam result announcements', 'Teacher recruitment merit lists', 'Banking exam score cards', 'State examination results', 'University and entrance exam results'] },
  'admit-card': { title: 'Admit Card', items: ['Government exam admit card releases', 'Recruitment exam city information', 'Teacher eligibility test hall tickets', 'Police recruitment physical test letters', 'Upcoming exam schedule updates'] },
  'latest-jobs': { title: 'Latest Job', items: ['Central government recruitment notices', 'State government vacancy updates', 'Banking and insurance vacancies', 'Teaching and education-sector jobs', 'Railway and defence recruitment'] },
  'answer-key': { title: 'Answer Key', items: ['Latest exam answer key notices', 'Response sheet availability updates', 'Objection window dates and details', 'Final answer key announcements'] },
  syllabus: { title: 'Syllabus', items: ['Competitive exam syllabus updates', 'Exam pattern and subject details', 'Downloadable preparation outlines', 'Recruitment-wise selection process'] },
  admission: { title: 'Admission', items: ['University admission application notices', 'Entrance test forms and schedules', 'Scholarship application updates', 'Counselling and allotment notices'] },
  'sarkari-kaam': { title: 'Sarkari Kaam', items: ['Government service application updates', 'Online certificates and document services', 'Voter ID and government ID services', 'Public service and utility forms'] },
  yojna: { title: 'Government Yojna', items: ['Central government scheme updates', 'State welfare scheme applications', 'Farmer and pension scheme information', 'Scholarship and women’s benefit schemes'] }
};
const updateItemsStorageKey = 'new-sarkari-updates-section-items';
const readUpdateItems = () => {
  try { return JSON.parse(localStorage.getItem(updateItemsStorageKey) || '{}'); }
  catch (error) { return {}; }
};
const saveUpdateItems = () => {
  try {
    localStorage.setItem(updateItemsStorageKey, JSON.stringify(Object.fromEntries(
      Object.entries(updateSections).map(([id, section]) => [id, section.items])
    )));
    return true;
  } catch (error) { return false; }
};
Object.entries(readUpdateItems()).forEach(([id, items]) => {
  if (updateSections[id] && Array.isArray(items) && items.every((item) => typeof item === 'string')) {
    updateSections[id].items = items;
  }
});
const updateStorageKey = 'new-sarkari-updates-item-details';
const readUpdateDetails = () => {
  try { return JSON.parse(localStorage.getItem(updateStorageKey) || '{}'); }
  catch (error) { return {}; }
};
const getUpdateItemUrl = (section, item) => `update-detail.html?section=${encodeURIComponent(section)}&item=${encodeURIComponent(item)}`;

// Rebuild homepage update lists from the locally saved editable titles.
document.querySelectorAll('.updates-section').forEach((sectionElement) => {
  const section = updateSections[sectionElement.id];
  const list = sectionElement.querySelector('.update-list');
  if (!section || !list) return;
  list.replaceChildren();
  section.items.forEach((title, index) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = getUpdateItemUrl(sectionElement.id, index);
    link.textContent = title;
    item.append(link);
    list.append(item);
  });
});

// Route each homepage update and View More link to its matching detail page.
document.querySelectorAll('.updates-section').forEach((sectionElement) => {
  const section = sectionElement.id;
  if (!updateSections[section]) return;
  sectionElement.querySelectorAll('.update-list li a').forEach((link, index) => {
    if (section === 'latest-jobs' && link.textContent === 'Railway and defence recruitment') {
      link.href = 'railway-defence.html';
      return;
    }
    link.href = getUpdateItemUrl(section, index);
  });
  const moreLink = sectionElement.querySelector('.view-more');
  if (moreLink) moreLink.href = getUpdateItemUrl(section, 'all');
});

const updateDetailPage = document.querySelector('[data-update-detail]');
if (updateDetailPage) {
  const params = new URLSearchParams(window.location.search);
  const sectionId = params.get('section');
  const itemValue = params.get('item');
  const section = updateSections[sectionId];
  const records = readUpdateDetails();
  const category = document.querySelector('#update-category');
  const title = document.querySelector('#update-title');
  const description = document.querySelector('#update-description');
  const info = document.querySelector('#update-extra-info');
  const allList = document.querySelector('#update-all-list');
  const noticeLinks = document.querySelector('.notice-links');

  if (!section) {
    title.textContent = 'Update not found';
    description.textContent = 'Choose an update from the homepage to view its details.';
  } else {
    category.textContent = section.title;
    document.querySelector('#update-category-label').textContent = section.title;
    if (itemValue === 'all') {
      title.textContent = `${section.title} Updates`;
      description.textContent = `Browse all ${section.title.toLowerCase()} updates. Select an item to view its details.`;
      document.querySelector('#update-all-title').textContent = `All ${section.title} Updates`;
      const list = document.querySelector('#update-all-items');
      allList.hidden = false;
      section.items.forEach((itemTitle, index) => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = getUpdateItemUrl(sectionId, index);
        link.textContent = itemTitle;
        item.append(link);
        list.append(item);
      });
      document.querySelector('.update-info-panel').hidden = true;
    } else {
      const itemIndex = Number(itemValue);
      if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= section.items.length) {
        title.textContent = 'Update not found';
        description.textContent = 'This update link is not valid.';
      } else {
        const itemTitle = section.items[itemIndex];
        const record = records[`${sectionId}:${itemIndex}`] || {};
        title.textContent = itemTitle;
        description.textContent = record.description || 'Verified details for this update have not been added yet. Please check the official website or notification before taking action.';
        info.textContent = record.info || 'No dates or additional information have been added yet.';
        const links = Array.isArray(record.links) ? record.links : [];
        if (!links.length && record.officialUrl) links.push({ label: 'Official Website / Notification', url: record.officialUrl });
        noticeLinks.replaceChildren();
        links.forEach((entry) => {
          if (!entry || !/^https?:\/\//i.test(String(entry.url || '').trim())) return;
          const link = document.createElement('a');
          link.href = entry.url.trim();
          link.textContent = entry.label.trim() || 'Open link';
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          noticeLinks.append(link);
        });
        noticeLinks.hidden = !noticeLinks.children.length;
      }
    }
  }
}

const updateAdmin = document.querySelector('#update-admin');
if (updateAdmin) {
  const sectionSelect = document.querySelector('#update-admin-section');
  const itemSelect = document.querySelector('#update-admin-item');
  const itemTitleInput = document.querySelector('#update-admin-title-input');
  const descriptionInput = document.querySelector('#update-admin-description');
  const infoInput = document.querySelector('#update-admin-info');
  const linksList = document.querySelector('#update-admin-links-list');
  const status = document.querySelector('#update-admin-status');
  const deleteButton = document.querySelector('#update-admin-delete');
  let addingNew = false;

  Object.entries(updateSections).forEach(([id, section]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = section.title;
    sectionSelect.append(option);
  });

  const selectedKey = () => `${sectionSelect.value}:${itemSelect.value}`;
  const makeLinkRow = (label = '', url = '') => {
    const row = document.createElement('div');
    row.className = 'update-admin-link-row';
    const labelInput = document.createElement('input');
    labelInput.className = 'local-tool-input';
    labelInput.type = 'text';
    labelInput.placeholder = 'Link label (e.g. Apply Online)';
    labelInput.setAttribute('aria-label', 'Link label');
    labelInput.dataset.linkLabel = '';
    labelInput.value = label;
    const urlInput = document.createElement('input');
    urlInput.className = 'local-tool-input';
    urlInput.type = 'url';
    urlInput.placeholder = 'https://...';
    urlInput.setAttribute('aria-label', 'Link URL');
    urlInput.dataset.linkUrl = '';
    urlInput.value = url;
    const removeButton = document.createElement('button');
    removeButton.className = 'image-secondary-button update-admin-remove-link';
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.setAttribute('aria-label', 'Remove this link');
    removeButton.addEventListener('click', () => row.remove());
    row.append(labelInput, urlInput, removeButton);
    return row;
  };
  const renderLinks = (record = {}) => {
    linksList.replaceChildren();
    let links = Array.isArray(record.links) ? record.links : [];
    if (!links.length && record.officialUrl) links = [{ label: 'Official Website / Notification', url: record.officialUrl }];
    links.forEach((link) => linksList.append(makeLinkRow(link.label || '', link.url || '')));
  };
  const loadEditorRecord = () => {
    addingNew = false;
    const index = Number(itemSelect.value);
    const currentSection = updateSections[sectionSelect.value];
    itemTitleInput.value = currentSection.items[index] || '';
    const record = readUpdateDetails()[selectedKey()] || {};
    descriptionInput.value = record.description || '';
    infoInput.value = record.info || '';
    renderLinks(record);
    itemSelect.disabled = false;
    deleteButton.disabled = false;
    status.textContent = '';
  };
  const populateItems = (preferredIndex = 0) => {
    const section = updateSections[sectionSelect.value];
    itemSelect.replaceChildren();
    section.items.forEach((item, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = item;
      itemSelect.append(option);
    });
    if (section.items.length) {
      itemSelect.value = String(Math.min(preferredIndex, section.items.length - 1));
      loadEditorRecord();
    } else {
      startNewUpdate();
    }
  };
  const startNewUpdate = () => {
    addingNew = true;
    itemSelect.value = '';
    itemTitleInput.value = '';
    descriptionInput.value = '';
    infoInput.value = '';
    renderLinks();
    itemSelect.disabled = true;
    deleteButton.disabled = true;
    status.textContent = 'New update: enter a title, details and any links, then save.';
    itemTitleInput.focus();
  };

  sectionSelect.addEventListener('change', () => populateItems());
  itemSelect.addEventListener('change', loadEditorRecord);
  document.querySelector('#update-admin-new').addEventListener('click', startNewUpdate);
  document.querySelector('#update-admin-add-link').addEventListener('click', () => {
    linksList.append(makeLinkRow());
    linksList.lastElementChild.querySelector('[data-link-label]').focus();
  });
  populateItems();

  document.querySelector('#update-admin-save').addEventListener('click', () => {
    const title = itemTitleInput.value.trim();
    if (!title) {
      status.textContent = 'Enter an update title before saving.';
      itemTitleInput.focus();
      return;
    }
    const links = Array.from(linksList.querySelectorAll('.update-admin-link-row')).map((row) => ({
      label: row.querySelector('[data-link-label]').value.trim(),
      url: row.querySelector('[data-link-url]').value.trim()
    })).filter((link) => link.label || link.url);
    if (links.some((link) => !link.url || !/^https?:\/\//i.test(link.url))) {
      status.textContent = 'Each link needs a valid http:// or https:// URL.';
      return;
    }
    const section = updateSections[sectionSelect.value];
    const index = addingNew ? section.items.length : Number(itemSelect.value);
    if (addingNew) section.items.push(title);
    else section.items[index] = title;
    const details = readUpdateDetails();
    details[`${sectionSelect.value}:${index}`] = {
      description: descriptionInput.value.trim(),
      info: infoInput.value.trim(),
      links
    };
    try {
      if (!saveUpdateItems()) throw new Error('Storage unavailable');
      localStorage.setItem(updateStorageKey, JSON.stringify(details));
      populateItems(index);
      status.textContent = 'Update saved in this browser. Refresh the homepage to preview.';
    } catch (error) {
      status.textContent = 'Could not save this update in this browser.';
    }
  });

  deleteButton.addEventListener('click', () => {
    if (addingNew || !itemSelect.value) return;
    const index = Number(itemSelect.value);
    const sectionId = sectionSelect.value;
    if (!window.confirm(`Delete “${updateSections[sectionId].items[index]}”?`)) return;
    const section = updateSections[sectionId];
    section.items.splice(index, 1);
    const oldDetails = readUpdateDetails();
    const shiftedDetails = {};
    Object.entries(oldDetails).forEach(([key, value]) => {
      const [id, rawIndex] = key.split(':');
      if (id !== sectionId) shiftedDetails[key] = value;
      else if (Number(rawIndex) < index) shiftedDetails[key] = value;
      else if (Number(rawIndex) > index) shiftedDetails[`${id}:${Number(rawIndex) - 1}`] = value;
    });
    try {
      if (!saveUpdateItems()) throw new Error('Storage unavailable');
      localStorage.setItem(updateStorageKey, JSON.stringify(shiftedDetails));
      populateItems(Math.max(0, index - 1));
      status.textContent = 'Update deleted.';
    } catch (error) {
      status.textContent = 'Could not delete this update in this browser.';
    }
  });

  document.querySelector('#update-admin-reset').addEventListener('click', () => {
    if (addingNew || !itemSelect.value) {
      status.textContent = 'Select a saved update before clearing its details.';
      return;
    }
    const details = readUpdateDetails();
    delete details[selectedKey()];
    try {
      localStorage.setItem(updateStorageKey, JSON.stringify(details));
      loadEditorRecord();
      status.textContent = 'Saved details and links cleared for this update.';
    } catch (error) {
      status.textContent = 'Could not clear saved details.';
    }
  });
}
