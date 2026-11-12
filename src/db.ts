import { Pool } from "pg";
import { env } from "./config/env.js";

const pool = new Pool({
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,

    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
});
export default pool