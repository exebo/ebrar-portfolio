const reportForm = document.getElementById("reportForm");
const reportList = document.getElementById("reportList");
const reportMessage = document.getElementById("reportMessage");

const visionForm = document.getElementById("visionForm");
const visionList = document.getElementById("visionList");
const visionMessage = document.getElementById("visionMessage");

const adminRequestList = document.getElementById("adminRequestList");

const userForm = document.getElementById("userForm");
const userList = document.getElementById("userList");
const userMessage = document.getElementById("userMessage");

const logoutButton = document.getElementById("logoutButton");
const currentAdmin = document.getElementById("currentAdmin");


async function checkLogin() {
    const response = await fetch("/api/admin/check");
    const data = await response.json();

    if (!data.loggedIn) {
        window.location.href = "/admin-login.html";
        return false;
    }

    currentAdmin.textContent = data.username;

    return true;
}


/* =====================================
   RAPORLAR
===================================== */

async function loadReports() {
    const response = await fetch("/api/reports");
    const reports = await response.json();

    reportList.innerHTML = "";

    if (reports.length === 0) {
        reportList.innerHTML =
            `<p class="empty">Henüz rapor yüklenmedi.</p>`;
        return;
    }

    reports.forEach(report => {
        const item = document.createElement("div");

        item.className = "admin-item";

        item.innerHTML = `
            <strong>${report.hafta}. Hafta</strong>

            <div class="actions">

                <a
                    href="${report.dosya}"
                    target="_blank"
                >
                    Görüntüle
                </a>

                <button
                    class="delete"
                    onclick="deleteReport(${report.hafta})"
                >
                    Sil
                </button>

            </div>
        `;

        reportList.appendChild(item);
    });
}


reportForm.addEventListener("submit", async event => {
    event.preventDefault();

    const response = await fetch(
        "/api/reports",
        {
            method: "POST",
            body: new FormData(reportForm)
        }
    );

    const result = await response.json();

    reportMessage.textContent =
        result.message || result.error;

    if (response.ok) {
        reportForm.reset();
        loadReports();
    }
});


async function deleteReport(week) {
    if (!confirm(`${week}. hafta raporu silinsin mi?`)) {
        return;
    }

    const response = await fetch(
        `/api/reports/${week}`,
        {
            method: "DELETE"
        }
    );

    const result = await response.json();

    if (!response.ok) {
        alert(result.error);
        return;
    }

    loadReports();
}


/* =====================================
   VİZYON
===================================== */

async function loadVision() {
    const response = await fetch("/api/vision");
    const files = await response.json();

    visionList.innerHTML = "";

    if (files.length === 0) {
        visionList.innerHTML =
            `<p class="empty">Henüz dosya yüklenmedi.</p>`;
        return;
    }

    files.forEach(file => {
        const item = document.createElement("div");

        item.className = "admin-item";

        item.innerHTML = `
            <strong>${file.title}</strong>

            <div class="actions">

                <a
                    href="${file.dosya}"
                    target="_blank"
                >
                    Görüntüle
                </a>

                <button
                    class="delete"
                    onclick="deleteVision('${file.type}')"
                >
                    Sil
                </button>

            </div>
        `;

        visionList.appendChild(item);
    });
}


visionForm.addEventListener("submit", async event => {
    event.preventDefault();

    const response = await fetch(
        "/api/vision",
        {
            method: "POST",
            body: new FormData(visionForm)
        }
    );

    const result = await response.json();

    visionMessage.textContent =
        result.message || result.error;

    if (response.ok) {
        visionForm.reset();
        loadVision();
    }
});


async function deleteVision(type) {
    if (!confirm("Dosya silinsin mi?")) {
        return;
    }

    const response = await fetch(
        `/api/vision/${type}`,
        {
            method: "DELETE"
        }
    );

    const result = await response.json();

    if (!response.ok) {
        alert(result.error);
        return;
    }

    loadVision();
}


/* =====================================
   TALEPLER
===================================== */

async function loadRequests() {
    const response = await fetch(
        "/api/admin/requests"
    );

    if (response.status === 401) {
        window.location.href =
            "/admin-login.html";
        return;
    }

    const requests = await response.json();

    adminRequestList.innerHTML = "";

    if (requests.length === 0) {
        adminRequestList.innerHTML =
            `<p class="empty">Henüz talep gelmedi.</p>`;
        return;
    }

    requests.forEach(request => {
        const card = document.createElement("div");

        card.className = "admin-request";

        card.innerHTML = `
            <div class="request-info">

                <span class="request-status">
                    ${request.status}
                </span>

                <h3>
                    ${escapeHtml(request.title)}
                </h3>

                <p>
                    ${escapeHtml(request.description)}
                </p>

                <div class="request-person">
                    <strong>
                        ${escapeHtml(request.name)}
                    </strong>

                    <span>
                        ${escapeHtml(request.email)}
                    </span>
                </div>

            </div>

            <div class="request-admin-actions">

                <select
                    onchange="changeRequestStatus(
                        '${request.id}',
                        this.value
                    )"
                >

                    <option
                        value="Bekliyor"
                        ${request.status === "Bekliyor" ? "selected" : ""}
                    >
                        Bekliyor
                    </option>

                    <option
                        value="Değerlendiriliyor"
                        ${request.status === "Değerlendiriliyor" ? "selected" : ""}
                    >
                        Değerlendiriliyor
                    </option>

                    <option
                        value="Tamamlandı"
                        ${request.status === "Tamamlandı" ? "selected" : ""}
                    >
                        Tamamlandı
                    </option>

                </select>

                <button
                    class="delete"
                    onclick="deleteRequest('${request.id}')"
                >
                    Talebi Sil
                </button>

            </div>
        `;

        adminRequestList.appendChild(card);
    });
}


async function changeRequestStatus(id, status) {
    const response = await fetch(
        `/api/admin/requests/${id}/status`,
        {
            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                status
            })
        }
    );

    const result = await response.json();

    if (!response.ok) {
        alert(result.error);
        loadRequests();
        return;
    }

    loadRequests();
}


async function deleteRequest(id) {
    if (!confirm("Bu talep silinsin mi?")) {
        return;
    }

    const response = await fetch(
        `/api/admin/requests/${id}`,
        {
            method: "DELETE"
        }
    );

    const result = await response.json();

    if (!response.ok) {
        alert(result.error);
        return;
    }

    loadRequests();
}


/* =====================================
   KULLANICILAR
===================================== */

async function loadUsers() {
    const response = await fetch(
        "/api/admin/users"
    );

    const users = await response.json();

    userList.innerHTML = "";

    users.forEach(user => {
        const item = document.createElement("div");

        item.className = "admin-item";

        item.innerHTML = `
            <div>
                <strong>
                    ${escapeHtml(user.username)}
                </strong>
            </div>

            <div class="actions">

                <button
                    onclick="changePassword('${user.id}')"
                >
                    Şifre Değiştir
                </button>

                <button
                    class="delete"
                    onclick="deleteUser('${user.id}')"
                >
                    Sil
                </button>

            </div>
        `;

        userList.appendChild(item);
    });
}


userForm.addEventListener("submit", async event => {
    event.preventDefault();

    const formData = new FormData(userForm);

    const username = formData.get("username");
    const password = formData.get("password");

    const response = await fetch(
        "/api/admin/users",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                username,
                password
            })
        }
    );

    const result = await response.json();

    userMessage.textContent =
        result.message || result.error;

    if (response.ok) {
        userForm.reset();
        loadUsers();
    }
});


async function changePassword(id) {
    const password = prompt(
        "Yeni şifreyi gir:"
    );

    if (!password) {
        return;
    }

    const response = await fetch(
        `/api/admin/users/${id}/password`,
        {
            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                password
            })
        }
    );

    const result = await response.json();

    alert(
        result.message ||
        result.error
    );
}


async function deleteUser(id) {
    if (!confirm("Bu yönetici silinsin mi?")) {
        return;
    }

    const response = await fetch(
        `/api/admin/users/${id}`,
        {
            method: "DELETE"
        }
    );

    const result = await response.json();

    if (!response.ok) {
        alert(result.error);
        return;
    }

    loadUsers();
}


/* =====================================
   ÇIKIŞ
===================================== */

logoutButton.addEventListener("click", async () => {
    await fetch(
        "/api/admin/logout",
        {
            method: "POST"
        }
    );

    window.location.href =
        "/admin-login.html";
});


/* =====================================
   HTML GÜVENLİĞİ
===================================== */

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =====================================
   BAŞLAT
===================================== */

async function startAdmin() {
    const loggedIn = await checkLogin();

    if (!loggedIn) {
        return;
    }

    loadReports();
    loadVision();
    loadRequests();
    loadUsers();
}

startAdmin();