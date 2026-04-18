import { http } from './http';

export const getAllCashouts = async (params = {}) => {
    const { status, search, page = 1, limit = 20, sort } = params;
    
    let url = `/api/admin/cashouts?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    if (search) url += `&search=${search}`;
    if (sort) url += `&sort=${sort}`;

    const res = await http.get(url);
    return res.data;
};
