/**
 * Centralized Renderer
 * Single render function that updates UI based on state
 * Pure function - UI is a function of state
 */

// Cache DOM elements for performance
const DOMCache = {
    authPage: null,
    mainApp: null,
    pageContents: {},
    codingQuestionView: null,
    aiChatbotContainer: null
};

/**
 * Initialize DOM cache
 */
function initializeDOMCache() {
    DOMCache.authPage = document.getElementById('auth-page');
    DOMCache.mainApp = document.getElementById('main-app');
    DOMCache.codingQuestionView = document.getElementById('coding-question-view');
    DOMCache.aiChatbotContainer = document.getElementById('ai-chatbot-container');
    
    // Cache all page-content elements
    document.querySelectorAll('.page-content').forEach(page => {
        const id = page.id;
        if (id) {
            DOMCache.pageContents[id] = page;
        }
    });
}

/**
 * Render UI based on current state
 * This is the single source of truth for UI rendering
 */
function render() {
    const state = getState();
    
    // Render authentication state
    renderAuth(state.auth);
    
    // Render navigation state
    renderNavigation(state.navigation);
    
    // Render UI visibility
    renderUIVisibility(state.ui);
    
    // Render page content
    renderPageContent(state.navigation.currentPage, state.navigation.questionId);
}

/**
 * Render authentication UI
 * @param {object} authState - Authentication state
 */
function renderAuth(authState) {
    if (!DOMCache.authPage || !DOMCache.mainApp) {
        // DOM not ready yet - try to reinitialize cache
        initializeDOMCache();
        if (!DOMCache.authPage || !DOMCache.mainApp) {
            console.warn('[Renderer] DOM elements not found, skipping auth render');
            return;
        }
    }
    
    if (authState.isAuthenticated) {
        // Hide auth page and show main app
        DOMCache.authPage.classList.remove('active');
        DOMCache.authPage.style.display = 'none';
        DOMCache.mainApp.classList.add('active');
        DOMCache.mainApp.style.display = 'block';
        console.log('[Renderer] ✅ Auth page hidden, main app shown');
    } else {
        // Show auth page and hide main app
        DOMCache.authPage.classList.add('active');
        DOMCache.authPage.style.display = 'block';
        DOMCache.mainApp.classList.remove('active');
        DOMCache.mainApp.style.display = 'none';
        console.log('[Renderer] ✅ Auth page shown, main app hidden');
    }
}

/**
 * Render navigation UI
 * @param {object} navState - Navigation state
 */
function renderNavigation(navState) {
    // Update active navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#${navState.currentPage}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Render UI visibility
 * @param {object} uiState - UI visibility state
 */
function renderUIVisibility(uiState) {
    // Hide all page-content elements first
    Object.values(DOMCache.pageContents).forEach(page => {
        if (page) {
            page.style.display = 'none';
        }
    });
    
    // Show current page
    if (uiState.currentPageVisible) {
        const pageId = `${uiState.currentPageVisible}-page`;
        const page = DOMCache.pageContents[pageId] || document.getElementById(pageId);
        if (page) {
            page.style.display = 'block';
            // Force reflow for smooth rendering
            requestAnimationFrame(() => {
                void page.offsetHeight;
            });
        }
    }
    
    // Handle coding question view
    if (DOMCache.codingQuestionView) {
        if (uiState.codingQuestionViewVisible) {
            DOMCache.codingQuestionView.style.display = 'flex';
            DOMCache.codingQuestionView.classList.remove('coding-question-hidden');
        } else {
            DOMCache.codingQuestionView.style.display = 'none';
            DOMCache.codingQuestionView.classList.add('coding-question-hidden');
        }
    }
    
    // Handle AI chatbot
    if (DOMCache.aiChatbotContainer) {
        DOMCache.aiChatbotContainer.style.display = uiState.aiChatbotVisible ? 'block' : 'none';
    }
}

/**
 * Render page content
 * @param {string} pageName - Page to render
 * @param {number|null} questionId - Optional question ID
 */
function renderPageContent(pageName, questionId = null) {
    try {
        // Check if page exists
        const pageId = `${pageName}-page`;
        let page = DOMCache.pageContents[pageId] || document.getElementById(pageId) || document.getElementById(pageName);
        
        if (!page) {
            console.warn(`[Renderer] Page "${pageName}" not found, trying to create or redirect`);
            
            // Try to find page with different naming
            const alternatives = [
                `${pageName}Page`,
                `page-${pageName}`,
                pageName.replace('-', '')
            ];
            
            for (const alt of alternatives) {
                page = document.getElementById(alt);
                if (page) {
                    console.log(`[Renderer] Found page with alternative name: ${alt}`);
                    break;
                }
            }
            
            // If still not found, show error and redirect
            if (!page) {
                console.error(`[Renderer] Page "${pageName}" not found after all attempts`);
                if (window.errorHandler) {
                    window.errorHandler.handle(
                        new Error(`Page not found: ${pageName}`),
                        'Renderer',
                        () => navigateToPage('dashboard', null, true)
                    );
                } else {
                    navigateToPage('dashboard', null, true);
                }
                return;
            }
        }
        
        // Ensure page is visible
        if (page) {
            page.style.display = 'block';
            page.classList.add('active');
        }
        
        // Update UI visibility state
        updateUIVisibility({
            currentPageVisible: pageName,
            codingQuestionViewVisible: pageName === 'coding' && questionId !== null
        }, true); // Silent update to avoid recursive render
        
        // Load page-specific data if needed
        const pageState = getState('pages');
        if (!pageState[pageName] || !pageState[pageName].loaded) {
            loadPageData(pageName, questionId);
        }
    } catch (error) {
        console.error(`[Renderer] Error rendering page "${pageName}":`, error);
        if (window.errorHandler) {
            window.errorHandler.handle(error, `Renderer:${pageName}`, () => {
                navigateToPage('dashboard', null, true);
            });
        }
    }
}

/**
 * Load page-specific data
 * @param {string} pageName - Page name
 * @param {number|null} questionId - Optional question ID
 */
function loadPageData(pageName, questionId = null) {
    // Mark page as loading
    updateState('ui', { loading: true }, true);
    
    // Call appropriate load function
    switch(pageName) {
        case 'dashboard':
            if (typeof loadDashboard === 'function') {
                loadDashboard();
            }
            break;
        case 'coding':
            if (typeof loadCodingPage === 'function') {
                loadCodingPage();
            }
            if (questionId && typeof openCodingQuestion === 'function') {
                // Small delay to ensure page is rendered
                setTimeout(() => {
                    openCodingQuestion(questionId, false);
                }, 100);
            }
            break;
        case 'quizzes':
            if (typeof loadQuizzesPage === 'function') {
                loadQuizzesPage();
            }
            break;
        case 'non-technical':
            if (typeof loadNonTechnicalPage === 'function') {
                loadNonTechnicalPage();
            }
            break;
        case 'companies':
            if (typeof loadCompaniesPage === 'function') {
                loadCompaniesPage();
            }
            break;
        case 'resources':
            if (typeof loadResourcesPage === 'function') {
                loadResourcesPage();
            }
            break;
        case 'leaderboard':
            if (typeof loadLeaderboard === 'function') {
                loadLeaderboard();
            }
            break;
        case 'chatbot':
        case 'ai-interview':
            if (typeof loadChatbotPage === 'function') {
                loadChatbotPage();
            }
            break;
        case 'student-assessments':
            if (typeof loadStudentAssessments === 'function') {
                loadStudentAssessments();
            }
            break;
        case 'available-assessments':
            if (typeof loadAvailableAssessments === 'function') {
                loadAvailableAssessments();
            }
            break;
    }
    
    // Mark page as loaded
    updateState('pages', {
        [pageName]: { loaded: true }
    }, true);
    
    // Mark loading as complete
    updateState('ui', { loading: false }, true);
}

// Render queue to prevent race conditions
let _renderQueue = [];
let _isRendering = false;
let _renderTimeout = null;

/**
 * Debounced render function with queue (prevents race conditions)
 */
function debouncedRender() {
    // Clear existing timeout
    if (_renderTimeout) {
        cancelAnimationFrame(_renderTimeout);
    }
    
    // Queue render
    _renderQueue.push({ type: 'debounced', timestamp: Date.now() });
    
    // Schedule render
    _renderTimeout = requestAnimationFrame(() => {
        processRenderQueue();
    });
}

/**
 * Process render queue (single render at a time)
 */
function processRenderQueue() {
    if (_isRendering) {
        // Already rendering, queue will be processed after current render
        return;
    }
    
    if (_renderQueue.length === 0) {
        _renderTimeout = null;
        return;
    }
    
    // Mark as rendering
    _isRendering = true;
    
    // Get latest render request (ignore older ones)
    const latest = _renderQueue[_renderQueue.length - 1];
    _renderQueue = []; // Clear queue
    
    try {
        render();
    } catch (error) {
        console.error('[Renderer] Error during render:', error);
        if (window.errorHandler) {
            window.errorHandler.handle(error, 'Renderer');
        }
    } finally {
        _isRendering = false;
        
        // Process any new renders that were queued during render
        if (_renderQueue.length > 0) {
            requestAnimationFrame(processRenderQueue);
        } else {
            _renderTimeout = null;
        }
    }
}

/**
 * Force immediate render (use sparingly, respects render lock)
 */
function forceRender() {
    if (_isRendering) {
        // Queue for after current render
        _renderQueue.push({ type: 'forced', timestamp: Date.now() });
        return;
    }
    
    if (_renderTimeout) {
        cancelAnimationFrame(_renderTimeout);
        _renderTimeout = null;
    }
    
    _renderQueue = []; // Clear queue
    processRenderQueue();
}

// Subscribe to state changes to trigger re-renders
// Wait for state_manager to be loaded
function setupStateSubscriptions() {
    if (typeof subscribeToState === 'function') {
        // Subscribe to auth state changes
        subscribeToState('auth', () => {
            console.log('[Renderer] Auth state changed, re-rendering...');
            debouncedRender();
        });
        
        // Subscribe to navigation state changes
        subscribeToState('navigation', () => {
            debouncedRender();
        });
        
        // Subscribe to UI visibility state changes
        subscribeToState('ui', () => {
            debouncedRender();
        });
        
        console.log('[Renderer] State subscriptions initialized');
    } else {
        // Retry after a short delay if state_manager isn't loaded yet
        setTimeout(setupStateSubscriptions, 100);
    }
}

// Initialize renderer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeDOMCache();
        setupStateSubscriptions();
        render();
    });
} else {
    initializeDOMCache();
    setupStateSubscriptions();
    render();
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.render = render;
    window.debouncedRender = debouncedRender;
    window.forceRender = forceRender;
    window.initializeDOMCache = initializeDOMCache;
}
