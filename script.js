/* =========================================================
   ConvertToToolsOnline
   Global JavaScript
   Version: 2.0

   Features:
   - Automatic copyright year
   - Responsive mobile navigation
   - Live utility search
   - Search result count and empty-state message
   - Keyboard shortcuts
   - Accessible menu controls
   - Safe operation on pages without these components

   No external libraries required.
   ========================================================= */

(() => {
  "use strict";

  /* -------------------------------------------------------
     1. General helpers
  ------------------------------------------------------- */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        callback,
        { once: true }
      );
    } else {
      callback();
    }
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  /* -------------------------------------------------------
     2. Automatic copyright year
  ------------------------------------------------------- */

  function initCopyrightYear() {
    const year = new Date().getFullYear();

    const yearElements = $$(
      "#year, [data-current-year], .current-year"
    );

    yearElements.forEach((element) => {
      element.textContent = String(year);
    });
  }

  /* -------------------------------------------------------
     3. Mobile navigation
  ------------------------------------------------------- */

  function initMobileNavigation() {
    const menuButton = $(
      [
        "[data-menu-toggle]",
        "#mobileMenuButton",
        "#menuToggle",
        "#navToggle",
        ".menu-toggle",
        ".mobile-menu-toggle"
      ].join(", ")
    );

    if (!menuButton) {
      return;
    }

    /*
      Prefer the element named by aria-controls.
      Otherwise, try common navigation selectors.
    */

    const controlledId = menuButton.getAttribute("aria-controls");

    let navigation = controlledId
      ? document.getElementById(controlledId)
      : null;

    if (!navigation) {
      navigation = $(
        [
          "[data-site-nav]",
          "#navMenu",
          "#siteNav",
          "#primaryNav",
          ".nav-links",
          ".nav-menu",
          ".site-navigation"
        ].join(", ")
      );
    }

    if (!navigation) {
      navigation = menuButton
        .closest("header")
        ?.querySelector("nav");
    }

    if (!navigation) {
      return;
    }

    if (!navigation.id) {
      navigation.id = "site-navigation";
    }

    menuButton.setAttribute("aria-controls", navigation.id);

    if (!menuButton.hasAttribute("aria-expanded")) {
      menuButton.setAttribute("aria-expanded", "false");
    }

    function setMenuOpen(isOpen) {
      menuButton.setAttribute(
        "aria-expanded",
        String(isOpen)
      );

      /*
        Support common CSS class names.
        Your stylesheet should style the class it uses.
      */

      navigation.classList.toggle("active", isOpen);
      navigation.classList.toggle("open", isOpen);
      navigation.classList.toggle("is-open", isOpen);

      menuButton.classList.toggle("active", isOpen);
      menuButton.classList.toggle("is-open", isOpen);
    }

    menuButton.addEventListener("click", (event) => {
      event.preventDefault();

      const isOpen =
        menuButton.getAttribute("aria-expanded") === "true";

      setMenuOpen(!isOpen);
    });

    /*
      Close the menu after selecting a navigation link.
    */

    navigation.addEventListener("click", (event) => {
      const link = event.target.closest("a");

      if (link) {
        setMenuOpen(false);
      }
    });

    /*
      Close the menu using Escape.
    */

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        menuButton.getAttribute("aria-expanded") === "true"
      ) {
        setMenuOpen(false);
        menuButton.focus();
      }
    });

    /*
      Close the menu when clicking outside it.
    */

    document.addEventListener("click", (event) => {
      const isOpen =
        menuButton.getAttribute("aria-expanded") === "true";

      if (
        isOpen &&
        !navigation.contains(event.target) &&
        !menuButton.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    });
  }

  /* -------------------------------------------------------
     4. Find the homepage tool cards
  ------------------------------------------------------- */

  function getToolCards() {
    /*
      First try the expected tool-card selectors.
    */

    let cards = $$(
      ".tool-card, [data-tool-card], .tool-item"
    );

    /*
      Prefer the outer card if selectors are nested.
    */

    cards = cards.filter((card) => {
      return !cards.some((other) => {
        return other !== card && other.contains(card);
      });
    });

    if (cards.length > 0) {
      return [...new Set(cards)];
    }

    /*
      Fallback: discover links leading to tool pages.
      This helps when the homepage uses different card classes.
    */

    const toolLinks = $$(
      'a[href*="tools/"]'
    );

    const discoveredCards = toolLinks.map((link) => {
      return (
        link.closest(
          ".tool-card, [data-tool-card], .tool-item, article, li"
        ) ||
        link.parentElement?.parentElement ||
        link.parentElement ||
        link
      );
    });

    return [...new Set(discoveredCards)];
  }

  /* -------------------------------------------------------
     5. Live tool search
  ------------------------------------------------------- */

  function initToolSearch() {
    const searchInput = $(
      [
        'input#toolSearch',
        'input#tool-search',
        'input#searchTools',
        "input[data-tool-search]",
        'input[type="search"]'
      ].join(", ")
    );

    if (!searchInput) {
      return;
    }

    const toolCards = getToolCards();

    if (toolCards.length === 0) {
      return;
    }

    /*
      Create an accessible status message if one doesn't
      already exist in the HTML.
    */

    let searchStatus = $(
      "#toolSearchStatus, [data-tool-search-status]"
    );

    if (!searchStatus) {
      searchStatus = document.createElement("p");

      searchStatus.id = "toolSearchStatus";
      searchStatus.className = "tool-search-status";
      searchStatus.setAttribute("role", "status");
      searchStatus.setAttribute("aria-live", "polite");

      searchStatus.style.margin = "12px 0";
      searchStatus.style.fontSize = "14px";
      searchStatus.style.color = "#64748b";

      const insertionPoint =
        searchInput.closest("form") ||
        searchInput.parentElement;

      if (insertionPoint) {
        insertionPoint.insertAdjacentElement(
          "afterend",
          searchStatus
        );
      } else {
        toolCards[0].parentElement?.prepend(searchStatus);
      }
    }

    /*
      Cache each card's searchable text once.
      Include headings, descriptions, keywords, and links.
    */

    const searchableCards = toolCards.map((card) => ({
      element: card,

      text: normalizeText(
        [
          card.textContent,
          card.getAttribute("data-search"),
          card.getAttribute("aria-label")
        ].join(" ")
      )
    }));

    function runSearch() {
      const query = normalizeText(searchInput.value);

      let visibleCount = 0;

      searchableCards.forEach((item) => {
        const matches =
          query === "" || item.text.includes(query);

        /*
          Set display explicitly so an existing CSS display
          declaration cannot accidentally show hidden cards.
        */

        if (!item.element.dataset.originalDisplay) {
          item.element.dataset.originalDisplay =
            item.element.style.display || "";
        }

        item.element.style.display = matches
          ? item.element.dataset.originalDisplay
          : "none";

        item.element.setAttribute(
          "aria-hidden",
          String(!matches)
        );

        if (matches) {
          visibleCount++;
        }
      });

      if (query === "") {
        searchStatus.textContent = "";
        searchStatus.hidden = true;
        return;
      }

      searchStatus.hidden = false;

      if (visibleCount === 0) {
        searchStatus.textContent =
          'No tools found for "' +
          searchInput.value.trim() +
          '". Try another keyword.';
      } else {
        searchStatus.textContent =
          visibleCount +
          (visibleCount === 1
            ? " tool found."
            : " tools found.");
      }
    }

    searchInput.addEventListener("input", runSearch);

    /*
      Avoid reloading the homepage when Enter is pressed
      inside a search form.
    */

    const searchForm = searchInput.closest("form");

    if (searchForm) {
      searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        runSearch();
      });
    }

    /*
      Support an optional Clear Search button:
      <button type="button" data-search-clear>Clear</button>
    */

    $$("[data-search-clear], #clearSearch").forEach((button) => {
      button.addEventListener("click", () => {
        searchInput.value = "";
        runSearch();
        searchInput.focus();
      });
    });

    /*
      Keyboard shortcut:
      Press / to focus the search input.
      Press Escape to clear a non-empty search.
    */

    document.addEventListener("keydown", (event) => {
      const target = event.target;

      const isTyping =
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
        );

      if (
        event.key === "/" &&
        !isTyping &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        searchInput.focus();
      }

      if (
        event.key === "Escape" &&
        document.activeElement === searchInput &&
        searchInput.value !== ""
      ) {
        searchInput.value = "";
        runSearch();
      }
    });

    /*
      Apply a search immediately if a query is already present.
    */

    runSearch();
  }

  /* -------------------------------------------------------
     6. External links opened in new tabs
  ------------------------------------------------------- */

  function initExternalLinks() {
    $$('a[target="_blank"]').forEach((link) => {
      const relTokens = new Set(
        (link.getAttribute("rel") || "")
          .split(/\s+/)
          .filter(Boolean)
      );

      relTokens.add("noopener");

      link.setAttribute("rel", [...relTokens].join(" "));
    });
  }

  /* -------------------------------------------------------
     7. Initialize website features
  ------------------------------------------------------- */

  function initWebsite() {
    initCopyrightYear();
    initMobileNavigation();
    initToolSearch();
    initExternalLinks();
  }

  onReady(initWebsite);
})();