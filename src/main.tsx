import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { TRPCProvider } from "./providers/trpc";
import { LanguageProvider } from "./lib/i18n/LanguageContext";
import { FarmProvider } from "./hooks/useFarm";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("عنصر root غير موجود في index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <LanguageProvider>
      <TRPCProvider>
        <FarmProvider>
          <App />
        </FarmProvider>
      </TRPCProvider>
    </LanguageProvider>
  </StrictMode>
);
