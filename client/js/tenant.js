const tenant = {
    rooms: [],
    categories: [],
    currentCategory: '',
    currentSearch: '',
    currentStay: null,
    landlordNotifications: [],
    issueReports: [],
    residentTab: 'stay',
    paymentNotifications: [],
    notificationPollerId: null,
    notificationOutsideClickHandler: null,

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    },

    escapeAttribute(value) {
        return this.escapeHtml(value).replace(/`/g, '&#96;');
    },

    buildMessagePreview(content, maxLength = 90) {
        const normalized = String(content ?? '').replace(/\s+/g, ' ').trim();
        if (normalized.length <= maxLength) return normalized;
        return `${normalized.substring(0, maxLength)}...`;
    },

    getSenderLabel(senderRole) {
        if (senderRole === 'Tenant') return 'Bạn';
        if (senderRole === 'Landlord') return 'Chủ trọ';
        return 'Hệ thống';
    },

    formatCurrency(value) {
        return `${Number(value || 0).toLocaleString('vi-VN')} VNĐ`;
    },

    formatDate(value) {
        if (!value) return '—';
        return new Date(value).toLocaleDateString('vi-VN');
    },

    formatDateTime(value) {
        if (!value) return '—';
        return new Date(value).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    formatMeasurement(value) {
        return Number(value || 0).toLocaleString('vi-VN');
    },

    getPaymentStatusMeta(status) {
        const map = {
            pending: { label: 'Chờ thanh toán', className: 'status-pending', icon: 'fa-clock' },
            partial: { label: 'Thanh toán một phần', className: 'status-partial', icon: 'fa-circle-half-stroke' },
            paid: { label: 'Đã thanh toán', className: 'status-confirmed', icon: 'fa-circle-check' },
            overdue: { label: 'Quá hạn', className: 'status-rejected', icon: 'fa-triangle-exclamation' },
            cancelled: { label: 'Đã hủy', className: 'status-rejected', icon: 'fa-circle-xmark' }
        };
        return map[status] || map.pending;
    },

    getPaymentMethodLabel(method) {
        const map = {
            cash: 'Tiền mặt',
            bank_transfer: 'Chuyển khoản',
            qr_transfer: 'Quét QR',
            other: 'Khác'
        };
        return map[method] || method || 'Chưa xác định';
    },

    isTransferPaymentMethod(method) {
        return ['bank_transfer', 'qr_transfer'].includes(method);
    },

    getPaymentTypeLabel(type) {
        const map = {
            deposit: 'Tiền cọc',
            monthly_rent: 'Tiền phòng tháng',
            service: 'Phí dịch vụ',
            other: 'Khoản khác'
        };
        return map[type] || type || 'Khoản thanh toán';
    },

    getContractStatusLabel(status) {
        const map = {
            active: 'Đang ở',
            draft: 'Đang giữ chỗ',
            expired: 'Hết hạn',
            terminated: 'Đã kết thúc'
        };
        return map[status] || 'Chưa xác định';
    },

    getIssueSeverityMeta(label) {
        const normalized = String(label || '').trim().toLowerCase();
        if (normalized === 'high' || normalized.includes('khẩn')) {
            return { label: 'Khẩn cấp', className: 'issue-high', icon: 'fa-triangle-exclamation' };
        }
        if (normalized === 'low' || normalized.includes('thấp')) {
            return { label: 'Thấp', className: 'issue-low', icon: 'fa-circle-info' };
        }
        return { label: 'Trung bình', className: 'issue-medium', icon: 'fa-screwdriver-wrench' };
    },

    getIssueStatusLabel(status) {
        const map = {
            pending: 'Chờ xử lý',
            in_progress: 'Đang xử lý',
            resolved: 'Đã giải quyết',
            closed: 'Đã đóng'
        };
        return map[status] || status || 'Chưa xác định';
    },

    getPrimaryPaymentChargeLabel(payment) {
        return payment.paymentType === 'deposit' ? 'Tiền cọc' : 'Tiền phòng';
    },

    buildUtilityChargeNote(payment, prefix, unitLabel) {
        const previousReading = payment[`${prefix}PreviousReading`];
        const currentReading = payment[`${prefix}CurrentReading`];
        const usage = payment[`${prefix}Usage`];
        const unitPrice = payment[`${prefix}UnitPrice`];
        const charge = payment[`${prefix}Charge`];

        const hasSnapshot = previousReading !== undefined && previousReading !== null && currentReading !== undefined && currentReading !== null;
        if (!hasSnapshot && Number(charge || 0) <= 0) return '';

        return `${this.formatMeasurement(previousReading)} -> ${this.formatMeasurement(currentReading)} (${this.formatMeasurement(usage)} ${unitLabel} x ${this.formatCurrency(unitPrice)})`;
    },

    renderPaymentAmountCell(amount, note = '') {
        const numericAmount = Number(amount || 0);
        const prefix = numericAmount < 0 ? '- ' : '';
        const displayAmount = `${prefix}${this.formatCurrency(Math.abs(numericAmount))}`;

        if (!note) return displayAmount;

        return `
            <div class="tenant-payment-cell">
                <strong>${displayAmount}</strong>
                <small>${this.escapeHtml(note)}</small>
            </div>
        `;
    },



    async loadResidentData() {
        const headers = { 'Authorization': `Bearer ${auth.getToken()}` };
        const [stayRes, notificationsRes, issuesRes] = await Promise.all([
            fetch(`${API_URL}/contracts/tenant/current`, { headers }),
            fetch(`${API_URL}/messages/tenant/notifications`, { headers }),
            fetch(`${API_URL}/issues/tenant`, { headers })
        ]);

        const [stayData, notificationsData, issuesData] = await Promise.all([
            stayRes.json(),
            notificationsRes.json(),
            issuesRes.json()
        ]);

        if (!stayRes.ok) throw new Error(stayData.message || 'Không thể tải phòng hiện tại');
        if (!notificationsRes.ok) throw new Error(notificationsData.message || 'Không thể tải thông báo từ chủ trọ');
        if (!issuesRes.ok) throw new Error(issuesData.message || 'Không thể tải báo cáo sự cố');

        this.currentStay = stayData.data || null;
        this.landlordNotifications = notificationsData.data || [];
        this.issueReports = issuesData.data || [];
    },

    renderResidentStay() {
        if (!this.currentStay) {
            return `
                <div class="empty-state resident-empty-card">
                    <i class="fas fa-house-circle-xmark fa-3x"></i>
                    <h3>Bạn chưa có phòng đang ở</h3>
                    <p>Khi chủ trọ tạo hợp đồng hoặc bàn giao phòng cho bạn, thông tin sẽ hiện tại đây.</p>
                </div>
            `;
        }

        const contract = this.currentStay;
        const room = contract.room || {};
        const landlordInfo = contract.landlord || {};

        return `
            <div class="resident-stay-shell">
                <div class="resident-stay-hero">
                    <div class="resident-stay-room-card">
                        <span class="resident-stay-badge">${this.escapeHtml(this.getContractStatusLabel(contract.status))}</span>
                        <h2>${this.escapeHtml(room.title || 'Phòng của bạn')}</h2>
                        <p><i class="fas fa-location-dot"></i> ${this.escapeHtml(room.address || 'Chưa có địa chỉ')}</p>
                        <div class="resident-stay-highlight">
                            <span>Tiền thuê</span>
                            <strong>${this.formatCurrency(contract.monthlyRent)}</strong>
                        </div>
                    </div>

                    <div class="resident-stay-landlord-card">
                        <span>Chủ trọ phụ trách</span>
                        <strong>${this.escapeHtml(landlordInfo.username || '—')}</strong>
                        <p>${this.escapeHtml(landlordInfo.email || 'Chưa có email liên hệ')}</p>
                        <button type="button" class="resident-inline-action" onclick="tenant.showResidentTab('issues')">
                            <i class="fas fa-screwdriver-wrench"></i> Báo cáo sự cố
                        </button>
                    </div>
                </div>

                <div class="resident-info-grid">
                    <div class="resident-info-card">
                        <span>Ngày bắt đầu</span>
                        <strong>${this.formatDate(contract.startDate)}</strong>
                        <small>Hợp đồng: ${this.escapeHtml(contract.contractCode || `HD-${contract.id}`)}</small>
                    </div>
                    <div class="resident-info-card">
                        <span>Ngày kết thúc</span>
                        <strong>${this.formatDate(contract.endDate)}</strong>
                        <small>Có thể để trống nếu ở lâu dài</small>
                    </div>
                    <div class="resident-info-card">
                        <span>Ngày đến hạn</span>
                        <strong>Ngày ${contract.paymentDueDay || 5}</strong>
                        <small>Chủ trọ sẽ gửi thông báo khi đến kỳ thu</small>
                    </div>
                    <div class="resident-info-card">
                        <span>Tiền cọc</span>
                        <strong>${this.formatCurrency(contract.depositAmount)}</strong>
                        <small>Điện ${this.formatCurrency(contract.electricityPrice)} / Nước ${this.formatCurrency(contract.waterPrice)}</small>
                    </div>
                </div>

                ${contract.note ? `
                    <div class="resident-note-card">
                        <strong><i class="fas fa-note-sticky"></i> Ghi chú hợp đồng</strong>
                        <p>${this.escapeHtml(contract.note)}</p>
                    </div>
                ` : ''}
            </div>
        `;
    },

    renderResidentNotifications() {
        if (!this.landlordNotifications.length) {
            return `
                <div class="empty-state resident-empty-card">
                    <i class="fas fa-bell-slash fa-3x"></i>
                    <h3>Chưa có thông báo nào từ chủ trọ</h3>
                    <p>Khi chủ trọ gửi nhắc lịch, phản hồi hoặc thông báo hệ thống, chúng sẽ xuất hiện tại đây.</p>
                </div>
            `;
        }

        return `
            <div class="resident-notice-list">
                ${this.landlordNotifications.map(item => {
                    const senderLabel = item.senderRole === 'System' ? 'Hệ thống' : (item.landlord?.username || 'Chủ trọ');
                    return `
                        <article class="resident-notice-card ${item.senderRole === 'System' ? 'system' : 'landlord'}">
                            <div class="resident-notice-top">
                                <div>
                                    <strong>${this.escapeHtml(senderLabel)}</strong>
                                    <p>${this.escapeHtml(item.room ? item.room.title : 'Phòng hiện tại')}</p>
                                </div>
                                <span>${this.formatDateTime(item.createdAt)}</span>
                            </div>
                            <div class="resident-notice-body">${this.escapeHtml(item.content).replace(/\n/g, '<br>')}</div>
                        </article>
                    `;
                }).join('')}
            </div>
        `;
    },

    renderIssueReports() {
        const currentRoomTitle = this.currentStay?.room?.title || 'Phòng hiện tại';

        return `
            <div class="resident-issue-shell">
                <div class="resident-issue-form-card">
                    <div class="resident-section-head">
                        <div>
                            <h3>Báo cáo sự cố cho chủ trọ</h3>
                            <p>${this.currentStay ? `Sự cố sẽ được gửi cho chủ trọ của ${this.escapeHtml(currentRoomTitle)}.` : 'Bạn cần có phòng đang ở để gửi báo cáo sự cố.'}</p>
                        </div>
                    </div>
                    <form onsubmit="tenant.submitIssueReport(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Tiêu đề sự cố</label>
                                <input type="text" id="issue-title" ${this.currentStay ? '' : 'disabled'} required placeholder="VD: Máy lạnh không hoạt động">
                            </div>
                            <div class="form-group">
                                <label>Mức độ</label>
                                <select id="issue-severity" ${this.currentStay ? '' : 'disabled'}>
                                    <option value="low">Thấp</option>
                                    <option value="medium" selected>Trung bình</option>
                                    <option value="high">Khẩn cấp</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group full-width">
                            <label>Mô tả chi tiết</label>
                            <textarea id="issue-description" rows="4" ${this.currentStay ? '' : 'disabled'} required placeholder="Mô tả rõ vấn đề, thời điểm xảy ra và điều bạn cần chủ trọ hỗ trợ..."></textarea>
                        </div>
                        <div class="form-actions resident-form-actions">
                            <button type="submit" class="btn btn-primary" ${this.currentStay ? '' : 'disabled'}>
                                <i class="fas fa-paper-plane"></i> Gửi Báo Cáo
                            </button>
                        </div>
                    </form>
                </div>

                <div class="resident-issue-history-card">
                    <div class="resident-section-head">
                        <div>
                            <h3>Lịch sử báo cáo sự cố</h3>
                            <p>${this.issueReports.length ? `Bạn đã gửi ${this.issueReports.length} báo cáo cho chủ trọ.` : 'Chưa có báo cáo sự cố nào được gửi.'}</p>
                        </div>
                    </div>
                    ${this.issueReports.length === 0 ? `
                        <div class="resident-empty-inline">
                            <i class="fas fa-screwdriver-wrench"></i>
                            <span>Danh sách báo cáo sự cố đang trống.</span>
                        </div>
                    ` : `
                        <div class="resident-issue-list">
                            ${this.issueReports.map(item => {
                                const severity = this.getIssueSeverityMeta(item.severity);
                                return `
                                    <article class="resident-issue-card">
                                        <div class="resident-issue-top">
                                            <div>
                                                <h4>${this.escapeHtml(item.title)}</h4>
                                                <p>${this.escapeHtml(item.room ? item.room.title : currentRoomTitle)} • ${this.formatDateTime(item.createdAt)}</p>
                                            </div>
                                            <span class="resident-issue-badge ${severity.className}"><i class="fas ${severity.icon}"></i> ${severity.label}</span>
                                        </div>
                                        <p>${this.escapeHtml(item.description)}</p>
                                        <div class="resident-issue-status">Trạng thái: <strong>${this.escapeHtml(this.getIssueStatusLabel(item.status))}</strong></div>
                                    </article>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    renderPaymentTransferDetails(payment) {
        if (!this.isTransferPaymentMethod(payment.paymentMethod)) return '';

        const hasTransferInfo = payment.bankName || payment.bankAccountHolder || payment.bankAccountNumber || payment.bankQrImage;
        if (!hasTransferInfo) return '';

        return `
            <div class="tenant-transfer-card">
                <div class="tenant-transfer-card-head">
                    <div>
                        <h4><i class="fas fa-building-columns"></i> Thông tin chuyển khoản</h4>
                        <p>Dùng thông tin này để thanh toán trực tiếp cho chủ trọ.</p>
                    </div>
                </div>
                <div class="tenant-transfer-grid ${payment.bankQrImage ? 'has-qr' : ''}">
                    <div class="tenant-transfer-info">
                        ${payment.bankName ? `
                            <div class="tenant-transfer-item">
                                <span>Ngân hàng</span>
                                <strong>${this.escapeHtml(payment.bankName)}</strong>
                            </div>
                        ` : ''}
                        ${payment.bankAccountHolder ? `
                            <div class="tenant-transfer-item">
                                <span>Chủ tài khoản</span>
                                <strong>${this.escapeHtml(payment.bankAccountHolder)}</strong>
                            </div>
                        ` : ''}
                        ${payment.bankAccountNumber ? `
                            <div class="tenant-transfer-item">
                                <span>Số tài khoản</span>
                                <div class="tenant-transfer-value-line">
                                    <strong>${this.escapeHtml(payment.bankAccountNumber)}</strong>
                                    <button type="button" class="tenant-transfer-copy" onclick="tenant.copyBankAccountNumber('${this.escapeAttribute(payment.bankAccountNumber)}')">
                                        <i class="fas fa-copy"></i> Sao chép
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                        <div class="tenant-transfer-item">
                            <span>Phương thức</span>
                            <strong>${this.escapeHtml(this.getPaymentMethodLabel(payment.paymentMethod))}</strong>
                        </div>
                    </div>
                    ${payment.bankQrImage ? `
                        <button type="button" class="tenant-transfer-qr-button" onclick="tenant.openQrPreview('${this.escapeAttribute(payment.bankQrImage)}')">
                            <div class="tenant-transfer-qr">
                                <img src="${this.escapeAttribute(payment.bankQrImage)}" alt="Mã QR nhận tiền của chủ trọ">
                            </div>
                            <span><i class="fas fa-expand"></i> Phóng to mã QR</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    ensureNotificationModalRoot() {
        let root = document.getElementById('tenant-payment-modal-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'tenant-payment-modal-root';
            document.body.appendChild(root);
        }
        return root;
    },

    ensureQrPreviewRoot() {
        let root = document.getElementById('tenant-qr-preview-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'tenant-qr-preview-root';
            document.body.appendChild(root);
        }
        return root;
    },

    fallbackCopyText(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);

        let copied = false;
        try {
            copied = document.execCommand('copy');
        } catch (error) {
            copied = false;
        }

        document.body.removeChild(textarea);
        return copied;
    },

    copyBankAccountNumber(accountNumber) {
        const normalized = String(accountNumber ?? '').trim();
        if (!normalized) {
            showToast('Không có số tài khoản để sao chép', 'error');
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(normalized)
                .then(() => showToast('Đã sao chép số tài khoản', 'success'))
                .catch(() => {
                    const copied = this.fallbackCopyText(normalized);
                    showToast(copied ? 'Đã sao chép số tài khoản' : 'Không thể sao chép số tài khoản', copied ? 'success' : 'error');
                });
            return;
        }

        const copied = this.fallbackCopyText(normalized);
        showToast(copied ? 'Đã sao chép số tài khoản' : 'Không thể sao chép số tài khoản', copied ? 'success' : 'error');
    },

    openQrPreview(imageUrl) {
        const normalized = String(imageUrl ?? '').trim();
        if (!normalized) {
            showToast('Không tìm thấy mã QR để phóng to', 'error');
            return;
        }

        const root = this.ensureQrPreviewRoot();
        root.innerHTML = `
            <div class="tenant-qr-preview" onclick="tenant.closeQrPreview()">
                <div class="tenant-qr-preview-card" onclick="event.stopPropagation()">
                    <button type="button" class="tenant-qr-preview-close" onclick="tenant.closeQrPreview()">
                        <i class="fas fa-times"></i>
                    </button>
                    <img src="${this.escapeAttribute(normalized)}" alt="Mã QR nhận tiền phóng to">
                    <p>Quét mã QR này để chuyển khoản cho chủ trọ.</p>
                </div>
            </div>
        `;
    },

    closeQrPreview() {
        const root = document.getElementById('tenant-qr-preview-root');
        if (root) root.innerHTML = '';
    },

    async initHeaderNotifications() {
        const user = auth.getUser();
        if (!user || user.role !== 'Tenant') return;

        this.ensureNotificationModalRoot();

        if (!this.notificationOutsideClickHandler) {
            this.notificationOutsideClickHandler = event => {
                if (!event.target.closest('.tenant-notification-shell')) {
                    this.closePaymentNotifications();
                }
            };
            document.addEventListener('click', this.notificationOutsideClickHandler);
        }

        await this.refreshPaymentNotifications();
        this.startPaymentNotificationPolling();
    },

    startPaymentNotificationPolling() {
        this.stopPaymentNotificationPolling();
        this.notificationPollerId = setInterval(() => {
            const user = auth.getUser();
            if (!user || user.role !== 'Tenant') {
                this.stopPaymentNotificationPolling();
                return;
            }
            this.refreshPaymentNotifications();
        }, 30000);
    },

    stopPaymentNotificationPolling() {
        if (this.notificationPollerId) {
            clearInterval(this.notificationPollerId);
            this.notificationPollerId = null;
        }
    },

    async loadPaymentNotifications() {
        const res = await fetch(`${API_URL}/payments/tenant`, {
            headers: { 'Authorization': `Bearer ${auth.getToken()}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Không thể tải thông báo thanh toán');

        this.paymentNotifications = data.data || [];
        return this.paymentNotifications;
    },

    async refreshPaymentNotifications(showError = false) {
        const user = auth.getUser();
        if (!user || user.role !== 'Tenant') return;

        try {
            await this.loadPaymentNotifications();
            this.renderPaymentNotificationDropdown();
        } catch (error) {
            if (showError) {
                showToast(error.message || 'Lỗi tải thông báo thanh toán', 'error');
            }
        }
    },

    renderPaymentNotificationDropdown() {
        const badge = document.getElementById('tenant-payment-badge');
        const dropdown = document.getElementById('tenant-payment-dropdown');
        if (!badge || !dropdown) return;

        const activeCount = this.paymentNotifications.filter(item => ['pending', 'partial', 'overdue'].includes(item.status)).length;
        badge.textContent = activeCount;
        badge.style.display = activeCount > 0 ? 'inline-flex' : 'none';

        dropdown.innerHTML = `
            <div class="tenant-notification-header">
                <div>
                    <h4>Thông báo thanh toán</h4>
                    <p>${activeCount > 0 ? `Bạn có ${activeCount} khoản cần theo dõi` : 'Chưa có khoản thanh toán mới'}</p>
                </div>
            </div>
            <div class="tenant-notification-list">
                ${this.paymentNotifications.length === 0 ? `
                    <div class="tenant-notification-empty">
                        <i class="fas fa-bell-slash"></i>
                        <p>Chưa có thông báo thanh toán nào.</p>
                    </div>
                ` : this.paymentNotifications.map(payment => {
                    const status = this.getPaymentStatusMeta(payment.status);
                    return `
                        <button type="button" class="tenant-notification-item" onclick="tenant.openPaymentNotification(${payment.id})">
                            <div class="tenant-notification-item-top">
                                <strong>${this.escapeHtml(payment.paymentCode || `TT-${payment.id}`)}</strong>
                                <span class="tenant-mini-status ${status.className}">
                                    <i class="fas ${status.icon}"></i> ${status.label}
                                </span>
                            </div>
                            <div class="tenant-notification-room">${this.escapeHtml(payment.room ? payment.room.title : `Phòng #${payment.roomId}`)}</div>
                            <div class="tenant-notification-meta">
                                <span>Kỳ: ${this.escapeHtml(payment.billingPeriod)}</span>
                                <span>${this.formatCurrency(payment.totalAmount)}</span>
                            </div>
                            <div class="tenant-notification-meta subtle">
                                <span>Hạn: ${this.formatDate(payment.dueDate)}</span>
                                <span>${this.escapeHtml(this.getPaymentMethodLabel(payment.paymentMethod))}</span>
                            </div>
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    },

    async togglePaymentNotifications(event) {
        event.stopPropagation();
        const dropdown = document.getElementById('tenant-payment-dropdown');
        if (!dropdown) return;

        const willOpen = !dropdown.classList.contains('open');
        this.closePaymentNotifications();
        if (willOpen) {
            await this.refreshPaymentNotifications();
            dropdown.classList.add('open');
        }
    },

    closePaymentNotifications() {
        const dropdown = document.getElementById('tenant-payment-dropdown');
        if (dropdown) dropdown.classList.remove('open');
    },

    openPaymentNotification(paymentId) {
        const payment = this.paymentNotifications.find(item => Number(item.id) === Number(paymentId));
        if (!payment) {
            showToast('Không tìm thấy chi tiết khoản thanh toán', 'error');
            return;
        }

        const root = this.ensureNotificationModalRoot();
        const status = this.getPaymentStatusMeta(payment.status);
        const remainingAmount = Math.max(Number(payment.totalAmount || 0) - Number(payment.paidAmount || 0), 0);
        const primaryChargeLabel = this.getPrimaryPaymentChargeLabel(payment);
        const roomChargeNote = payment.paymentType === 'deposit'
            ? 'Khoản cọc đã được chốt trong hợp đồng.'
            : payment.paymentType === 'monthly_rent'
                ? 'Theo giá thuê tháng trong hợp đồng.'
                : '';
        const electricityNote = this.buildUtilityChargeNote(payment, 'electricity', 'số');
        const waterNote = this.buildUtilityChargeNote(payment, 'water', 'khối');
        const serviceNote = Number(payment.serviceCharge || 0) > 0 ? 'Phí cố định theo hợp đồng.' : '';
        const additionalNote = Number(payment.additionalCharge || 0) > 0
            ? (payment.paymentType === 'other' ? 'Khoản khác do chủ trọ thêm vào phiếu.' : 'Khoản cộng thêm ngoài công thức cơ bản.')
            : '';
        const discountNote = Number(payment.discountAmount || 0) > 0 ? 'Khoản giảm cho kỳ thanh toán này.' : '';
        const detailRows = [
            (Number(payment.roomCharge || 0) > 0 || ['deposit', 'monthly_rent'].includes(payment.paymentType))
                ? `<tr><td>${this.escapeHtml(primaryChargeLabel)}</td><td>${this.renderPaymentAmountCell(payment.roomCharge, roomChargeNote)}</td></tr>`
                : '',
            (Number(payment.electricityCharge || 0) > 0 || electricityNote)
                ? `<tr><td>Tiền điện</td><td>${this.renderPaymentAmountCell(payment.electricityCharge, electricityNote)}</td></tr>`
                : '',
            (Number(payment.waterCharge || 0) > 0 || waterNote)
                ? `<tr><td>Tiền nước</td><td>${this.renderPaymentAmountCell(payment.waterCharge, waterNote)}</td></tr>`
                : '',
            Number(payment.serviceCharge || 0) > 0
                ? `<tr><td>Phí dịch vụ</td><td>${this.renderPaymentAmountCell(payment.serviceCharge, serviceNote)}</td></tr>`
                : '',
            (Number(payment.additionalCharge || 0) > 0 || payment.paymentType === 'other')
                ? `<tr><td>Phụ thu khác</td><td>${this.renderPaymentAmountCell(payment.additionalCharge, additionalNote)}</td></tr>`
                : '',
            Number(payment.discountAmount || 0) > 0
                ? `<tr><td>Giảm trừ</td><td>${this.renderPaymentAmountCell(-Number(payment.discountAmount || 0), discountNote)}</td></tr>`
                : ''
        ].filter(Boolean).join('');

        root.innerHTML = `
            <div class="tenant-payment-modal" onclick="tenant.closePaymentNotificationModal()">
                <div class="tenant-payment-modal-card" onclick="event.stopPropagation()">
                    <div class="tenant-payment-modal-header">
                        <div>
                            <h3><i class="fas fa-file-invoice-dollar"></i> Bảng Chi Phí Thanh Toán</h3>
                            <p>${this.escapeHtml(payment.paymentCode || `TT-${payment.id}`)} • ${this.escapeHtml(payment.billingPeriod)}</p>
                        </div>
                        <button type="button" class="tenant-payment-close" onclick="tenant.closePaymentNotificationModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="tenant-payment-summary-grid">
                        <div class="tenant-payment-summary-card">
                            <span>Phòng</span>
                            <strong>${this.escapeHtml(payment.room ? payment.room.title : `Phòng #${payment.roomId}`)}</strong>
                            <small>${this.escapeHtml(payment.room ? payment.room.address : '')}</small>
                        </div>
                        <div class="tenant-payment-summary-card">
                            <span>Chủ trọ</span>
                            <strong>${this.escapeHtml(payment.landlord ? payment.landlord.username : '—')}</strong>
                            <small>${this.escapeHtml(payment.landlord ? payment.landlord.email : '')}</small>
                        </div>
                        <div class="tenant-payment-summary-card">
                            <span>Trạng thái</span>
                            <strong class="tenant-summary-status ${status.className}"><i class="fas ${status.icon}"></i> ${status.label}</strong>
                            <small>Hạn thanh toán: ${this.formatDate(payment.dueDate)}</small>
                        </div>
                    </div>

                    ${this.renderPaymentTransferDetails(payment)}

                    <div class="tenant-payment-table-shell">
                        <table class="tenant-payment-table">
                            <thead>
                                <tr>
                                    <th>Khoản phí</th>
                                    <th>Giá trị</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${detailRows}
                                <tr class="tenant-payment-total-row"><td>Tổng cần thanh toán</td><td>${this.formatCurrency(payment.totalAmount)}</td></tr>
                                <tr><td>Đã thanh toán</td><td>${this.formatCurrency(payment.paidAmount)}</td></tr>
                                <tr><td>Còn lại</td><td>${this.formatCurrency(remainingAmount)}</td></tr>
                                <tr><td>Phương thức</td><td>${this.escapeHtml(this.getPaymentMethodLabel(payment.paymentMethod))}</td></tr>
                                <tr><td>Loại thanh toán</td><td>${this.escapeHtml(this.getPaymentTypeLabel(payment.paymentType))}</td></tr>
                                <tr><td>Ngày tạo</td><td>${this.formatDateTime(payment.createdAt)}</td></tr>
                                <tr><td>Ngày thu</td><td>${this.formatDateTime(payment.paidDate)}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    ${payment.note ? `
                        <div class="tenant-payment-note">
                            <strong>Ghi chú từ chủ trọ</strong>
                            <p>${this.escapeHtml(payment.note)}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    closePaymentNotificationModal() {
        this.closeQrPreview();
        const root = document.getElementById('tenant-payment-modal-root');
        if (root) root.innerHTML = '';
    },

    async init() {
        try {
            await this.loadResidentData();
            this.renderPage();
        } catch (error) {
            const content = document.getElementById('main-content');
            content.innerHTML = `<div class="container" style="padding:2rem 2rem 4rem;"><div class="empty-state resident-empty-card"><i class="fas fa-triangle-exclamation fa-3x"></i><h3>Không thể tải cổng cư dân</h3><p>${this.escapeHtml(error.message)}</p></div></div>`;
        }
    },

    renderPage() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <section class="resident-shell">
                <div class="container">
                    <div class="resident-board">
                        <div class="resident-head">
                            <div>
                                <span class="resident-kicker">Cổng cư dân</span>
                                <h1>Phòng Của Tôi</h1>
                                <p>Xem thông tin phòng đang ở, nhận thông báo từ chủ trọ và gửi báo cáo sự cố tại một nơi duy nhất.</p>
                            </div>
                            <div class="resident-head-actions">
                                <button type="button" class="resident-inline-action" onclick="tenant.showResidentTab('notifications')">
                                    <i class="fas fa-bell"></i> Xem Thông Báo
                                </button>
                                <button type="button" class="btn btn-primary" onclick="tenant.showResidentTab('issues')">
                                    <i class="fas fa-screwdriver-wrench"></i> Báo Cáo Sự Cố
                                </button>
                            </div>
                        </div>

                        <div class="resident-tab-strip">
                            <button class="resident-tab ${this.residentTab === 'stay' ? 'active' : ''}" onclick="tenant.showResidentTab('stay')">
                                <i class="fas fa-bed"></i> Phòng đang ở
                            </button>
                            <button class="resident-tab ${this.residentTab === 'notifications' ? 'active' : ''}" onclick="tenant.showResidentTab('notifications')">
                                <i class="fas fa-bell"></i> Thông báo từ chủ trọ
                            </button>
                            <button class="resident-tab ${this.residentTab === 'issues' ? 'active' : ''}" onclick="tenant.showResidentTab('issues')">
                                <i class="fas fa-screwdriver-wrench"></i> Báo cáo sự cố
                            </button>
                        </div>

                        <div class="resident-content-shell">
                            ${this.residentTab === 'stay'
                                ? this.renderResidentStay()
                                : this.residentTab === 'notifications'
                                    ? this.renderResidentNotifications()
                                    : this.renderIssueReports()}
                        </div>
                    </div>
                </div>
            </section>
        `;
    },

    showResidentTab(tab) {
        this.residentTab = tab;
        this.renderPage();
    },

    async submitIssueReport(event) {
        event.preventDefault();

        if (!this.currentStay) {
            showToast('Bạn chưa có phòng đang thuê để gửi báo cáo sự cố', 'error');
            return;
        }

        const title = document.getElementById('issue-title')?.value.trim();
        const severity = document.getElementById('issue-severity')?.value;
        const description = document.getElementById('issue-description')?.value.trim();

        if (!title || !description) {
            showToast('Vui lòng nhập đầy đủ tiêu đề và mô tả sự cố', 'error');
            return;
        }

        const submitButton = event.target.querySelector('[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';

        try {
            const res = await fetch(`${API_URL}/issues/tenant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.getToken()}`
                },
                body: JSON.stringify({ title, severity, description })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Không thể gửi báo cáo sự cố');

            await this.loadResidentData();
            this.residentTab = 'issues';
            this.renderPage();
            showToast('Đã gửi báo cáo sự cố cho chủ trọ', 'success');
        } catch (error) {
            showToast(error.message || 'Có lỗi xảy ra khi gửi báo cáo', 'error');
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi Báo Cáo';
        }
    },

    showTab(tab) {
        ['rooms', 'inbox', 'invitations'].forEach(t => {
            document.getElementById(`tab-content-${t}`).style.display = t === tab ? 'block' : 'none';
            document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
        });
        if (tab === 'inbox') this.loadInbox();
        if (tab === 'invitations') this.loadInvitations();
    },

    renderRooms() {
        let filtered = this.rooms;
        if (this.currentCategory !== '') {
            filtered = filtered.filter(r => r.categoryId == this.currentCategory);
        }
        if (this.currentSearch.trim()) {
            const q = this.currentSearch.toLowerCase();
            filtered = filtered.filter(r =>
                r.title.toLowerCase().includes(q) ||
                r.address.toLowerCase().includes(q)
            );
        }
        if (filtered.length === 0) {
            return `<div class="empty-state" style="grid-column:1/-1">
                <i class="fas fa-search fa-3x"></i>
                <h3>Không tìm thấy phòng phù hợp</h3>
                <p>Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm</p>
            </div>`;
        }
        return filtered.map(room => this.renderTenantCard(room)).join('');
    },

    renderTenantCard(room) {
        const imgs = room.images || [];
        const mainImg = imgs.length > 0
            ? `http://localhost:5000${imgs[0].url}`
            : 'https://placehold.co/400x250/e2e8f0/718096?text=Chưa+có+ảnh';
        const badge = room.category ? `<span class="category-badge">${room.category.name}</span>` : '';
        return `
            <div class="tenant-card" onclick="tenant.showDetail(${room.id})">
                <div class="tenant-card-img" style="background-image: url('${mainImg}')">
                    ${badge}
                    ${imgs.length > 1 ? `<div class="img-count"><i class="fas fa-images"></i> ${imgs.length}</div>` : ''}
                </div>
                <div class="tenant-card-body">
                    <h3>${room.title}</h3>
                    <p class="room-price"><i class="fas fa-money-bill-wave"></i> <strong>${Number(room.price).toLocaleString('vi-VN')}</strong> VNĐ/tháng</p>
                    <p class="room-address"><i class="fas fa-map-marker-alt"></i> ${room.address}</p>
                    ${room.area ? `<p class="room-area"><i class="fas fa-ruler-combined"></i> ${room.area} m²</p>` : ''}
                    <button class="btn btn-primary" style="width:100%;margin-top:0.75rem;justify-content:center" onclick="event.stopPropagation();tenant.showDetail(${room.id})">
                        <i class="fas fa-eye"></i> Xem Chi Tiết
                    </button>
                </div>
            </div>
        `;
    },

    filterByCategory(catId) {
        this.currentCategory = catId;
        event.target.closest('.filter-tabs').querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        document.getElementById('rooms-display').innerHTML = this.renderRooms();
    },

    filterRooms() {
        this.currentSearch = document.getElementById('search-input').value;
        document.getElementById('rooms-display').innerHTML = this.renderRooms();
    },

    async showDetail(id) {
        try {
            const res = await fetch(`${API_URL}/rooms/${id}`);
            const data = await res.json();
            const room = data.data;
            const imgs = room.images || [];
            const user = auth.getUser();
            const content = document.getElementById('main-content');
            content.innerHTML = `
                <div class="container" style="padding: 2rem;">
                    <button class="btn btn-secondary" onclick="tenant.renderPage()" style="margin-bottom:1.5rem;color:var(--primary);border-color:var(--primary);">
                        <i class="fas fa-arrow-left"></i> Quay lại
                    </button>
                    <div class="room-detail-layout">
                        <!-- Gallery -->
                        <div class="gallery">
                            ${imgs.length > 0 ? `
                                <div class="gallery-main" id="gallery-main" style="background-image: url('http://localhost:5000${imgs[0].url}')"></div>
                                <div class="gallery-thumbs">
                                    ${imgs.map((img, i) => `
                                        <div class="gallery-thumb ${i===0?'active':''}"
                                             style="background-image: url('http://localhost:5000${img.url}')"
                                             onclick="tenant.switchImg('http://localhost:5000${img.url}', this)">
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div class="gallery-main" style="background:#e2e8f0;display:flex;align-items:center;justify-content:center;border-radius:14px;">
                                    <p style="color:#718096;text-align:center"><i class="fas fa-image fa-3x"></i><br>Chưa có ảnh</p>
                                </div>
                            `}
                        </div>

                        <!-- Info -->
                        <div class="room-detail-info">
                            ${room.category ? `<span class="category-badge" style="position:static;font-size:0.85rem;display:inline-block;margin-bottom:0.5rem">${room.category.name}</span>` : ''}
                            <h1 style="font-size:1.6rem;margin:0.5rem 0">${room.title}</h1>
                            <p class="room-price" style="font-size:1.4rem">
                                <i class="fas fa-money-bill-wave"></i>
                                <strong style="color:var(--primary)">${Number(room.price).toLocaleString('vi-VN')} VNĐ</strong>/tháng
                            </p>
                            <div class="detail-meta">
                                <div class="meta-item"><i class="fas fa-map-marker-alt"></i><span>${room.address}</span></div>
                                ${room.area ? `<div class="meta-item"><i class="fas fa-ruler-combined"></i><span>${room.area} m²</span></div>` : ''}
                                <div class="meta-item"><i class="fas fa-images"></i><span>${imgs.length} hình ảnh</span></div>
                            </div>
                            ${room.description ? `
                                <div class="room-description">
                                    <h3><i class="fas fa-info-circle"></i> Mô tả</h3>
                                    <p>${room.description}</p>
                                </div>
                            ` : ''}

                            <!-- Contact via Message -->
                            <div class="contact-card" id="contact-section">
                                <h3><i class="fas fa-comments"></i> Nhắn tin cho chủ trọ</h3>
                                ${user ? `
                                    <div id="chat-box-${id}" class="chat-box"></div>
                                    <div class="chat-input-row">
                                        <textarea id="msg-input-${id}" class="chat-input" rows="2"
                                            placeholder="Nhập tin nhắn... (VD: Tôi muốn hỏi về phòng này)"></textarea>
                                        <button class="btn btn-primary chat-send-btn" onclick="tenant.sendMessage(${id})">
                                            <i class="fas fa-paper-plane"></i>
                                        </button>
                                    </div>
                                ` : `
                                    <p style="color:var(--text-light);margin:0.5rem 0">Bạn cần <a href="#" onclick="showLogin()" style="color:var(--primary);font-weight:700">đăng nhập</a> để nhắn tin cho chủ trọ.</p>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            if (user) {
                this.loadConversation(id);
            }
        } catch (err) {
            showToast('Lỗi tải chi tiết phòng', 'error');
        }
    },

    async loadConversation(roomId) {
        const user = auth.getUser();
        if (!user) return;
        try {
            const res = await fetch(`${API_URL}/messages/conversation/${roomId}/${user.id}`, {
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            const data = await res.json();
            const box = document.getElementById(`chat-box-${roomId}`);
            if (!box) return;
            if (!data.data || data.data.length === 0) {
                box.innerHTML = `<div class="chat-empty">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</div>`;
            } else {
                box.innerHTML = data.data.map(m => {
                    let msgClass = '';
                    if (m.senderRole === 'System') msgClass = 'msg-system';
                    else msgClass = m.senderRole === 'Tenant' ? 'msg-mine' : 'msg-theirs';

                    return `
                        <div class="chat-msg ${msgClass}">
                            <div class="msg-bubble">
                                <p>${this.escapeHtml(m.content)}</p>
                                <span class="msg-time">${new Date(m.createdAt).toLocaleString('vi-VN', {hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}</span>
                            </div>
                        </div>
                    `;
                }).join('');
                box.scrollTop = box.scrollHeight;
            }
        } catch (err) {
            console.error('Lỗi tải tin nhắn:', err);
        }
    },

    async sendMessage(roomId) {
        const input = document.getElementById(`msg-input-${roomId}`);
        const content = input.value.trim();
        if (!content) return;
        try {
            const res = await fetch(`${API_URL}/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.getToken()}`
                },
                body: JSON.stringify({ roomId, content })
            });
            const data = await res.json();
            if (res.ok) {
                input.value = '';
                await this.loadConversation(roomId);
                showToast('Tin nhắn đã gửi thành công!', 'success');
            } else {
                showToast(data.message || 'Lỗi gửi tin nhắn', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối', 'error');
        }
    },

    async loadInbox() {
        const panel = document.getElementById('tab-content-inbox');
        panel.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;
        try {
            const res = await fetch(`${API_URL}/messages/inbox/tenant`, {
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            const data = await res.json();
            const convos = data.data || [];
            if (convos.length === 0) {
                panel.innerHTML = `<div class="empty-state"><i class="fas fa-comments fa-3x"></i><h3>Chưa có cuộc trò chuyện nào</h3><p>Hãy vào xem phòng và nhắn tin cho chủ trọ</p></div>`;
                return;
            }
            panel.innerHTML = `
                <h3 style="margin:1.5rem 0 1.5rem; display:flex; align-items:center; gap:0.75rem">
                    <i class="fas fa-inbox" style="color:var(--primary)"></i> Tin nhắn của tôi
                </h3>
                <div class="convo-list">
                    ${convos.map(m => `
                        <div class="convo-item" onclick="tenant.showDetail(${m.roomId})">
                            <div class="convo-icon"><i class="fas fa-home"></i></div>
                            <div class="convo-info">
                                <h4>${this.escapeHtml(m.room ? m.room.title : 'Phòng #' + m.roomId)}</h4>
                                <p><i class="fas fa-map-marker-alt" style="font-size:0.75rem"></i> ${this.escapeHtml(m.room ? m.room.address : '')}</p>
                                <span class="convo-preview">
                                    <strong>${this.getSenderLabel(m.senderRole)}:</strong> ${this.escapeHtml(this.buildMessagePreview(m.content))}
                                </span>
                            </div>
                            <div class="convo-time">
                                ${new Date(m.createdAt).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (err) {
            panel.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Lỗi tải dữ liệu</h3></div>`;
        }
    },

    async checkPendingInvitations() {
        try {
            const res = await fetch(`${API_URL}/messages/invitation/tenant`, {
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            const data = await res.json();
            const pending = (data.data || []).filter(i => i.status === 'pending');
            const badge = document.getElementById('invite-badge');
            if (badge && pending.length > 0) {
                badge.style.display = 'inline';
                badge.textContent = pending.length;
            }
        } catch (e) {}
    },

    async loadInvitations() {
        const panel = document.getElementById('tab-content-invitations');
        panel.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;
        try {
            const res = await fetch(`${API_URL}/messages/invitation/tenant`, {
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            const data = await res.json();
            const invs = data.data || [];
            if (invs.length === 0) {
                panel.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-check fa-3x"></i><h3>Chưa có lời mời nào</h3><p>Khi chủ trọ gửi xác nhận lịch xem phòng, sẽ hiển thị ở đây</p></div>`;
                return;
            }
            panel.innerHTML = `
                <h3 style="margin:1.5rem 0 1rem"><i class="fas fa-calendar-check"></i> Lời Mời Xem Phòng</h3>
                <div class="invitation-list">
                    ${invs.map(inv => this.renderInvitationCard(inv)).join('')}
                </div>
            `;
        } catch (err) {
            panel.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Lỗi tải dữ liệu</h3></div>`;
        }
    },

    renderInvitationCard(inv) {
        const statusMap = {
            pending: { text: 'Chờ xác nhận', cls: 'status-pending', icon: 'fa-clock' },
            confirmed: { text: 'Đã xác nhận', cls: 'status-confirmed', icon: 'fa-check-circle' },
            rejected: { text: 'Đã từ chối', cls: 'status-rejected', icon: 'fa-times-circle' }
        };
        const s = statusMap[inv.status] || statusMap.pending;
        const dateStr = new Date(inv.viewingDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        return `
            <div class="invitation-card ${s.cls}">
                <div class="inv-header">
                    <div class="inv-icon"><i class="fas fa-calendar-alt"></i></div>
                    <div class="inv-title">
                        <h4>${inv.room ? inv.room.title : 'Phòng #' + inv.roomId}</h4>
                        <p>${inv.room ? inv.room.address : ''}</p>
                    </div>
                    <span class="inv-status ${s.cls}"><i class="fas ${s.icon}"></i> ${s.text}</span>
                </div>
                <div class="inv-body">
                    <div class="inv-detail">
                        <i class="fas fa-user"></i>
                        <span>Chủ trọ: <strong>${inv.landlord ? inv.landlord.username : '—'}</strong></span>
                    </div>
                    <div class="inv-detail">
                        <i class="fas fa-calendar"></i>
                        <span>Ngày xem: <strong>${dateStr}</strong></span>
                    </div>
                    <div class="inv-detail">
                        <i class="fas fa-clock"></i>
                        <span>Giờ xem: <strong>${inv.viewingTime}</strong></span>
                    </div>
                    ${inv.note ? `<div class="inv-note"><i class="fas fa-sticky-note"></i> ${inv.note}</div>` : ''}
                </div>
                ${inv.status === 'pending' ? `
                <div class="inv-actions">
                    <button class="btn btn-primary" onclick="tenant.respondInvitation(${inv.id}, 'confirmed')">
                        <i class="fas fa-check"></i> Xác Nhận Tham Dự
                    </button>
                    <button class="btn" style="background:#fee2e2;color:#dc2626;border:none" onclick="tenant.respondInvitation(${inv.id}, 'rejected')">
                        <i class="fas fa-times"></i> Từ Chối
                    </button>
                </div>` : ''}
            </div>
        `;
    },

    async respondInvitation(id, status) {
        const action = status === 'confirmed' ? 'xác nhận tham dự' : 'từ chối';
        if (!confirm(`Bạn có chắc muốn ${action} lời mời này?`)) return;
        try {
            const res = await fetch(`${API_URL}/messages/invitation/${id}/respond`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.getToken()}`
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                showToast(status === 'confirmed' ? 'Đã xác nhận! Hẹn gặp bạn.' : 'Đã từ chối lời mời.', status === 'confirmed' ? 'success' : 'info');
                this.loadInvitations();
            }
        } catch (err) {
            showToast('Lỗi kết nối', 'error');
        }
    },

    switchImg(url, el) {
        document.getElementById('gallery-main').style.backgroundImage = `url('${url}')`;
        document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
    }
};
