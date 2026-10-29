import dotenv from "dotenv";

dotenv.config({
  path: ".env.test",
  override: true,
});

if (process.env.DB_NAME !== "mini_twitter_test") {
  throw new Error(
    "Tests aborted: DB_NAME must be mini_twitter_test"
  );
}