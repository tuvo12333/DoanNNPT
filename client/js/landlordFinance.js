Object.assign(landlord, {
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

    formatCurrency(value) {
        return `${Number(value || 0).toLocaleString('vi-VN')} VNĐ`;
    },

    formatDate(value) {
        if (!value) return '—';
        return new Date(value).toLocaleDateString('vi-VN');
    },

    formatDateInput(value) {
        if (!value) return '';
        return new Date(value).toISOString().split('T')[0];
    },

    formatDateTimeInput(value) {
        if (!value) return '';
        return new Date(value).toISOString().slice(0, 16);
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

    getPaymentTypeLabel(type) {
        const map = {
            deposit: 'Tiền cọc',
            monthly_rent: 'Tiền phòng tháng',
            service: 'Phí dịch vụ',
            other: 'Khoản khác'
        };
        return map[type] || type || 'Chưa xác định';
    },

    toNumericValue(value, defaultValue = 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : defaultValue;
    },

    formatMeasurement(value) {
        return Number(value || 0).toLocaleString('vi-VN');
    },

    isTransferPaymentMethod(method) {
        return ['bank_transfer', 'qr_transfer'].includes(method);
    },

    getContractStatusMeta(status) {
        const map = {
            draft: { label: 'Nháp', className: 'status-draft', icon: 'fa-file-lines' },
            active: { label: 'Hiệu lực', className: 'status-active', icon: 'fa-badge-check' },
            expired: { label: 'Hết hạn', className: 'status-expired', icon: 'fa-hourglass-end' },
            terminated: { label: 'Đã kết thúc', className: 'status-terminated', icon: 'fa-ban' }
        };
        return map[status] || map.draft;
    },

    getPaymentStatusMeta(status) {
        const map = {
            pending: { label: 'Chờ thanh toán', className: 'status-pending', icon: 'fa-clock' },
            partial: { label: 'Thanh toán một phần', className: 'status-partial', icon: 'fa-circle-half-stroke' },
            paid: { label: 'Đã thanh toán', className: 'status-paid', icon: 'fa-circle-check' },
            overdue: { label: 'Quá hạn', className: 'status-overdue', icon: 'fa-triangle-exclamation' },
            cancelled: { label: 'Đã hủy', className: 'status-cancelled', icon: 'fa-circle-xmark' }
        };
        return map[status] || map.pending;
    },

    renderFinanceStats(cards) {
        return `
            <div class="finance-stats-grid">
                ${cards.map(card => `
                    <div class="finance-stat-card">
                        <div class="finance-stat-icon ${card.tone || 'tone-blue'}">
                            <i class="fas ${card.icon}"></i>
                        </div>
                        <div>
                            <div class="finance-stat-label">${this.escapeHtml(card.label)}</div>
                            <div class="finance-stat-value">${this.escapeHtml(card.value)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    async loadContractLookups(force = false) {
        if (!force && (this.contractLookups.rooms.length || this.contractLookups.tenants.length)) return this.contractLookups;

        const res = await fetch(`${API_URL}/contracts/lookups`, {
            headers: { 'Authorization': `Bearer ${auth.getToken()}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Không thể tải dữ liệu tra cứu');

        this.contractLookups = data.data || { rooms: [], tenants: [] };
        return this.contractLookups;
    },

    async loadContracts() {
        const res = await fetch(`${API_URL}/contracts`, {
            headers: { 'Authorization': `Bearer ${auth.getToken()}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Không thể tải danh sách hợp đồng');

        this.contracts = data.data || [];
        return this.contracts;
    },

    async loadPayments() {
        const res = await fetch(`${API_URL}/payments`, {
            headers: { 'Authorization': `Bearer ${auth.getToken()}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Không thể tải danh sách thanh toán');

        this.payments = data.data || [];
        return this.payments;
    },

    renderContractTable() {
        return `
            <div class="table-container finance-table-shell">
                <table>
                    <thead>
                        <tr>
                            <th>Hợp đồng</th>
                            <th>Phòng</th>
                            <th>Người thuê</th>
                            <th>Chi phí</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.contracts.map(contract => {
                            const status = this.getContractStatusMeta(contract.status);
                            return `
                                <tr>
                                    <td>
                                        <div class="finance-title">${this.escapeHtml(contract.contractCode || `HD-${contract.id}`)}</div>
                                        <div class="finance-subtitle">Bắt đầu: ${this.formatDate(contract.startDate)}</div>
                                        <div class="finance-subtitle">Kết thúc: ${this.formatDate(contract.endDate)}</div>
                                    </td>
                                    <td>
                                        <div class="finance-title">${this.escapeHtml(contract.room ? contract.room.title : `Phòng #${contract.roomId}`)}</div>
                                        <div class="finance-subtitle">${this.escapeHtml(contract.room ? contract.room.address : '')}</div>
                                    </td>
                                    <td>
                                        <div class="finance-title">${this.escapeHtml(contract.tenant ? contract.tenant.username : `Khách #${contract.tenantId}`)}</div>
                                        <div class="finance-subtitle">${this.escapeHtml(contract.tenant ? contract.tenant.email : '')}</div>
                                    </td>
                                    <td>
                                        <div class="finance-title">${this.formatCurrency(contract.monthlyRent)}</div>
                                        <div class="finance-subtitle">Cọc: ${this.formatCurrency(contract.depositAmount)}</div>
                                        <div class="finance-subtitle">Hạn thu: ngày ${contract.paymentDueDay || 5}</div>
                                    </td>
                                    <td>
                                        <span class="status-badge ${status.className}">
                                            <i class="fas ${status.icon}"></i> ${status.label}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="finance-actions-row">
                                            <button class="btn-icon btn-edit" onclick="landlord.showContractForm(${contract.id})">
                                                <i class="fas fa-edit"></i> Sửa
                                            </button>
                                            <button class="btn-icon btn-del" onclick="landlord.deleteContract(${contract.id})">
                                                <i class="fas fa-trash"></i> Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async showContracts() {
        this.setActiveLink('link-contracts');
        const panel = document.getElementById('landlord-panel');
        panel.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải hợp đồng...</div>`;

        try {
            await Promise.all([this.loadContracts(), this.loadContractLookups(true)]);

            const activeCount = this.contracts.filter(item => item.status === 'active').length;
            const draftCount = this.contracts.filter(item => item.status === 'draft').length;
            const endedCount = this.contracts.filter(item => ['expired', 'terminated'].includes(item.status)).length;

            panel.innerHTML = `
                <div class="panel-header">
                    <h2><i class="fas fa-file-signature"></i> Quản Lý Hợp Đồng</h2>
                    <button class="btn btn-primary" onclick="landlord.showContractForm()">
                        <i class="fas fa-plus"></i> Tạo Hợp Đồng
                    </button>
                </div>
                ${this.renderFinanceStats([
                    { label: 'Tổng hợp đồng', value: String(this.contracts.length), icon: 'fa-file-signature', tone: 'tone-blue' },
                    { label: 'Đang hiệu lực', value: String(activeCount), icon: 'fa-circle-check', tone: 'tone-green' },
                    { label: 'Nháp', value: String(draftCount), icon: 'fa-pen-to-square', tone: 'tone-amber' },
                    { label: 'Đã kết thúc', value: String(endedCount), icon: 'fa-ban', tone: 'tone-slate' }
                ])}
                ${this.contractLookups.rooms.length === 0
                    ? `<div class="finance-banner warning"><i class="fas fa-circle-info"></i> Bạn chưa có phòng nào để lập hợp đồng. Hãy thêm phòng trước.</div>`
                    : ''}
                ${this.contractLookups.tenants.length === 0
                    ? `<div class="finance-banner warning"><i class="fas fa-user-slash"></i> Hiện chưa có tài khoản người thuê nào trong hệ thống để gán vào hợp đồng.</div>`
                    : ''}
                <div id="contract-form-area"></div>
                ${this.contracts.length === 0
                    ? `
                        <div class="empty-state finance-empty-state">
                            <i class="fas fa-file-signature fa-3x"></i>
                            <h3>Chưa có hợp đồng nào</h3>
                            <p>Tạo hợp đồng đầu tiên để quản lý người thuê, tiền cọc và thời hạn thuê phòng.</p>
                            <button class="btn btn-primary" onclick="landlord.showContractForm()">
                                <i class="fas fa-plus"></i> Tạo Hợp Đồng
                            </button>
                        </div>
                    `
                    : this.renderContractTable()}
            `;
        } catch (error) {
            panel.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Lỗi tải hợp đồng</h3><p>${this.escapeHtml(error.message)}</p></div>`;
        }
    },

    showContractForm(contractId = null) {
        const area = document.getElementById('contract-form-area');
        if (!area) return;

        const contract = contractId ? this.contracts.find(item => item.id === contractId) : null;
        const rooms = this.contractLookups.rooms || [];
        const tenants = this.contractLookups.tenants || [];

        if (!rooms.length || !tenants.length) {
            showToast('Cần có phòng và người thuê trước khi tạo hợp đồng', 'error');
            return;
        }

        area.innerHTML = `
            <form class="room-form finance-form" onsubmit="landlord.submitContract(event${contract ? `, ${contract.id}` : ''})">
                <div class="finance-form-header">
                    <h3><i class="fas ${contract ? 'fa-pen' : 'fa-plus-circle'}"></i> ${contract ? 'Cập Nhật Hợp Đồng' : 'Tạo Hợp Đồng Mới'}</h3>
                    <button type="button" class="finance-close-btn" onclick="document.getElementById('contract-form-area').innerHTML=''">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Mã hợp đồng</label>
                        <input type="text" id="contract-code" value="${this.escapeAttribute(contract ? contract.contractCode : '')}" placeholder="Tự sinh nếu để trống">
                    </div>
                    <div class="form-group">
                        <label>Trạng thái</label>
                        <select id="contract-status">
                            <option value="draft" ${!contract || contract.status === 'draft' ? 'selected' : ''}>Nháp</option>
                            <option value="active" ${contract && contract.status === 'active' ? 'selected' : ''}>Hiệu lực</option>
                            <option value="expired" ${contract && contract.status === 'expired' ? 'selected' : ''}>Hết hạn</option>
                            <option value="terminated" ${contract && contract.status === 'terminated' ? 'selected' : ''}>Đã kết thúc</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Phòng *</label>
                        <select id="contract-room-id" required>
                            <option value="">-- Chọn phòng --</option>
                            ${rooms.map(room => `
                                <option value="${room.id}" ${contract && Number(contract.roomId) === Number(room.id) ? 'selected' : ''}>
                                    ${this.escapeHtml(room.title)} - ${this.escapeHtml(room.address)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Người thuê *</label>
                        <select id="contract-tenant-id" required>
                            <option value="">-- Chọn người thuê --</option>
                            ${tenants.map(tenant => `
                                <option value="${tenant.id}" ${contract && Number(contract.tenantId) === Number(tenant.id) ? 'selected' : ''}>
                                    ${this.escapeHtml(tenant.username)} - ${this.escapeHtml(tenant.email)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Ngày bắt đầu *</label>
                        <input type="date" id="contract-start-date" required value="${this.escapeAttribute(this.formatDateInput(contract ? contract.startDate : ''))}">
                    </div>
                    <div class="form-group">
                        <label>Ngày kết thúc</label>
                        <input type="date" id="contract-end-date" value="${this.escapeAttribute(this.formatDateInput(contract ? contract.endDate : ''))}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Tiền thuê / tháng *</label>
                        <input type="number" min="0" step="0.01" id="contract-monthly-rent" required value="${contract ? Number(contract.monthlyRent || 0) : ''}">
                    </div>
                    <div class="form-group">
                        <label>Tiền cọc</label>
                        <input type="number" min="0" step="0.01" id="contract-deposit-amount" value="${contract ? Number(contract.depositAmount || 0) : 0}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Giá điện / số</label>
                        <input type="number" min="0" step="0.01" id="contract-electricity-price" value="${contract ? Number(contract.electricityPrice || 0) : 0}">
                    </div>
                    <div class="form-group">
                        <label>Giá nước / khối</label>
                        <input type="number" min="0" step="0.01" id="contract-water-price" value="${contract ? Number(contract.waterPrice || 0) : 0}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Phí dịch vụ</label>
                        <input type="number" min="0" step="0.01" id="contract-service-fee" value="${contract ? Number(contract.serviceFee || 0) : 0}">
                    </div>
                    <div class="form-group">
                        <label>Ngày đến hạn thanh toán</label>
                        <input type="number" min="1" max="31" id="contract-payment-due-day" value="${contract ? Number(contract.paymentDueDay || 5) : 5}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Ngày ký</label>
                        <input type="datetime-local" id="contract-signed-at" value="${this.escapeAttribute(this.formatDateTimeInput(contract ? contract.signedAt : ''))}">
                    </div>
                    <div class="form-group full-width">
                        <label>Ghi chú</label>
                        <textarea id="contract-note" rows="3" placeholder="Điều khoản riêng, ghi chú bàn giao, quy định thanh toán...">${this.escapeHtml(contract ? contract.note || '' : '')}</textarea>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('contract-form-area').innerHTML=''">Hủy</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${contract ? 'Cập Nhật Hợp Đồng' : 'Lưu Hợp Đồng'}
                    </button>
                </div>
            </form>
        `;

        area.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    async submitContract(event, contractId = null) {
        event.preventDefault();

        const payload = {
            contractCode: document.getElementById('contract-code').value.trim(),
            roomId: document.getElementById('contract-room-id').value,
            tenantId: document.getElementById('contract-tenant-id').value,
            startDate: document.getElementById('contract-start-date').value,
            endDate: document.getElementById('contract-end-date').value,
            monthlyRent: document.getElementById('contract-monthly-rent').value,
            depositAmount: document.getElementById('contract-deposit-amount').value,
            electricityPrice: document.getElementById('contract-electricity-price').value,
            waterPrice: document.getElementById('contract-water-price').value,
            serviceFee: document.getElementById('contract-service-fee').value,
            paymentDueDay: document.getElementById('contract-payment-due-day').value,
            status: document.getElementById('contract-status').value,
            signedAt: document.getElementById('contract-signed-at').value,
            note: document.getElementById('contract-note').value.trim()
        };

        const submitButton = event.target.querySelector('[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

        try {
            const res = await fetch(`${API_URL}/contracts${contractId ? `/${contractId}` : ''}`, {
                method: contractId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.getToken()}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Không thể lưu hợp đồng');
            }

            showToast(contractId ? 'Cập nhật hợp đồng thành công' : 'Tạo hợp đồng thành công', 'success');
            await this.showContracts();
        } catch (error) {
            showToast(error.message || 'Có lỗi xảy ra khi lưu hợp đồng', 'error');
            submitButton.disabled = false;
            submitButton.innerHTML = `<i class="fas fa-save"></i> ${contractId ? 'Cập Nhật Hợp Đồng' : 'Lưu Hợp Đồng'}`;
        }
    },

    async deleteContract(contractId) {
        if (!confirm('Xóa hợp đồng này sẽ xóa luôn các khoản thanh toán liên quan. Tiếp tục?')) return;

        try {
            const res = await fetch(`${API_URL}/contracts/${contractId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Không thể xóa hợp đồng');

            showToast('Đã xóa hợp đồng', 'success');
            await this.showContracts();
        } catch (error) {
            showToast(error.message || 'Có lỗi xảy ra khi xóa hợp đồng', 'error');
        }
    },

    renderPaymentTable() {
        return `
            <div class="table-container finance-table-shell">
                <table>
                    <thead>
                        <tr>
                            <th>Thanh toán</th>
                            <th>Hợp đồng</th>
                            <th>Người thuê</th>
                            <th>Kỳ thu</th>
                            <th>Số tiền</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.payments.map(payment => {
                            const status = this.getPaymentStatusMeta(payment.status);
                            return `
                                <tr>
                                    <td>
                                        <div class="finance-title">${this.escapeHtml(payment.paymentCode || `TT-${payment.id}`)}</div>
                                        <div class="finance-subtitle">Hạn: ${this.formatDate(payment.dueDate)}</div>
                                        <div class="finance-subtitle">Đã thu: ${this.formatCurrency(payment.paidAmount)}</div>
                                    </td>
                                    <td>
                                        <div class="finance-title">${this.escapeHtml(payment.contract ? payment.contract.contractCode : `HĐ #${payment.contractId}`)}</div>
                                        <div class="finance-subtitle">${this.escapeHtml(payment.room ? payment.room.title : `Phòng #${payment.roomId}`)}</div>
                                    </td>
                                    <td>
                                        <div class="finance-title">${this.escapeHtml(payment.tenant ? payment.tenant.username : `Khách #${payment.tenantId}`)}</div>
                                        <div class="finance-subtitle">${this.escapeHtml(this.getPaymentMethodLabel(payment.paymentMethod))}</div>
                                        ${payment.bankAccountNumber ? `<div class="finance-subtitle">STK: ${this.escapeHtml(payment.bankAccountNumber)}</div>` : ''}
                                    </td>
                                    <td>
                                        <div class="finance-title">${this.escapeHtml(payment.billingPeriod)}</div>
                                        <div class="finance-subtitle">Loại: ${this.escapeHtml(this.getPaymentTypeLabel(payment.paymentType))}</div>
                                    </td>
                                    <td>
                                        <div class="finance-title">${this.formatCurrency(payment.totalAmount)}</div>
                                        <div class="finance-subtitle">Phải thu còn lại: ${this.formatCurrency(Number(payment.totalAmount || 0) - Number(payment.paidAmount || 0))}</div>
                                    </td>
                                    <td>
                                        <span class="status-badge ${status.className}">
                                            <i class="fas ${status.icon}"></i> ${status.label}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="finance-actions-row">
                                            <button class="btn-icon btn-edit" onclick="landlord.showPaymentForm(${payment.id})">
                                                <i class="fas fa-edit"></i> Sửa
                                            </button>
                                            <button class="btn-icon btn-del" onclick="landlord.deletePayment(${payment.id})">
                                                <i class="fas fa-trash"></i> Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async showPayments() {
        this.setActiveLink('link-payments');
        const panel = document.getElementById('landlord-panel');
        panel.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải thanh toán...</div>`;

        try {
            await Promise.all([this.loadContracts(), this.loadPayments()]);

            const pendingCount = this.payments.filter(item => ['pending', 'partial', 'overdue'].includes(item.status)).length;
            const paidCount = this.payments.filter(item => item.status === 'paid').length;
            const totalRevenue = this.payments.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
            const collectedRevenue = this.payments.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);

            panel.innerHTML = `
                <div class="panel-header">
                    <h2><i class="fas fa-file-invoice-dollar"></i> Quản Lý Thanh Toán</h2>
                    <button class="btn btn-primary" onclick="landlord.showPaymentForm()" ${this.contracts.length === 0 ? 'disabled' : ''}>
                        <i class="fas fa-plus"></i> Tạo Kỳ Thanh Toán
                    </button>
                </div>
                ${this.renderFinanceStats([
                    { label: 'Tổng phiếu thu', value: String(this.payments.length), icon: 'fa-receipt', tone: 'tone-blue' },
                    { label: 'Chưa hoàn tất', value: String(pendingCount), icon: 'fa-hourglass-half', tone: 'tone-amber' },
                    { label: 'Đã thanh toán', value: String(paidCount), icon: 'fa-money-check-dollar', tone: 'tone-green' },
                    { label: 'Đã thu', value: this.formatCurrency(collectedRevenue), icon: 'fa-wallet', tone: 'tone-slate' }
                ])}
                <div class="finance-banner info"><i class="fas fa-sack-dollar"></i> Tổng giá trị phải thu hiện có: <strong>${this.formatCurrency(totalRevenue)}</strong></div>
                ${this.contracts.length === 0
                    ? `<div class="finance-banner warning"><i class="fas fa-circle-info"></i> Bạn cần tạo ít nhất một hợp đồng trước khi lập khoản thanh toán.</div>`
                    : ''}
                <div id="payment-form-area"></div>
                ${this.payments.length === 0
                    ? `
                        <div class="empty-state finance-empty-state">
                            <i class="fas fa-file-invoice-dollar fa-3x"></i>
                            <h3>Chưa có kỳ thanh toán nào</h3>
                            <p>Tạo phiếu thu theo từng tháng hoặc khoản cọc để theo dõi công nợ và dòng tiền.</p>
                            <button class="btn btn-primary" onclick="landlord.showPaymentForm()" ${this.contracts.length === 0 ? 'disabled' : ''}>
                                <i class="fas fa-plus"></i> Tạo Kỳ Thanh Toán
                            </button>
                        </div>
                    `
                    : this.renderPaymentTable()}
            `;
        } catch (error) {
            panel.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Lỗi tải thanh toán</h3><p>${this.escapeHtml(error.message)}</p></div>`;
        }
    },

    getSelectedPaymentContract() {
        const contractId = Number(document.getElementById('pay-contract-id')?.value || 0);
        return this.contracts.find(item => Number(item.id) === contractId) || null;
    },

    getLatestPaymentForContract(contractId, excludePaymentId = null) {
        return this.payments.find(item => Number(item.contractId) === Number(contractId) && Number(item.id) !== Number(excludePaymentId || 0)) || null;
    },

    syncPaymentMeterDefaults(force = false) {
        const mode = document.getElementById('pay-form-mode')?.value;
        const selectedContract = this.getSelectedPaymentContract();
        const lastContractField = document.getElementById('pay-last-contract-id');

        if (!selectedContract || mode === 'edit') {
            if (lastContractField) lastContractField.value = selectedContract ? String(selectedContract.id) : '';
            return;
        }

        const selectedContractId = String(selectedContract.id);
        const contractChanged = lastContractField && lastContractField.value !== selectedContractId;
        if (!force && !contractChanged) return;

        const latestPayment = this.getLatestPaymentForContract(selectedContract.id);
        const electricityReading = latestPayment ? this.toNumericValue(latestPayment.electricityCurrentReading) : 0;
        const waterReading = latestPayment ? this.toNumericValue(latestPayment.waterCurrentReading) : 0;

        const electricPrevious = document.getElementById('pay-electricity-previous-reading');
        const electricCurrent = document.getElementById('pay-electricity-current-reading');
        const waterPrevious = document.getElementById('pay-water-previous-reading');
        const waterCurrent = document.getElementById('pay-water-current-reading');

        if (electricPrevious) electricPrevious.value = electricityReading;
        if (electricCurrent) electricCurrent.value = electricityReading;
        if (waterPrevious) waterPrevious.value = waterReading;
        if (waterCurrent) waterCurrent.value = waterReading;

        if (lastContractField) lastContractField.value = selectedContractId;
    },

    buildPaymentCalculation(contract, overrides = {}) {
        const paymentType = overrides.paymentType || 'monthly_rent';
        const additionalCharge = Math.max(this.toNumericValue(overrides.additionalCharge), 0);
        const discountAmount = Math.max(this.toNumericValue(overrides.discountAmount), 0);

        if (!contract) {
            return {
                paymentType,
                roomCharge: 0,
                electricityCharge: 0,
                waterCharge: 0,
                serviceCharge: 0,
                totalAmount: Math.max(additionalCharge - discountAmount, 0),
                detailLines: [],
                errors: []
            };
        }

        const snapshot = {
            monthlyRent: Math.max(this.toNumericValue(contract.monthlyRent), 0),
            depositAmount: Math.max(this.toNumericValue(contract.depositAmount), 0),
            electricityPrice: Math.max(this.toNumericValue(contract.electricityPrice), 0),
            waterPrice: Math.max(this.toNumericValue(contract.waterPrice), 0),
            serviceFee: Math.max(this.toNumericValue(contract.serviceFee), 0)
        };

        let roomCharge = 0;
        let electricityCharge = 0;
        let waterCharge = 0;
        let serviceCharge = 0;
        let electricityPreviousReading = null;
        let electricityCurrentReading = null;
        let electricityUsage = 0;
        let waterPreviousReading = null;
        let waterCurrentReading = null;
        let waterUsage = 0;
        const detailLines = [];
        const errors = [];

        if (paymentType === 'deposit') {
            roomCharge = snapshot.depositAmount;
            detailLines.push({
                label: 'Tiền cọc',
                value: roomCharge,
                note: 'Lấy trực tiếp từ hợp đồng đang chọn.'
            });
        } else if (paymentType === 'service') {
            serviceCharge = snapshot.serviceFee;
            detailLines.push({
                label: 'Phí dịch vụ',
                value: serviceCharge,
                note: 'Phí cố định theo hợp đồng.'
            });
        } else if (paymentType === 'monthly_rent') {
            roomCharge = snapshot.monthlyRent;
            serviceCharge = snapshot.serviceFee;

            electricityPreviousReading = Math.max(this.toNumericValue(overrides.electricityPreviousReading), 0);
            electricityCurrentReading = Math.max(this.toNumericValue(overrides.electricityCurrentReading), 0);
            waterPreviousReading = Math.max(this.toNumericValue(overrides.waterPreviousReading), 0);
            waterCurrentReading = Math.max(this.toNumericValue(overrides.waterCurrentReading), 0);

            if (electricityCurrentReading < electricityPreviousReading) {
                errors.push('Chỉ số điện mới phải lớn hơn hoặc bằng chỉ số cũ');
            }

            if (waterCurrentReading < waterPreviousReading) {
                errors.push('Chỉ số nước mới phải lớn hơn hoặc bằng chỉ số cũ');
            }

            electricityUsage = Math.max(electricityCurrentReading - electricityPreviousReading, 0);
            waterUsage = Math.max(waterCurrentReading - waterPreviousReading, 0);
            electricityCharge = electricityUsage * snapshot.electricityPrice;
            waterCharge = waterUsage * snapshot.waterPrice;

            detailLines.push({
                label: 'Tiền phòng',
                value: roomCharge,
                note: 'Tiền thuê tháng theo hợp đồng.'
            });
            detailLines.push({
                label: 'Tiền điện',
                value: electricityCharge,
                note: `${this.formatMeasurement(electricityPreviousReading)} -> ${this.formatMeasurement(electricityCurrentReading)} (${this.formatMeasurement(electricityUsage)} số x ${this.formatCurrency(snapshot.electricityPrice)})`
            });
            detailLines.push({
                label: 'Tiền nước',
                value: waterCharge,
                note: `${this.formatMeasurement(waterPreviousReading)} -> ${this.formatMeasurement(waterCurrentReading)} (${this.formatMeasurement(waterUsage)} khối x ${this.formatCurrency(snapshot.waterPrice)})`
            });

            if (serviceCharge > 0) {
                detailLines.push({
                    label: 'Phí dịch vụ',
                    value: serviceCharge,
                    note: 'Phí cố định theo hợp đồng.'
                });
            }
        }

        if (additionalCharge > 0) {
            detailLines.push({
                label: paymentType === 'other' ? 'Khoản khác' : 'Phụ thu',
                value: additionalCharge,
                note: 'Khoản cộng thêm ngoài công thức cơ bản.'
            });
        }

        if (discountAmount > 0) {
            detailLines.push({
                label: 'Giảm trừ',
                value: -discountAmount,
                note: 'Khoản giảm cho kỳ thanh toán này.'
            });
        }

        const totalAmount = Math.max(roomCharge + electricityCharge + waterCharge + serviceCharge + additionalCharge - discountAmount, 0);

        return {
            paymentType,
            roomCharge,
            electricityCharge,
            waterCharge,
            serviceCharge,
            additionalCharge,
            discountAmount,
            totalAmount,
            electricityPreviousReading,
            electricityCurrentReading,
            electricityUsage,
            waterPreviousReading,
            waterCurrentReading,
            waterUsage,
            snapshot,
            detailLines,
            errors
        };
    },

    showPaymentForm(paymentId = null) {
        const area = document.getElementById('payment-form-area');
        if (!area) return;

        if (!this.contracts.length) {
            showToast('Cần có hợp đồng trước khi tạo thanh toán', 'error');
            return;
        }

        const payment = paymentId ? this.payments.find(item => item.id === paymentId) : null;
        const contractId = payment ? payment.contractId : this.contracts[0].id;
        const latestPayment = !payment ? this.getLatestPaymentForContract(contractId) : null;
        const electricityPreviousReading = payment
            ? this.toNumericValue(payment.electricityPreviousReading)
            : latestPayment
                ? this.toNumericValue(latestPayment.electricityCurrentReading)
                : 0;
        const electricityCurrentReading = payment
            ? this.toNumericValue(payment.electricityCurrentReading)
            : electricityPreviousReading;
        const waterPreviousReading = payment
            ? this.toNumericValue(payment.waterPreviousReading)
            : latestPayment
                ? this.toNumericValue(latestPayment.waterCurrentReading)
                : 0;
        const waterCurrentReading = payment
            ? this.toNumericValue(payment.waterCurrentReading)
            : waterPreviousReading;

        area.innerHTML = `
            <form class="room-form finance-form" onsubmit="landlord.submitPayment(event${payment ? `, ${payment.id}` : ''})">
                <input type="hidden" id="pay-form-mode" value="${payment ? 'edit' : 'create'}">
                <input type="hidden" id="pay-last-contract-id" value="${this.escapeAttribute(String(contractId))}">
                <div class="finance-form-header">
                    <h3><i class="fas ${payment ? 'fa-pen' : 'fa-plus-circle'}"></i> ${payment ? 'Cập Nhật Thanh Toán' : 'Tạo Kỳ Thanh Toán'}</h3>
                    <button type="button" class="finance-close-btn" onclick="document.getElementById('payment-form-area').innerHTML=''">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Mã thanh toán</label>
                        <input type="text" id="pay-code" value="${this.escapeAttribute(payment ? payment.paymentCode : '')}" placeholder="Tự sinh nếu để trống">
                    </div>
                    <div class="form-group">
                        <label>Hợp đồng *</label>
                        <select id="pay-contract-id" required onchange="landlord.syncPaymentMeterDefaults(); landlord.updatePaymentContractPreview()">
                            ${this.contracts.map(contract => `
                                <option value="${contract.id}" ${Number(contractId) === Number(contract.id) ? 'selected' : ''}>
                                    ${this.escapeHtml(contract.contractCode || `HD-${contract.id}`)} - ${this.escapeHtml(contract.room ? contract.room.title : `Phòng #${contract.roomId}`)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div id="payment-contract-preview" class="finance-preview-card"></div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Kỳ thanh toán *</label>
                        <input type="text" id="pay-billing-period" required value="${this.escapeAttribute(payment ? payment.billingPeriod : '')}" placeholder="VD: 04/2026 hoặc Cọc ban đầu">
                    </div>
                    <div class="form-group">
                        <label>Loại thanh toán</label>
                        <select id="pay-type" onchange="landlord.updatePaymentAmountPreview()">
                            <option value="deposit" ${payment && payment.paymentType === 'deposit' ? 'selected' : ''}>Tiền cọc</option>
                            <option value="monthly_rent" ${!payment || payment.paymentType === 'monthly_rent' ? 'selected' : ''}>Tiền phòng tháng</option>
                            <option value="service" ${payment && payment.paymentType === 'service' ? 'selected' : ''}>Phí dịch vụ</option>
                            <option value="other" ${payment && payment.paymentType === 'other' ? 'selected' : ''}>Khác</option>
                        </select>
                    </div>
                </div>
                <div id="payment-meter-section" class="finance-meter-section">
                    <div class="finance-meter-section-head">
                        <div>
                            <h4><i class="fas fa-gauge-high"></i> Chỉ số điện nước</h4>
                            <p>Chỉ cần nhập chỉ số cũ và mới, hệ thống sẽ tự nhân theo đơn giá trong hợp đồng.</p>
                        </div>
                    </div>
                    <div class="form-row finance-meter-grid">
                        <div class="form-group">
                            <label>Điện cũ</label>
                            <input type="number" min="0" step="0.01" id="pay-electricity-previous-reading" value="${electricityPreviousReading}" oninput="landlord.updatePaymentAmountPreview()">
                        </div>
                        <div class="form-group">
                            <label>Điện mới</label>
                            <input type="number" min="0" step="0.01" id="pay-electricity-current-reading" value="${electricityCurrentReading}" oninput="landlord.updatePaymentAmountPreview()">
                        </div>
                        <div class="form-group">
                            <label>Nước cũ</label>
                            <input type="number" min="0" step="0.01" id="pay-water-previous-reading" value="${waterPreviousReading}" oninput="landlord.updatePaymentAmountPreview()">
                        </div>
                        <div class="form-group">
                            <label>Nước mới</label>
                            <input type="number" min="0" step="0.01" id="pay-water-current-reading" value="${waterCurrentReading}" oninput="landlord.updatePaymentAmountPreview()">
                        </div>
                    </div>
                </div>
                <div class="form-row finance-charge-grid">
                    <div class="form-group">
                        <label>Tiền phòng / cọc</label>
                        <input type="number" min="0" step="0.01" id="pay-room-charge" value="${payment ? Number(payment.roomCharge || 0) : 0}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Tiền điện</label>
                        <input type="number" min="0" step="0.01" id="pay-electricity-charge" value="${payment ? Number(payment.electricityCharge || 0) : 0}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Tiền nước</label>
                        <input type="number" min="0" step="0.01" id="pay-water-charge" value="${payment ? Number(payment.waterCharge || 0) : 0}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Phí dịch vụ</label>
                        <input type="number" min="0" step="0.01" id="pay-service-charge" value="${payment ? Number(payment.serviceCharge || 0) : 0}" readonly>
                    </div>
                </div>
                <div class="form-row finance-amount-grid">
                    <div class="form-group">
                        <label>Phụ thu khác</label>
                        <input type="number" min="0" step="0.01" id="pay-additional-charge" value="${payment ? Number(payment.additionalCharge || 0) : 0}" oninput="landlord.updatePaymentAmountPreview()">
                    </div>
                    <div class="form-group">
                        <label>Giảm trừ</label>
                        <input type="number" min="0" step="0.01" id="pay-discount-amount" value="${payment ? Number(payment.discountAmount || 0) : 0}" oninput="landlord.updatePaymentAmountPreview()">
                    </div>
                </div>
                <div id="payment-calculation-warning" class="finance-banner warning" style="display:none"></div>
                <div id="payment-calculation-breakdown" class="finance-preview-card finance-breakdown-card"></div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Tổng phải thu</label>
                        <input type="number" min="0" step="0.01" id="pay-total-amount" value="${payment ? Number(payment.totalAmount || 0) : 0}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Đã thu</label>
                        <input type="number" min="0" step="0.01" id="pay-paid-amount" value="${payment ? Number(payment.paidAmount || 0) : 0}">
                    </div>
                </div>
                <div class="finance-total-preview">Tổng dự kiến: <strong id="payment-total-preview">0 VNĐ</strong></div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Hạn thanh toán *</label>
                        <input type="date" id="pay-due-date" required value="${this.escapeAttribute(this.formatDateInput(payment ? payment.dueDate : ''))}">
                    </div>
                    <div class="form-group">
                        <label>Ngày thu thực tế</label>
                        <input type="datetime-local" id="pay-paid-date" value="${this.escapeAttribute(this.formatDateTimeInput(payment ? payment.paidDate : ''))}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Phương thức</label>
                        <select id="pay-method" onchange="landlord.togglePaymentBankingFields()">
                            <option value="cash" ${!payment || payment.paymentMethod === 'cash' ? 'selected' : ''}>Tiền mặt</option>
                            <option value="bank_transfer" ${payment && payment.paymentMethod === 'bank_transfer' ? 'selected' : ''}>Chuyển khoản</option>
                            <option value="qr_transfer" ${payment && payment.paymentMethod === 'qr_transfer' ? 'selected' : ''}>Quét QR</option>
                            <option value="other" ${payment && payment.paymentMethod === 'other' ? 'selected' : ''}>Khác</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Trạng thái</label>
                        <select id="pay-status">
                            <option value="pending" ${!payment || payment.status === 'pending' ? 'selected' : ''}>Chờ thanh toán</option>
                            <option value="partial" ${payment && payment.status === 'partial' ? 'selected' : ''}>Thanh toán một phần</option>
                            <option value="paid" ${payment && payment.status === 'paid' ? 'selected' : ''}>Đã thanh toán</option>
                            <option value="overdue" ${payment && payment.status === 'overdue' ? 'selected' : ''}>Quá hạn</option>
                            <option value="cancelled" ${payment && payment.status === 'cancelled' ? 'selected' : ''}>Đã hủy</option>
                        </select>
                    </div>
                </div>
                <div id="payment-transfer-section" class="finance-transfer-section">
                    <div class="finance-transfer-banner">
                        <i class="fas fa-building-columns"></i>
                        <span id="payment-transfer-hint">Khi người thuê mở thông báo thanh toán, hệ thống sẽ hiển thị STK và mã QR này.</span>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Tên ngân hàng</label>
                            <input type="text" id="pay-bank-name" value="${this.escapeAttribute(payment ? payment.bankName || '' : '')}" placeholder="VD: Vietcombank">
                        </div>
                        <div class="form-group">
                            <label>Tên chủ tài khoản</label>
                            <input type="text" id="pay-bank-account-holder" value="${this.escapeAttribute(payment ? payment.bankAccountHolder || '' : '')}" placeholder="VD: NGUYEN VAN A">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Số tài khoản</label>
                            <input type="text" id="pay-bank-account-number" value="${this.escapeAttribute(payment ? payment.bankAccountNumber || '' : '')}" placeholder="Nhập số tài khoản nhận tiền của chủ trọ">
                            <small class="finance-field-tip">Bắt buộc khi chọn chuyển khoản hoặc quét QR.</small>
                        </div>
                        <div class="form-group">
                            <label>Mã QR nhận tiền</label>
                            <input type="file" id="pay-bank-qr-image" accept="image/*" data-has-existing="${payment && payment.bankQrImage ? 'true' : 'false'}">
                            <small class="finance-field-tip">Tải ảnh QR của chủ trọ để người thuê có thể quét chuyển khoản.</small>
                        </div>
                    </div>
                    ${payment && payment.bankQrImage ? `
                        <div class="finance-current-qr">
                            <div class="finance-current-qr-head">
                                <strong>Mã QR hiện tại</strong>
                                <label class="finance-checkbox-line">
                                    <input type="checkbox" id="pay-remove-bank-qr" onchange="landlord.togglePaymentBankingFields()">
                                    Xóa mã QR hiện tại
                                </label>
                            </div>
                            <img src="${this.escapeAttribute(payment.bankQrImage)}" alt="Mã QR nhận tiền hiện tại">
                        </div>
                    ` : ''}
                </div>
                <div class="form-group full-width">
                    <label>Ghi chú</label>
                    <textarea id="pay-note" rows="3" placeholder="Nội dung phiếu thu, ghi chú công nợ, điều chỉnh...">${this.escapeHtml(payment ? payment.note || '' : '')}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('payment-form-area').innerHTML=''">Hủy</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${payment ? 'Cập Nhật Thanh Toán' : 'Lưu Thanh Toán'}
                    </button>
                </div>
            </form>
        `;

        if (!payment) {
            this.syncPaymentMeterDefaults(true);
        }
        this.updatePaymentContractPreview();
        this.updatePaymentAmountPreview();
        this.togglePaymentBankingFields();
        area.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    togglePaymentBankingFields() {
        const methodInput = document.getElementById('pay-method');
        const section = document.getElementById('payment-transfer-section');
        const hint = document.getElementById('payment-transfer-hint');

        if (!methodInput || !section) return;

        const isTransfer = this.isTransferPaymentMethod(methodInput.value);
        section.style.display = isTransfer ? 'block' : 'none';

        if (hint) {
            hint.textContent = methodInput.value === 'qr_transfer'
                ? 'Người thuê sẽ thấy STK và mã QR để quét thanh toán nhanh.'
                : 'Người thuê sẽ thấy STK và mã QR này trong thông báo chi phí.';
        }
    },

    updatePaymentContractPreview() {
        const preview = document.getElementById('payment-contract-preview');
        if (!preview) return;

        const contract = this.getSelectedPaymentContract();

        if (!contract) {
            preview.innerHTML = '<p>Chọn hợp đồng để xem thông tin phòng và người thuê.</p>';
            return;
        }

        preview.innerHTML = `
            <div class="finance-preview-grid">
                <div>
                    <span class="finance-preview-label">Phòng</span>
                    <strong>${this.escapeHtml(contract.room ? contract.room.title : `Phòng #${contract.roomId}`)}</strong>
                    <small>${this.escapeHtml(contract.room ? contract.room.address : '')}</small>
                </div>
                <div>
                    <span class="finance-preview-label">Người thuê</span>
                    <strong>${this.escapeHtml(contract.tenant ? contract.tenant.username : `Khách #${contract.tenantId}`)}</strong>
                    <small>${this.escapeHtml(contract.tenant ? contract.tenant.email : '')}</small>
                </div>
                <div>
                    <span class="finance-preview-label">Tiền thuê / tháng</span>
                    <strong>${this.formatCurrency(contract.monthlyRent)}</strong>
                    <small>Hạn thu ngày ${contract.paymentDueDay || 5}</small>
                </div>
                <div>
                    <span class="finance-preview-label">Chi phí cố định</span>
                    <strong>Điện ${this.formatCurrency(contract.electricityPrice)} / số</strong>
                    <small>Nước ${this.formatCurrency(contract.waterPrice)} / khối • DV ${this.formatCurrency(contract.serviceFee)}</small>
                </div>
                <div>
                    <span class="finance-preview-label">Tiền cọc</span>
                    <strong>${this.formatCurrency(contract.depositAmount)}</strong>
                    <small>Hệ thống sẽ tự lấy theo loại phiếu bạn chọn.</small>
                </div>
            </div>
        `;

        this.updatePaymentAmountPreview();
    },

    updatePaymentAmountPreview() {
        const contract = this.getSelectedPaymentContract();
        const paymentType = document.getElementById('pay-type')?.value || 'monthly_rent';
        const calculation = this.buildPaymentCalculation(contract, {
            paymentType,
            additionalCharge: document.getElementById('pay-additional-charge')?.value,
            discountAmount: document.getElementById('pay-discount-amount')?.value,
            electricityPreviousReading: document.getElementById('pay-electricity-previous-reading')?.value,
            electricityCurrentReading: document.getElementById('pay-electricity-current-reading')?.value,
            waterPreviousReading: document.getElementById('pay-water-previous-reading')?.value,
            waterCurrentReading: document.getElementById('pay-water-current-reading')?.value
        });

        const meterSection = document.getElementById('payment-meter-section');
        const warning = document.getElementById('payment-calculation-warning');
        const breakdown = document.getElementById('payment-calculation-breakdown');

        if (meterSection) {
            meterSection.style.display = paymentType === 'monthly_rent' ? 'block' : 'none';
        }

        if (warning) {
            if (calculation.errors.length > 0) {
                warning.style.display = 'flex';
                warning.innerHTML = `<i class="fas fa-triangle-exclamation"></i> ${this.escapeHtml(calculation.errors[0])}`;
            } else {
                warning.style.display = 'none';
                warning.innerHTML = '';
            }
        }

        if (breakdown) {
            breakdown.innerHTML = calculation.detailLines.length === 0
                ? '<p>Phiếu này chỉ tính theo phụ thu và giảm trừ bạn nhập thêm.</p>'
                : `
                    <div class="finance-breakdown-list">
                        ${calculation.detailLines.map(item => `
                            <div class="finance-breakdown-item ${item.value < 0 ? 'is-negative' : ''}">
                                <div>
                                    <strong>${this.escapeHtml(item.label)}</strong>
                                    <small>${this.escapeHtml(item.note)}</small>
                                </div>
                                <span>${item.value < 0 ? '-' : ''}${this.formatCurrency(Math.abs(item.value))}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
        }

        const roomChargeInput = document.getElementById('pay-room-charge');
        const electricityChargeInput = document.getElementById('pay-electricity-charge');
        const waterChargeInput = document.getElementById('pay-water-charge');
        const serviceChargeInput = document.getElementById('pay-service-charge');

        const totalInput = document.getElementById('pay-total-amount');
        const totalPreview = document.getElementById('payment-total-preview');

        if (roomChargeInput) roomChargeInput.value = calculation.roomCharge.toFixed(2);
        if (electricityChargeInput) electricityChargeInput.value = calculation.electricityCharge.toFixed(2);
        if (waterChargeInput) waterChargeInput.value = calculation.waterCharge.toFixed(2);
        if (serviceChargeInput) serviceChargeInput.value = calculation.serviceCharge.toFixed(2);
        if (totalInput) totalInput.value = calculation.totalAmount.toFixed(2);
        if (totalPreview) totalPreview.textContent = this.formatCurrency(calculation.totalAmount);
    },

    async submitPayment(event, paymentId = null) {
        event.preventDefault();
        this.updatePaymentAmountPreview();

        const contract = this.getSelectedPaymentContract();
        const paymentType = document.getElementById('pay-type').value;
        const calculation = this.buildPaymentCalculation(contract, {
            paymentType,
            additionalCharge: document.getElementById('pay-additional-charge').value,
            discountAmount: document.getElementById('pay-discount-amount').value,
            electricityPreviousReading: document.getElementById('pay-electricity-previous-reading')?.value,
            electricityCurrentReading: document.getElementById('pay-electricity-current-reading')?.value,
            waterPreviousReading: document.getElementById('pay-water-previous-reading')?.value,
            waterCurrentReading: document.getElementById('pay-water-current-reading')?.value
        });

        if (calculation.errors.length > 0) {
            showToast(calculation.errors[0], 'error');
            return;
        }

        const paymentMethod = document.getElementById('pay-method').value;
        const bankAccountNumber = document.getElementById('pay-bank-account-number').value.trim();
        const bankQrInput = document.getElementById('pay-bank-qr-image');
        const removeBankQrCheckbox = document.getElementById('pay-remove-bank-qr');
        const hasExistingBankQr = bankQrInput?.dataset.hasExisting === 'true' && !removeBankQrCheckbox?.checked;
        const hasNewBankQr = Boolean(bankQrInput?.files?.length);

        if (this.isTransferPaymentMethod(paymentMethod)) {
            if (!bankAccountNumber) {
                showToast('Vui lòng nhập số tài khoản của chủ trọ', 'error');
                return;
            }

            if (!hasExistingBankQr && !hasNewBankQr) {
                showToast('Vui lòng tải mã QR nhận tiền của chủ trọ', 'error');
                return;
            }
        }

        const payload = {
            paymentCode: document.getElementById('pay-code').value.trim(),
            contractId: document.getElementById('pay-contract-id').value,
            billingPeriod: document.getElementById('pay-billing-period').value.trim(),
            paymentType,
            roomCharge: document.getElementById('pay-room-charge').value,
            electricityCharge: document.getElementById('pay-electricity-charge').value,
            waterCharge: document.getElementById('pay-water-charge').value,
            serviceCharge: document.getElementById('pay-service-charge').value,
            electricityPreviousReading: document.getElementById('pay-electricity-previous-reading')?.value || '',
            electricityCurrentReading: document.getElementById('pay-electricity-current-reading')?.value || '',
            waterPreviousReading: document.getElementById('pay-water-previous-reading')?.value || '',
            waterCurrentReading: document.getElementById('pay-water-current-reading')?.value || '',
            additionalCharge: document.getElementById('pay-additional-charge').value,
            discountAmount: document.getElementById('pay-discount-amount').value,
            totalAmount: document.getElementById('pay-total-amount').value,
            paidAmount: document.getElementById('pay-paid-amount').value,
            dueDate: document.getElementById('pay-due-date').value,
            paidDate: document.getElementById('pay-paid-date').value,
            paymentMethod,
            bankName: document.getElementById('pay-bank-name').value.trim(),
            bankAccountHolder: document.getElementById('pay-bank-account-holder').value.trim(),
            bankAccountNumber,
            removeBankQrImage: removeBankQrCheckbox?.checked ? 'true' : 'false',
            status: document.getElementById('pay-status').value,
            note: document.getElementById('pay-note').value.trim()
        };

        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
            formData.append(key, value ?? '');
        });

        if (hasNewBankQr) {
            formData.append('bankQrImage', bankQrInput.files[0]);
        }

        const submitButton = event.target.querySelector('[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

        try {
            const res = await fetch(`${API_URL}/payments${paymentId ? `/${paymentId}` : ''}`, {
                method: paymentId ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${auth.getToken()}`
                },
                body: formData
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Không thể lưu thanh toán');

            const successMessage = paymentId
                ? 'Cập nhật thanh toán thành công'
                : data.notificationSent
                    ? 'Tạo thanh toán thành công và đã gửi chi phí cho người thuê'
                    : 'Tạo thanh toán thành công';

            showToast(successMessage, 'success');
            await this.showPayments();
        } catch (error) {
            showToast(error.message || 'Có lỗi xảy ra khi lưu thanh toán', 'error');
            submitButton.disabled = false;
            submitButton.innerHTML = `<i class="fas fa-save"></i> ${paymentId ? 'Cập Nhật Thanh Toán' : 'Lưu Thanh Toán'}`;
        }
    },

    async deletePayment(paymentId) {
        if (!confirm('Bạn có chắc muốn xóa khoản thanh toán này?')) return;

        try {
            const res = await fetch(`${API_URL}/payments/${paymentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Không thể xóa thanh toán');

            showToast('Đã xóa thanh toán', 'success');
            await this.showPayments();
        } catch (error) {
            showToast(error.message || 'Có lỗi xảy ra khi xóa thanh toán', 'error');
        }
    }
});