import crypto from "crypto";

type PayMethod = "wechat" | "alipay";

type PayfmCreateOrderResponse = {
  success?: boolean;
  code?: number;
  msg?: string;
  data?: {
    id?: string;
    payUrl?: string;
  } | null;
};

type PayfmQueryOrderResponse = {
  success?: boolean;
  code?: number;
  msg?: string;
  data?: {
    orderId?: string;
    orderNo?: string;
    merchantNum?: string;
    amount?: string;
    tradeMoney?: string;
    orderState?: string;
    orderStateDesc?: string;
    payTime?: string | null;
  } | null;
};

export type PayfmQueryOrderResult = {
  paid: boolean;
  raw: PayfmQueryOrderResponse;
};

function md5(value: string) {
  return crypto.createHash("md5").update(value).digest("hex");
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is missing.`);
  }

  return value;
}

function normalizeApiBaseUrl(value: string) {
  const url = new URL(value);

  url.search = "";
  url.hash = "";
  url.pathname = url.pathname
    .replace(/\/mapi\.php$/i, "")
    .replace(/\/startOrder$/i, "")
    .replace(/\/queryOutOrder$/i, "")
    .replace(/\/+$/g, "");

  return url.toString().replace(/\/$/g, "");
}

export function getPayfmConfig() {
  const merchantNum = getRequiredEnv("PAYFM_PID");
  const key = getRequiredEnv("PAYFM_KEY");
  const rawApiBaseUrl = process.env.PAYFM_API_BASE || process.env.PAYFM_GATEWAY;
  const siteUrl = getRequiredEnv("NEXT_PUBLIC_SITE_URL").replace(/\/$/g, "");

  if (!rawApiBaseUrl) {
    throw new Error("PAYFM_API_BASE or PAYFM_GATEWAY is missing.");
  }

  return {
    merchantNum,
    key,
    apiBaseUrl: normalizeApiBaseUrl(rawApiBaseUrl),
    notifyUrl: `${siteUrl}/api/pay/notify`,
    returnUrl: `${siteUrl}/dashboard`,
  };
}

export function getPayfmPayType(method: PayMethod) {
  if (method === "wechat") {
    return process.env.PAYFM_WECHAT_PAY_TYPE?.trim() || "wechat";
  }

  return process.env.PAYFM_ALIPAY_PAY_TYPE?.trim() || "alipay";
}

export function signPayfmCreateOrder(
  merchantNum: string,
  orderNo: string,
  amount: string,
  notifyUrl: string,
  key: string
) {
  return md5(`${merchantNum}${orderNo}${amount}${notifyUrl}${key}`);
}

export function signPayfmNotify(
  state: string,
  merchantNum: string,
  orderNo: string,
  amount: string,
  key: string
) {
  return md5(`${state}${merchantNum}${orderNo}${amount}${key}`);
}

export function signPayfmQueryOrder(
  merchantNum: string,
  orderNo: string,
  key: string
) {
  return md5(`${merchantNum}${orderNo}${key}`);
}

export function verifyPayfmNotify(params: Record<string, string>) {
  const { merchantNum, key } = getPayfmConfig();
  const state = params.state || "";
  const orderNo = params.orderNo || "";
  const amount = params.amount || "";
  const incomingSign = params.sign || "";
  const expectedSign = signPayfmNotify(state, merchantNum, orderNo, amount, key);

  return {
    ok:
      params.merchantNum === merchantNum &&
      state === "1" &&
      Boolean(orderNo) &&
      Boolean(amount) &&
      incomingSign === expectedSign,
    orderNo,
    amount,
    state,
  };
}

export async function createPayfmOrder({
  orderNo,
  amount,
  payMethod,
  subject,
}: {
  orderNo: string;
  amount: string;
  payMethod: PayMethod;
  subject: string;
}) {
  const { merchantNum, key, apiBaseUrl, notifyUrl, returnUrl } = getPayfmConfig();
  const sign = signPayfmCreateOrder(merchantNum, orderNo, amount, notifyUrl, key);
  const body = new URLSearchParams({
    merchantNum,
    orderNo,
    amount,
    notifyUrl,
    returnUrl,
    payType: getPayfmPayType(payMethod),
    returnType: "json",
    apiMode: "post_form",
    subject: subject.slice(0, 100),
    sign,
  });

  const response = await fetch(`${apiBaseUrl}/startOrder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await response.text();
  let data: PayfmCreateOrderResponse;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Payment gateway response is invalid: ${text.slice(0, 200)}`);
  }

  if (!response.ok || !data.success || data.code !== 200 || !data.data?.payUrl) {
    throw new Error(data.msg || "Payment order creation failed.");
  }

  return {
    payUrl: data.data.payUrl,
    platformOrderId: data.data.id || null,
    raw: data,
  };
}

export async function queryPayfmOrder(orderNo: string): Promise<PayfmQueryOrderResult> {
  const { merchantNum, key, apiBaseUrl } = getPayfmConfig();
  const sign = signPayfmQueryOrder(merchantNum, orderNo, key);
  const body = new URLSearchParams({
    merchantNum,
    orderNo,
    sign,
  });

  const response = await fetch(`${apiBaseUrl}/queryOutOrder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await response.text();
  let data: PayfmQueryOrderResponse;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Payment query response is invalid: ${text.slice(0, 200)}`);
  }

  if (!response.ok || !data.success || data.code !== 200 || !data.data) {
    throw new Error(data.msg || "Payment query failed.");
  }

  return {
    paid: data.data.orderState === "4",
    raw: data,
  };
}
