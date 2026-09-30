import { app } from "../artifacts/api-server/dist/index.mjs";

export default function clerkProxyHandler(req, res) {
  const requestUrl = new URL(req.url || "/", "http://localhost");
  const proxyPath = requestUrl.searchParams.get("__clerk_path");

  if (proxyPath) {
    const segments = proxyPath.split("/");
    if (
      proxyPath.startsWith("/") ||
      segments.some((segment) => segment === "." || segment === "..")
    ) {
      res.statusCode = 400;
      res.end("Invalid Clerk proxy path");
      return;
    }

    requestUrl.searchParams.delete("__clerk_path");
    req.url = `/api/clerkproxy/${proxyPath}${requestUrl.search}`;
  }

  return app(req, res);
}