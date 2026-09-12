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

```
const result = await response.json().catch(() => ({}));

if (!response.ok) {
  throw new Error(result.error || "Submission failed");
}

statusEl.textContent =
  result.message || "Submitted successfully.";

form.reset();
```

} catch (error) {
statusEl.textContent = error.message;
}
}

/* ================= CONTACT FORM ================= */

const contactForm =
document.getElementById("contactForm");

if (contactForm) {

contactForm.addEventListener("submit", (event) => {

```
event.preventDefault();

submitForm(
  event.currentTarget,
  "/api/contact",
  document.getElementById("contactStatus")
);
```

});

}

/* ================= WORK FORM ================= */

const workForm =
document.getElementById("workForm");

if (workForm) {

workForm.addEventListener("submit", (event) => {

```
event.preventDefault();

submitForm(
  event.currentTarget,
  "/api/work",
  document.getElementById("workStatus")
);
```

});

}

/* ================= LANGUAGE ================= */

const lang =
document.getElementById("lang");

if (lang) {

const savedLanguage =
localStorage.getItem("dark_lang");

if (savedLanguage) {
lang.value = savedLanguage;
}

lang.addEventListener("change", (event) => {

```
if (event.target.value === "ar") {

  alert(
    "Arabic translation will be added in the next step."
  );

}

localStorage.setItem(
  "dark_lang",
  event.target.value
);
```

});

}

/* ================= AUTH ELEMENTS ================= */

const loginPanel =
document.getElementById("loginPanel");

const signupPanel =
document.getElementById("signupPanel");

const accountPanel =
document.getElementById("accountPanel");

const loginBtn =
document.getElementById("loginBtn");

const signupBtn =
document.getElementById("signupBtn");

const showLogin =
document.getElementById("showLogin");

const showSignup =
document.getElementById("showSignup");

const logoutBtn =
document.getElementById("logoutBtn");

/* ================= SHOW LOGIN ================= */

function showLoginPanel() {

if (!loginPanel || !signupPanel) {
return;
}

loginPanel.hidden = false;
signupPanel.hidden = true;

if (accountPanel) {
accountPanel.hidden = true;
}

const auth =
document.getElementById("auth");

if (auth) {

```
auth.scrollIntoView({
  behavior: "smooth"
});
```

}

}

/* ================= SHOW SIGNUP ================= */

function showSignupPanel() {

if (!loginPanel || !signupPanel) {
return;
}

loginPanel.hidden = true;
signupPanel.hidden = false;

if (accountPanel) {
accountPanel.hidden = true;
}

const auth =
document.getElementById("auth");

if (auth) {

```
auth.scrollIntoView({
  behavior: "smooth"
});
```

}

}

/* ================= SHOW ACCOUNT ================= */

function showAccount(user) {

if (!accountPanel) {
return;
}

if (loginPanel) {
loginPanel.hidden = true;
}

if (signupPanel) {
signupPanel.hidden = true;
}

accountPanel.hidden = false;

const accountName =
document.getElementById("accountName");

const accountEmail =
document.getElementById("accountEmail");

const accountCreated =
document.getElementById("accountCreated");

if (accountName) {
accountName.textContent =
user.name || "-";
}

if (accountEmail) {
accountEmail.textContent =
user.email || "-";
}

if (accountCreated) {

```
if (user.created_at) {

  const date =
    new Date(user.created_at);

  accountCreated.textContent =
    date.toLocaleString();

} else {

  accountCreated.textContent =
    "-";

}
```

}

}

/* ================= BUTTONS ================= */

if (loginBtn) {

loginBtn.addEventListener(
"click",
showLoginPanel
);

}

if (signupBtn) {

signupBtn.addEventListener(
"click",
showSignupPanel
);

}

if (showLogin) {

showLogin.addEventListener(
"click",
showLoginPanel
);

}

if (showSignup) {

showSignup.addEventListener(
"click",
showSignupPanel
);

}

/* ================= SIGN UP ================= */

const signupForm =
document.getElementById("signupForm");

if (signupForm) {

signupForm.addEventListener(
"submit",
async (event) => {

```
  event.preventDefault();

  const status =
    document.getElementById(
      "signupStatus"
    );

  const data =
    Object.fromEntries(
      new FormData(signupForm).entries()
    );


  if (
    data.password !==
    data.confirmPassword
  ) {

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

    const response =
      await fetch("/api/signup", {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        credentials: "include",

        body: JSON.stringify({

          name: data.name,

          email: data.email,

          password: data.password

        })

      });


    const result =
      await response.json()
        .catch(() => ({}));


    if (!response.ok) {

      throw new Error(
        result.error ||
        "Could not create account."
      );

    }


    status.textContent =
      "Account created successfully!";


    signupForm.reset();


    /* The signup endpoint creates a session,
       so check the session immediately. */

    await checkSession();


  } catch (error) {

    status.textContent =
      error.message;

  }

}
```

);

}

/* ================= LOGIN ================= */

const loginForm =
document.getElementById("loginForm");

if (loginForm) {

loginForm.addEventListener(
"submit",
async (event) => {

```
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
      await fetch("/api/login", {

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

      });


    const result =
      await response.json()
        .catch(() => ({}));


    if (!response.ok) {

      throw new Error(
        result.error ||
        "Login failed."
      );

    }


    loginForm.reset();

    status.textContent =
      "Login successful!";


    if (result.user) {

      showAccount(result.user);

    } else {

      await checkSession();

    }


  } catch (error) {

    status.textContent =
      error.message;

  }

}
```

);

}

/* ================= LOGOUT ================= */

if (logoutBtn) {

logoutBtn.addEventListener(
"click",
async () => {

```
  const status =
    document.getElementById(
      "accountStatus"
    );


  if (status) {
    status.textContent =
      "Logging out...";
  }


  try {

    const response =
      await fetch("/api/logout", {

        method: "POST",

        credentials: "include"

      });


    const result =
      await response.json()
        .catch(() => ({}));


    if (!response.ok) {

      throw new Error(
        result.error ||
        "Logout failed."
      );

    }


    if (accountPanel) {
      accountPanel.hidden = true;
    }


    if (status) {
      status.textContent = "";
    }


    showLoginPanel();


  } catch (error) {

    if (status) {
      status.textContent =
        error.message;
    }

  }

}
```

);

}

/* ================= CHECK SESSION ================= */

async function checkSession() {

try {

```
const response =
  await fetch("/api/me", {

    method: "GET",

    credentials: "include"

  });


if (!response.ok) {

  if (accountPanel) {
    accountPanel.hidden = true;
  }

  if (loginPanel) {
    loginPanel.hidden = false;
  }

  if (signupPanel) {
    signupPanel.hidden = true;
  }

  return;

}


const result =
  await response.json();


if (
  result.authenticated &&
  result.user
) {

  showAccount(result.user);

} else {

  showLoginPanel();

}
```

} catch (error) {

```
console.error(
  "Session check failed:",
  error
);
```

}

}

/* ================= START SESSION CHECK ================= */

checkSession();
