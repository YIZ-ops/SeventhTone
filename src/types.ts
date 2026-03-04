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
