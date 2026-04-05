const app = {
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
        
        let links = `<li><a href="#" onclick="app.renderHero()">Trang Chủ</a></li>`;
        if (user) {
            if (user.role === 'Admin') {
                links += `<li><a href="#" onclick="admin.loadUsers()">Quản Lý User</a></li>`;
            } else if (user.role === 'Landlord') {
                links += `<li><a href="#">Quản Lý Phòng</a></li>`;
            } else {
                links += `<li><a href="#">Tìm Phòng</a></li>`;
            }
            navLinks.innerHTML = links;
            authStatus.innerHTML = `
                <span class="user-display">${user.username}</span>
                <button onclick="auth.logout()" class="btn btn-secondary btn-sm" style="color: var(--primary); border: 1px solid var(--primary); padding: 0.5rem 1rem;">THOÁT</button>
            `;
        } else {
            navLinks.innerHTML = links;
            authStatus.innerHTML = `
                <button onclick="showLogin()" class="btn btn-primary btn-sm">Đăng Nhập</button>
            `;
        }
    },

    renderHero() {
        const user = auth.getUser();
        document.getElementById('main-content').innerHTML = `
            <section class="hero-section">
                <div class="container hero-center">
                    <div class="hero-content">
                        <h1>Quản lý thông minh <br> <span style="color: var(--accent);">Kinh doanh Nhà trọ</span></h1>
                        <p style="margin-left: auto; margin-right: auto;">Ứng dụng công nghệ 4.0 giúp tối ưu hóa quy trình vận hành, quản lý khách thuê và doanh thu hiệu quả.</p>
                        ${!user ? `
                        <div class="cta-buttons" style="justify-content: center;">
                            <button onclick="showRegister()" class="btn btn-primary">
                                Đăng ký ngay <i class="fas fa-user-plus"></i>
                            </button>
                            <button onclick="showLogin()" class="btn btn-secondary">
                                Đăng nhập <i class="fas fa-sign-in-alt"></i>
                            </button>
                        </div>
                        ` : `
                        <div style="margin-top: 2rem;">
                            <button onclick="app.renderDashboard(auth.getUser())" class="btn btn-primary">
                                ĐẾN TRANG QUẢN LÝ <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                        `}
                    </div>
                </div>
            </section>

            <section class="container" style="padding: 4rem 0;">
                <div style="text-align: center; margin-bottom: 3rem;">
                    <h2 style="font-size: 2.5rem; color: var(--primary);">Tính năng nổi bật</h2>
                    <p style="color: var(--text-light);">Mọi thứ bạn cần để vận hành nhà trọ chuyên nghiệp</p>
                </div>
                <div class="feature-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem;">
                    <div class="glass-card">
                        <div class="card-icon"><i class="fas fa-hotel"></i></div>
                        <h3>Quản lý phòng</h3>
                        <p>Theo dõi tình trạng phòng trống, lịch đặt và bảo trì dễ dàng.</p>
                        <a href="#" style="color: var(--primary); font-weight: 700; text-decoration: none; margin-top: 1rem; display: block;">Xem chi tiết &rarr;</a>
                    </div>
                    <div class="glass-card">
                        <div class="card-icon"><i class="fas fa-users"></i></div>
                        <h3>Quản lý khách thuê</h3>
                        <p>Lưu trữ hồ sơ, hợp đồng và quản lý cư dân minh bạch.</p>
                        <a href="#" style="color: var(--primary); font-weight: 700; text-decoration: none; margin-top: 1rem; display: block;">Xem chi tiết &rarr;</a>
                    </div>
                    <div class="glass-card">
                        <div class="card-icon"><i class="fas fa-file-invoice-dollar"></i></div>
                        <h3>Hóa đơn & Thanh toán</h3>
                        <p>Tự động tạo hóa đơn tiền điện, nước và dịch vụ hàng tháng.</p>
                        <a href="#" style="color: var(--primary); font-weight: 700; text-decoration: none; margin-top: 1rem; display: block;">Xem chi tiết &rarr;</a>
                    </div>
                </div>
            </section>
        `;
    },

    renderDashboard(user) {
        document.getElementById('main-content').innerHTML = `
            <div class="container" style="padding-top: 5rem; display: flex; justify-content: center;">
                <div class="glass-card" style="max-width: 500px; text-align: center;">
                    <div style="margin-bottom: 1.5rem; font-size: 3rem; color: var(--primary);">
                        <i class="fas fa-user-astronaut"></i>
                    </div>
                    <h2>Chào mừng, ${user.username}!</h2>
                    <p>Bạn đang đăng nhập với tư cách là <strong>${user.role}</strong>.</p>
                    <p style="margin-top: 1.5rem; color: var(--text-light); font-style: italic;">
                        <i class="fas fa-tools"></i> Hệ thống chức năng dành riêng cho ${user.role} hiện đang được cập nhật.
                    </p>
                    <button class="btn btn-primary" style="margin-top: 2rem;">Khám Phá Ngay</button>
                </div>
            </div>
        `;
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
                    <div class="form-group" style="margin-top: 1rem;">
                        <label style="color: var(--text-dark); font-weight: 600;">Vai trò</label>
                        <select id="reg-role" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; background: white;">
                            <option value="Tenant">Người Thuê</option>
                            <option value="Landlord">Chủ Trọ</option>
                        </select>
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
    const role = document.getElementById('reg-role').value;
    auth.register(username, email, password, role);
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
