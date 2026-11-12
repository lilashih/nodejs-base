const express = require("express");
const fs = require("fs");
const { frontendPath, frontendIndexPath } = require("@src/config/frontend.js");
const defaultEmbeddedAssets = require("@src/http/asset/embeddedAssets.js");

const registerFrontendRoutes = (app, options = {}) => {
    const embeddedSource = options.embeddedAssets ?? defaultEmbeddedAssets;
    const forceEmbedded = Boolean(options.forceEmbedded);
    const hasPhysical = !forceEmbedded && fs.existsSync(frontendIndexPath);

    app.get("/", (req, res) => res.redirect(302, "/app/"));
    app.get(/^\/app$/, (req, res) => res.redirect(302, "/app/"));

    if (hasPhysical) {
        app.use(
            "/app",
            express.static(frontendPath, {
                index: false,
                fallthrough: true,
                setHeaders: (res, filePath) => {
                    const normalized = filePath.replace(/\\/g, "/");
                    if (normalized.includes("/assets/")) {
                        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
                    }
                },
            }),
        );
        app.get("/app/{*path}", (req, res, next) => {
            const relativePath = req.path.slice("/app/".length);
            const lastSegment = relativePath.split("/").at(-1) ?? "";
            if (relativePath.startsWith("assets/") || lastSegment.includes(".") || !req.accepts("html")) {
                return next();
            }
            res.setHeader("Cache-Control", "no-cache");
            return res.sendFile(frontendIndexPath, (error) => {
                if (error && !res.headersSent) next(error);
            });
        });
        return;
    }

    if (embeddedSource.hasEmbeddedFrontend) {
        app.use("/app", (req, res, next) => {
            if (req.method !== "GET" && req.method !== "HEAD") {
                return next();
            }

            const relativePath = req.path.replace(/^\/+/, "");
            const asset = embeddedSource.getEmbeddedAsset(relativePath);
            if (!asset) {
                return next();
            }

            if (req.headers["if-none-match"] === asset.etag) {
                return res.status(304).end();
            }

            res.setHeader("Content-Type", asset.contentType);
            res.setHeader("ETag", asset.etag);
            if (relativePath.startsWith("assets/")) {
                res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            }

            if (req.method === "HEAD") {
                return res.status(200).end();
            }

            return res.status(200).send(asset.content);
        });

        app.get("/app/{*path}", (req, res, next) => {
            const relativePath = req.path.slice("/app/".length);
            const lastSegment = relativePath.split("/").at(-1) ?? "";
            if (relativePath.startsWith("assets/") || lastSegment.includes(".") || !req.accepts("html")) {
                return next();
            }

            const indexAsset = embeddedSource.getEmbeddedIndex();
            if (!indexAsset) {
                return next();
            }

            if (req.headers["if-none-match"] === indexAsset.etag) {
                return res.status(304).end();
            }

            res.setHeader("Content-Type", indexAsset.contentType);
            res.setHeader("ETag", indexAsset.etag);
            res.setHeader("Cache-Control", "no-cache");

            if (req.method === "HEAD") {
                return res.status(200).end();
            }

            return res.status(200).send(indexAsset.content);
        });
    }
};

module.exports = { registerFrontendRoutes };
