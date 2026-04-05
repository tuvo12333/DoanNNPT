const API_URL = 'http://localhost:5000/api';

const auth = {
    async login(email, password) {
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                showToast('Đăng nhập thành công', 'success');
                app.init();
            } else {
                showToast(data.message || 'Đăng nhập thất bại', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối server', 'error');
        }
    },

    async register(username, email, password, roleName) {
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, roleName })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Đăng ký thành công! Hãy đăng nhập', 'success');
                showLogin();
            } else {
                showToast(data.message || 'Đăng ký thất bại', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối server', 'error');
        }
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        showToast('Đã đăng xuất', 'info');
        app.init();
    },

    getToken() {
        return localStorage.getItem('token');
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
};
