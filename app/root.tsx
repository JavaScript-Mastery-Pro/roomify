import { useEffect, useState } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import "../index.css";
import {
  getCurrentUser,
  signIn as puterSignIn,
  signOut as puterSignOut,
} from "../lib/puter.action";

interface AuthState {
  isSignedIn: boolean;
  userName: string | null;
  userId: string | null;
}

const DEFAULT_AUTH_STATE: AuthState = {
  isSignedIn: false,
  userName: null,
  userId: null,
};

export default function Root() {
  const [authState, setAuthState] = useState<AuthState>(DEFAULT_AUTH_STATE);

  const refreshAuth = async () => {
    try {
      const user = await getCurrentUser();
      setAuthState({
        isSignedIn: !!user,
        userName: user?.username || null,
        userId: user?.uuid || null,
      });
      return !!user;
    } catch {
      setAuthState(DEFAULT_AUTH_STATE);
      return false;
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const signIn = async () => {
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
                ...authState,
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
