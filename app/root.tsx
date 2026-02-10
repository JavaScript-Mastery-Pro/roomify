import React, { useEffect, useState } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import "../index.css";
import {
  getCurrentUser,
  signIn as puterSignIn,
  signOut as puterSignOut,
} from "../lib/puter.action";

export default function Root() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const refreshAuth = async () => {
    try {
      const user = await getCurrentUser();
      setIsSignedIn(!!user);
      setUserName(user?.username || null);
      setUserId(user?.uuid || null);
      return !!user;
    } catch {
      setIsSignedIn(false);
      setUserName(null);
      setUserId(null);
      return false;
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const signIn = async () => {
    const alreadySignedIn = await refreshAuth();
    if (alreadySignedIn) return true;
    await puterSignIn();
    return await refreshAuth();
  };

  const signOut = async () => {
    puterSignOut();
    return await refreshAuth();
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Roomify | AI Architectural Visualization</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <div className="min-h-screen bg-background text-foreground">
          <div className="relative z-10">
            <Outlet
              context={{
                isSignedIn,
                userName,
                userId,
                refreshAuth,
                signIn,
                signOut,
              }}
            />
          </div>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
