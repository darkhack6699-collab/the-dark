const LOGIN_LIMIT = 5;
const WINDOW = 15 * 60;
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

function base64urlToBytes(value) {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);

  const binary = atob(padded);
  return new Uint8Array(
    [...binary].map(char => char.charCodeAt(0))
  );
}

async function hashPassword(password, salt) {
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

  return new Uint8Array(bits);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;

  let difference = 0;

  for (let i = 0; i < a.length; i++) {
    difference |= a[i] ^ b[i];
  }

  return difference === 0;
}

async function verifyPassword(password, stored) {
  const parts = String(stored).split("$");

  if (
    parts.length !== 5 ||
    parts[0] !== "pbkdf2" ||
    parts[1] !== "sha256"
  ) {
    return false;
  }

  const iterations = Number(parts[2]);

  if (!Number.isInteger(iterations) || iterations < 100000) {
    return false;
  }

  const salt = base64urlToBytes(parts[3]);
  const expected = base64urlToBytes(parts[4]);

  const actual = await hashPassword(
    password,
    salt
  );

  return constantTimeEqual(actual, expected);
}

function createToken() {
  const bytes =
    crypto.getRandomValues(
      new Uint8Array(32)
    );

  return base64url(bytes);
}

async function hashToken(token) {
  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );

  return base64url(
    new Uint8Array(hash)
  );
}

function getCookie(request, name) {
  const header =
    request.headers.get("Cookie") || "";

  const cookies = header.split(";");

  for (const cookie of cookies) {
    const [key, ...value] =
      cookie.trim().split("=");

    if (key === name) {
      return value.join("=");
    }
  }

  return null;
}

export async function onRequestPost({
  request,
  env
}) {
  try {

    const body =
      await request.json().catch(() => null);

    if (!body) {
      return Response.json(
        { error: "Invalid request." },
        { status: 400 }
      );
    }

    const email =
      clean(body.email, 254).toLowerCase();

    const password =
      String(body.password ?? "");

    if (
      !validEmail(email) ||
      password.length === 0
    ) {
      return Response.json(
        {
          error:
            "Please enter a valid email and password."
        },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get(
        "CF-Connecting-IP"
      ) || "unknown";

    const rateKey =
      `login:${ip}:${Math.floor(
        Date.now() / 1000 / WINDOW
      )}`;

    const current =
      await env.RATE_LIMIT?.get(rateKey);

    if (
      Number(current || 0) >= LOGIN_LIMIT
    ) {
      return Response.json(
        {
          error:
            "Too many login attempts. Please try again in 15 minutes."
        },
        { status: 429 }
      );
    }

    const user =
      await env.DB
        .prepare(
          `SELECT id,name,email,password_hash,created_at
           FROM users
           WHERE email = ?
           LIMIT 1`
        )
        .bind(email)
        .first();

    if (!user) {

      await env.RATE_LIMIT?.put(
        rateKey,
        String(Number(current || 0) + 1),
        {
          expirationTtl:
            WINDOW + 60
        }
      );

      return Response.json(
        {
          error:
            "Invalid email or password."
        },
        { status: 401 }
      );
    }

    const valid =
      await verifyPassword(
        password,
        user.password_hash
      );

    if (!valid) {

      await env.RATE_LIMIT?.put(
        rateKey,
        String(Number(current || 0) + 1),
        {
          expirationTtl:
            WINDOW + 60
        }
      );

      return Response.json(
        {
          error:
            "Invalid email or password."
        },
        { status: 401 }
      );
    }

    /*
      Successful login:
      reset the current login-attempt counter.
    */

    await env.RATE_LIMIT?.delete(rateKey);

    /*
      Remove old expired sessions.
    */

    await env.DB
      .prepare(
        "DELETE FROM sessions WHERE expires_at <= ?"
      )
      .bind(
        Math.floor(Date.now() / 1000)
      )
      .run();

    /*
      Create a new session.
    */

    const sessionToken =
      createToken();

    const sessionId =
      await hashToken(sessionToken);

    const expiresAt =
      Math.floor(Date.now() / 1000) +
      SESSION_TTL;

    await env.DB
      .prepare(
        `INSERT INTO sessions
        (id,user_id,expires_at)
        VALUES(?,?,?)`
      )
      .bind(
        sessionId,
        user.id,
        expiresAt
      )
      .run();

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
          "Login successful.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.created_at
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json",
          "Set-Cookie":
            cookie
        }
      }
    );

  } catch (error) {

    console.error(
      "Login error:",
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
