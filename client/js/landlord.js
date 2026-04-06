const landlord = {
    rooms: [],
    categories: [],
    contracts: [],
    payments: [],
    roomFilters: {
        status: 'all',
        categoryId: 'all',
        search: ''
    },
    contractLookups: {
        rooms: [],
        tenants: []
    },

    async init() {
        await this.loadCategories();
        this.renderDashboard();
    },

    async loadCategories() {
        try {
            const res = await fetch(`${API_URL}/categories`);
            const data = await res.json();
            if (data.success) this.categories = data.data;
        } catch (err) {
            console.error('Lỗi tải danh mục:', err);
        }
    },

    renderDashboard() {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="landlord-shell">
                <section class="landlord-dashboard-board">
                    <div class="landlord-header-row">
                        <div class="landlord-header-copy">
                            <h1>Quản Lý Nhà Trọ</h1>
                        </div>
                        <div class="landlord-top-actions">
                            <button type="button" class="btn btn-primary" onclick="landlord.showAddRoom()">
                                <i class="fas fa-plus"></i> Thêm Phòng
                            </button>
                            <button type="button" class="landlord-top-secondary" onclick="landlord.showPayments()">
                                <i class="fas fa-file-invoice-dollar"></i> Xem Thanh Toán
                            </button>
                        </div>
                    </div>

                    <div class="landlord-nav-strip">
                        <button type="button" class="landlord-nav-link active" id="link-rooms" onclick="landlord.showRooms()">
                            <i class="fas fa-door-open"></i> Danh Sách Phòng
                        </button>
                        <button type="button" class="landlord-nav-link" id="link-add" onclick="landlord.showAddRoom()">
                            <i class="fas fa-plus-circle"></i> Thêm Phòng Mới
                        </button>
                        <button type="button" class="landlord-nav-link landlord-has-badge" id="link-messages" onclick="landlord.showMessages()">
                            <i class="fas fa-comments"></i> Tin Nhắn Khách
                            <span class="notif-badge" id="msg-badge" style="display:none">0</span>
                        </button>
                        <button type="button" class="landlord-nav-link" id="link-invitations" onclick="landlord.showSentInvitations()">
                            <i class="fas fa-calendar-check"></i> Lời Mời Đã Gửi
                        </button>
                        <button type="button" class="landlord-nav-link" id="link-issues" onclick="landlord.showIssues()">
                            <i class="fas fa-screwdriver-wrench"></i> Báo Cáo Sự Cố
                            <span class="notif-badge" id="issue-badge" style="display:none">0</span>
                        </button>
                        <button type="button" class="landlord-nav-link" id="link-contracts" onclick="landlord.showContracts()">
                            <i class="fas fa-file-signature"></i> Quản Lý Hợp Đồng
                        </button>
                        <button type="button" class="landlord-nav-link" id="link-payments" onclick="landlord.showPayments()">
                            <i class="fas fa-file-invoice-dollar"></i> Quản Lý Thanh Toán
                        </button>
                        <button type="button" class="landlord-nav-link" id="link-categories" onclick="landlord.showCategories()">
                            <i class="fas fa-tags"></i> Danh Mục Phòng
                        </button>
                    </div>

                    <main class="landlord-workspace" id="landlord-panel">
                        <div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>
                    </main>
                </section>
            </div>
        `;
        this.showRooms();
        this.checkUnreadMessages();
        this.checkPendingIssues();
    },

    async checkUnreadMessages() {
        try {
            const res = await fetch(`${API_URL}/messages/inbox/landlord`, {
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            const data = await res.json();
            const badge = document.getElementById('msg-badge');
            if (badge && data.data && data.data.length > 0) {
                badge.style.display = 'inline';
                badge.textContent = data.data.length;
            }
        } catch (e) {}
    },

    async checkPendingIssues() {
        try {
            const res = await fetch(`${API_URL}/issues/landlord`, {
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            const data = await res.json();
            const badge = document.getElementById('issue-badge');
            if (badge && data.data) {
                const pendingCount = data.data.filter(i => i.status === 'pending').length;
                if (pendingCount > 0) {
                    badge.style.display = 'inline-flex';
                    badge.textContent = pendingCount;
                    document.getElementById('link-issues').classList.add('landlord-has-badge');
                } else {
                    badge.style.display = 'none';
                    document.getElementById('link-issues').classList.remove('landlord-has-badge');
                }
            }
        } catch (e) {}
    },

    setActiveLink(id) {
        document.querySelectorAll('.landlord-nav-link, .sidebar-link').forEach(l => l.classList.remove('active'));
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    },

    getRoomStatusMeta(room) {
        const activeContract = this.contracts.find(item => Number(item.roomId) === Number(room.id) && item.status === 'active');
        const draftContract = this.contracts.find(item => Number(item.roomId) === Number(room.id) && item.status === 'draft');
        const latestPayment = this.payments.find(item => Number(item.roomId) === Number(room.id));
        const contract = activeContract || draftContract || null;
        const tenantName = contract?.tenant?.username || 'Trống - sẵn sàng thêm khách mới';

        if (!contract) {
            return {
                key: 'vacant',
                label: 'Đang trống',
                className: 'is-vacant',
                tenantName,
                note: 'Chưa có hợp đồng hiệu lực cho phòng này.'
            };
        }

        if (latestPayment && ['pending', 'partial', 'overdue'].includes(latestPayment.status)) {
            return {
                key: 'attention',
                label: 'Chưa thu phí',
                className: 'is-attention',
                tenantName,
                note: `Kỳ ${latestPayment.billingPeriod || 'hiện tại'} đang cần theo dõi thanh toán.`
            };
        }

        return {
            key: 'occupied',
            label: contract.status === 'draft' ? 'Đang giữ chỗ' : 'Đã cho thuê',
            className: 'is-occupied',
            tenantName,
            note: contract.status === 'draft' ? 'Hợp đồng đang ở bản nháp, chờ xác nhận.' : 'Hợp đồng đang hiệu lực và hồ sơ phòng ổn định.'
        };
    },

    getFilteredRooms() {
        const search = this.roomFilters.search.trim().toLowerCase();

        return this.rooms.filter(room => {
            const status = this.getRoomStatusMeta(room);
            const categoryMatch = this.roomFilters.categoryId === 'all' || String(room.categoryId) === String(this.roomFilters.categoryId);
            const statusMatch = this.roomFilters.status === 'all' || status.key === this.roomFilters.status;

            if (!categoryMatch || !statusMatch) return false;
            if (!search) return true;

            const haystack = [
                room.title,
                room.address,
                room.category?.name,
                status.tenantName,
                status.note
            ].join(' ').toLowerCase();

            return haystack.includes(search);
        });
    },

    updateRoomFilters() {
        this.roomFilters = {
            status: document.getElementById('room-filter-status')?.value || 'all',
            categoryId: document.getElementById('room-filter-category')?.value || 'all',
            search: document.getElementById('room-filter-search')?.value || ''
        };
        this.renderRoomsView();
    },

    renderRoomsView() {
        const panel = document.getElementById('landlord-panel');
        if (!panel) return;

        const filteredRooms = this.getFilteredRooms();
        const vacantCount = this.rooms.filter(room => this.getRoomStatusMeta(room).key === 'vacant').length;
        const occupiedCount = this.rooms.filter(room => this.getRoomStatusMeta(room).key === 'occupied').length;
        const attentionCount = this.rooms.filter(room => this.getRoomStatusMeta(room).key === 'attention').length;

        panel.innerHTML = `
            <div class="landlord-rooms-shell">
                <div class="landlord-rooms-hero">
                    <div>
                        <h2>Danh Sách Phòng</h2>
                    </div>
                    <div class="landlord-room-hero-actions">
                        <button type="button" class="landlord-section-btn teal" onclick="landlord.showAddRoom()">
                            <i class="fas fa-plus"></i> Thêm phòng nhanh
                        </button>
                        <button type="button" class="landlord-section-btn blue" onclick="landlord.showContracts()">
                            <i class="fas fa-file-signature"></i> Mở hợp đồng
                        </button>
                    </div>
                </div>

                <div class="landlord-summary-strip">
                    <span class="landlord-summary-pill green">Còn trống <strong>${vacantCount}</strong></span>
                    <span class="landlord-summary-pill blue">Đã cho thuê <strong>${occupiedCount}</strong></span>
                    <span class="landlord-summary-pill amber">Chưa thu phí <strong>${attentionCount}</strong></span>
                    <span class="landlord-summary-pill slate">Tổng phòng <strong>${this.rooms.length}</strong></span>
                </div>

                <div class="landlord-toolbar-card">
                    <div class="landlord-filter-grid">
                        <div class="landlord-filter-field">
                            <label>Trạng thái phòng</label>
                            <select id="room-filter-status" onchange="landlord.updateRoomFilters()">
                                <option value="all" ${this.roomFilters.status === 'all' ? 'selected' : ''}>Tất cả</option>
                                <option value="vacant" ${this.roomFilters.status === 'vacant' ? 'selected' : ''}>Đang trống</option>
                                <option value="occupied" ${this.roomFilters.status === 'occupied' ? 'selected' : ''}>Đã cho thuê</option>
                                <option value="attention" ${this.roomFilters.status === 'attention' ? 'selected' : ''}>Chưa thu phí</option>
                            </select>
                        </div>
                        <div class="landlord-filter-field">
                            <label>Danh mục phòng</label>
                            <select id="room-filter-category" onchange="landlord.updateRoomFilters()">
                                <option value="all">Tất cả danh mục</option>
                                ${this.categories.map(category => `
                                    <option value="${category.id}" ${String(this.roomFilters.categoryId) === String(category.id) ? 'selected' : ''}>${this.escapeHtml(category.name)}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="landlord-filter-field">
                            <label>Tìm theo tên phòng</label>
                            <input type="text" id="room-filter-search" value="${this.escapeHtml(this.roomFilters.search)}" oninput="landlord.updateRoomFilters()" placeholder="Phòng, địa chỉ hoặc người thuê">
                        </div>
                        <button type="button" class="landlord-filter-action" onclick="landlord.showRooms()">
                            <i class="fas fa-rotate"></i> Làm mới
                        </button>
                    </div>
                </div>

                ${filteredRooms.length === 0 ? `
                    <div class="empty-state landlord-empty-card">
                        <i class="fas fa-house-circle-xmark fa-3x"></i>
                        <h3>Không có phòng nào khớp bộ lọc</h3>
                        <p>Hãy đổi trạng thái, danh mục hoặc từ khóa để xem lại danh sách phòng.</p>
                    </div>
                ` : `
                    <div class="landlord-room-grid">
                        ${filteredRooms.map(room => this.renderRoomCard(room)).join('')}
                    </div>
                `}
            </div>
        `;
    },

    async showRooms() {
        this.setActiveLink('link-rooms');
        const panel = document.getElementById('landlord-panel');
        panel.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;
        try {
            const [rooms, contracts, payments] = await Promise.all([
                fetch(`${API_URL}/rooms`, {
                    headers: { 'Authorization': `Bearer ${auth.getToken()}` }
                }).then(async res => {
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Không thể tải danh sách phòng');
                    return data.data || [];
                }),
                typeof this.loadContracts === 'function' ? this.loadContracts().catch(() => []) : Promise.resolve([]),
                typeof this.loadPayments === 'function' ? this.loadPayments().catch(() => []) : Promise.resolve([])
            ]);

            this.rooms = rooms;
            if (Array.isArray(contracts)) this.contracts = contracts;
            if (Array.isArray(payments)) this.payments = payments;
            this.renderRoomsView();
        } catch (err) {
            panel.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Lỗi tải dữ liệu</h3></div>`;
        }
    },

    renderRoomCard(room) {
        const status = this.getRoomStatusMeta(room);
        const roomType = room.category ? room.category.name : 'Phòng trọ';
        return `
            <article class="landlord-room-card ${status.className}">
                <div class="landlord-room-top">
                    <div>
                        <h3>${this.escapeHtml(room.title)}</h3>
                        <p>${this.escapeHtml(roomType)}</p>
                    </div>
                    <span class="landlord-room-state ${status.className}">${status.label}</span>
                </div>

                <div class="landlord-room-chip-row">
                    <button type="button" class="landlord-room-chip mint" onclick="landlord.showRooms()">${status.key === 'vacant' ? 'Trống' : 'Đang ở'}</button>
                    <button type="button" class="landlord-room-chip slate" onclick="landlord.showEditRoom(${room.id})">Xem</button>
                    <button type="button" class="landlord-room-chip sky" onclick="landlord.showPayments()">Thu phí</button>
                </div>

                <div class="landlord-room-body">
                    <p class="landlord-room-line"><i class="fas fa-user"></i> ${this.escapeHtml(status.tenantName)}</p>
                    <p class="landlord-room-line price"><i class="fas fa-money-bill-wave"></i> ${Number(room.price).toLocaleString('vi-VN')} VNĐ/tháng</p>
                    <p class="landlord-room-line"><i class="fas fa-location-dot"></i> ${this.escapeHtml(room.address)}</p>
                    ${room.area ? `<p class="landlord-room-line"><i class="fas fa-ruler-combined"></i> ${room.area} m²</p>` : ''}
                    <p class="landlord-room-note">${this.escapeHtml(status.note)}</p>
                </div>

                <div class="landlord-room-actions">
                    <button class="landlord-room-action primary" onclick="landlord.showEditRoom(${room.id})" title="Sửa phòng">
                        <i class="fas fa-pen-to-square"></i> Chỉnh sửa
                    </button>
                    <button class="landlord-room-action danger" onclick="landlord.deleteRoom(${room.id})" title="Xóa phòng">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </div>
            </article>
        `;
    },

    showAddRoom() {
        this.setActiveLink('link-add');
        const panel = document.getElementById('landlord-panel');
        const catOptions = this.categories.map(c =>
            `<option value="${c.id}">${c.name}</option>`
        ).join('');
        panel.innerHTML = `
            <div class="panel-header">
                <h2><i class="fas fa-plus-circle"></i> Thêm Phòng Mới</h2>
            </div>
            <form class="room-form" onsubmit="landlord.submitAddRoom(event)" enctype="multipart/form-data">
                <div class="form-row">
                    <div class="form-group">
                        <label>Tiêu đề phòng *</label>
                        <input type="text" id="r-title" required placeholder="VD: Phòng trọ gần ĐH Bách Khoa">
                    </div>
                    <div class="form-group">
                        <label>Danh mục phòng *</label>
                        <select id="r-category" required>
                            <option value="">-- Chọn danh mục --</option>
                            ${catOptions}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Giá thuê (VNĐ/tháng) *</label>
                        <input type="number" id="r-price" required placeholder="VD: 1500000" min="0">
                    </div>
                    <div class="form-group">
                        <label>Diện tích (m²)</label>
                        <input type="number" id="r-area" placeholder="VD: 25" min="0">
                    </div>
                </div>
                <div class="form-group full-width">
                    <label>Địa chỉ *</label>
                    <input type="text" id="r-address" required placeholder="VD: 123 Đường Lê Lợi, Quận 1, TP.HCM">
                </div>
                <div class="form-group full-width">
                    <label>Mô tả phòng</label>
                    <textarea id="r-description" rows="4" placeholder="Mô tả về phòng, tiện ích, lưu ý..."></textarea>
                </div>
                <div class="form-group full-width">
                    <label>Hình ảnh phòng (tối đa 10 ảnh, mỗi ảnh &le; 5MB)</label>
                    <div class="upload-area" id="upload-area" onclick="document.getElementById('r-images').click()">
                        <i class="fas fa-cloud-upload-alt fa-2x"></i>
                        <p>Bấm để chọn ảnh hoặc kéo thả vào đây</p>
                        <span>PNG, JPG, WEBP</span>
                    </div>
                    <input type="file" id="r-images" name="images" multiple accept="image/*" style="display:none" onchange="landlord.previewImages(event)">
                    <div class="image-preview-grid" id="image-previews"></div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="landlord.showRooms()">Hủy</button>
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Lưu Phòng</button>
                </div>
            </form>
        `;
    },

    previewImages(event) {
        const files = event.target.files;
        const previewGrid = document.getElementById('image-previews');
        previewGrid.innerHTML = '';
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = e => {
                previewGrid.innerHTML += `
                    <div class="preview-item">
                        <img src="${e.target.result}" alt="preview">
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('upload-area').innerHTML = `
            <i class="fas fa-check-circle fa-2x" style="color: #10b981"></i>
            <p>Đã chọn <strong>${files.length}</strong> ảnh</p>
        `;
    },

    async submitAddRoom(e) {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', document.getElementById('r-title').value);
        formData.append('price', document.getElementById('r-price').value);
        formData.append('address', document.getElementById('r-address').value);
        formData.append('categoryId', document.getElementById('r-category').value);
        const area = document.getElementById('r-area').value;
        if (area) formData.append('area', area);
        const desc = document.getElementById('r-description').value;
        if (desc) formData.append('description', desc);
        const files = document.getElementById('r-images').files;
        Array.from(files).forEach(file => formData.append('images', file));

        try {
            const btn = e.target.querySelector('[type=submit]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
            const res = await fetch(`${API_URL}/rooms`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${auth.getToken()}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Thêm phòng thành công!', 'success');
                this.showRooms();
            } else {
                showToast(data.message || 'Lỗi khi thêm phòng', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Lưu Phòng';
            }
        } catch (err) {
            showToast('Lỗi kết nối server', 'error');
        }
    },

    async showEditRoom(id) {
        this.setActiveLink('link-rooms');
        const panel = document.getElementById('landlord-panel');
        panel.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;
        try {
            const res = await fetch(`${API_URL}/rooms/${id}`, {
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            const data = await res.json();
            const room = data.data;
            const catOptions = this.categories.map(c =>
                `<option value="${c.id}" ${room.categoryId == c.id ? 'selected' : ''}>${c.name}</option>`
            ).join('');
            panel.innerHTML = `
                <div class="panel-header">
                    <h2><i class="fas fa-edit"></i> Chỉnh Sửa Phòng</h2>
                </div>
                <form class="room-form" onsubmit="landlord.submitEditRoom(event, ${id})">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Tiêu đề phòng *</label>
                            <input type="text" id="r-title" required value="${room.title}">
                        </div>
                        <div class="form-group">
                            <label>Danh mục phòng *</label>
                            <select id="r-category" required>
                                <option value="">-- Chọn --</option>
                                ${catOptions}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Giá thuê (VNĐ/tháng) *</label>
                            <input type="number" id="r-price" required value="${room.price}">
                        </div>
                        <div class="form-group">
                            <label>Diện tích (m²)</label>
                            <input type="number" id="r-area" value="${room.area || ''}">
                        </div>
                    </div>
                    <div class="form-group full-width">
                        <label>Địa chỉ *</label>
                        <input type="text" id="r-address" required value="${room.address}">
                    </div>
                    <div class="form-group full-width">
                        <label>Mô tả phòng</label>
                        <textarea id="r-description" rows="4">${room.description || ''}</textarea>
                    </div>
                    <div class="form-group full-width">
                        <label>Ảnh hiện tại (${room.images ? room.images.length : 0} ảnh)</label>
                        <div class="image-preview-grid">
                            ${room.images ? room.images.map(img => `
                                <div class="preview-item">
                                    <img src="http://localhost:5000${img.url}" alt="room">
                                    <button type="button" class="del-img-btn" onclick="landlord.deleteImage(${img.id}, ${id})" title="Xóa ảnh">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            `).join('') : ''}
                        </div>
                    </div>
                    <div class="form-group full-width">
                        <label>Thêm ảnh mới</label>
                        <div class="upload-area" onclick="document.getElementById('r-images').click()">
                            <i class="fas fa-cloud-upload-alt fa-2x"></i>
                            <p>Bấm để chọn thêm ảnh</p>
                        </div>
                        <input type="file" id="r-images" name="images" multiple accept="image/*" style="display:none" onchange="landlord.previewImages(event)">
                        <div class="image-preview-grid" id="image-previews"></div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="landlord.showRooms()">Hủy</button>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Cập Nhật</button>
                    </div>
                </form>
            `;
        } catch (err) {
            panel.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Lỗi tải dữ liệu</h3></div>`;
        }
    },

    async submitEditRoom(e, id) {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', document.getElementById('r-title').value);
        formData.append('price', document.getElementById('r-price').value);
        formData.append('address', document.getElementById('r-address').value);
        formData.append('categoryId', document.getElementById('r-category').value);
        const area = document.getElementById('r-area').value;
        if (area) formData.append('area', area);
        const desc = document.getElementById('r-description').value;
        if (desc) formData.append('description', desc);
        const files = document.getElementById('r-images').files;
        Array.from(files).forEach(file => formData.append('images', file));

        try {
            const btn = e.target.querySelector('[type=submit]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
            const res = await fetch(`${API_URL}/rooms/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${auth.getToken()}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Cập nhật phòng thành công!', 'success');
                this.showRooms();
            } else {
                showToast(data.message || 'Lỗi cập nhật', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Cập Nhật';
            }
        } catch (err) {
            showToast('Lỗi kết nối server', 'error');
        }
    },

    async deleteImage(imgId, roomId) {
        if (!confirm('Xóa ảnh này?')) return;
        try {
            const res = await fetch(`${API_URL}/rooms/images/${imgId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            if (res.ok) {
                showToast('Đã xóa ảnh', 'success');
                this.showEditRoom(roomId);
            }
        } catch (err) {
            showToast('Lỗi xóa ảnh', 'error');
        }
    },

    async deleteRoom(id) {
        if (!confirm('Bạn có chắc muốn xóa phòng này? Hình ảnh, hợp đồng, thanh toán, tin nhắn và dữ liệu liên quan của phòng sẽ bị xóa.')) return;
        try {
            const res = await fetch(`${API_URL}/rooms/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            if (res.ok) {
                showToast('Đã xóa phòng', 'success');
                this.showRooms();
            } else {
                const data = await res.json();
                showToast(data.message || 'Lỗi xóa phòng', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối server', 'error');
        }
    },

    // ---- CATEGORY MANAGEMENT ----
    async showCategories() {
        this.setActiveLink('link-categories');
        const panel = document.getElementById('landlord-panel');
        panel.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;
        await this.loadCategories();
        panel.innerHTML = `
            <div class="panel-header">
                <h2><i class="fas fa-tags"></i> Danh Mục Phòng</h2>
                <button class="btn btn-primary" onclick="landlord.showAddCategoryForm()">
                    <i class="fas fa-plus"></i> Thêm Danh Mục
                </button>
            </div>
            <div id="cat-form-area"></div>
            <div class="table-container" style="margin-top:1rem">
                <table>
                    <thead><tr><th>ID</th><th>Tên danh mục</th><th>Mô tả</th><th>Thao tác</th></tr></thead>
                    <tbody>
                        ${this.categories.length === 0
                            ? '<tr><td colspan="4" style="text-align:center; padding: 2rem; color:#718096">Chưa có danh mục nào</td></tr>'
                            : this.categories.map(c => `
                                <tr>
                                    <td>#${c.id}</td>
                                    <td><strong>${c.name}</strong></td>
                                    <td>${c.description || '—'}</td>
                                    <td>
                                        <button class="action-btn btn-danger" onclick="landlord.deleteCategory(${c.id})" title="Xóa">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')
                        }
                    </tbody>
                </table>
            </div>
        `;
    },

    showAddCategoryForm() {
        const area = document.getElementById('cat-form-area');
        if (!area) return;
        area.innerHTML = `
            <div class="glass-card" style="margin-top:1rem; padding: 1.5rem;">
                <h3 style="margin-bottom:1rem"><i class="fas fa-plus"></i> Thêm Danh Mục Mới</h3>
                <form onsubmit="landlord.submitCategory(event)" class="form-row">
                    <div class="form-group">
                        <label>Tên danh mục *</label>
                        <input type="text" id="cat-name" required placeholder="VD: Phòng trọ, Căn hộ mini...">
                    </div>
                    <div class="form-group">
                        <label>Mô tả</label>
                        <input type="text" id="cat-desc" placeholder="Mô tả ngắn...">
                    </div>
                    <div class="form-actions" style="margin-top: 0; align-self: flex-end;">
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Lưu</button>
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('cat-form-area').innerHTML=''">Hủy</button>
                    </div>
                </form>
            </div>
        `;
    },

    async submitCategory(e) {
        e.preventDefault();
        const name = document.getElementById('cat-name').value;
        const description = document.getElementById('cat-desc').value;
        try {
            const res = await fetch(`${API_URL}/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.getToken()}`
                },
                body: JSON.stringify({ name, description })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Thêm danh mục thành công!', 'success');
                this.showCategories();
            } else {
                showToast(data.message || 'Lỗi thêm danh mục', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối server', 'error');
        }
    },

    async deleteCategory(id) {
        if (!confirm('Xóa danh mục này?')) return;
        try {
            const res = await fetch(`${API_URL}/categories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            if (res.ok) {
                showToast('Đã xóa danh mục', 'success');
                this.showCategories();
            } else {
                const data = await res.json();
                showToast(data.message || 'Lỗi xóa', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối server', 'error');
        }
    },

    // ==================== TIN NHẮN ====================
    async showMessages() {
        this.setActiveLink('link-messages');
        const panel = document.getElementById('landlord-panel');
        panel.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;
        try {
            const res = await fetch(`${API_URL}/messages/inbox/landlord`, {
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            const data = await res.json();
            const convos = data.data || [];
            if (convos.length === 0) {
                panel.innerHTML = `
                    <div class="panel-header"><h2><i class="fas fa-comments"></i> Tin Nhắn Khách</h2></div>
                    <div class="empty-state">
                        <i class="fas fa-comments fa-3x"></i>
                        <h3>Chưa có tin nhắn nào</h3>
                        <p>Khi khách thuê nhắn tin về phòng của bạn, tin nhắn sẽ hiện ở đây.</p>
                    </div>`;
                return;
            }
            panel.innerHTML = `
                <div class="panel-header"><h2><i class="fas fa-comments"></i> Tin Nhắn Khách (${convos.length})</h2></div>
                <div class="convo-list">
                    ${convos.map(m => `
                        <div class="convo-item" onclick="landlord.showConversation(${m.roomId}, ${m.tenantId}, '${m.tenant ? m.tenant.username : 'Khách'}', '${m.room ? m.room.title : 'Phòng #'+m.roomId}')">
                            <div class="convo-icon"><i class="fas fa-user-circle"></i></div>
                            <div class="convo-info">
                                <h4><strong>${m.tenant ? m.tenant.username : 'Khách #'+m.tenantId}</strong> — ${m.room ? m.room.title : 'Phòng #'+m.roomId}</h4>
                                <p style="font-size:0.85rem;color:var(--text-light);margin-top:0.25rem"><i class="fas fa-map-marker-alt"></i> ${m.room ? m.room.address : ''}</p>
                                <span class="convo-preview"><strong>${m.senderRole === 'Tenant' ? 'Khách' : 'Bạn'}:</strong> ${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''}</span>
                            </div>
                            <div class="convo-time">${new Date(m.createdAt).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (err) {
            panel.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Lỗi tải dữ liệu</h3></div>`;
        }
    },

    async showConversation(roomId, tenantId, tenantName, roomTitle) {
        const panel = document.getElementById('landlord-panel');
        panel.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;
        try {
            const res = await fetch(`${API_URL}/messages/conversation/${roomId}/${tenantId}`, {
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            const data = await res.json();
            const msgs = data.data || [];
            panel.innerHTML = `
                <div class="panel-header">
                    <div>
                        <button class="btn btn-secondary" onclick="landlord.showMessages()" style="margin-bottom:0.5rem;color:var(--primary);border-color:var(--primary);font-size:0.85rem">
                            <i class="fas fa-arrow-left"></i> Quay lại
                        </button>
                        <h2><i class="fas fa-comments"></i> ${tenantName} — ${roomTitle}</h2>
                    </div>
                    <button class="btn btn-primary" onclick="landlord.showInviteForm(${roomId}, ${tenantId}, '${tenantName}', '${roomTitle}')">
                        <i class="fas fa-calendar-plus"></i> Gửi Lời Mời Xem Phòng
                    </button>
                </div>
                <div id="invite-form-area"></div>
                <div class="chat-panel">
                    <div class="chat-box" id="chat-box-landlord">
                        ${msgs.length === 0
                            ? `<div class="chat-empty">Chưa có tin nhắn. Hãy trả lời khách!</div>`
                            : msgs.map(m => {
                                let msgClass = '';
                                if (m.senderRole === 'System') msgClass = 'msg-system';
                                else msgClass = m.senderRole === 'Landlord' ? 'msg-mine' : 'msg-theirs';

                                return `
                                    <div class="chat-msg ${msgClass}">
                                        <div class="msg-bubble">
                                            <p>${m.content}</p>
                                            <span class="msg-time">${new Date(m.createdAt).toLocaleString('vi-VN', {hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')
                        }
                    </div>
                    <div class="chat-input-row">
                        <textarea id="landlord-msg-input" class="chat-input" rows="2"
                            placeholder="Trả lời khách..."></textarea>
                        <button class="btn btn-primary chat-send-btn"
                            onclick="landlord.replyMessage(${roomId}, ${tenantId})">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            `;
            const box = document.getElementById('chat-box-landlord');
            if (box) box.scrollTop = box.scrollHeight;
        } catch (err) {
            panel.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Lỗi tải dữ liệu</h3></div>`;
        }
    },

    async replyMessage(roomId, tenantId) {
        const input = document.getElementById('landlord-msg-input');
        const content = input.value.trim();
        if (!content) return;
        try {
            const res = await fetch(`${API_URL}/messages/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.getToken()}`
                },
                body: JSON.stringify({ roomId, tenantId, content })
            });
            const data = await res.json();
            if (res.ok) {
                input.value = '';
                // Thêm tin nhắn mới vào chat box
                const box = document.getElementById('chat-box-landlord');
                const emptyMsg = box.querySelector('.chat-empty');
                if (emptyMsg) emptyMsg.remove();
                box.innerHTML += `
                    <div class="chat-msg msg-mine">
                        <div class="msg-bubble">
                            <p>${content}</p>
                            <span class="msg-time">${new Date().toLocaleString('vi-VN', {hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})}</span>
                        </div>
                    </div>
                `;
                box.scrollTop = box.scrollHeight;
                showToast('Đã gửi phản hồi!', 'success');
            } else {
                showToast(data.message || 'Lỗi gửi', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối', 'error');
        }
    },

    showInviteForm(roomId, tenantId, tenantName, roomTitle) {
        const area = document.getElementById('invite-form-area');
        if (!area) return;
        // Ngày tối thiểu là ngày mai
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];

        area.innerHTML = `
            <div class="invite-form-card">
                <div class="invite-form-header">
                    <i class="fas fa-calendar-plus"></i>
                    <div>
                        <h3>Gửi Lời Mời Xem Phòng</h3>
                        <p>Gửi đến: <strong>${tenantName}</strong> — ${roomTitle}</p>
                    </div>
                    <button onclick="document.getElementById('invite-form-area').innerHTML=''" class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="invite-form-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-calendar"></i> Ngày xem phòng *</label>
                            <input type="date" id="inv-date" min="${minDate}" required>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-clock"></i> Giờ xem phòng *</label>
                            <input type="time" id="inv-time" required>
                        </div>
                    </div>
                    <div class="form-group full-width" style="margin-bottom:0">
                        <label><i class="fas fa-sticky-note"></i> Ghi chú thêm (tùy chọn)</label>
                        <textarea id="inv-note" rows="2" placeholder="VD: Vui lòng mang CMND/CCCD để xem phòng. Liên hệ 0912345678 khi đến."></textarea>
                    </div>
                    <div class="form-actions" style="margin-top:1rem">
                        <button class="btn btn-primary" onclick="landlord.submitInvitation(${roomId}, ${tenantId})">
                            <i class="fas fa-paper-plane"></i> Gửi Lời Mời
                        </button>
                        <button class="btn btn-secondary" onclick="document.getElementById('invite-form-area').innerHTML=''">
                            Hủy
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    async submitInvitation(roomId, tenantId) {
        const viewingDate = document.getElementById('inv-date').value;
        const viewingTime = document.getElementById('inv-time').value;
        const note = document.getElementById('inv-note').value;
        if (!viewingDate || !viewingTime) {
            showToast('Vui lòng chọn ngày và giờ xem phòng', 'error');
            return;
        }
        try {
            const res = await fetch(`${API_URL}/messages/invitation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.getToken()}`
                },
                body: JSON.stringify({ roomId, tenantId, viewingDate, viewingTime, note })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Đã gửi lời mời xem phòng thành công!', 'success');
                document.getElementById('invite-form-area').innerHTML = `
                    <div class="invite-success">
                        <i class="fas fa-check-circle"></i>
                        <span>Lời mời đã gửi! Khách sẽ nhận được thông báo và xác nhận tham dự.</span>
                    </div>
                `;
            } else {
                showToast(data.message || 'Lỗi gửi lời mời', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối server', 'error');
        }
    },

    // ==================== LỜI MỜI ĐÃ GỬI ====================
    async showSentInvitations() {
        this.setActiveLink('link-invitations');
        const panel = document.getElementById('landlord-panel');
        panel.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;
        try {
            const res = await fetch(`${API_URL}/messages/invitation/landlord`, {
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            const data = await res.json();
            const invs = data.data || [];
            const statusMap = {
                pending: { text: 'Chờ phản hồi', cls: 'status-pending', icon: 'fa-clock' },
                confirmed: { text: 'Đã xác nhận', cls: 'status-confirmed', icon: 'fa-check-circle' },
                rejected: { text: 'Đã từ chối', cls: 'status-rejected', icon: 'fa-times-circle' }
            };
            panel.innerHTML = `
                <div class="panel-header">
                    <h2><i class="fas fa-calendar-check"></i> Lời Mời Đã Gửi (${invs.length})</h2>
                </div>
                ${invs.length === 0
                    ? `<div class="empty-state"><i class="fas fa-calendar fa-3x"></i><h3>Chưa có lời mời nào</h3><p>Hãy vào Tin Nhắn, xem tin nhắn của khách và gửi lời mời xem phòng.</p></div>`
                    : `<div class="invitation-list">
                        ${invs.map(inv => {
                            const s = statusMap[inv.status] || statusMap.pending;
                            const dateStr = new Date(inv.viewingDate).toLocaleDateString('vi-VN', {weekday:'long',year:'numeric',month:'long',day:'numeric'});
                            return `
                                <div class="invitation-card ${s.cls}">
                                    <div class="inv-header">
                                        <div class="inv-icon"><i class="fas fa-calendar-alt"></i></div>
                                        <div class="inv-title">
                                            <h4>${inv.room ? inv.room.title : 'Phòng #'+inv.roomId}</h4>
                                            <p>${inv.room ? inv.room.address : ''}</p>
                                        </div>
                                        <span class="inv-status ${s.cls}"><i class="fas ${s.icon}"></i> ${s.text}</span>
                                    </div>
                                    <div class="inv-body">
                                        <div class="inv-detail"><i class="fas fa-user"></i><span>Khách: <strong>${inv.tenant ? inv.tenant.username : '—'}</strong></span></div>
                                        <div class="inv-detail"><i class="fas fa-calendar"></i><span>Ngày: <strong>${dateStr}</strong></span></div>
                                        <div class="inv-detail"><i class="fas fa-clock"></i><span>Giờ: <strong>${inv.viewingTime}</strong></span></div>
                                        ${inv.note ? `<div class="inv-note"><i class="fas fa-sticky-note"></i> ${inv.note}</div>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>`
                }
            `;
        } catch (err) {
            panel.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Lỗi tải dữ liệu</h3></div>`;
        }
    },

    // ==================== BÁO CÁO SỰ CỐ ====================
    async showIssues() {
        this.setActiveLink('link-issues');
        const panel = document.getElementById('landlord-panel');
        panel.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;
        try {
            const res = await fetch(`${API_URL}/issues/landlord`, {
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            const data = await res.json();
            const issues = data.data || [];
            this.issues = issues;
            this.renderIssuesView();
        } catch (err) {
            panel.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Lỗi tải dữ liệu báo cáo sự cố</h3></div>`;
        }
    },

    renderIssuesView() {
        const panel = document.getElementById('landlord-panel');
        if (!panel) return;

        panel.innerHTML = `
            <div class="landlord-issues-shell">
                <div class="panel-header">
                    <h2><i class="fas fa-screwdriver-wrench"></i> Quản Lý Báo Cáo Sự Cố (${this.issues.length})</h2>
                </div>
                ${this.issues.length === 0 ? `
                    <div class="empty-state landlord-empty-card">
                        <i class="fas fa-check-circle fa-3x" style="color: #10b981"></i>
                        <h3>Tuyệt vời! Không có sự cố nào cần xử lý.</h3>
                        <p>Khi khách thuê gửi báo cáo về hư hỏng hoặc vấn đề phát sinh, chúng sẽ hiện ở đây.</p>
                    </div>
                ` : `
                    <div class="landlord-issue-list">
                        ${this.issues.map(issue => {
                            const severity = this.getIssueSeverityMeta(issue.severity);
                            return `
                                <article class="landlord-issue-card">
                                    <div class="landlord-issue-top">
                                        <div class="landlord-issue-info">
                                            <div class="landlord-issue-room">
                                                <strong>${this.escapeHtml(issue.room ? issue.room.title : 'Phòng #' + issue.roomId)}</strong>
                                                <span><i class="fas fa-user"></i> ${this.escapeHtml(issue.tenant ? issue.tenant.username : 'Khách')}</span>
                                            </div>
                                            <h3>${this.escapeHtml(issue.title)}</h3>
                                            <p class="landlord-issue-time"><i class="fas fa-clock"></i> ${new Date(issue.createdAt).toLocaleString('vi-VN')}</p>
                                        </div>
                                        <span class="resident-issue-badge ${severity.className}"><i class="fas ${severity.icon}"></i> ${severity.label}</span>
                                    </div>
                                    <div class="landlord-issue-body">
                                        <p>${this.escapeHtml(issue.description).replace(/\n/g, '<br>')}</p>
                                    </div>
                                    <div class="landlord-issue-actions">
                                        <div class="landlord-issue-status-control">
                                            <label>Trạng thái:</label>
                                            <select onchange="landlord.updateIssueStatus(${issue.id}, this.value)">
                                                <option value="pending" ${issue.status === 'pending' ? 'selected' : ''}>Chờ xử lý</option>
                                                <option value="in_progress" ${issue.status === 'in_progress' ? 'selected' : ''}>Đang xử lý</option>
                                                <option value="resolved" ${issue.status === 'resolved' ? 'selected' : ''}>Đã giải quyết</option>
                                                <option value="closed" ${issue.status === 'closed' ? 'selected' : ''}>Đã đóng</option>
                                            </select>
                                        </div>
                                    </div>
                                </article>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        `;
    },

    async updateIssueStatus(id, status) {
        try {
            const res = await fetch(`${API_URL}/issues/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.getToken()}`
                },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Đã cập nhật trạng thái sự cố', 'success');
                const issue = this.issues.find(i => i.id === id);
                if (issue) issue.status = status;
                
                // Cập nhật lại số lượng badge
                this.checkPendingIssues();
            } else {
                showToast(data.message || 'Lỗi cập nhật trạng thái', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối server', 'error');
        }
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
    }
};
