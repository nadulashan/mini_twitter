export const registerEndpoint = "/api/auth/register"
export const loginEndpoint = "/api/auth/login"
export const getCsrfTokenEndpoint = "/api/auth/csrf"
export const csrfTokenName = "X-CSRF-Token"
export const createPostEndpoint = "/api/posts/"
export const deletePostEndpoint = "/api/posts/"
export const logoutEndpoint = "/api/auth/logout"
export const meEndpoint = "/api/auth/me"
export const usersEndpoint = "/api/users"

export function extractSId ( cookie: string){
    return cookie.split("connect.sid=s%")[1].split(";")[0]
}