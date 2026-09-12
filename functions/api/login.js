const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days

function clean(v, max) {
  return String(v ?? "").trim().replace(/[<>]/g, "").slice(0, max);
}

function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(hash);
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  return [...bytes]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashToken(token) {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(hash);
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

    const email = clean(body.email, 254).toLowerCase();
    const password = String(body.password ?? "").slice(0, 128);

    if (!validEmail(email) || !password) {
      return Response.json(
        { error: "Please enter a valid email and password." },
        { status: 400 }
      );
    }

    const user = await env.DB
      .prepare(
        "SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1"
      )
      .bind(email)
      .first();

    if (!user) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordHash = await hashPassword(password);

    if (passwordHash !== user.password_hash) {
      return Response.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const sessionToken = randomToken();
    const sessionId = await hashToken(sessionToken);

    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL;

    await env.DB
      .prepare(
        "INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)"
      )
      .bind(sessionId, user.id, expiresAt)
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
        message: "Login successful.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookie
        }
      }
    );
  } catch (error) {
    console.error("Login error:", error);

    return Response.json(
      { error: "Server error. Please try again later." },
      { status: 500 }
    );
  }
}
