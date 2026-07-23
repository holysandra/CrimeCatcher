import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AiAgentPage from "./pages/AiAgentPage";
import FormPage from "./pages/FormPage";
import { usePath } from "./router";
import "./index.css";

function Root() {
  const path = usePath();
  if (path === "/aiagent") return <AiAgentPage />;
  if (path === "/form") return <FormPage />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
