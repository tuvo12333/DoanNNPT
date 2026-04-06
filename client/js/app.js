const app = {
    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    },

    init() {
        const user = auth.getUser();
        this.renderNav(user);
        if (user) {
            if (user.role === 'Admin') {
                admin.loadUsers();
            } else {
                this.renderDashboard(user);
            }
        } else {
            this.renderHero();
        }
    },

    renderNav(user) {
        const navLinks = document.getElementById('nav-links');
        const authStatus = document.getElementById('auth-status');
        const logo = document.querySelector('.logo');
        const homeAction = user ? 'app.renderDashboard(auth.getUser())' : 'app.renderHero()';

        if (typeof tenant !== 'undefined') {
            tenant.stopPaymentNotificationPolling?.();
            tenant.closePaymentNotifications?.();
            tenant.closePaymentNotificationModal?.();
            tenant.closeQrPreview?.();
        }

        if (logo) {
            logo.setAttribute('role', 'button');
            logo.setAttribute('tabindex', '0');
            logo.setAttribute('onclick', homeAction);
            logo.setAttribute('onkeypress', `if(event.key==='Enter'||event.key===' '){${homeAction}}`);
        }
        
        let links = '';
        if (user) {
            if (user.role === 'Admin') {
                links += `<li><a href="#" onclick="admin.loadUsers()">Quản Lý User</a></li>`;
            } else if (user.role === 'Landlord') {
                links += `<li><a href="#" onclick="landlord.init()">Quản Lý Phòng</a></li>`;
            } else {
                links += `<li><a href="#" onclick="tenant.init()">Phòng Của Tôi</a></li>`;
            }
            navLinks.innerHTML = links;
            if (user.role === 'Tenant') {
                authStatus.innerHTML = `
                    <div class="auth-user-tools">
                        <div class="tenant-notification-shell">
                            <button type="button" class="tenant-notification-btn" onclick="tenant.togglePaymentNotifications(event)">
                                <i class="fas fa-bell"></i>
                                <span class="notif-badge nav-notif-badge" id="tenant-payment-badge" style="display:none">0</span>
                            </button>
                            <div id="tenant-payment-dropdown" class="tenant-notification-dropdown"></div>
                        </div>
                        <span class="user-display">${this.escapeHtml(user.username)}</span>
                        <button onclick="auth.logout()" class="btn btn-secondary btn-sm" style="color: var(--primary); border: 1px solid var(--primary); padding: 0.5rem 1rem;">THOÁT</button>
                    </div>
                `;
                tenant.initHeaderNotifications?.();
            } else {
                authStatus.innerHTML = `
                    <div class="auth-user-tools">
                        <span class="user-display">${this.escapeHtml(user.username)}</span>
                        <button onclick="auth.logout()" class="btn btn-secondary btn-sm" style="color: var(--primary); border: 1px solid var(--primary); padding: 0.5rem 1rem;">THOÁT</button>
                    </div>
                `;
            }
        } else {
            links = `<li><a href="#" onclick="app.renderHero()">Trang Chủ</a></li>`;
            navLinks.innerHTML = links;
            authStatus.innerHTML = `
                <button onclick="showLogin()" class="btn btn-primary btn-sm">Đăng Nhập</button>
            `;
        }
    },

    getHomeActionHandler(user) {
        if (!user) return 'showLogin()';
        if (user.role === 'Landlord') return 'landlord.init()';
        if (user.role === 'Tenant') return 'tenant.init()';
        return 'admin.loadUsers()';
    },

    renderHomePrimaryActions(user) {
        if (!user) {
            return `
                <button onclick="showRegister()" class="btn btn-primary">
                    <i class="fas fa-user-plus"></i> Tạo Tài Khoản
                </button>
                <button onclick="showLogin()" class="home-outline-action">
                    <i class="fas fa-right-to-bracket"></i> Đăng Nhập
                </button>
            `;
        }

        if (user.role === 'Landlord') {
            return `
                <button onclick="landlord.init()" class="btn btn-primary">
                    <i class="fas fa-building"></i> Mở Quản Lý Trọ
                </button>
                <button onclick="app.renderHero()" class="home-outline-action">
                    <i class="fas fa-chart-column"></i> Xem Mẫu Trang Chủ
                </button>
            `;
        }

        if (user.role === 'Tenant') {
            return `
                <button onclick="tenant.init()" class="btn btn-primary">
                    <i class="fas fa-bed"></i> Phòng Của Tôi
                </button>
                <button onclick="app.renderHero()" class="home-outline-action">
                    <i class="fas fa-bell"></i> Xem Tổng Quan
                </button>
            `;
        }

        return `
            <button onclick="admin.loadUsers()" class="btn btn-primary">
                <i class="fas fa-users-cog"></i> Vào Quản Trị
            </button>
            <button onclick="app.renderHero()" class="home-outline-action">
                <i class="fas fa-grid-2"></i> Xem Bố Cục
            </button>
        `;
    },

    renderHomeRoomCard(room, actionHandler) {
        const statusMap = {
            occupied: { label: 'Đã thuê', className: 'is-occupied' },
            vacant: { label: 'Đang trống', className: 'is-vacant' },
            attention: { label: 'Chưa thu phí', className: 'is-attention' }
        };
        const status = statusMap[room.status] || statusMap.occupied;

        return `
            <article class="home-room-card ${status.className}">
                <div class="home-room-top">
                    <div>
                        <h3>${this.escapeHtml(room.name)}</h3>
                        <p>${this.escapeHtml(room.block)}</p>
                    </div>
                    <span class="home-room-state ${status.className}">${status.label}</span>
                </div>

                <div class="home-room-chips">
                    ${room.quickActions.map(action => `
                        <button type="button" class="home-room-chip ${action.tone}" onclick="${actionHandler}">
                            ${this.escapeHtml(action.label)}
                        </button>
                    `).join('')}
                </div>

                <div class="home-room-body">
                    <p class="home-room-tenant"><i class="fas fa-user"></i> ${this.escapeHtml(room.tenant)}</p>
                    <p class="home-room-price"><i class="fas fa-money-bill-wave"></i> ${this.escapeHtml(room.price)}</p>
                    <p class="home-room-note">${this.escapeHtml(room.note)}</p>
                </div>

                <div class="home-room-footer">
                    <button type="button" class="home-room-action primary" onclick="${actionHandler}">
                        <i class="fas fa-pen-to-square"></i> Chỉnh sửa
                    </button>
                    <button type="button" class="home-room-action danger" onclick="${actionHandler}">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </div>
            </article>
        `;
    },

    renderHero() {
        const user = auth.getUser();
        if (user) {
            this.renderDashboard(user);
            return;
        }

        document.getElementById('main-content').innerHTML = `
            <section class="guest-home-shell">
                <div class="container guest-home-wrap">
                    <div class="guest-home-card">
                        <div class="guest-home-copy">
                            <span class="guest-home-eyebrow">Giao diện đơn giản</span>
                            <h1>Quản Lý <span>Nhà Trọ</span></h1>
                            <p>Đăng nhập để vào đúng không gian làm việc của bạn với bố cục gọn gàng và dễ nhìn hơn.</p>

                            <div class="guest-home-actions">
                                <button onclick="showLogin()" class="btn btn-primary">
                                    <i class="fas fa-right-to-bracket"></i> Đăng Nhập
                                </button>
                                <button onclick="showRegister()" class="guest-home-outline">
                                    <i class="fas fa-user-plus"></i> Tạo Tài Khoản
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    },

    renderDashboard(user) {
        if (user.role === 'Landlord') {
            landlord.init();
        } else if (user.role === 'Tenant') {
            tenant.init();
        } else {
            admin.loadUsers();
        }
    }
};

function showLogin() {
    document.getElementById('main-content').innerHTML = `
        <div class="auth-container">
            <div class="glass-card login-card animate-fadeIn">
                <h2 style="text-align: center; margin-bottom: 2rem; color: var(--primary);">
                    <i class="fas fa-lock"></i> Đăng Nhập
                </h2>
                <form onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label style="color: var(--text-dark); font-weight: 600;">Email</label>
                        <input type="email" id="login-email" required placeholder="admin@example.com" 
                               style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    <div class="form-group" style="margin-top: 1rem;">
                        <label style="color: var(--text-dark); font-weight: 600;">Mật khẩu</label>
                        <input type="password" id="login-password" required placeholder="••••••••"
                               style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 2rem; justify-content: center;">
                        ĐĂNG NHẬP <i class="fas fa-sign-in-alt"></i>
                    </button>
                    <p style="margin-top: 1.5rem; text-align: center; font-size: 0.9rem;">
                        Chưa có tài khoản? <a href="#" onclick="showRegister()" style="color: var(--primary); font-weight: 700; text-decoration: none;">Đăng ký ngay</a>
                    </p>
                </form>
            </div>
        </div>
    `;
}

function showRegister() {
    document.getElementById('main-content').innerHTML = `
        <div class="auth-container" style="padding: 2rem 0;">
            <div class="glass-card login-card animate-fadeIn" style="max-width: 500px;">
                <h2 style="text-align: center; margin-bottom: 2rem; color: var(--primary);">
                    <i class="fas fa-user-plus"></i> Đăng Ký
                </h2>
                <form onsubmit="handleRegister(event)">
                    <div class="form-group">
                        <label style="color: var(--text-dark); font-weight: 600;">Tên đăng nhập</label>
                        <input type="text" id="reg-username" required placeholder="username" 
                               style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    <div class="form-group" style="margin-top: 1rem;">
                        <label style="color: var(--text-dark); font-weight: 600;">Email</label>
                        <input type="email" id="reg-email" required placeholder="email@example.com"
                               style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    <div class="form-group" style="margin-top: 1rem;">
                        <label style="color: var(--text-dark); font-weight: 600;">Mật khẩu</label>
                        <input type="password" id="reg-password" required placeholder="••••••••"
                               style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    <div class="form-group" style="margin-top: 1rem; display: none;">
                        <input type="hidden" id="reg-role" value="Tenant">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 2rem; justify-content: center;">
                        TẠO TÀI KHOẢN <i class="fas fa-check-circle"></i>
                    </button>
                </form>
            </div>
        </div>
    `;
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    auth.login(email, password);
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    auth.register(username, email, password, 'Tenant');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Initial session check
app.init();
