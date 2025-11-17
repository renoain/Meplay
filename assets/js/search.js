class SearchManager {
  constructor() {
    this.searchInput = document.getElementById("searchInput");
    this.debounceTimer = null;
    this.currentGenreFilter = null;

    this.setupSearch();
    this.setupGenreFilter();
  }

  setupSearch() {
    // Input event dengan debounce
    this.searchInput.addEventListener("input", (e) => {
      this.debouncedSearch(e.target.value);
    });

    // Enter key untuk search
    this.searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.performSearch(e.target.value);
      }
    });

    // Clear genre filter ketika search dikosongkan
    this.searchInput.addEventListener("input", (e) => {
      if (e.target.value === "") {
        this.clearGenreFilter();
      }
    });
  }

  setupGenreFilter() {
    // Event delegation untuk genre filter
    document.addEventListener("change", (e) => {
      if (e.target.id === "genreFilterSelect") {
        this.handleGenreFilterChange(e.target.value);
      }
    });
  }

  debouncedSearch(query) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.performSearch(query);
    }, 300);
  }

  performSearch(query, genreFilter = null) {
    const normalizedQuery = query.toLowerCase().trim();

    // Update current genre filter
    if (genreFilter !== undefined) {
      this.currentGenreFilter = genreFilter;
    }

    // Jika query kosong, kembali ke home
    if (normalizedQuery === "") {
      if (window.mePlayApp.currentView === "search") {
        window.mePlayApp.showView("home");
      }
      // Reset genre filter
      this.currentGenreFilter = null;
      return;
    }

    // Validasi songs data
    if (!window.mePlayApp || !window.mePlayApp.songs) {
      console.error(" Songs data not available");
      this.showSearchError("Songs data not loaded yet");
      return;
    }

    console.log("🔍 Performing search:", {
      query: normalizedQuery,
      genreFilter: this.currentGenreFilter,
      totalSongs: window.mePlayApp.songs.length,
    });

    // Filter songs berdasarkan query
    let results = window.mePlayApp.songs.filter(
      (song) =>
        song.title.toLowerCase().includes(normalizedQuery) ||
        song.artist.toLowerCase().includes(normalizedQuery) ||
        song.album.toLowerCase().includes(normalizedQuery) ||
        (song.genre && song.genre.toLowerCase().includes(normalizedQuery))
    );

    // Apply genre filter jika ada
    if (this.currentGenreFilter) {
      results = results.filter(
        (song) =>
          song.genre &&
          song.genre.toLowerCase() === this.currentGenreFilter.toLowerCase()
      );
      console.log(
        `🎵 Applied genre filter: ${this.currentGenreFilter}, results: ${results.length}`
      );
    }

    this.displaySearchResults(results, normalizedQuery);
  }

  handleGenreFilterChange(genre) {
    console.log("🎵 Genre filter changed:", genre);

    const currentQuery = this.searchInput.value.trim();
    this.currentGenreFilter = genre || null;

    if (currentQuery) {
      // Jika ada query, perform search dengan genre filter baru
      this.performSearch(currentQuery);
    } else if (genre) {
      // Jika tidak ada query tapi ada genre filter, show all songs in that genre
      this.showAllSongsByGenre(genre);
    } else {
      // Jika genre di-set ke All Genres, clear results
      this.clearSearchResults();
    }
  }

  showAllSongsByGenre(genre) {
    if (!window.mePlayApp || !window.mePlayApp.songs) return;

    const results = window.mePlayApp.songs.filter(
      (song) => song.genre && song.genre.toLowerCase() === genre.toLowerCase()
    );

    this.displaySearchResults(results, "", genre);
  }

  displaySearchResults(results, query, genreFilter = null) {
    // Pastikan di search view
    window.mePlayApp.showView("search");

    const searchTitle = document.getElementById("searchTitle");
    const gridElement = document.getElementById("searchResultsGrid");

    if (!searchTitle || !gridElement) {
      console.error(" Search UI elements not found");
      return;
    }

    // Show genre filter
    this.showGenreFilter();

    // Update genre filter select value
    this.updateGenreFilterSelect(genreFilter || this.currentGenreFilter);

    // Build title text
    let titleText = "";
    if (query) {
      titleText = `Search results for "${query}"`;
    } else if (genreFilter) {
      titleText = `All ${genreFilter} songs`;
    } else {
      titleText = "Search results";
    }

    // Add genre info to title jika ada filter
    if (this.currentGenreFilter && !genreFilter) {
      titleText += ` in ${this.currentGenreFilter}`;
    } else if (genreFilter) {
      titleText += ` (${results.length} songs)`;
    }

    // Handle no results
    if (results.length === 0) {
      searchTitle.textContent = titleText;

      let errorMessage = "No songs found";
      if (query && this.currentGenreFilter) {
        errorMessage = `No songs found matching "${query}" in ${this.currentGenreFilter}`;
      } else if (query) {
        errorMessage = `No songs found matching "${query}"`;
      } else if (this.currentGenreFilter) {
        errorMessage = `No songs found in ${this.currentGenreFilter}`;
      }

      gridElement.innerHTML = `
        <div class="empty-state">
          <p>${errorMessage}</p>
          <p>Try different keywords or check the spelling</p>
        </div>
      `;
      return;
    }

    // Show results
    searchTitle.textContent = `${titleText} (${results.length} songs)`;

    // Render tracks grid
    window.mePlayApp.renderTracksGrid(results, "searchResultsGrid", "search");

    console.log("✅ Search results displayed:", {
      totalResults: results.length,
      query: query,
      genreFilter: this.currentGenreFilter,
    });
  }

  showGenreFilter() {
    const container = document.getElementById("genreFilterContainer");
    if (!container) {
      console.error(" Genre filter container not found");
      return;
    }

    // Populate genre options jika belum
    this.populateGenreOptions();

    // Show the filter
    container.style.display = "block";
  }

  populateGenreOptions() {
    const select = document.getElementById("genreFilterSelect");
    if (!select) {
      console.error(" Genre filter select not found");
      return;
    }

    // Cek jika options sudah ada
    if (select.options.length > 1) return;

    // Get unique genres dari songs
    const genres = this.getAvailableGenres();

    // Clear dan populate options
    select.innerHTML = '<option value="">All Genres</option>';
    genres.forEach((genre) => {
      const option = document.createElement("option");
      option.value = genre;
      option.textContent = genre;
      select.appendChild(option);
    });

    console.log("✅ Genre options populated:", genres);
  }

  getAvailableGenres() {
    if (!window.mePlayApp || !window.mePlayApp.songs) return [];

    const genres = new Set();
    window.mePlayApp.songs.forEach((song) => {
      if (song.genre) {
        genres.add(song.genre);
      }
    });

    return Array.from(genres).sort();
  }

  updateGenreFilterSelect(genre) {
    const select = document.getElementById("genreFilterSelect");
    if (select) {
      select.value = genre || "";
    }
  }

  clearGenreFilter() {
    this.currentGenreFilter = null;
    const select = document.getElementById("genreFilterSelect");
    if (select) {
      select.value = "";
    }
  }

  clearSearchResults() {
    const searchTitle = document.getElementById("searchTitle");
    const gridElement = document.getElementById("searchResultsGrid");

    if (searchTitle) {
      searchTitle.textContent = "Search";
    }

    if (gridElement) {
      gridElement.innerHTML = `
        <div class="empty-state">
          <p>Start typing to search</p>
        </div>
      `;
    }

    // Hide genre filter
    const container = document.getElementById("genreFilterContainer");
    if (container) {
      container.style.display = "none";
    }
  }

  showSearchError(message) {
    const searchTitle = document.getElementById("searchTitle");
    const gridElement = document.getElementById("searchResultsGrid");

    if (searchTitle && gridElement) {
      searchTitle.textContent = "Search Error";
      gridElement.innerHTML = `
        <div class="empty-state">
          <p>${message}</p>
          <p>Please refresh the page and try again</p>
        </div>
      `;
    }
  }

  // Method untuk external calls (dari genre manager)
  performSearchWithGenre(query, genre) {
    this.currentGenreFilter = genre;
    this.performSearch(query, genre);
  }

  // Get current search state
  getSearchState() {
    return {
      query: this.searchInput.value,
      genreFilter: this.currentGenreFilter,
      view: window.mePlayApp.currentView,
    };
  }
}

// Initialize search manager
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    window.searchManager = new SearchManager();
    console.log("✅ Search Manager initialized");
  }, 1000);
});
