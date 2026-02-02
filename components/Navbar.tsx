import { useOutletContext } from "react-router";
import { Box } from "lucide-react";

import { Button } from "./ui/Button";

const Navbar = () => {
  const { isSignedIn, userName, signIn, signOut } =
    useOutletContext<AuthContext>();

  const handleAuthClick = async () => {
    if (isSignedIn) {
      try {
        await signOut();
      } catch (error) {
        console.error("Puter sign-out failed:", error);
      }
      return;
    }

    try {
      await signIn();
    } catch (error) {
      console.error("Puter sign-in failed:", error);
    }
  };

  return (
    <nav className="navbar">
      <div className="inner">
        <div className="left">
          <div className="brand">
            <Box className="logo" strokeWidth={2.5} />
            <span className="name">Roomify</span>
          </div>
          <div className="links">
            <a href="#">Product</a>
            <a href="#">Pricing</a>
            <a href="#">Community</a>
            <a href="#">Enterprise</a>
          </div>
        </div>

        <div className="actions">
          {isSignedIn && (
            <span className="greeting">
              {userName ? `Hi, ${userName}` : "Signed in"}
            </span>
          )}
          {isSignedIn ? (
            <Button size="sm" onClick={handleAuthClick} className="btn">
              Log Out
            </Button>
          ) : (
            <>
              <button
                onClick={handleAuthClick}
                className="login"
              >
                Log In
              </button>
              <a href="#upload" className="cta">
                Get Started
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
