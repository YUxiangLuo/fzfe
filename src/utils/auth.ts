/**
 * JWT Payload 的基本结构。
 * 您可以根据后端签发的实际内容来扩展这个接口。
 */
export interface DecodedToken {
  sub: number;      // 用户ID
  username: string; // 用户名
  role: string;     // 角色
  full_name?: string; // 全名 (可选)
  exp: number;      // 过期时间戳
  iat: number;      // 签发时间戳
}

/**
 * 解码JWT字符串以获取其Payload。
 * 注意：此函数不验证JWT的签名，只做解码。
 * 验证应该始终在后端进行。
 * 
 * @param token - JWT字符串。
 * @returns 解码后的Payload对象，如果token无效或解码失败则返回null。
 */
export const decodeToken = (token: string): DecodedToken | null => {
  try {
    // JWT由三部分组成，我们只需要第二部分 (Payload)
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return null;
    }
    
    // 将Base64Url编码转换为普通的Base64编码
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // 使用atob解码Base64字符串，然后用JSON.parse解析
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
};
