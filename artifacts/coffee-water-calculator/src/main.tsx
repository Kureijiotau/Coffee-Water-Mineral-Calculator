import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Route, Router as WouterRouter, Switch } from "wouter";
import App from "./App";
import { setAccountSyncScope } from "./accountSyncStorage";
import "./index.css";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const queryClient = new QueryClient();
setAccountSyncScope(null);

function RootApp() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/" component={App} />
          <Route component={() => <Redirect to="/" />} />
        </Switch>
      </QueryClientProvider>
    </WouterRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);