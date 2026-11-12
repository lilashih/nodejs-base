const schema = (data = {}, message = "") => ({ message, data });

const success = (res, data = {}, message = "", httpCode = 200) => {
    return res.status(httpCode).json(schema(data, message));
};

const error = (res, errorData) => {
    const httpCode = Number.isInteger(errorData.httpCode) ? errorData.httpCode : 500;
    return res.status(httpCode).json(schema(errorData.data ?? {}, errorData.message ?? "系統發生錯誤"));
};

module.exports = { schema, success, error };
