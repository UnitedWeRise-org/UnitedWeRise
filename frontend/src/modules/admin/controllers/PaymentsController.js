/**
 * PaymentsController - Handles admin dashboard payments section
 * View-only payment management - refunds are processed in Stripe dashboard
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 */

class PaymentsController {
    constructor() {
        this.sectionId = 'payments';
        this.section = null;
        this.isInitialized = false;
        this.currentPayments = [];
        this.currentFilters = {
            status: '',
            type: '',
            search: ''
        };
        this.pagination = {
            page: 1,
            limit: 50,
            total: 0,
            pages: 1
        };
        this.summary = {
            totalCompletedCents: 0,
            byStatus: {}
        };

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.displayPaymentsData = this.displayPaymentsData.bind(this);
        this.handleFilterChange = this.handleFilterChange.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handlePageChange = this.handlePageChange.bind(this);
        this.renderPaymentsTable = this.renderPaymentsTable.bind(this);
        this.updateSummaryCards = this.updateSummaryCards.bind(this);
        this.getStatusBadge = this.getStatusBadge.bind(this);
        this.formatDate = this.formatDate.bind(this);
    }

    /**
     * Initialize the payments controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            await adminDebugLog('PaymentsController', 'Starting initialization');

            this.section = document.getElementById(this.sectionId);
            if (!this.section) {
                console.warn(`[PaymentsController] Section #${this.sectionId} not found`);
                return;
            }

            // Override AdminState display methods for payments
            if (window.AdminState) {
                window.AdminState.displayPaymentsData = this.displayPaymentsData.bind(this);
            }

            // Set up event listeners
            await this.setupEventListeners();

            // Load initial data
            await this.loadData();

            this.isInitialized = true;

            await adminDebugLog('PaymentsController', 'Controller initialized successfully');
        } catch (error) {
            await adminDebugError('PaymentsController', 'Initialization failed', error);
            throw error;
        }
    }

    /**
     * Set up event listeners for payments section
     */
    async setupEventListeners() {
        try {
            // Status filter
            const statusFilter = document.getElementById('paymentStatusFilter');
            if (statusFilter) {
                statusFilter.addEventListener('change', (e) => {
                    this.currentFilters.status = e.target.value;
                    this.pagination.page = 1;
                    this.loadData();
                });
            }

            // Type filter
            const typeFilter = document.getElementById('paymentTypeFilter');
            if (typeFilter) {
                typeFilter.addEventListener('change', (e) => {
                    this.currentFilters.type = e.target.value;
                    this.pagination.page = 1;
                    this.loadData();
                });
            }

            // Search input - search on Enter
            const searchInput = document.getElementById('paymentSearchInput');
            if (searchInput) {
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handleSearch();
                    }
                });
            }

            // Search button
            const searchBtn = document.getElementById('paymentSearchBtn');
            if (searchBtn) {
                searchBtn.addEventListener('click', this.handleSearch);
            }

            // Refresh button
            const refreshBtn = document.getElementById('paymentRefreshBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.loadData());
            }

            // Pagination buttons
            const prevBtn = document.getElementById('paymentsPrevBtn');
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    if (this.pagination.page > 1) {
                        this.pagination.page--;
                        this.loadData();
                    }
                });
            }

            const nextBtn = document.getElementById('paymentsNextBtn');
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    if (this.pagination.page < this.pagination.pages) {
                        this.pagination.page++;
                        this.loadData();
                    }
                });
            }

            await adminDebugLog('PaymentsController', 'Event listeners set up');
        } catch (error) {
            await adminDebugError('PaymentsController', 'Failed to set up event listeners', error);
        }
    }

    /**
     * Handle search
     */
    handleSearch() {
        const searchInput = document.getElementById('paymentSearchInput');
        if (searchInput) {
            this.currentFilters.search = searchInput.value.trim();
            this.pagination.page = 1;
            this.loadData();
        }
    }

    /**
     * Handle filter change
     */
    handleFilterChange() {
        this.pagination.page = 1;
        this.loadData();
    }

    /**
     * Handle page change
     */
    handlePageChange(newPage) {
        if (newPage >= 1 && newPage <= this.pagination.pages) {
            this.pagination.page = newPage;
            this.loadData();
        }
    }

    /**
     * Load payments data from API
     */
    async loadData(useCache = false) {
        try {
            await adminDebugLog('PaymentsController', 'Loading payments data', this.currentFilters);

            // Show loading state
            const tbody = document.getElementById('paymentsTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align: center; color: #666;">Loading payments...</td></tr>';
            }

            // Build params
            const params = {
                page: this.pagination.page,
                limit: this.pagination.limit
            };

            if (this.currentFilters.status) {
                params.status = this.currentFilters.status;
            }
            if (this.currentFilters.type) {
                params.type = this.currentFilters.type;
            }
            if (this.currentFilters.search) {
                params.search = this.currentFilters.search;
            }

            // Fetch from API
            const response = await window.AdminAPI.getPayments(params);

            if (response.success || response.data) {
                const data = response.data || response;
                this.displayPaymentsData(data);
            } else {
                throw new Error(response.error || 'Failed to load payments');
            }

        } catch (error) {
            await adminDebugError('PaymentsController', 'Failed to load payments', error);
            this.showError('Failed to load payments: ' + error.message);
        }
    }

    /**
     * Display payments data in the UI
     */
    displayPaymentsData(data) {
        try {
            // Store data
            this.currentPayments = data.payments || [];
            this.pagination = {
                ...this.pagination,
                ...data.pagination
            };
            this.summary = data.summary || {};

            // Update summary cards
            this.updateSummaryCards();

            // Render table
            this.renderPaymentsTable();

            // Update pagination UI
            this.updatePaginationUI();

            adminDebugLog('PaymentsController', 'Displayed payments data', {
                count: this.currentPayments.length,
                total: this.pagination.total
            });
        } catch (error) {
            adminDebugError('PaymentsController', 'Failed to display payments', error);
            this.showError('Failed to display payments');
        }
    }

    /**
     * Update summary cards with data
     */
    updateSummaryCards() {
        const totalAmountEl = document.getElementById('totalPaymentsAmount');
        if (totalAmountEl) {
            totalAmountEl.textContent = this.summary.totalCompletedFormatted || '$0.00';
        }

        const totalCountEl = document.getElementById('totalPaymentsCount');
        if (totalCountEl) {
            totalCountEl.textContent = this.pagination.total || 0;
        }

        const completedEl = document.getElementById('completedPayments');
        if (completedEl) {
            completedEl.textContent = this.summary.byStatus?.COMPLETED || 0;
        }

        const refundedEl = document.getElementById('refundedPayments');
        if (refundedEl) {
            const refunded = (this.summary.byStatus?.REFUNDED || 0) +
                           (this.summary.byStatus?.PARTIAL_REFUNDED || 0);
            refundedEl.textContent = refunded;
        }
    }

    /**
     * Render the payments table
     */
    renderPaymentsTable() {
        const tbody = document.getElementById('paymentsTableBody');
        if (!tbody) return;

        if (this.currentPayments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding: 2rem; text-align: center; color: #666;">No payments found</td></tr>';
            return;
        }

        const rows = this.currentPayments.map(payment => {
            const user = payment.user || {};
            const userName = user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.username || user.email || 'Unknown';

            const stripeLink = payment.stripeLink || (payment.stripePaymentIntentId
                ? `https://dashboard.stripe.com/payments/${payment.stripePaymentIntentId}`
                : null);

            const stripeIdDisplay = payment.stripePaymentIntentId
                ? `<a href="${stripeLink}" target="_blank" rel="noopener" style="color: #1976d2; text-decoration: none;" title="Open in Stripe">${payment.stripePaymentIntentId.substring(0, 15)}...</a>`
                : '-';

            return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 0.75rem;">${this.formatDate(payment.createdAt)}</td>
                    <td style="padding: 0.75rem;">
                        <div style="font-weight: 500;">${this.escapeHtml(userName)}</div>
                        <div style="font-size: 0.8rem; color: #666;">${this.escapeHtml(user.email || '')}</div>
                    </td>
                    <td style="padding: 0.75rem; font-weight: 600;">${payment.amountFormatted || '$' + (payment.amount / 100).toFixed(2)}</td>
                    <td style="padding: 0.75rem;">${this.getTypeBadge(payment.type)}</td>
                    <td style="padding: 0.75rem;">${this.getStatusBadge(payment.status)}</td>
                    <td style="padding: 0.75rem; font-family: monospace; font-size: 0.8rem;">${stripeIdDisplay}</td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rows;
    }

    /**
     * Update pagination UI
     */
    updatePaginationUI() {
        const pageInfo = document.getElementById('paymentsPageInfo');
        if (pageInfo) {
            pageInfo.textContent = `Page ${this.pagination.page} of ${this.pagination.pages || 1} (${this.pagination.total} total)`;
        }

        const prevBtn = document.getElementById('paymentsPrevBtn');
        if (prevBtn) {
            prevBtn.disabled = this.pagination.page <= 1;
        }

        const nextBtn = document.getElementById('paymentsNextBtn');
        if (nextBtn) {
            nextBtn.disabled = this.pagination.page >= this.pagination.pages;
        }
    }

    /**
     * Get status badge HTML
     */
    getStatusBadge(status) {
        const badges = {
            COMPLETED: { bg: '#e8f5e9', color: '#2e7d32', text: 'Completed' },
            PENDING: { bg: '#fff3e0', color: '#ef6c00', text: 'Pending' },
            PROCESSING: { bg: '#e3f2fd', color: '#1565c0', text: 'Processing' },
            FAILED: { bg: '#ffebee', color: '#c62828', text: 'Failed' },
            CANCELLED: { bg: '#f5f5f5', color: '#616161', text: 'Cancelled' },
            REFUNDED: { bg: '#fff3e0', color: '#e65100', text: 'Refunded' },
            PARTIAL_REFUNDED: { bg: '#fff8e1', color: '#ff8f00', text: 'Partial Refund' }
        };

        const badge = badges[status] || { bg: '#f5f5f5', color: '#616161', text: status };

        return `<span style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500; background: ${badge.bg}; color: ${badge.color};">${badge.text}</span>`;
    }

    /**
     * Get type badge HTML
     */
    getTypeBadge(type) {
        const badges = {
            DONATION: { bg: '#e8f5e9', color: '#2e7d32', icon: '❤️', text: 'Donation' },
            FEE: { bg: '#e3f2fd', color: '#1565c0', icon: '📄', text: 'Fee' }
        };

        const badge = badges[type] || { bg: '#f5f5f5', color: '#616161', icon: '💵', text: type };

        return `<span style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; background: ${badge.bg}; color: ${badge.color};">${badge.icon} ${badge.text}</span>`;
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorEl = document.getElementById('paymentsError');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }

        const tbody = document.getElementById('paymentsTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 2rem; text-align: center; color: #d32f2f;">${this.escapeHtml(message)}</td></tr>`;
        }
    }

    /**
     * Cleanup method for proper module shutdown
     */
    destroy() {
        this.isInitialized = false;
        this.currentPayments = [];
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentsController;
} else {
    window.PaymentsController = PaymentsController;
}
