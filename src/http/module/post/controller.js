const response = require("@src/http/common/response.js");
const service = require("./service.js");

const list = async (req, res, next) => {
    try {
        return response.success(res, await service.list(req.validated));
    } catch (error) {
        return next(error);
    }
};

const mine = async (req, res, next) => {
    try {
        return response.success(res, await service.listMine(req.validated, req.user.id));
    } catch (error) {
        return next(error);
    }
};

const showMine = async (req, res, next) => {
    try {
        return response.success(res, { post: await service.getMineById(req.validated.id, req.user.id) });
    } catch (error) {
        return next(error);
    }
};

const show = async (req, res, next) => {
    try {
        return response.success(res, { post: await service.getById(req.validated.id) });
    } catch (error) {
        return next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const post = await service.create(req.validated, req.user.id);
        return response.success(res, { post }, "新增成功", 201);
    } catch (error) {
        return next(error);
    }
};

const update = async (req, res, next) => {
    try {
        const post = await service.update(req.validated.id, req.validated, req.user.id);
        return response.success(res, { post }, "更新成功");
    } catch (error) {
        return next(error);
    }
};

const destroy = async (req, res, next) => {
    try {
        await service.destroy(req.validated.id, req.user.id);
        return response.success(res, {}, "刪除成功");
    } catch (error) {
        return next(error);
    }
};

module.exports = { list, mine, show, showMine, create, update, destroy };
