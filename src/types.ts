export interface ArticleItem {
  contId: number;
  nodeId: number;
  name: string;
  summary: string;
  pubTime: string;
  pubTimeLong: number;
  pic: string;
  appHeadPic: string;
  link: string;
  userInfo?: {
    name: string;
    pic: string;
  };
  nodeInfo?: {
    name: string;
  };
}

export interface ArticleListResponse {
  code: number;
  data: {
    pageInfo: {
      list: ArticleItem[];
      pageNum: number;
      hasNext: boolean;
      total: number;
    };
  };
}

export interface ArticleDetail {
  contId: number;
  nodeId: number;
  name: string;
  content: string;
  summary: string;
  pubTime: string;
  headPic: string;
  authorList?: {
    name: string;
    pic: string;
  }[];
}

export interface Bookmark {
  article: ArticleItem;
  category: string;
  CollectedAt: number;
}

export interface Highlight {
  id: string;
  contId: number;
  text: string;
  articleName?: string;
  category?: string;
  thought?: string;
  start?: number;
  length?: number;
  createdAt: number;
}

export interface ArticleDetailResponse {
  pageProps: {
    contId: string;
    detailData: {
      code: number;
      data: ArticleDetail;
    };
  };
}

/** 接口 getWebAllNodes 返回的节点项 */
export interface WebNode {
  nodeId: number;
  pic?: string;
  tonePic?: string;
  logoPic?: string;
  name: string;
  urlName: string;
  description: string;
  nodeType: number;
  nickName?: string;
  forwardType?: number;
  isParticular?: boolean;
}

/** 前端使用的分类（用于列表展示与路由） */
export interface Category {
  id: string;
  title: string;
  description: string;
  pic?: string;
  tonePic?: string;
}

/** 搜索接口 /search/news 返回的列表项 */
export interface SearchResultItem {
  contId: number;
  cardMode?: string;
  name: string;
  pubTime?: string;
  pubTimeLong?: number;
  summary?: string;
  pic?: string;
  appHeadPic?: string;
  nodeInfo?: { nodeId: number; name: string; [key: string]: unknown };
  [key: string]: unknown;
}

/** 搜索接口响应 */
export interface SearchResponse {
  code: number;
  data: {
    list: SearchResultItem[];
    pageNum: number;
    prevPageNum: number;
    nextPageNum: number;
    hasNext: boolean;
    pageSize: number;
    total: number;
    pages: number;
  };
}
