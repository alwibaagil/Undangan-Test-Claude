(function () {
  const configs = window.WEDDING_TEMPLATE_CONFIGS || {};
  const state = {
    templateId: "monochrome",
    data: null,
    opened: false,
    countdownTimer: null,
    particleFrame: null,
    observer: null
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    renderTemplateCards();
    bindActions();

    const params = new URLSearchParams(window.location.search);
    const templateId = params.get("template");
    if (templateId && configs[templateId]) {
      showPreview(templateId, { push: false, guestMode: params.get("guest") === "1" });
    } else {
      showLanding(false);
    }
  }

  function cacheElements() {
    els.landingView = document.getElementById("landingView");
    els.previewView = document.getElementById("previewView");
    els.templateGrid = document.getElementById("templateGrid");
    els.toolbarTitle = document.getElementById("toolbarTitle");
    els.backHomeBtn = document.getElementById("backHomeBtn");
    els.openEditorBtn = document.getElementById("openEditorBtn");
    els.invitePhone = document.getElementById("invitePhone");
    els.introOverlay = document.getElementById("introOverlay");
    els.openInvitationBtn = document.getElementById("openInvitationBtn");
    els.inviteContent = document.getElementById("inviteContent");
    els.countdownStatus = document.getElementById("countdownStatus");
    els.cdDays = document.getElementById("cdDays");
    els.cdHours = document.getElementById("cdHours");
    els.cdMinutes = document.getElementById("cdMinutes");
    els.cdSeconds = document.getElementById("cdSeconds");
    els.storyList = document.getElementById("storyList");
    els.eventList = document.getElementById("eventList");
    els.gallerySection = document.getElementById("gallerySection");
    els.galleryList = document.getElementById("galleryList");
    els.rsvpForm = document.getElementById("rsvpForm");
    els.rsvpThanks = document.getElementById("rsvpThanks");
    els.editModal = document.getElementById("editModal");
    els.editForm = document.getElementById("editForm");
    els.shareLinkInput = document.getElementById("shareLinkInput");
    els.copyShareLinkBtn = document.getElementById("copyShareLinkBtn");
    els.resetDataBtn = document.getElementById("resetDataBtn");
    els.particleCanvas = document.getElementById("particleCanvas");
  }

  function renderTemplateCards() {
    els.templateGrid.innerHTML = "";
    Object.values(configs).forEach((template) => {
      const card = document.createElement("article");
      card.className = "template-card";
      card.innerHTML = `
        <div class="template-thumb">
          <img class="thumb-flower thumb-flower-lb" src="${escapeHtml(template.assets.flowerLeft)}" alt="" aria-hidden="true">
          <img class="thumb-flower thumb-flower-rt" src="${escapeHtml(template.assets.flowerLeft)}" alt="" aria-hidden="true">
          <img class="thumb-flower thumb-flower-rb" src="${escapeHtml(template.assets.flowerRight)}" alt="" aria-hidden="true">
          <img class="thumb-flower thumb-flower-lt" src="${escapeHtml(template.assets.flowerRight)}" alt="" aria-hidden="true">
          <div class="template-preview-text">
            <span>${escapeHtml(template.theme)}</span>
            <strong>${escapeHtml(template.defaultData.groomShort)} &amp; ${escapeHtml(template.defaultData.brideShort)}</strong>
          </div>
        </div>
        <div class="template-body">
          <h3>${escapeHtml(template.name)}</h3>
          <p>${escapeHtml(template.description)}</p>
          <div class="template-meta">
            <span>${escapeHtml(template.price)}</span>
            <span>Config per template</span>
          </div>
          <button class="btn btn-dark" type="button" data-select-template="${escapeHtml(template.id)}">Pilih Template</button>
        </div>
      `;
      els.templateGrid.appendChild(card);
    });
  }

  function bindActions() {
    document.addEventListener("click", (event) => {
      const templateButton = event.target.closest("[data-select-template]");
      if (templateButton) {
        const templateId = templateButton.getAttribute("data-select-template");
        if (configs[templateId]) showPreview(templateId, { push: true, guestMode: false });
      }

      if (event.target.matches("[data-close-modal]")) {
        closeModal();
      }
    });

    els.backHomeBtn.addEventListener("click", () => showLanding(true));
    els.openEditorBtn.addEventListener("click", openModal);
    els.openInvitationBtn.addEventListener("click", openInvitation);

    els.editForm.addEventListener("input", (event) => {
      if (event.target.name === "guestName") {
        updateShareLinkPreview();
      }
    });

    els.editForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await saveEditorData();
        closeModal();
      } catch (error) {
        window.alert("Gagal memproses foto. Coba pilih gambar lain dengan ukuran lebih kecil.");
      }
    });

    els.resetDataBtn.addEventListener("click", () => {
      const config = configs[state.templateId];
      state.data = clone(config.defaultData);
      localStorage.removeItem(storageKey(state.templateId));
      applyQueryGuestData(state.data);
      renderInvite();
      fillEditorForm();
    });

    els.copyShareLinkBtn.addEventListener("click", async () => {
      updateShareLinkPreview();
      try {
        await navigator.clipboard.writeText(els.shareLinkInput.value);
        els.copyShareLinkBtn.textContent = "Link Disalin";
        window.setTimeout(() => {
          els.copyShareLinkBtn.textContent = "Salin Link";
        }, 1400);
      } catch (error) {
        els.shareLinkInput.select();
      }
    });

    els.rsvpForm.addEventListener("submit", (event) => {
      event.preventDefault();
      els.rsvpThanks.classList.add("is-show");
      els.rsvpForm.reset();
    });
  }

  function showLanding(push) {
    stopCountdown();
    stopParticles();
    state.opened = false;
    document.body.classList.remove("preview-active", "invitation-locked", "guest-mode");
    els.previewView.classList.add("is-hidden");
    els.landingView.classList.remove("is-hidden");
    els.invitePhone.classList.remove("is-open", "is-cover-animated");
    closeModal();
    if (push) history.pushState({}, "", window.location.pathname);
  }

  function showPreview(templateId, options) {
    const config = configs[templateId];
    state.templateId = templateId;
    state.opened = false;
    state.data = loadTemplateData(templateId);
    applyQueryGuestData(state.data);

    document.body.classList.add("preview-active", "invitation-locked");
    document.body.classList.toggle("guest-mode", Boolean(options.guestMode));
    els.landingView.classList.add("is-hidden");
    els.previewView.classList.remove("is-hidden");
    els.invitePhone.classList.remove("is-open");
    els.toolbarTitle.textContent = config.name;

    // Reset and show intro overlay
    els.introOverlay.style.display = 'flex';

    renderInvite();
    fillEditorForm();
    window.scrollTo({ top: 0, behavior: "auto" });

    // Hide overlay after animation (4.5s total)
    setTimeout(() => {
      els.introOverlay.style.display = 'none';
      // Start cover animations after intro hides
      els.invitePhone.classList.add("is-cover-animated");
    }, 4500);

    if (options.push) {
      const params = new URLSearchParams();
      params.set("template", templateId);
      history.pushState({}, "", `${window.location.pathname}?${params.toString()}`);
    }
  }

  function resetIntroAnimation() {
    els.introOverlay.style.animation = "none";
    els.introOverlay.offsetHeight;
    els.introOverlay.style.animation = "";
  }

  function restartCoverAnimation() {
    // Trigger cover content animations
    els.invitePhone.classList.remove("is-cover-animated");
    void els.invitePhone.offsetHeight;
    els.invitePhone.classList.add("is-cover-animated");
  }

  function loadTemplateData(templateId) {
    const config = configs[templateId];
    const saved = localStorage.getItem(storageKey(templateId));
    if (!saved) return normalizeData(clone(config.defaultData), config.defaultData);
    try {
      return normalizeData(Object.assign(clone(config.defaultData), JSON.parse(saved)), config.defaultData);
    } catch (error) {
      return normalizeData(clone(config.defaultData), config.defaultData);
    }
  }

  function renderInvite() {
    const config = configs[state.templateId];
    const data = state.data;
    if (!config || !data) return;

    els.invitePhone.style.setProperty("--name-font", data.nameFont || config.defaultData.nameFont);
    els.invitePhone.style.setProperty("--accent-font", data.accentFont || config.defaultData.accentFont);
    els.invitePhone.style.setProperty("--body-font", data.bodyFont || config.defaultData.bodyFont);

    setAllText("openingLine", data.openingLine);
    setAllText("groomShort", data.groomShort);
    setAllText("brideShort", data.brideShort);
    setAllText("groomFull", data.groomFull);
    setAllText("brideFull", data.brideFull);
    setAllText("groomParents", data.groomParents);
    setAllText("brideParents", data.brideParents);
    setAllText("title", data.title);
    setAllText("introText", data.introText);
    setAllText("displayDate", data.displayDate);
    setAllText("quoteText", data.quoteText);
    setAllText("quoteSource", data.quoteSource);
    setAllText("guestName", data.guestName || "Tamu Undangan");
    setAllText("closingText", data.closingText);
    setAllText("closingFamily", data.closingFamily);
    setAllText("initials", `${firstLetter(data.groomShort)} & ${firstLetter(data.brideShort)}`);
    setAllText("groomInitial", firstLetter(data.groomShort));
    setAllText("brideInitial", firstLetter(data.brideShort));

    document.querySelectorAll("[data-flower='left'], [data-static-flower='left']").forEach((img) => {
      img.src = config.assets.flowerLeft;
    });
    document.querySelectorAll("[data-flower='right'], [data-static-flower='right']").forEach((img) => {
      img.src = config.assets.flowerRight;
    });

    renderPersonPhoto("groom", data.groomPhoto);
    renderPersonPhoto("bride", data.bridePhoto);
    renderStory(data.story || []);
    renderEvents(data.events || []);
    renderGallery(data.galleryPhotos || []);
    setupRevealObserver();
    startCountdown(data.eventDate);
    startParticles();
  }

  function renderPersonPhoto(type, imageUrl) {
    const avatar = document.querySelector(`[data-avatar="${type}"]`);
    if (!avatar) return;
    const image = avatar.querySelector("img");
    if (imageUrl && image) {
      image.src = imageUrl;
      avatar.classList.add("has-photo");
      return;
    }
    if (image) image.removeAttribute("src");
    avatar.classList.remove("has-photo");
  }

  function renderStory(items) {
    els.storyList.innerHTML = items.map((item) => `
      <article class="story-card">
        <strong>${escapeHtml(item.year)}</strong>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.text)}</p>
      </article>
    `).join("");
  }

  function renderEvents(items) {
    els.eventList.innerHTML = items.map((item) => `
      <article class="event-card">
        <p class="event-type">${escapeHtml(item.type)}</p>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="event-row"><span>Tanggal</span><strong>${escapeHtml(item.date)}</strong></div>
        <div class="event-row"><span>Waktu</span><strong>${escapeHtml(item.time)}</strong></div>
        <div class="event-row"><span>Tempat</span><strong>${escapeHtml(item.venue)}</strong></div>
      </article>
    `).join("");
  }

  function renderGallery(photos) {
    const images = normalizeGalleryPhotos(photos);
    const isOdd = images.length % 2 === 1;
    els.gallerySection.hidden = images.length === 0;
    els.galleryList.className = `gallery-list count-${images.length}${isOdd ? " is-odd" : " is-even"}${images.length === 0 ? " is-empty" : ""}`;
    els.galleryList.innerHTML = images.map((image, index) => `
      <figure class="gallery-item has-photo">
        <img src="${escapeHtml(image)}" alt="Foto galeri ${index + 1}">
      </figure>
    `).join("");
  }

  function openInvitation() {
    state.opened = true;
    document.body.classList.remove("invitation-locked");
    els.invitePhone.classList.add("is-open");

    // Add confetti burst effect
    triggerConfettiBurst();

    window.setTimeout(() => {
      document.getElementById("quoteSection").scrollIntoView({ behavior: "smooth", block: "start" });
      setupRevealObserver();
    }, 100);
  }

  function triggerConfettiBurst() {
    const phone = els.invitePhone;
    const confettiCount = 50;
    const colors = ['#c9a962', '#e8d5a3', '#ffffff', '#d4af37', '#f5f5f0'];

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-particle';
      confetti.style.cssText = `
        position: absolute;
        width: ${Math.random() * 8 + 4}px;
        height: ${Math.random() * 8 + 4}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}%;
        top: 50%;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        opacity: 0;
        pointer-events: none;
        z-index: 1000;
        animation: confettiFall ${Math.random() * 2 + 1.5}s ease-out forwards;
        animation-delay: ${Math.random() * 0.3}s;
      `;
      phone.appendChild(confetti);

      setTimeout(() => confetti.remove(), 3000);
    }
  }

  function openModal() {
    fillEditorForm();
    els.editModal.classList.remove("is-hidden");
    els.editModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    if (!els.editModal) return;
    els.editModal.classList.add("is-hidden");
    els.editModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function fillEditorForm() {
    if (!state.data) return;
    const data = state.data;
    const form = els.editForm;
    form.elements.groomShort.value = data.groomShort || "";
    form.elements.groomFull.value = data.groomFull || "";
    form.elements.groomParents.value = data.groomParents || "";
    form.elements.brideShort.value = data.brideShort || "";
    form.elements.brideFull.value = data.brideFull || "";
    form.elements.brideParents.value = data.brideParents || "";
    form.elements.title.value = data.title || "";
    form.elements.introText.value = data.introText || "";
    form.elements.nameFont.value = data.nameFont || configs[state.templateId].defaultData.nameFont;
    form.elements.eventDate.value = toDateTimeLocal(data.eventDate);
    form.elements.displayDate.value = data.displayDate || "";
    form.elements.akadTime.value = data.events?.[0]?.time || "";
    form.elements.akadVenue.value = data.events?.[0]?.venue || "";
    form.elements.receptionTime.value = data.events?.[1]?.time || "";
    form.elements.receptionVenue.value = data.events?.[1]?.venue || "";
    form.elements.guestName.value = data.guestName || "";
    form.elements.groomPhoto.value = "";
    form.elements.bridePhoto.value = "";
    getGalleryPhotoInputs().forEach((input) => {
      input.value = "";
    });
    updateShareLinkPreview();
  }

  async function saveEditorData() {
    const form = els.editForm;
    const data = clone(state.data);
    const eventDate = fromDateTimeLocal(form.elements.eventDate.value) || data.eventDate;
    const displayDate = form.elements.displayDate.value.trim() || formatDisplayDate(eventDate);

    data.groomShort = form.elements.groomShort.value.trim() || data.groomShort;
    data.groomFull = form.elements.groomFull.value.trim() || data.groomFull;
    data.groomParents = form.elements.groomParents.value.trim() || data.groomParents;
    data.brideShort = form.elements.brideShort.value.trim() || data.brideShort;
    data.brideFull = form.elements.brideFull.value.trim() || data.brideFull;
    data.brideParents = form.elements.brideParents.value.trim() || data.brideParents;
    data.title = form.elements.title.value.trim() || data.title;
    data.introText = form.elements.introText.value.trim() || data.introText;
    data.nameFont = form.elements.nameFont.value;
    data.eventDate = eventDate;
    data.displayDate = displayDate;
    data.guestName = form.elements.guestName.value.trim() || "Tamu Undangan";
    removeDeprecatedFields(data);

    const groomPhoto = form.elements.groomPhoto.files?.[0];
    const bridePhoto = form.elements.bridePhoto.files?.[0];

    if (groomPhoto) data.groomPhoto = await readImageFile(groomPhoto, 820, 0.82);
    if (bridePhoto) data.bridePhoto = await readImageFile(bridePhoto, 820, 0.82);
    data.galleryPhotos = await readGalleryPhotoSlots(data.galleryPhotos);

    if (data.events?.[0]) {
      data.events[0].date = displayDate;
      data.events[0].time = form.elements.akadTime.value.trim() || data.events[0].time;
      data.events[0].venue = form.elements.akadVenue.value.trim() || data.events[0].venue;
    }
    if (data.events?.[1]) {
      data.events[1].date = displayDate;
      data.events[1].time = form.elements.receptionTime.value.trim() || data.events[1].time;
      data.events[1].venue = form.elements.receptionVenue.value.trim() || data.events[1].venue;
    }

    state.data = data;
    try {
      localStorage.setItem(storageKey(state.templateId), JSON.stringify(data));
    } catch (error) {
      window.alert("Preview sudah berubah, tetapi sebagian foto terlalu besar untuk disimpan permanen di browser.");
    }
    renderInvite();
  }

  function updateShareLinkPreview() {
    if (!state.data) return;
    const form = els.editForm;
    const guestName = form.elements.guestName.value || state.data.guestName || "Tamu Undangan";
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("template", state.templateId);
    url.searchParams.set("guest", "1");
    url.searchParams.set("to", guestName.trim());
    els.shareLinkInput.value = url.toString();
  }

  function applyQueryGuestData(data) {
    const params = new URLSearchParams(window.location.search);
    if (params.has("to")) data.guestName = params.get("to") || data.guestName;
  }

  function normalizeData(data, defaults) {
    const normalized = data || clone(defaults);
    removeDeprecatedFields(normalized);
    normalized.groomPhoto = typeof normalized.groomPhoto === "string" ? normalized.groomPhoto : "";
    normalized.bridePhoto = typeof normalized.bridePhoto === "string" ? normalized.bridePhoto : "";
    normalized.galleryPhotos = normalizeGalleryPhotos(normalized.galleryPhotos);
    return normalized;
  }

  function removeDeprecatedFields(data) {
    ["cover" + "Image", "guest" + "City"].forEach((field) => {
      delete data[field];
    });
  }

  async function readGalleryPhotoSlots(existingPhotos) {
    const photos = normalizeGalleryPhotos(existingPhotos);
    const inputs = getGalleryPhotoInputs();
    for (let index = 0; index < inputs.length; index += 1) {
      const file = inputs[index].files?.[0];
      if (file && file.type.startsWith("image/")) {
        photos[index] = await readImageFile(file, 1200, 0.8);
      }
    }
    return normalizeGalleryPhotos(photos);
  }

  function getGalleryPhotoInputs() {
    return Array.from(els.editForm.querySelectorAll("[data-gallery-photo]")).slice(0, 5);
  }

  function normalizeGalleryPhotos(photos) {
    return Array.isArray(photos) ? photos.filter(Boolean).slice(0, 5) : [];
  }

  function readImageFile(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Image read failed"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("Image load failed"));
        image.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
          const width = Math.max(1, Math.round(image.naturalWidth * scale));
          const height = Math.max(1, Math.round(image.naturalHeight * scale));
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.width = width;
          canvas.height = height;
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function startCountdown(dateValue) {
    stopCountdown();
    const target = new Date(dateValue).getTime();

    const render = () => {
      const diff = target - Date.now();
      if (!Number.isFinite(target) || diff <= 0) {
        els.countdownStatus.textContent = "Acara telah berlangsung";
        setCountdown(0, 0, 0, 0);
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      els.countdownStatus.textContent = "Menuju hari bahagia";
      setCountdown(days, hours, minutes, seconds);
    };

    render();
    state.countdownTimer = window.setInterval(render, 1000);
  }

  function setCountdown(days, hours, minutes, seconds) {
    els.cdDays.textContent = pad(days);
    els.cdHours.textContent = pad(hours);
    els.cdMinutes.textContent = pad(minutes);
    els.cdSeconds.textContent = pad(seconds);
  }

  function stopCountdown() {
    if (state.countdownTimer) {
      window.clearInterval(state.countdownTimer);
      state.countdownTimer = null;
    }
  }

  function startParticles() {
    stopParticles();
    const canvas = els.particleCanvas;
    const ctx = canvas.getContext("2d");
    const phone = els.invitePhone;
    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: Math.random() * 1.8 + 0.4,
      sx: (Math.random() - 0.5) * 0.00072,
      sy: (Math.random() - 0.5) * 0.00072,
      alpha: Math.random() * 0.25 + 0.1,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.5 + 0.3,
      color: Math.random() > 0.7 ? '#c9a962' : '#2c2c2a'
    }));

    function sizeCanvas() {
      const rect = phone.getBoundingClientRect();
      const height = Math.max(phone.scrollHeight, window.innerHeight);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        particle.x += particle.sx * particle.speed;
        particle.y += particle.sy * particle.speed;
        particle.phase += 0.025;
        if (particle.x < 0 || particle.x > 1) particle.sx *= -1;
        if (particle.y < 0 || particle.y > 1) particle.sy *= -1;
      });

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        const ax = a.x * width;
        const ay = a.y * height;
        const pulse = Math.sin(a.phase) * 0.12;
        const glow = Math.sin(a.phase * 0.5) * 0.3;

        // Draw particle with glow effect
        ctx.beginPath();
        ctx.arc(ax, ay, a.radius + pulse, 0, Math.PI * 2);
        ctx.fillStyle = a.color;
        ctx.globalAlpha = a.alpha + glow;
        ctx.fill();

        // Add sparkle effect for gold particles
        if (a.color === '#c9a962') {
          ctx.beginPath();
          ctx.arc(ax, ay, a.radius * 1.5 + pulse, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(201, 169, 98, 0.15)';
          ctx.fill();
        }

        ctx.globalAlpha = 1;

        // Draw connection lines
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const bx = b.x * width;
          const by = b.y * height;
          const distance = Math.hypot(ax - bx, ay - by);
          const maxDist = 110;
          if (distance < maxDist) {
            const opacity = 0.1 * (1 - distance / maxDist);
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.strokeStyle = `rgba(90, 90, 84, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Gold connection for gold particles
            if (a.color === '#c9a962' || b.color === '#c9a962') {
              ctx.beginPath();
              ctx.moveTo(ax, ay);
              ctx.lineTo(bx, by);
              ctx.strokeStyle = `rgba(201, 169, 98, ${opacity * 0.5})`;
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }
        }
      }
      state.particleFrame = window.requestAnimationFrame(draw);
    }

    sizeCanvas();
    window.addEventListener("resize", sizeCanvas, { passive: true });
    draw();
  }

  function stopParticles() {
    if (state.particleFrame) {
      window.cancelAnimationFrame(state.particleFrame);
      state.particleFrame = null;
    }
  }

  function setupRevealObserver() {
    if (state.observer) state.observer.disconnect();
    state.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          state.observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });

    document.querySelectorAll(".reveal").forEach((item) => {
      if (state.opened) state.observer.observe(item);
      else item.classList.remove("in-view");
    });
  }

  function setAllText(key, value) {
    document.querySelectorAll(`[data-text="${key}"]`).forEach((node) => {
      node.textContent = value || "";
    });
  }

  function storageKey(templateId) {
    return `wedding-template-${templateId}-data`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function firstLetter(value) {
    return (value || "").trim().charAt(0).toUpperCase() || "?";
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function toDateTimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function fromDateTimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function formatDisplayDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta"
    }).format(date);
  }
})();
