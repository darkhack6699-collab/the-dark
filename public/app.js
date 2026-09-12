async function submitForm(form, endpoint, statusEl) {
  const data = Object.fromEntries(new FormData(form).entries());

  statusEl.textContent = "Sending...";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Submission failed");
    }

    statusEl.textContent =
      result.message || "Submitted successfully.";

    form.reset();

  } catch (error) {
    statusEl.textContent = error.message;
  }
}


/* CONTACT */

const contactForm = document.getElementById("contactForm");

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    submitForm(
      event.currentTarget,
      "/api/contact",
      document.getElementById("contactStatus")
    );
  });
}


/* WORK WITH ME */

const workForm = document.getElementById("workForm");

if (workForm) {
  workForm.addEventListener("submit", (event) => {
    event.preventDefault();

    submitForm(
      event.currentTarget,
      "/api/work",
      document.getElementById("workStatus")
    );
  });
}


/* LANGUAGE */

const lang = document.getElementById("lang");

if (lang) {
  lang.addEventListener("change", (event) => {

    if (event.target.value === "ar") {
      alert(
        "Arabic selector is ready for expansion. The current public content is English by default."
      );
    }

    localStorage.setItem(
      "dark_lang",
      event.target.value
    );
  });
}


/* ACCOUNT PANELS */

const loginPanel = document.getElementById("loginPanel");
const signupPanel = document.getElementById("signupPanel");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");

const showLogin = document.getElementById("showLogin");
const showSignup = document.getElementById("showSignup");


function showLoginPanel() {

  if (!loginPanel || !signupPanel) return;

  loginPanel.hidden = false;
  signupPanel.hidden = true;

  const auth = document.getElementById("auth");

  if (auth) {
    auth.scrollIntoView({
      behavior: "smooth"
    });
  }
}


function showSignupPanel() {

  if (!loginPanel || !signupPanel) return;

  loginPanel.hidden = true;
  signupPanel.hidden = false;

  const auth = document.getElementById("auth");

  if (auth) {
    auth.scrollIntoView({
      behavior: "smooth"
    });
  }
}


if (loginBtn) {
  loginBtn.addEventListener("click", showLoginPanel);
}

if (signupBtn) {
  signupBtn.addEventListener("click", showSignupPanel);
}

if (showLogin) {
  showLogin.addEventListener("click", showLoginPanel);
}

if (showSignup) {
  showSignup.addEventListener("click", showSignupPanel);
}


/* SIGN UP */

const signupForm = document.getElementById("signupForm");

if (signupForm) {

  signupForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const status =
      document.getElementById("signupStatus");

    const data =
      Object.fromEntries(
        new FormData(signupForm).entries()
      );


    if (data.password !== data.confirmPassword) {

      status.textContent =
        "Passwords do not match.";

      return;
    }


    if (data.password.length < 8) {

      status.textContent =
        "Password must be at least 8 characters.";

      return;
    }


    status.textContent =
      "Creating account...";


    try {

      const response = await fetch(
        "/api/signup",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          credentials: "include",

          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: data.password
          })
        }
      );


      const result =
        await response.json().catch(() => ({}));


      if (!response.ok) {

        throw new Error(
          result.error ||
          "Could not create account."
        );
      }


      status.textContent =
        "Account created successfully!";


      signupForm.reset();


      setTimeout(() => {
        showLoginPanel();
      }, 1000);


    } catch (error) {

      status.textContent =
        error.message;

    }

  });

}


/* LOGIN */

const loginForm =
  document.getElementById("loginForm");


if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const status =
        document.getElementById(
          "loginStatus"
        );


      const data =
        Object.fromEntries(
          new FormData(loginForm).entries()
        );


      status.textContent =
        "Logging in...";


      try {

        const response =
          await fetch(
            "/api/login",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              credentials: "include",

              body: JSON.stringify({
                email: data.email,
                password: data.password
              })
            }
          );


        const result =
          await response
            .json()
            .catch(() => ({}));


        if (!response.ok) {

          throw new Error(
            result.error ||
            "Login failed."
          );

        }


        status.textContent =
          `Welcome, ${result.user.name}!`;


        loginForm.reset();


      } catch (error) {

        status.textContent =
          error.message;

      }

    }
  );

}
