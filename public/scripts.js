// ==========================================
// YAZI YAZMA EFEKTİ
// ==========================================

const words = [
    "Web Development",
    "Network",
    "Cyber Security",
    "Software Development"
];

const typing =
    document.getElementById("typing");

let word = 0;
let letter = 0;
let deleting = false;


function terminalTyping() {

    if (!typing) {
        return;
    }

    const current =
        words[word];


    if (!deleting) {

        typing.textContent =
            "> " +
            current.substring(
                0,
                letter + 1
            );

        letter++;


        if (
            letter ===
            current.length
        ) {

            deleting = true;

            setTimeout(
                terminalTyping,
                1400
            );

            return;
        }

    } else {

        typing.textContent =
            "> " +
            current.substring(
                0,
                letter - 1
            );

        letter--;


        if (letter === 0) {

            deleting = false;

            word++;


            if (
                word >=
                words.length
            ) {

                word = 0;

            }
        }
    }


    setTimeout(
        terminalTyping,
        deleting ? 35 : 80
    );

}

terminalTyping();



/* ==========================================
   HAFTALIK RAPORLAR
========================================== */

async function loadReports() {

    const reportGrid =
        document.getElementById(
            "reportGrid"
        );

    if (!reportGrid) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/reports"
            );

        const reports =
            await response.json();


        reportGrid.innerHTML = "";


        reports.forEach(
            report => {

                const card =
                    document.createElement(
                        "article"
                    );

                card.className =
                    "file-card";


                const number =
                    String(
                        report.hafta
                    ).padStart(
                        2,
                        "0"
                    );


                card.innerHTML = `

                    <div class="number">
                        ${number}
                    </div>

                    <div>

                        <small>
                            HAFTALIK RAPOR
                        </small>

                        <h3>
                            ${report.hafta}. Hafta
                        </h3>

                    </div>

                    <div class="file-buttons">

                        <a
                            href="${report.dosya}"
                            target="_blank"
                        >
                            Görüntüle →
                        </a>

                        <a
                            href="${report.dosya}"
                            download
                        >
                            PDF İndir
                        </a>

                    </div>

                `;


                reportGrid.appendChild(
                    card
                );

            }
        );

    } catch (error) {

        console.error(
            "Raporlar alınamadı:",
            error
        );

    }

}



/* ==========================================
   VİZYON DOSYALARI
========================================== */

async function loadVision() {

    const visionGrid =
        document.querySelector(
            ".vision-grid"
        );

    if (!visionGrid) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/vision"
            );

        const files =
            await response.json();


        visionGrid.innerHTML = "";


        files.forEach(
            file => {

                const card =
                    document.createElement(
                        "article"
                    );

                card.className =
                    "vision-card";


                card.innerHTML = `

                    <div class="pdf-icon">
                        PDF
                    </div>

                    <div>

                        <small>
                            SİSTEM ANALİZİ
                        </small>

                        <h3>
                            ${file.title}
                        </h3>

                    </div>

                    <div class="vision-buttons">

                        <a
                            href="${file.dosya}"
                            target="_blank"
                        >
                            Görüntüle
                        </a>

                        <a
                            href="${file.dosya}"
                            download
                        >
                            PDF İndir
                        </a>

                    </div>

                `;


                visionGrid.appendChild(
                    card
                );

            }
        );

    } catch (error) {

        console.error(
            "Vizyon dosyaları alınamadı:",
            error
        );

    }

}

/* ==========================================
   TALEP GÖNDER
========================================== */

const requestForm =
    document.getElementById("requestForm");

const requestMessage =
    document.getElementById("requestMessage");


if (requestForm) {

    requestForm.addEventListener(
        "submit",

        async event => {

            event.preventDefault();

            requestMessage.textContent =
                "Gönderiliyor...";


            const formData =
                new FormData(requestForm);


            const requestData = {

                name:
                    formData.get("name"),

                email:
                    formData.get("email"),

                title:
                    formData.get("title"),

                description:
                    formData.get("description")

            };


            try {

                const response =
                    await fetch(
                        "/api/requests",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    requestData
                                )
                        }
                    );


                const result =
                    await response.json();


                requestMessage.textContent =
                    result.message ||
                    result.error;


                if (response.ok) {

                    requestForm.reset();

                    loadPublicRequests();

                }

            } catch {

                requestMessage.textContent =
                    "Talep gönderilemedi.";

            }

        }
    );

}



/* ==========================================
   TALEP EDİLENLER
========================================== */

async function loadPublicRequests() {

    const container =
        document.getElementById(
            "publicRequestList"
        );


    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/requests/public"
            );


        const requests =
            await response.json();


        container.innerHTML = "";


        if (requests.length === 0) {

            container.innerHTML = `
                <p class="empty">
                    Henüz talep bulunmuyor.
                </p>
            `;

            return;
        }


        requests.forEach(
            (request, index) => {

                const card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "request-card";


                const completed =
                    request.status ===
                    "Tamamlandı";


                card.innerHTML = `

                    <span>
                        TALEP #${String(
                            index + 1
                        ).padStart(2, "0")}
                    </span>

                    <h3>
                        ${escapePublicHtml(
                            request.title
                        )}
                    </h3>

                    <p>
                        ${escapePublicHtml(
                            request.description
                        )}
                    </p>

                    <div class="
                        status
                        ${completed
                            ? "completed"
                            : ""}
                    ">
                        ${escapePublicHtml(
                            request.status
                        )}
                    </div>

                `;


                container.appendChild(
                    card
                );

            }
        );

    } catch (error) {

        console.error(
            "Talepler alınamadı:",
            error
        );

    }

}


function escapePublicHtml(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


loadPublicRequests();
loadReports();
loadVision();