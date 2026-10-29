import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Posts API", () => {
  it("should reject an unauthenticated request to create a post", async () => {
    const response = await request(app)
      .post("/api/posts")
      .send({ content: "Hello world" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "User not logged in",
    });
  });


    it("should reject an unauthenticated request to delete a post", async () => {
    const response = await request(app)
        .delete("/api/posts/1");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
        message: "User not logged in",
    });
    });
});
