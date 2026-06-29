import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { GoogleOAuthProvider } from "@react-oauth/google"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { TooltipProvider } from "@/components/ui/tooltip"

const GOOGLE_CLIENT_ID = "961393758077-d7ldd3kq64dmfckfmqscvldemhm9pul2.apps.googleusercontent.com"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </StrictMode>
)
