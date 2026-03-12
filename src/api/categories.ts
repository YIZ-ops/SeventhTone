import { request } from "../utils/request";
import type { WebNode, Category } from "../types";
import { BASE_URL } from "./base";
import { getCategoriesCache, setCategoriesCache } from "../store/categoriesCache";

/** 获取全部节点（分类）原始接口 */
export const getWebAllNodes = async () => {
  const res = await request<{ code: number; data: { nodeList: WebNode[] } }>(`${BASE_URL}/node/getWebAllNodes`, { method: "GET" });
  if (res?.code !== 200 || !Array.isArray(res?.data?.nodeList)) {
    throw new Error("Failed to fetch nodes.");
  }
  return res;
};

/** 获取分类列表（映射为前端 Category，带缓存） */
export const getCategories = async (): Promise<Category[]> => {
  const cached = getCategoriesCache();
  if (cached) return cached;

  const res = await getWebAllNodes();
  const list = res.data.nodeList ?? [];
  const categories = list
    .filter((node) => node.nodeType === 0 && node.name !== "DAILY TONES")
    .map((node) => ({
      id: String(node.nodeId),
      title: node.name,
      description: node.description || "",
      pic: node.pic,
      tonePic: node.tonePic,
    }));
  setCategoriesCache(categories);
  return categories;
};
