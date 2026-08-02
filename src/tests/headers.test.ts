import nextConfig from "../../next.config";

describe("Security Headers Configuration", () => {
  test("defines headers function returning security headers for all routes", async () => {
    expect(nextConfig.headers).toBeDefined();
    if (nextConfig.headers) {
      const routes = await nextConfig.headers();
      expect(routes.length).toBeGreaterThan(0);
      const rootRoute = routes.find((r) => r.source === "/:path*");
      expect(rootRoute).toBeDefined();

      const headerKeys = rootRoute?.headers.map((h) => h.key);
      expect(headerKeys).toContain("X-DNS-Prefetch-Control");
      expect(headerKeys).toContain("Strict-Transport-Security");
      expect(headerKeys).toContain("X-Frame-Options");
      expect(headerKeys).toContain("X-Content-Type-Options");
      expect(headerKeys).toContain("Referrer-Policy");
      expect(headerKeys).toContain("X-XSS-Protection");
      expect(headerKeys).toContain("Permissions-Policy");
    }
  });
});
