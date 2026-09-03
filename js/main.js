(() => {
  const body = document.body;
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#site-nav");
  const menuLabel = menuButton?.querySelector(".sr-only");

  const setMenuState = (isOpen) => {
    if (!menuButton) return;
    body.classList.toggle("menu-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    if (menuLabel) {
      menuLabel.textContent = isOpen ? "Cerrar menú" : "Abrir menú";
    }
  };

  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      setMenuState(!body.classList.contains("menu-open"));
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenuState(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMenuState(false);
    });

    document.addEventListener("click", (event) => {
      if (
        body.classList.contains("menu-open") &&
        !nav.contains(event.target) &&
        !menuButton.contains(event.target)
      ) {
        setMenuState(false);
      }
    });
  }

  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  const mobileCta = document.querySelector(".mobile-cta");
  if (mobileCta) {
    const updateMobileCta = () => {
      mobileCta.classList.toggle("is-visible", window.scrollY > 180);
    };

    updateMobileCta();
    window.addEventListener("scroll", updateMobileCta, { passive: true });
  }

  const accountNumber = "751769721";
  const copyControls = document.querySelectorAll("[data-copy-account]");
  const copyButton = document.querySelector("[data-copy-button]");
  const copyButtonText = document.querySelector("[data-copy-button-text]");
  const copyFeedback = document.querySelector("[data-copy-feedback]");
  let copyResetTimer;

  const fallbackCopy = (text) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.append(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  };

  const copyAccountNumber = async () => {
    let copied = false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(accountNumber);
        copied = true;
      } catch {
        copied = fallbackCopy(accountNumber);
      }
    } else {
      copied = fallbackCopy(accountNumber);
    }

    if (!copied) {
      if (copyFeedback) {
        copyFeedback.textContent = copyButton?.dataset.copyErrorMessage || "";
      }
      return;
    }

    if (copyButton) {
      copyButton.classList.add("is-copied");
      if (copyButtonText) {
        copyButtonText.textContent = copyButton.dataset.copiedLabel || "Copied";
      }
    }

    if (copyFeedback) {
      copyFeedback.textContent = copyButton?.dataset.copiedMessage || "";
    }

    window.clearTimeout(copyResetTimer);
    copyResetTimer = window.setTimeout(() => {
      if (copyButton) {
        copyButton.classList.remove("is-copied");
        if (copyButtonText) {
          copyButtonText.textContent = copyButton.dataset.copyLabel || "Copy account number";
        }
      }

      if (copyFeedback) {
        copyFeedback.textContent = "";
      }
    }, 2000);
  };

  copyControls.forEach((control) => {
    control.addEventListener("click", copyAccountNumber);
  });

})();
