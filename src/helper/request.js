const parseResponseData = async (response) => {
    const responseText = await response.text();
    if (!responseText) return null;

    try {
        return JSON.parse(responseText);
    } catch {
        return responseText;
    }
};

const appendQueryString = (url, data = {}) => {
    const params = new URLSearchParams();

    Object.entries(data ?? {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
            value.forEach((item) => params.append(key, String(item)));
            return;
        }
        params.append(key, String(value));
    });

    const queryString = params.toString();
    return queryString ? `${url}${url.includes("?") ? "&" : "?"}${queryString}` : url;
};

const getHeader = (headers, target) => {
    const key = Object.keys(headers).find((item) => item.toLowerCase() === target.toLowerCase());
    return key ? headers[key] : undefined;
};

const buildBody = (data, headers, bodyType) => {
    if (data === null || data === undefined) return null;
    if (data instanceof FormData) return data;

    if (bodyType === "formData") {
        if (typeof data !== "object" || Array.isArray(data)) {
            throw new TypeError("formData 必須使用物件或 FormData");
        }
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== null && typeof value === "object" && !(value instanceof Blob)) {
                throw new TypeError(`formData 欄位 ${key} 不可使用陣列或物件`);
            }
            formData.append(key, value instanceof Blob ? value : String(value ?? ""));
        });
        return formData;
    }

    if (bodyType === "urlEncoded") {
        if (!getHeader(headers, "Content-Type")) headers["Content-Type"] = "application/x-www-form-urlencoded";
        return new URLSearchParams(data).toString();
    }
    if (typeof data === "object") {
        if (!getHeader(headers, "Content-Type")) headers["Content-Type"] = "application/json";
        return JSON.stringify(data);
    }

    return data;
};

const safeErrorUrl = (url) => {
    try {
        return new URL(url).origin;
    } catch {
        return "[網址無法解析]";
    }
};

const buildRequestError = ({ response, data, url, method, cause, errorType }) => {
    const httpCode = response?.status || 500;
    const message = errorType === "timeout" ? "第三方請求逾時"
        : errorType === "cancelled" ? "第三方請求已取消" : `第三方請求失敗（HTTP ${httpCode}）`;
    const error = new Error(message);
    error.name = "RequestError";
    error.httpCode = httpCode;
    error.data = data;
    error.url = safeErrorUrl(url);
    error.method = method;
    error.response = { httpCode, data, url: error.url, method };
    if (errorType) error.errorType = errorType;
    if (cause) error.cause = cause;
    return error;
};

const normalizeResponseHeaders = (headers) => {
    if (!headers || typeof headers.entries !== "function") return {};
    return Object.fromEntries(headers.entries());
};

const request = async (method, url, data = null, headers = {}, options = {}) => {
    const normalizedMethod = String(method || "GET").toUpperCase();
    const requestHeaders = { ...headers };
    const timeout = options.timeout ?? 8000;
    if (!Number.isSafeInteger(timeout) || timeout <= 0) {
        throw new TypeError("options.timeout 必須是大於 0 的整數毫秒數");
    }
    const queryMethod = normalizedMethod === "GET" || normalizedMethod === "HEAD";
    const hasQuery = Object.hasOwn(options, "query");
    const hasBody = Object.hasOwn(options, "body");
    if (data !== null && data !== undefined && ((queryMethod && hasQuery) || (!queryMethod && hasBody))) {
        throw new TypeError("data 不可與 options.query 或 options.body 重複指定");
    }
    if (queryMethod && options.body !== null && options.body !== undefined) {
        throw new TypeError(`${normalizedMethod} 不可包含 request body`);
    }
    const queryData = hasQuery ? options.query : queryMethod ? data : null;
    const bodyData = queryMethod ? null : hasBody ? options.body : data;
    const requestUrl = appendQueryString(url, queryData);
    const body = buildBody(bodyData, requestHeaders, options.bodyType);
    const fetchOptions = { ...options };
    delete fetchOptions.timeout;
    delete fetchOptions.bodyType;
    delete fetchOptions.signal;
    delete fetchOptions.query;
    delete fetchOptions.body;

    if (body instanceof FormData) {
        Object.keys(requestHeaders).forEach((key) => {
            if (key.toLowerCase() === "content-type") delete requestHeaders[key];
        });
    }

    const timeoutSignal = AbortSignal.timeout(timeout);
    const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;

    try {
        const response = await fetch(requestUrl, {
            ...fetchOptions,
            method: normalizedMethod,
            headers: requestHeaders,
            body,
            signal,
        });
        const responseData = await parseResponseData(response);
        const envelope = {
            httpCode: response.status,
            headers: normalizeResponseHeaders(response.headers),
            data: responseData,
            url: response.url || requestUrl,
            method: normalizedMethod,
        };

        if (!response.ok) {
            throw buildRequestError({ response, data: responseData, url: envelope.url, method: normalizedMethod });
        }

        return envelope;
    } catch (error) {
        if (error.name === "RequestError") throw error;
        const isCancelled = options.signal?.aborted === true && signal.reason === options.signal.reason;
        const isTimeout = !isCancelled && (timeoutSignal.aborted || error.name === "TimeoutError" || error.name === "AbortError");
        throw buildRequestError({
            response: { status: isCancelled ? 499 : isTimeout ? 408 : 500 },
            data: null,
            url: requestUrl,
            method: normalizedMethod,
            cause: error,
            errorType: isCancelled ? "cancelled" : isTimeout ? "timeout" : undefined,
        });
    }
};

module.exports = { request };
