(async () => {
  let source;
  try { source = await window.ESPARTANOS_GALLERY; }
  catch (error) {
    document.querySelectorAll('[data-gallery-empty], .gallery-preview-note').forEach(node => {
      node.hidden = false;
      node.textContent = error.message;
    });
    const count = document.querySelector('[data-gallery-count]');
    if (count) count.textContent = '';
    return;
  }

  if (!source || !Array.isArray(source.items)) {
    return;
  }

  const items = source.items.filter((item) => item && item.image);
  const isMock = source.source === "mock";
  const galleryPage = document.querySelector("[data-gallery-page]");
  const galleryGrid = document.querySelector("[data-gallery-grid]");
  const previewGrid = document.querySelector("[data-gallery-preview]");
  const previewLimitValue = Number.parseInt(previewGrid?.dataset.limit || "6", 10);
  const previewLimit = Number.isFinite(previewLimitValue) ? previewLimitValue : 6;

  const createCard = (item, { linkToGallery = false } = {}) => {
    const card = document.createElement(linkToGallery ? "a" : "button");
    card.className = "gallery-card";

    if (linkToGallery) {
      card.href = "/nuestros-trabajos/";
      card.setAttribute(
        "aria-label",
        `Ver todos los trabajos: ${item.caption || item.category}`
      );
    } else {
      card.type = "button";
      card.dataset.galleryId = item.id;
      card.setAttribute(
        "aria-label",
        `Ampliar imagen: ${item.caption || item.category}, categoría ${item.category}`
      );
    }

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.alt || `${item.caption || item.category} de Espartano’s Barbershop`;
    image.width = item.width || 1000;
    image.height = item.height || 1000;
    image.loading = "lazy";
    image.decoding = "async";

    const copy = document.createElement("span");
    copy.className = "gallery-card-copy";

    const category = document.createElement("span");
    category.className = "gallery-card-category";
    category.textContent = item.category;
    copy.append(category);

    if (item.caption) {
      const caption = document.createElement("span");
      caption.className = "gallery-card-caption";
      caption.textContent = item.caption;
      copy.append(caption);
    }

    card.append(image, copy);
    return card;
  };

  if (previewGrid) {
    const previewItems = [...items].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, Math.min(6, previewLimit));
    previewGrid.replaceChildren(
      ...previewItems.map((item) => createCard(item, { linkToGallery: true }))
    );
    const note = document.querySelector('.gallery-preview-note');
    if (note) { note.hidden = items.length > 0; note.textContent = 'Pronto compartiremos fotos de nuestra barbería y nuestros trabajos.'; }
  }

  if (!galleryPage || !galleryGrid) {
    return;
  }

  const filters = [...galleryPage.querySelectorAll("[data-gallery-filter]")];
  const count = galleryPage.querySelector("[data-gallery-count]");
  const emptyState = galleryPage.querySelector("[data-gallery-empty]");
  const lightbox = galleryPage.querySelector("[data-gallery-lightbox]");
  const lightboxImage = lightbox?.querySelector("[data-lightbox-image]");
  const lightboxCategory = lightbox?.querySelector("[data-lightbox-category]");
  const lightboxCaption = lightbox?.querySelector("[data-lightbox-caption]");
  const lightboxCounter = lightbox?.querySelector("[data-lightbox-counter]");
  const lightboxNote = lightbox?.querySelector("[data-lightbox-note]");
  const closeButton = lightbox?.querySelector("[data-lightbox-close]");
  const previousButton = lightbox?.querySelector("[data-lightbox-prev]");
  const nextButton = lightbox?.querySelector("[data-lightbox-next]");

  let visibleItems = items;
  let currentIndex = 0;
  let lastTrigger = null;

  const updateCount = () => {
    if (!count) return;

    const noun = visibleItems.length === 1 ? "trabajo" : "trabajos";
    count.textContent = `${visibleItems.length} ${noun}${isMock ? " de ejemplo" : ""}`;
  };

  const renderGallery = (filter) => {
    visibleItems = filter === "Todos"
      ? items
      : items.filter((item) => item.category === filter);

    galleryGrid.replaceChildren(...visibleItems.map((item) => createCard(item)));
    updateCount();

    if (emptyState) {
      emptyState.hidden = visibleItems.length > 0;
    }
  };

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      filters.forEach((filterButton) => {
        const isActive = filterButton === button;
        filterButton.classList.toggle("is-active", isActive);
        filterButton.setAttribute("aria-pressed", String(isActive));
      });

      renderGallery(button.dataset.galleryFilter || "Todos");
    });
  });

  const updateLightbox = () => {
    const item = visibleItems[currentIndex];

    if (!item || !lightboxImage) return;

    lightboxImage.src = item.image;
    lightboxImage.alt = item.alt || `${item.caption || item.category} de Espartano’s Barbershop`;
    lightboxImage.width = item.width || 1000;
    lightboxImage.height = item.height || 1000;

    if (lightboxCategory) {
      lightboxCategory.textContent = item.category;
    }

    if (lightboxCaption) {
      lightboxCaption.textContent = item.caption || item.category;
    }

    if (lightboxCounter) {
      lightboxCounter.textContent = `${currentIndex + 1} / ${visibleItems.length}`;
    }

    if (lightboxNote) {
      lightboxNote.hidden = !isMock;
    }

    const hasSeveralItems = visibleItems.length > 1;

    if (previousButton) {
      previousButton.disabled = !hasSeveralItems;
    }

    if (nextButton) {
      nextButton.disabled = !hasSeveralItems;
    }
  };

  const openLightbox = (itemId, trigger) => {
    const index = visibleItems.findIndex((item) => item.id === itemId);

    if (index < 0 || !lightbox) return;

    currentIndex = index;
    lastTrigger = trigger;
    updateLightbox();

    if (typeof lightbox.showModal === "function") {
      lightbox.showModal();
    } else {
      lightbox.setAttribute("open", "");
    }
  };

  const closeLightbox = () => {
    if (!lightbox) return;

    if (typeof lightbox.close === "function" && lightbox.open) {
      lightbox.close();
    } else {
      lightbox.removeAttribute("open");
    }
  };

  const moveLightbox = (direction) => {
    if (visibleItems.length <= 1) return;

    currentIndex = (currentIndex + direction + visibleItems.length) % visibleItems.length;
    updateLightbox();
  };

  galleryGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-gallery-id]");

    if (!card) return;

    openLightbox(card.dataset.galleryId, card);
  });

  closeButton?.addEventListener("click", closeLightbox);
  previousButton?.addEventListener("click", () => moveLightbox(-1));
  nextButton?.addEventListener("click", () => moveLightbox(1));

  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  lightbox?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveLightbox(-1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveLightbox(1);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    }
  });

  lightbox?.addEventListener("close", () => {
    if (lastTrigger && document.contains(lastTrigger)) {
      lastTrigger.focus();
    }
  });

  const initialFilter = filters.find((button) => button.getAttribute("aria-pressed") === "true");
  renderGallery(initialFilter?.dataset.galleryFilter || "Todos");
})();
