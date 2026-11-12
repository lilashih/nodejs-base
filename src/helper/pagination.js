const createPagination = ({ total, perPage, currentPage }) => ({
    total: Number(total),
    perPage,
    currentPage,
    lastPage: Math.ceil(Number(total) / perPage),
});

module.exports = { createPagination };
