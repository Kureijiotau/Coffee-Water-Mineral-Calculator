import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useAuth,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import App from "./App";
import { AccountSyncProvider } from "./AccountSyncProvider";
import "./index.css";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const queryClient = new QueryClient();

const clerkAppearance = {
  theme: shadcn,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#22d3ee",
    colorForeground: "#e2e8f0",
    colorMutedForeground: "#94a3b8",
    colorDanger: "#fb7185",
    colorBackground: "#0f172a",
    colorInput: "#020617",
    colorInputForeground: "#e2e8f0",
    colorNeutral: "#e2e8f0",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "flex w-full justify-center",
    cardBox: "w-[440px] max-w-full overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-900 shadow-2xl",
    card: "!rounded-none !border-0 !bg-transparent !shadow-none",
    footer: "!rounded-none !border-0 !bg-transparent !shadow-none",
    headerTitle: "font-semibold tracking-tight text-slate-100",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButtonText: "font-medium text-slate-100",
    formFieldLabel: "text-slate-300",
    footerActionLink: "font-semibold text-cyan-300 hover:text-cyan-200",
    footerActionText: "text-slate-400",
    dividerText: "text-slate-500",
    identityPreviewEditButton: "text-cyan-300 hover:text-cyan-200",
    formFieldSuccessText: "text-emerald-300",
    alertText: "text-rose-200",
    logoBox: "mb-3",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border-white/15 bg-slate-950/70 hover:bg-slate-800",
    formButtonPrimary: "bg-cyan-300 font-semibold text-slate-950 hover:bg-cyan-200",
    formFieldInput: "border-white/15 bg-slate-950 text-slate-100 placeholder:text-slate-500",
    footerAction: "border-t border-white/10",
    dividerLine: "border-white/10",
    alert: "border-rose-400/30 bg-rose-950/40",
    otpCodeFieldInput: "border-white/15 bg-slate-950 text-slate-100",
    formFieldRow: "gap-2",
    main: "text-slate-100",
  },
};

const localization = {
  signIn: {
    start: {
      title: "Welcome back",
      subtitle: "Sign in to sync your custom profiles and DIY concentrate inputs.",
    },
  },
  signUp: {
    start: {
      title: "Create your Watermancer account",
      subtitle: "Access your saved profiles and DIY concentrate inputs on every device.",
    },
  },
};

function stripBase(path: string): string {
  if (!basePath || !path.startsWith(basePath)) return path;
  return path.slice(basePath.length) || "/";
}

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-sm text-slate-300">
      Loading Watermancer…
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef(userId);

  useEffect(() => {
    if (previousUserId.current !== userId) {
      queryClient.clear();
      previousUserId.current = userId;
    }
  }, [queryClient, userId]);

  return null;
}

function CalculatorWorkspace() {
  return (
    <AccountSyncProvider>
      <App />
    </AccountSyncProvider>
  );
}

function HomeRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  return isSignedIn ? <Redirect to="/user-portal" /> : <CalculatorWorkspace />;
}

function UserPortalRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  return isSignedIn ? <CalculatorWorkspace /> : <Redirect to="/" />;
}

function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-10">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
      <a
        href={`${basePath}/`}
        className="mt-5 text-sm text-slate-400 underline decoration-slate-600 underline-offset-4 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
      >
        Continue without an account
      </a>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-10">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
      <a
        href={`${basePath}/`}
        className="mt-5 text-sm text-slate-400 underline decoration-slate-600 underline-offset-4 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
      >
        Continue without an account
      </a>
    </div>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={clerkAppearance}
      localization={localization}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={to => setLocation(stripBase(to))}
      routerReplace={to => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRoute} />
          <Route path="/user-portal" component={UserPortalRoute} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route component={() => <Redirect to="/" />} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function RootApp() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);