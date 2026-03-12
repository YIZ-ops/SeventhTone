import { request } from "../utils/request";
import type { NewsItem } from "../types";
import { BASE_URL } from "./base";

export const getDailyTonesCalendar = async (yearMonth: string) => {
  const res = await request<any>(`${BASE_URL}/cont/detail/dailyTones/calendar/${yearMonth}`, {
    method: "GET",
  });

  if (res?.code !== 200 || !Array.isArray(res?.data?.calendar)) {
    throw new Error("Failed to fetch daily tones calendar.");
  }

  return res;
};

const getDailyTonesByNodeId = async (nodeId: string | number) => {
  const res = await request<any>(`${BASE_URL}/cont/detail/dailyTones/data/${nodeId}`, {
    method: "GET",
  });

  if (res?.code !== 200 || !Array.isArray(res?.data?.contList)) {
    throw new Error("Failed to fetch daily tones data");
  }

  const contList = (res.data.contList as any[]).map((item) => ({
    ...item,
    appHeadPic: item.appHeadPic || item.pic,
    summary: item.summary || "",
    pubTime: item.pubTime || "",
    pubTimeLong: typeof item.pubTimeLong === "number" ? item.pubTimeLong : Date.now(),
  })) as NewsItem[];

  return {
    ...res,
    data: {
      ...res.data,
      contList,
    },
  };
};

export const getDailyTonesByDate = async (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    throw new Error("Invalid date for Daily Tones.");
  }

  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const yearMonth = `${year}${month}`;
  const monthDay = `${month}${day}`;

  const calendarRes = await getDailyTonesCalendar(yearMonth);

  const dayEntry = calendarRes.data.calendar.find((entry: any) => entry?.monthDay === monthDay);
  const nodeId = dayEntry?.nodeList?.[0]?.nodeId;
  if (!nodeId) {
    return {
      code: 200,
      data: {
        dateInfo: { year, month, day },
        contList: [],
      },
    };
  }

  return await getDailyTonesByNodeId(nodeId);
};
