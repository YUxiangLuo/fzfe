const BASE_URL = "http://localhost:3001/api"; // 后端API的基础URL

/**
 * 统一处理API响应。
 * 它会解析JSON，并在响应状态码不为 "ok" (200-299) 时抛出错误。
 * 特别地，它会处理401状态码，此时会清除token并重定向到登录页。
 * @param response - fetch返回的原始Response对象。
 * @returns 解析后的JSON数据。
 */
const handleResponse = async (response: Response) => {
  // 如果是401未授权，说明token无效或已过期
  if (response.status === 401) {
    localStorage.removeItem("token");
    // 重定向到登录页，避免用户停留在需要授权的页面
    window.location.href = "/login";
    // 抛出错误，中断后续的代码执行
    throw new Error("会话已过期，请重新登录");
  }

  // 尝试解析JSON响应体
  // 注意：即使是错误响应（如400, 500），也可能包含JSON格式的错误信息
  const data = await response.json();

  // 如果响应状态码不是 "ok"，则抛出错误
  if (!response.ok) {
    // 优先使用后端返回的错误信息，否则使用HTTP状态文本
    const error = (data && data.error) || response.statusText;
    throw new Error(error);
  }

  return data;
};

/**
 * 核心的API请求函数。
 * @param endpoint - API的端点路径 (例如, '/users')。
 * @param options - fetch请求的配置对象 (例如, method, body)。
 * @returns 返回一个Promise，解析为API的响应数据。
 */
const request = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // 如果本地存储中有token，则将其添加到Authorization请求头中
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  // 发起fetch请求
  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  // 使用统一的响应处理器来处理返回结果
  return handleResponse(response);
};

// 导出一个包含常用HTTP方法的对象，方便在其他地方调用
export const apiClient = {
  get: (endpoint: string, options?: RequestInit) =>
    request(endpoint, { ...options, method: "GET" }),

  post: (endpoint: string, body: any, options?: RequestInit) =>
    request(endpoint, { ...options, method: "POST", body: JSON.stringify(body) }),

  put: (endpoint: string, body: any, options?: RequestInit) =>
    request(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) }),

  delete: (endpoint: string, options?: RequestInit) =>
    request(endpoint, { ...options, method: "DELETE" }),
};
