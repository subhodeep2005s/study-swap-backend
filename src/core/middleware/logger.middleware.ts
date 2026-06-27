import type { NextFunction, Request, Response } from "express";
import { logger } from "@/config/logger";

const c = {
    r: "\x1b[0m",
    b: "\x1b[1m",
    d: "\x1b[2m",
    red: "\x1b[31m",
    grn: "\x1b[32m",
    ylw: "\x1b[33m",
    cyn: "\x1b[36m",
    mag: "\x1b[35m",
    blu: "\x1b[34m",
    gry: "\x1b[90m",
};

const methodColor = {
    GET: c.grn,
    POST: c.blu,
    PUT: c.ylw,
    DELETE: c.red,
    PATCH: c.mag,
};

const statusColor = (s: number) =>
    s >= 500 ? c.red : s >= 400 ? c.ylw : s >= 300 ? c.cyn : c.grn;

const fmt = (v: unknown, d = 0): string => {
    if (d > 2 || v === null || v === undefined) return c.gry + String(v) + c.r;
    if (typeof v === "string") {
        const t = v.length > 60 ? v.slice(0, 57) + "..." : v;
        return c.cyn + `"${t}"` + c.r;
    }
    if (typeof v === "number") return c.ylw + v + c.r;
    if (typeof v === "boolean") return (v ? c.grn : c.red) + v + c.r;
    if (Array.isArray(v)) {
        if (!v.length) return c.gry + "[]" + c.r;
        const items = v.slice(0, 2).map((x) => fmt(x, d + 1));
        return v.length > 2
            ? `${c.mag}[${items.join(", ")}, ...${v.length - 2} more]${c.r}`
            : `${c.mag}[${items.join(", ")}]${c.r}`;
    }
    if (typeof v === "object") {
        const keys = Object.keys(v as object);
        if (!keys.length) return c.gry + "{}" + c.r;
        const entries = keys
            .slice(0, 3)
            .map((k) => `${c.blu}${k}${c.r}: ${fmt((v as any)[k], d + 1)}`);
        return keys.length > 3
            ? `{ ${entries.join(", ")}, ...${keys.length - 3} more }`
            : `{ ${entries.join(", ")} }`;
    }
    return String(v);
};

const logData = (label: string, data: unknown, id: string) => {
    if (!data || (typeof data === "object" && !Object.keys(data as object).length))
        return;
    logger.info(
        `${c.gry}[${id}]${c.r} ${c.mag}${label}${c.r} ${fmt(data)}`
    );
};

const logErr = (err: unknown, id: string) => {
    if (!err) return;
    if (err instanceof Error) {
        const stack = err.stack
            ?.split("\n")
            .slice(1, 4)
            .map((l) => `${c.gry}[${id}]   ${l.trim()}${c.r}`)
            .join("\n");
        logger.error(
            `${c.red}[${id}] ✗ ${err.name}: ${err.message}${c.r}${stack ? "\n" + stack : ""}`
        );
    } else {
        logger.error(`${c.red}[${id}] ✗ ${String(err)}${c.r}`);
    }
};

export const requestLogger = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (req.url?.includes("health")) {
        next();
        return;
    }

    const start = Date.now();
    const id = (req as any).id || Math.random().toString(36).slice(2, 9);
    const mColor = methodColor[req.method as keyof typeof methodColor] || c.mag;

    logger.info(
        `${c.b}[${id}]${c.r} ${mColor}${req.method.padEnd(6)}${c.r} ${c.cyn}${req.url}${c.r}`
    );

    if (req.query && Object.keys(req.query).length) logData("query", req.query, id);
    if (req.params && Object.keys(req.params).length) logData("params", req.params, id);
    if (
        req.body &&
        typeof req.body === "object" &&
        Object.keys(req.body).length &&
        !["GET", "HEAD"].includes(req.method)
    ) {
        logData("body", req.body, id);
    }

    const origSend = res.send;
    res.send = function (body: unknown) {
        const ms = Date.now() - start;
        const st = res.statusCode;
        const sColor = statusColor(st);
        const lvl = st >= 500 ? "error" : st >= 400 ? "warn" : "info";

        logger[lvl](
            `${c.b}[${id}]${c.r} ${mColor}${req.method.padEnd(6)}${c.r} ${c.cyn}${req.url}${c.r} ${sColor}${st}${c.r} ${c.d}${ms}ms${c.r}`
        );

        if (
            body &&
            typeof body === "object" &&
            res.get("Content-Type")?.includes("json")
        ) {
            try {
                const raw = JSON.stringify(body);
                if (raw.length < 1500) logData("response", body, id);
            } catch { }
        }

        return origSend.call(this, body);
    };

    const origNext = next;
    next = (err?: unknown) => {
        if (err) logErr(err, id);
        origNext(err);
    };

    next();
};