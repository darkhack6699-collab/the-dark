function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hashToken(token) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return base64url(new Uint8Array(hash));
}

function getSessionToken(request) {
  const cookies =
    request.headers.get("Cookie") || "";

  const match =
    cookies.match(
      /(?:^|;\s*)dark_session=([^;]+)/
    );

  return match ? match[1] : null;
}

export async function onRequestGet({ request, env }) {
  try {
    const token = getSessionToken(request);

    if (!token) {
      return Response.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const sessionId =
      await hashToken(token);

    const now =
      Math.floor(Date.now() / 1000);

    const session =
      await env.DB
        .prepare(
          `SELECT
             sessions.id,
             sessions.expires_at,
             users.id AS user_id,
             users.name,
             users.email,
             users.created_at
           FROM sessions
           JOIN users
             ON users.id = sessions.user_id
           WHERE sessions.id = ?
             AND sessions.expires_at > ?
           LIMIT 1`
        )
        .bind(sessionId, now)
        .first();

    if (!session) {
      return new Response(
        JSON.stringify({
          authenticated: false
        }),
        {
          status: 401,
          headers: {
            "Content-Type":
              "application/json",
            "Set-Cookie":
              "dark_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
          }
        }
      );
    }

    return Response.json({
      authenticated: true,
      user: {
        id: session.user_id,
        name: session.name,
        email: session.email,
        created_at: session.created_at
      }
    });

  } catch (error) {
    console.error(
      "Session check error:",
      error
    );

    return Response.json(
      { error: "Server error." },
      { status: 500 }
    );
  }
}
