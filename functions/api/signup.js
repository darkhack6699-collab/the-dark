const MAX_NAME = 120;
const MAX_EMAIL = 254;
const MAX_PASSWORD = 128;

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

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return Response.json(
        { error: "Invalid request." },
        { status: 400 }
      );
    }

    const name = clean(body.name, MAX_NAME);
    const email = clean(body.email, MAX_EMAIL).toLowerCase();
    const password = String(body.password ?? "").slice(0, MAX_PASSWORD);

    if (!name || !validEmail(email) || password.length < 8) {
      return Response.json(
        { error: "Please enter a valid name, email and password of at least 8 characters." },
        { status: 400 }
      );
    }

    const existing = await env.DB
      .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
      .bind(email)
      .first();

    if (existing) {
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const result = await env.DB
      .prepare(
        "INSERT INTO users(name,email,password_hash) VALUES(?,?,?)"
      )
      .bind(name, email, passwordHash)
      .run();

    if (!result.success) {
      return Response.json(
        { error: "Could not create the account." },
        { status: 500 }
      );
    }

    if (env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.MAIL_FROM || "The Dark <onboarding@resend.dev>",
          to: ["dark.hack6699@gmail.com"],
          subject: "New User Registered",
          text:
            `A new user created an account.\n\n` +
            `Name: ${name}\n` +
            `Email: ${email}\n` +
            `Registered: ${new Date().toISOString()}`
        })
      });
    }

    return Response.json({
      message: "Account created successfully."
    });

  } catch (error) {
    console.error("Signup error:", error);

    return Response.json(
      { error: "Server error. Please try again later." },
      { status: 500 }
    );
  }
}
