module.exports = {
    jwt: {
        secret: process.env.JWT_SECRET ?? "",
        expiresIn: process.env.JWT_EXPIRES_IN ?? "1h",
        issuer: process.env.JWT_ISSUER ?? "nodejs-base",
        audience: process.env.JWT_AUDIENCE ?? "nodejs-base-api",
        algorithm: "HS256",
    },
    cookie: {
        name: "token",
        path: "/api",
        secure: String(process.env.COOKIE_SECURE ?? "false").trim().toLowerCase() === "true",
    },
    bcrypt: {
        saltRounds: 12,
    },
};

