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
      testEmail = `test-${randomUUID()}@email.com`
    })

    afterEach ( async () => {
      await pool.query(`
          DELETE FROM users;
        `)
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
        "should reject white-space only %s", async ( field ) => {

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
        "should reject non-string type for %s", async ( field ) => {

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

      it.each([ "invalidEmail#mail.com", "invalidEmail@mail,com" ])
      ( "should reject invalid emails: %s", async ( invaldEmail ) => {

        const response = await request(app)
          .post( registerEndpoint )
          .send({
            ...validData(),
            email: invaldEmail
          })

        expect(response.status).toBe(400)
      })

      describe( "should reject if either field is missing.", () => {
        it.each([ "username", "email", "password" ] as const )("missing field: %s", async ( field ) => {

          const { [field]: omitted, ...data } = validData()

          const response = await request(app)
            .post( registerEndpoint )
            .send(data)
          expect(response.status).toBe(400)
        });
      })

    it( "should normalise email", async () => {

      const response = await request(app)
        .post(registerEndpoint)
        .send({
          ...validData(),
          email: `  ${testEmail.toUpperCase()}  `
        })
      
        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
          email: testEmail,
          username: "test user"
        })
        expect(response.body).toHaveProperty("id")
        expect(response.body).toHaveProperty("created_at")
        expect(response.body).not.toHaveProperty("password_hash")

    })

    it( "should reject duplicate registration", async () => {

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

    it( "should perform successful registration", async () => {
      const response = await request(app)
      .post( registerEndpoint )
      .send({
        ...validData()
      })

      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({
        email: testEmail,
        username: validData().username
      })
      expect(response.body).toHaveProperty("id")
      expect(response.body).toHaveProperty("created_at")
      expect(response.body).not.toHaveProperty("password_hash")
    })

  })


  })
})