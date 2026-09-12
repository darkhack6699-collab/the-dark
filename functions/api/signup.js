const SIGNUP_LIMIT = 5;
const WINDOW = 60 * 60;
const SESSION_TTL = 7 * 24 * 60 * 60;
const PBKDF2_ITERATIONS = 120000;

function clean(v, max) {
  return String(v ?? "").trim().replace(/[<>]/g, "").slice(0, max);
}

function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomBytes(size) {
  return crypto.getRandomValues(new Uint8Array(size));
}

async function hashPassword(password) {
  const salt = randomBytes(16);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    key,
    256
  );

  return [
    "pbkdf2",
    "sha256",
    PBKDF2_ITERATIONS,
    base64url(salt),
    base64url(new Uint8Array(bits))
  ].join("$");
}

async function hashToken(token) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return base64url(new Uint8Array(hash));
}

function createToken() {
  return base64url(randomBytes(32));
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return Response.json(
        { error: "Invalid request." },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("CF-Connecting-IP") || "unknown";

    const rateKey =
      `signup:${ip}:${Math.floor(Date.now() / 1000 / WINDOW)}`;

    const current =
      await env.RATE_LIMIT?.get(rateKey);

    if (Number(current || 0) >= SIGNUP_LIMIT) {
      return Response.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429 }
      );
    }

    await env.RATE_LIMIT?.put(
      rateKey,
      String(Number(current || 0) + 1),
      { expirationTtl: WINDOW + 60 }
    );

    const name = clean(body.name, 120);
    const email = clean(body.email, 254).toLowerCase();
    const password = String(body.password ?? "");

    if (
      !name ||
      !validEmail(email) ||
      password.length < 8 ||
      password.length > 128
    ) {
      return Response.json(
        {
          error:
            "Please enter a valid name, email and password of 8-128 characters."
        },
        { status: 400 }
      );
    }

    const existing = await env.DB
      .prepare(
        "SELECT id FROM users WHERE email = ? LIMIT 1"
      )
      .bind(email)
      .first();

    if (existing) {
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash =
      await hashPassword(password);

    const result = await env.DB
      .prepare(
        `INSERT INTO users
        (name,email,password_hash,created_at)
        VALUES(?,?,?,datetime('now'))`
      )
      .bind(name, email, passwordHash)
      .run();

    const userId = result.meta.last_row_id;

    const sessionToken = createToken();
    const sessionId = await hashToken(sessionToken);

    const expiresAt =
      Math.floor(Date.now() / 1000) + SESSION_TTL;

    await env.DB
      .prepare(
        `INSERT INTO sessions
        (id,user_id,expires_at)
        VALUES(?,?,?)`
      )
      .bind(sessionId, userId, expiresAt)
      .run();

    if (env.RESEND_API_KEY) {
      try {
        await fetch(
          "https://api.resend.com/emails",
          {
            method: "POST",

            headers: {
              "Authorization":
                `Bearer ${env.RESEND_API_KEY}`,
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              from:
                env.MAIL_FROM ||
                "The Dark <onboarding@resend.dev>",

              to: [
                "dark.hack6699@gmail.com"
              ],

              subject:
                "New User Registered",

              text:
                `New user registration\n\n` +
                `Name: ${name}\n` +
                `Email: ${email}\n` +
                `Registered: ${new Date().toISOString()}\n\n` +
                `Password: NOT INCLUDED`
            })
          }
        );
      } catch (emailError) {
        console.error(
          "Signup email error:",
          emailError
        );
      }
    }

    const cookie =
      `dark_session=${sessionToken}; ` +
      `Path=/; ` +
      `HttpOnly; ` +
      `Secure; ` +
      `SameSite=Lax; ` +
      `Max-Age=${SESSION_TTL}`;

    return new Response(
      JSON.stringify({
        message:
          "Account created successfully.",
        user: {
          id: userId,
          name,
          email
        }
      }),
      {
        status: 201,
        headers: {
          "Content-Type":
            "application/json",
          "Set-Cookie": cookie
        }
      }
    );

  } catch (error) {
    console.error(
      "Signup error:",
      error
    );

    return Response.json(
      {
        error:
          "Server error. Please try again later."
      },
      { status: 500 }
    );
  }
}
