import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

type VisitorDetails = {
  visitorId: string;
  method: string;
  path: string;
  queryString: string | null;
  referrer: string | null;
  userAgent: string | null;
  acceptLanguage: string | null;
  ipAddress: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: string | null;
  secChUa: string | null;
  secChUaMobile: boolean | null;
  secChUaPlatform: string | null;
  metadata: Record<string, string | boolean | null>;
};

const VISIT_ENDPOINT_PATH = "/api/visit";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const VISIT_DEBUG_HEADER = "x-visit-tracking";

function isDebugEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.VISIT_TRACKING_DEBUG === "true";
}

function parseBooleanHeader(value: string | null) {
  if (value === null) {
    return null;
  }

  return value === "?1" || value === "1" || value === "true";
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");

  if (!forwardedFor) {
    return null;
  }

  return forwardedFor.split(",")[0]?.trim() ?? null;
}

function getVisitorIdCookieName() {
  return "hs_visitor_id";
}

function getVisitorId(request: NextRequest) {
  const cookieName = getVisitorIdCookieName();
  return request.cookies.get(cookieName)?.value ?? crypto.randomUUID();
}

function getSkipReason(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === VISIT_ENDPOINT_PATH) {
    return "visit-endpoint";
  }

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return "framework-or-api";
  }

  if (pathname.includes(".")) {
    return "static-file";
  }

  const purpose = request.headers.get("purpose");
  const nextRouterPrefetch = request.headers.get("next-router-prefetch");

  if (purpose === "prefetch" || nextRouterPrefetch === "1") {
    return "prefetch";
  }

  return null;
}

function parseUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return {
      browser: null,
      browserVersion: null,
      os: null,
      osVersion: null,
      deviceType: null,
    };
  }

  const browserPatterns = [
    { name: "Edge", pattern: /Edg\/([\d.]+)/ },
    { name: "Chrome", pattern: /Chrome\/([\d.]+)/ },
    { name: "Firefox", pattern: /Firefox\/([\d.]+)/ },
    { name: "Safari", pattern: /Version\/([\d.]+).*Safari/ },
    { name: "Opera", pattern: /OPR\/([\d.]+)/ },
  ];

  const osPatterns = [
    { name: "Windows", pattern: /Windows NT ([\d.]+)/ },
    { name: "macOS", pattern: /Mac OS X ([\d_]+)/ },
    { name: "iOS", pattern: /iPhone OS ([\d_]+)/ },
    { name: "iPadOS", pattern: /CPU OS ([\d_]+)/ },
    { name: "Android", pattern: /Android ([\d.]+)/ },
    { name: "Linux", pattern: /Linux/ },
  ];

  const browserMatch = browserPatterns.find(({ pattern }) => pattern.test(userAgent));
  const osMatch = osPatterns.find(({ pattern }) => pattern.test(userAgent));

  const browserVersion = browserMatch?.pattern.exec(userAgent)?.[1] ?? null;
  const osVersion = osMatch?.pattern.exec(userAgent)?.[1]?.replaceAll("_", ".") ?? null;

  return {
    browser: browserMatch?.name ?? null,
    browserVersion,
    os: osMatch?.name ?? null,
    osVersion,
    deviceType: /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent) ? "mobile" : "desktop",
  };
}

function buildVisitorDetails(input: {
  visitorId: string;
  method: string;
  path: string;
  queryString: string | null;
  referrer: string | null;
  userAgent: string | null;
  acceptLanguage: string | null;
  ipAddress: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  secChUa: string | null;
  secChUaMobile: boolean | null;
  secChUaPlatform: string | null;
}): VisitorDetails {
  const parsedUserAgent = parseUserAgent(input.userAgent);

  return {
    visitorId: input.visitorId,
    method: input.method,
    path: input.path,
    queryString: input.queryString,
    referrer: input.referrer,
    userAgent: input.userAgent,
    acceptLanguage: input.acceptLanguage,
    ipAddress: input.ipAddress,
    country: input.country,
    region: input.region,
    city: input.city,
    timezone: input.timezone,
    browser: parsedUserAgent.browser,
    browserVersion: parsedUserAgent.browserVersion,
    os: parsedUserAgent.os,
    osVersion: parsedUserAgent.osVersion,
    deviceType: parsedUserAgent.deviceType,
    secChUa: input.secChUa,
    secChUaMobile: input.secChUaMobile,
    secChUaPlatform: input.secChUaPlatform,
    metadata: {
      pathname: input.path,
      queryString: input.queryString,
      referrer: input.referrer,
      ipAddress: input.ipAddress,
      country: input.country,
      region: input.region,
      city: input.city,
      timezone: input.timezone,
      acceptLanguage: input.acceptLanguage,
      secChUa: input.secChUa,
      secChUaMobile: input.secChUaMobile,
      secChUaPlatform: input.secChUaPlatform,
    },
  };
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const response = NextResponse.next();
  const skipReason = getSkipReason(request);

  if (skipReason) {
    response.headers.set(VISIT_DEBUG_HEADER, `skip:${skipReason}`);
    if (isDebugEnabled()) {
      console.error("[visit-tracking] proxy skip", {
        path: request.nextUrl.pathname,
        reason: skipReason,
      });
    }
    return response;
  }

  response.headers.set(VISIT_DEBUG_HEADER, "hit");

  const visitorId = getVisitorId(request);
  const requestUrl = request.nextUrl;
  const geo = (request as NextRequest & {
    geo?: {
      country?: string;
      region?: string;
      city?: string;
    };
  }).geo;
  const payload = buildVisitorDetails({
    visitorId,
    method: request.method,
    path: requestUrl.pathname,
    queryString: requestUrl.search || null,
    referrer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
    acceptLanguage: request.headers.get("accept-language"),
    ipAddress: getClientIp(request),
    country: request.headers.get("x-vercel-ip-country") ?? geo?.country ?? null,
    region: request.headers.get("x-vercel-ip-country-region") ?? geo?.region ?? null,
    city: request.headers.get("x-vercel-ip-city") ?? geo?.city ?? null,
    timezone: request.headers.get("x-vercel-ip-timezone") ?? null,
    secChUa: request.headers.get("sec-ch-ua"),
    secChUaMobile: parseBooleanHeader(request.headers.get("sec-ch-ua-mobile")),
    secChUaPlatform: request.headers.get("sec-ch-ua-platform"),
  });

  const visitUrl = new URL(VISIT_ENDPOINT_PATH, request.url);

  if (isDebugEnabled()) {
    console.error("[visit-tracking] proxy hit", {
      method: request.method,
      path: requestUrl.pathname,
      payload,
      visitorId,
      visitUrl: visitUrl.toString(),
    });
  }

  event.waitUntil(
    fetch(visitUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })
      .then((result) => {
        if (isDebugEnabled()) {
          console.error("[visit-tracking] api response", {
            status: result.status,
            ok: result.ok,
          });
        }
      })
      .catch((error) => {
        console.error("Visit tracking request failed", error);
      })
  );

  response.cookies.set({
    name: getVisitorIdCookieName(),
    value: visitorId,
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE,
  });

  return response;
}

export const config = {
  matcher: ["/((?!api/visit|api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};