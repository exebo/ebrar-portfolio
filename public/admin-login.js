const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");


loginForm.addEventListener(
    "submit",

    async function (event) {

        event.preventDefault();

        loginMessage.textContent = "";


        const username =
            document.getElementById("username").value;

        const password =
            document.getElementById("password").value;


        try {

            const response =
                await fetch("/api/admin/login", {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        username,
                        password
                    })

                });


            const result =
                await response.json();


            if (!response.ok) {

                loginMessage.textContent =
                    result.error ||
                    "Kullanıcı adı veya şifre yanlış.";

                return;
            }


            window.location.href =
                "/admin.html";


        } catch (error) {

            loginMessage.textContent =
                "Sunucuya bağlanılamadı.";

        }

    }
);