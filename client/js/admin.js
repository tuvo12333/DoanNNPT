const admin = {
    async loadUsers() {
        try {
            const res = await fetch(`${API_URL}/users`, {
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            const users = await res.json();
            if (res.ok) {
                this.renderUsers(users);
            } else {
                showToast(users.message, 'error');
            }
        } catch (err) {
            showToast('Không thể tải danh sách người dùng', 'error');
        }
    },

    renderUsers(users) {
        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="container" style="padding-top: 3rem;">
            <div class="header-actions" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2><i class="fas fa-users-cog"></i> Quản Lý Người Dùng</h2>
                <button class="btn btn-primary" onclick="showRegister()"><i class="fas fa-user-plus"></i> Thêm User</button>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Quyền</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td>#${u.id}</td>
                                <td><strong>${u.username}</strong></td>
                                <td>${u.email}</td>
                                <td><span class="role-badge role-${u.role.name.toLowerCase()}">${u.role.name}</span></td>
                                <td>
                                    <button onclick="admin.deleteUser(${u.id})" class="action-btn btn-danger" title="Xóa người dùng">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async deleteUser(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
        try {
            const res = await fetch(`${API_URL}/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${auth.getToken()}` }
            });
            if (res.ok) {
                showToast('Đã xóa người dùng', 'success');
                this.loadUsers();
            } else {
                const data = await res.json();
                showToast(data.message, 'error');
            }
        } catch (err) {
            showToast('Lỗi khi xóa người dùng', 'error');
        }
    }
};
