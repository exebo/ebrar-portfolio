const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
require("dotenv").config();
const app = express();
const PORT = 3000;

/* =====================================
   POSTGRESQL
===================================== */

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT)
});
async function testDatabase() {
    try {
        await pool.query("SELECT NOW()");

        console.log("PostgreSQL bağlantısı başarılı.");
    } catch (error) {
        console.error(
            "PostgreSQL bağlantı hatası:",
            error.message
        );
    }
}

/* =====================================
   KLASÖRLER
===================================== */

const publicDir = path.join(
    __dirname,
    "public"
);

const reportsDir = path.join(
    __dirname,
    "uploads",
    "reports"
);

const visionDir = path.join(
    __dirname,
    "uploads",
    "vision"
);

fs.mkdirSync(
    reportsDir,
    { recursive: true }
);

fs.mkdirSync(
    visionDir,
    { recursive: true }
);

/* =====================================
   MIDDLEWARE
===================================== */

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);

/* =====================================
   SESSION
===================================== */

const sessions = new Map();

function getCookies(req) {
    const cookies = {};

    if (!req.headers.cookie) {
        return cookies;
    }

    req.headers.cookie
        .split(";")
        .forEach(cookie => {

            const parts =
                cookie.trim().split("=");

            const key =
                parts.shift();

            const value =
                parts.join("=");

            cookies[key] =
                decodeURIComponent(value);
        });

    return cookies;
}

function getSession(req) {
    const cookies =
        getCookies(req);

    const token =
        cookies.admin_session;

    if (!token) {
        return null;
    }

    return sessions.get(token) || null;
}

function adminOnly(req, res, next) {
    const session =
        getSession(req);

    if (!session) {
        return res.status(401).json({
            error:
                "Oturum süreniz dolmuş. Tekrar giriş yapın."
        });
    }

    req.admin = session;

    next();
}

/* =====================================
   İLK ADMIN
===================================== */

async function createFirstAdmin() {
    try {
        const result =
            await pool.query(
                "SELECT COUNT(*) FROM users"
            );

        const count =
            Number(result.rows[0].count);

        if (count === 0) {
            const hashedPassword =
                bcrypt.hashSync(
                    "123456",
                    10
                );

            await pool.query(
                `
                INSERT INTO users
                (username, password)
                VALUES ($1, $2)
                `,
                [
                    "ebrar",
                    hashedPassword
                ]
            );

            console.log(
                "İlk admin oluşturuldu."
            );
        }
    } catch (error) {
        console.error(
            "Admin oluşturma hatası:",
            error.message
        );
    }
}

/* =====================================
   ADMIN LOGIN
===================================== */

app.post(
    "/api/admin/login",
    async (req, res) => {

        try {
            const username =
                String(
                    req.body.username || ""
                ).trim();

            const password =
                String(
                    req.body.password || ""
                );

            const result =
                await pool.query(
                    `
                    SELECT *
                    FROM users
                    WHERE LOWER(username)
                    = LOWER($1)
                    LIMIT 1
                    `,
                    [username]
                );

            if (result.rows.length === 0) {
                return res
                    .status(401)
                    .json({
                        error:
                            "Kullanıcı adı veya şifre yanlış."
                    });
            }

            const user =
                result.rows[0];

            const correct =
                bcrypt.compareSync(
                    password,
                    user.password
                );

            if (!correct) {
                return res
                    .status(401)
                    .json({
                        error:
                            "Kullanıcı adı veya şifre yanlış."
                    });
            }

            const token =
                crypto
                    .randomBytes(32)
                    .toString("hex");

            sessions.set(
                token,
                {
                    userId: user.id,
                    username:
                        user.username
                }
            );

            res.setHeader(
                "Set-Cookie",
                `admin_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`
            );

            res.json({
                message:
                    "Giriş başarılı."
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                error:
                    "Giriş sırasında hata oluştu."
            });
        }
    }
);

/* =====================================
   ADMIN CHECK
===================================== */

app.get(
    "/api/admin/check",
    (req, res) => {

        const session =
            getSession(req);

        res.json({
            loggedIn:
                Boolean(session),

            username:
                session
                    ? session.username
                    : null
        });
    }
);

/* =====================================
   LOGOUT
===================================== */

app.post(
    "/api/admin/logout",
    (req, res) => {

        const cookies =
            getCookies(req);

        if (cookies.admin_session) {
            sessions.delete(
                cookies.admin_session
            );
        }

        res.setHeader(
            "Set-Cookie",
            "admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
        );

        res.json({
            message:
                "Çıkış yapıldı."
        });
    }
);

/* =====================================
   ADMIN SAYFASI
===================================== */

app.get(
    "/admin.html",
    (req, res) => {

        if (!getSession(req)) {
            return res.redirect(
                "/admin-login.html"
            );
        }

        res.sendFile(
            path.join(
                publicDir,
                "admin.html"
            )
        );
    }
);

/* =====================================
   KULLANICILAR
===================================== */

app.get(
    "/api/admin/users",
    adminOnly,
    async (req, res) => {

        try {
            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        username,
                        created_at
                    FROM users
                    ORDER BY created_at ASC
                    `
                );

            res.json(result.rows);

        } catch (error) {
            res.status(500).json({
                error:
                    "Kullanıcılar alınamadı."
            });
        }
    }
);

app.post(
    "/api/admin/users",
    adminOnly,
    async (req, res) => {

        try {
            const username =
                String(
                    req.body.username || ""
                ).trim();

            const password =
                String(
                    req.body.password || ""
                );

            if (username.length < 3) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Kullanıcı adı en az 3 karakter olmalı."
                    });
            }

            if (password.length < 6) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Şifre en az 6 karakter olmalı."
                    });
            }

            const exists =
                await pool.query(
                    `
                    SELECT id
                    FROM users
                    WHERE LOWER(username)
                    = LOWER($1)
                    `,
                    [username]
                );

            if (exists.rows.length > 0) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Bu kullanıcı adı zaten var."
                    });
            }

            const hash =
                bcrypt.hashSync(
                    password,
                    10
                );

            await pool.query(
                `
                INSERT INTO users
                (username, password)
                VALUES ($1, $2)
                `,
                [
                    username,
                    hash
                ]
            );

            res.json({
                message:
                    "Yönetici oluşturuldu."
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                error:
                    "Yönetici oluşturulamadı."
            });
        }
    }
);

/* =====================================
   ŞİFRE DEĞİŞTİR
===================================== */

app.put(
    "/api/admin/users/:id/password",
    adminOnly,
    async (req, res) => {

        try {
            const password =
                String(
                    req.body.password || ""
                );

            if (password.length < 6) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Şifre en az 6 karakter olmalı."
                    });
            }

            const hash =
                bcrypt.hashSync(
                    password,
                    10
                );

            const result =
                await pool.query(
                    `
                    UPDATE users
                    SET password = $1
                    WHERE id = $2
                    RETURNING id
                    `,
                    [
                        hash,
                        req.params.id
                    ]
                );

            if (
                result.rows.length === 0
            ) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Kullanıcı bulunamadı."
                    });
            }

            res.json({
                message:
                    "Şifre değiştirildi."
            });

        } catch (error) {
            res.status(500).json({
                error:
                    "Şifre değiştirilemedi."
            });
        }
    }
);

/* =====================================
   KULLANICI SİL
===================================== */

app.delete(
    "/api/admin/users/:id",
    adminOnly,
    async (req, res) => {

        try {
            const id =
                Number(req.params.id);

            if (
                Number(req.admin.userId)
                === id
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Giriş yaptığın hesabı silemezsin."
                    });
            }

            const count =
                await pool.query(
                    "SELECT COUNT(*) FROM users"
                );

            if (
                Number(
                    count.rows[0].count
                ) <= 1
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Son yönetici silinemez."
                    });
            }

            const result =
                await pool.query(
                    `
                    DELETE FROM users
                    WHERE id = $1
                    RETURNING id
                    `,
                    [id]
                );

            if (
                result.rows.length === 0
            ) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Kullanıcı bulunamadı."
                    });
            }

            res.json({
                message:
                    "Yönetici silindi."
            });

        } catch (error) {
            res.status(500).json({
                error:
                    "Yönetici silinemedi."
            });
        }
    }
);

/* =====================================
   TALEP OLUŞTUR
===================================== */

app.post(
    "/api/requests",
    async (req, res) => {

        try {
            const name =
                String(
                    req.body.name || ""
                ).trim();

            const email =
                String(
                    req.body.email || ""
                ).trim();

            const title =
                String(
                    req.body.title || ""
                ).trim();

            const description =
                String(
                    req.body.description || ""
                ).trim();

            if (
                !name ||
                !email ||
                !title ||
                !description
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Tüm alanları doldurun."
                    });
            }

            if (
                !email.includes("@")
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Geçerli bir e-posta girin."
                    });
            }

            await pool.query(
                `
                INSERT INTO requests
                (
                    name,
                    email,
                    title,
                    description,
                    status
                )
                VALUES
                ($1, $2, $3, $4, $5)
                `,
                [
                    name,
                    email,
                    title,
                    description,
                    "Bekliyor"
                ]
            );

            res.json({
                message:
                    "Talebiniz gönderildi."
            });

        } catch (error) {
            console.error(error);

            res.status(500).json({
                error:
                    "Talep gönderilemedi."
            });
        }
    }
);

/* =====================================
   PUBLIC TALEPLER
===================================== */

app.get(
    "/api/requests/public",
    async (req, res) => {

        try {
            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        title,
                        description,
                        status,
                        created_at
                    FROM requests
                    ORDER BY created_at DESC
                    `
                );

            res.json(result.rows);

        } catch (error) {
            res.status(500).json({
                error:
                    "Talepler alınamadı."
            });
        }
    }
);

/* =====================================
   ADMIN TALEPLER
===================================== */

app.get(
    "/api/admin/requests",
    adminOnly,
    async (req, res) => {

        try {
            const result =
                await pool.query(
                    `
                    SELECT *
                    FROM requests
                    ORDER BY created_at DESC
                    `
                );

            res.json(result.rows);

        } catch (error) {
            res.status(500).json({
                error:
                    "Talepler alınamadı."
            });
        }
    }
);

/* =====================================
   TALEP DURUMU
===================================== */

app.put(
    "/api/admin/requests/:id/status",
    adminOnly,
    async (req, res) => {

        try {
            const allowed = [
                "Bekliyor",
                "Değerlendiriliyor",
                "Tamamlandı"
            ];

            const status =
                req.body.status;

            if (
                !allowed.includes(status)
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Geçersiz durum."
                    });
            }

            const result =
                await pool.query(
                    `
                    UPDATE requests
                    SET status = $1
                    WHERE id = $2
                    RETURNING id
                    `,
                    [
                        status,
                        req.params.id
                    ]
                );

            if (
                result.rows.length === 0
            ) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Talep bulunamadı."
                    });
            }

            res.json({
                message:
                    "Durum güncellendi."
            });

        } catch (error) {
            res.status(500).json({
                error:
                    "Durum güncellenemedi."
            });
        }
    }
);

/* =====================================
   TALEP SİL
===================================== */

app.delete(
    "/api/admin/requests/:id",
    adminOnly,
    async (req, res) => {

        try {
            const result =
                await pool.query(
                    `
                    DELETE FROM requests
                    WHERE id = $1
                    RETURNING id
                    `,
                    [req.params.id]
                );

            if (
                result.rows.length === 0
            ) {
                return res
                    .status(404)
                    .json({
                        error:
                            "Talep bulunamadı."
                    });
            }

            res.json({
                message:
                    "Talep silindi."
            });

        } catch (error) {
            res.status(500).json({
                error:
                    "Talep silinemedi."
            });
        }
    }
);

/* =====================================
   PDF FİLTRE
===================================== */

function pdfFilter(
    req,
    file,
    cb
) {
    if (
        file.mimetype
        === "application/pdf"
    ) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Sadece PDF yükleyebilirsin."
            )
        );
    }
}

/* =====================================
   RAPORLAR
===================================== */

const reportStorage =
    multer.diskStorage({

        destination(
            req,
            file,
            cb
        ) {
            cb(
                null,
                reportsDir
            );
        },

        filename(
            req,
            file,
            cb
        ) {
            const week =
                Number(
                    req.body.hafta
                );

            if (
                !Number.isInteger(week) ||
                week < 1 ||
                week > 14
            ) {
                return cb(
                    new Error(
                        "Geçersiz hafta."
                    )
                );
            }

            cb(
                null,
                `hafta${week}.pdf`
            );
        }
    });

const reportUpload =
    multer({
        storage:
            reportStorage,

        fileFilter:
            pdfFilter,

        limits: {
            fileSize:
                20 * 1024 * 1024
        }
    });

app.post(
    "/api/reports",
    adminOnly,
    reportUpload.single("pdf"),
    (req, res) => {

        res.json({
            message:
                "Rapor yüklendi."
        });
    }
);

app.get(
    "/api/reports",
    (req, res) => {

        const files =
            fs.readdirSync(
                reportsDir
            );

        const reports =
            files

                .filter(
                    file =>
                        /^hafta\d+\.pdf$/i
                            .test(file)
                )

                .map(file => {

                    const match =
                        file.match(/\d+/);

                    return {
                        hafta:
                            Number(
                                match[0]
                            ),

                        dosya:
                            `/uploads/reports/${file}`
                    };
                })

                .sort(
                    (a, b) =>
                        a.hafta -
                        b.hafta
                );

        res.json(reports);
    }
);

app.delete(
    "/api/reports/:week",
    adminOnly,
    (req, res) => {

        const week =
            Number(
                req.params.week
            );

        if (
            !Number.isInteger(week) ||
            week < 1 ||
            week > 14
        ) {
            return res
                .status(400)
                .json({
                    error:
                        "Geçersiz hafta."
                });
        }

        const file =
            path.join(
                reportsDir,
                `hafta${week}.pdf`
            );

        if (
            !fs.existsSync(file)
        ) {
            return res
                .status(404)
                .json({
                    error:
                        "Rapor bulunamadı."
                });
        }

        fs.unlinkSync(file);

        res.json({
            message:
                "Rapor silindi."
        });
    }
);

/* =====================================
   VİZYON
===================================== */

const visionStorage =
    multer.diskStorage({

        destination(
            req,
            file,
            cb
        ) {
            cb(
                null,
                visionDir
            );
        },

        filename(
            req,
            file,
            cb
        ) {

            if (
                req.body.type
                === "vision"
            ) {
                cb(
                    null,
                    "vizyon.pdf"
                );

            } else if (
                req.body.type
                === "actor-goal"
            ) {
                cb(
                    null,
                    "aktor-goal.pdf"
                );

            } else {
                cb(
                    new Error(
                        "Geçersiz dosya türü."
                    )
                );
            }
        }
    });

const visionUpload =
    multer({
        storage:
            visionStorage,

        fileFilter:
            pdfFilter,

        limits: {
            fileSize:
                20 * 1024 * 1024
        }
    });

app.post(
    "/api/vision",
    adminOnly,
    visionUpload.single("pdf"),
    (req, res) => {

        res.json({
            message:
                "Dosya yüklendi."
        });
    }
);

app.get(
    "/api/vision",
    (req, res) => {

        const files =
            fs.readdirSync(
                visionDir
            );

        const result = [];

        if (
            files.includes(
                "vizyon.pdf"
            )
        ) {
            result.push({
                type:
                    "vision",

                title:
                    "Vizyon Dokümanı",

                dosya:
                    "/uploads/vision/vizyon.pdf"
            });
        }

        if (
            files.includes(
                "aktor-goal.pdf"
            )
        ) {
            result.push({
                type:
                    "actor-goal",

                title:
                    "Aktör - Goal İlişkisi",

                dosya:
                    "/uploads/vision/aktor-goal.pdf"
            });
        }

        res.json(result);
    }
);

app.delete(
    "/api/vision/:type",
    adminOnly,
    (req, res) => {

        let filename;

        if (
            req.params.type
            === "vision"
        ) {
            filename =
                "vizyon.pdf";

        } else if (
            req.params.type
            === "actor-goal"
        ) {
            filename =
                "aktor-goal.pdf";

        } else {
            return res
                .status(400)
                .json({
                    error:
                        "Geçersiz dosya türü."
                });
        }

        const file =
            path.join(
                visionDir,
                filename
            );

        if (
            !fs.existsSync(file)
        ) {
            return res
                .status(404)
                .json({
                    error:
                        "Dosya bulunamadı."
                });
        }

        fs.unlinkSync(file);

        res.json({
            message:
                "Dosya silindi."
        });
    }
);

/* =====================================
   PUBLIC
===================================== */

app.use(
    express.static(
        publicDir
    )
);

/* =====================================
   HATA
===================================== */

app.use(
    (err, req, res, next) => {

        console.error(err);

        res
            .status(400)
            .json({
                error:
                    err.message ||
                    "Bir hata oluştu."
            });
    }
);

/* =====================================
   SERVER BAŞLAT
===================================== */

async function startServer() {
    await testDatabase();

    await createFirstAdmin();

    app.listen(
        PORT,
        () => {

            console.log(
                `Site: http://localhost:${PORT}`
            );

            console.log(
                `Admin: http://localhost:${PORT}/admin-login.html`
            );

        }
    );
}

startServer();