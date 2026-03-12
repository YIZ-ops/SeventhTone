import { request } from "../utils/request";
import type { SearchResponse } from "../types";
import { BASE_URL } from "./base";

export interface SearchNewsParams {
  word: string;
  pageNum?: number;
  pageSize?: number;
  orderType?: number;
}

/** 搜索新闻：POST /search/news */
export const searchNews = async (params: SearchNewsParams) => {
  const { word, pageNum = 1, pageSize = 10, orderType = 1 } = params;
  const res = await request<SearchResponse>(`${BASE_URL}/search/news`, {
    method: "POST",
    body: JSON.stringify({ word, pageNum, pageSize, orderType }),
  });
  if (res?.code !== 200 || !res?.data) {
    throw new Error("Failed to search.");
  }
  return res;
};
