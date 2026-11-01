import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../src/app.js";
import pool from "../src/db.js";

const registerEndpoint = "/api/auth/register"

describe( "Authentication Validation", () => {

  describe( "Registration", () => {

    let testEmail: string

    beforeEach( async () => {
      testEmail = `test-${randomUUID()}@email.com  `
    })

    afterEach ( async () => {
      await pool.query(`
          DELETE FROM users WHERE email = $1;
        `, [ testEmail ])
    })

    const validData = () => ({
      email: testEmail,
      username: 'test user',
      password: 'testPassword123'
    })

    describe( "Input Validation", () => {
      it.each( [ "username", "email", "password" ] as const ) (
        "should reject empty %s", async ( field ) => {

          const response = await request(app)
            .post(registerEndpoint)
            .send({
            ...validData(),
            [ field ]: ""
          })

          expect(response.status).toBe(400)
        }
      )

      it.each ( [ "username", "email", "password"] as const )(
        "should reject space %s", async ( field ) => {

          const response = await request(app)
            .post(registerEndpoint)
            .send({
              ...validData(),
              [field]: "    "
            })
          
          expect(response.status).toBe(400)
        }
      )

      it.each([ "username", "email", "password" ] as const )(
        "should reject invalid data type for %s", async ( field ) => {

          const response = await request(app)
            .post(registerEndpoint)
            .send({
              ...validData(),
              [ field ]: 123,
            })

            expect(response.status).toBe(400)
        }
      )

      it( "should reject short passwords", async () => {

        const response = await request(app)
          .post(registerEndpoint)
          .send({
            ...validData(),
            password: "short"
          })

        expect(response.status).toBe(400)
      })

      it.each([ "invalidEmail#mail.com", "invaldEmail@mail,com" ])
      ( "should reject invalid emails: %s", async ( invaldEmail ) => {

        const response = await request(app)
          .post( registerEndpoint )
          .send({
            ...validData(),
            email: invaldEmail
          })

        expect(response.status).toBe(400)
      })

      // describe( "should reject if either field is missing.", () => {
      //   it("missing email", async () => {
      //     const response = await request(app)
      //       .post( registerEndpoint )
      //       .send({
      //         username: "test user",
      //         password: "testpassword123"
      //       })
      //     expect(response.status).toBe(400)
      //   });

      //   it("missing password", async () => {
      //     const response = await request(app)
      //       .post( registerEndpoint )
      //       .send({
      //         username: "test user",
      //         email: testEmail
      //       })
      //     expect(response.status).toBe(400)
      //   });
        
      //   it("missing username", async () => {
      //     const response = await request(app)
      //       .post( registerEndpoint )
      //       .send({
      //         email: testEmail,
      //         password: "testpassword123"
      //       })
      //     expect(response.status).toBe(400)
      //   });
      // })

    it( "should normalise email", async () => {

      const response = await request(app)
        .post(registerEndpoint)
        .send({
          ...validData(),
        })
      
        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
          email: testEmail.trim(),
          username: "test user"
        })
        expect(response.body).toHaveProperty("id")
        expect(response.body).toHaveProperty("created_at")
        expect(response.body).not.toHaveProperty("password_hash")

    })

    it( "should reject creating duplicate accouts", async () => {

      const firstResponse = await request(app)
        .post(registerEndpoint)
        .send({
          ...validData()
        })

      expect(firstResponse.status).toBe(201)
      
      const secondResponse = await request(app)
        .post(registerEndpoint)
        .send({
          ...validData()
        })

      expect(secondResponse.status).toBe(409)

    })

  })


  })
})