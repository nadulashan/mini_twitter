import {
  afterEach,
  beforeEach,
  beforeAll,
  describe,
  expect,
  it,
  afterAll,
} from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../src/app.js";
import pool from "../src/db.js";

const registerEndpoint = "/api/auth/register"
const loginEndpoint = "/api/auth/login"
const getCsrfTokenEndpoint = "/api/auth/csrf"
const csrfTokenName = "X-CSRF-Token"

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
      describe( "Empty inputs", () => {
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
      })

      describe( "White-space only inputs", () => {
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
      })

      describe( "Non-string inputs", () => {
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
      })

      it( "should reject short passwords", async () => {
        const response = await request(app)
          .post(registerEndpoint)
          .send({
            ...validData(),
            password: "short"
          })

        expect(response.status).toBe(400)
      })

      describe( "Invalid emails", () => {
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
      })

      describe( "Missing Fields", () => {
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


  describe( "Login", () => {

    const validData ={
      email: `test-${randomUUID()}@email.com`,      
      password: 'testPassword123'
    }
    let csrfToken: string;
    const agent = request.agent(app)

    beforeAll( async () => {

      const createAccountResponse = await agent
        .post( registerEndpoint )
        .send({ ...validData, username: "test user" })

      expect(createAccountResponse.status).toBe(201)

      const getCsrfTokenResponse = await agent
        .get( getCsrfTokenEndpoint )
      
      expect(getCsrfTokenResponse.status).toBe(200)
      expect(getCsrfTokenResponse.body).toHaveProperty("csrfToken")
      csrfToken = getCsrfTokenResponse.body.csrfToken

    })

    afterAll ( async () => {
      await pool.query(`
          DELETE FROM users;
        `)
    })

    describe( "Input Validation", () => {

      describe( "Empty inputs", () => {
        it.each( [ "email", "password" ] as const ) (
          "should reject empty %s", async ( field ) => {

            const response = await agent
              .post( loginEndpoint )
              .set( csrfTokenName, csrfToken)
              .send({
                ...validData,
                [ field ]: ""
              })

            expect(response.status).toBe(400)
          }
        )
      })

      describe( "White-space only inputs", () => {
        it.each ( [ "email", "password"] as const )(
          "should reject white-space only %s", async ( field ) => {

            const response = await agent
              .post( loginEndpoint )
              .set( csrfTokenName, csrfToken)
              .send({
                ...validData,
                [field]: "    "
              })
            
            expect(response.status).toBe(400)
          }
        )
      })

      describe("Non-string type inputs", () => {
        it.each([ "email", "password" ] as const )(
          "should reject non-string type for %s", async ( field ) => {

            const response = await agent
              .post( loginEndpoint )
              .set( csrfTokenName, csrfToken)
              .send({
                ...validData,
                [ field ]: 123,
              })

              expect(response.status).toBe(400)
          }
        )
      })

      describe( "Invalid Email formats", () => {
        it.each([ "invalidEmail#mail.com", "invalidEmail@mail,com" ])
        ( "should reject invalid emails: %s", async ( invaldEmail ) => {

          const response = await agent
            .post( loginEndpoint )
            .set( csrfTokenName, csrfToken)
            .send({
              ...validData,
              email: invaldEmail
            })

          expect(response.status).toBe(400)
        })
      })

      describe( "Missing Fields", () => {
        it.each([ "email", "password" ] as const )("missing field: %s", async ( field ) => {

          const { [field]: omitted, ...data } = validData

          const response = await agent
            .post( loginEndpoint )
            .set( csrfTokenName, csrfToken )
            .send( data )
          expect(response.status).toBe(400)
        });
      })

      describe( "Login and Session regeneration", () => {
        it( "should perform successful login", async () => {
          const response = await agent
            .post( loginEndpoint )
            .set( csrfTokenName, csrfToken )
            .send( validData )
            
          expect(response.status).toBe(200)
          expect(response.body).toMatchObject({
            message: "Authentication successful."
          })
          
        })

        it( "should generate a new CSRF token", async () => {
          const response = await agent
            .get(getCsrfTokenEndpoint)

          expect( response.body.csrfToken ).not.toBe(csrfToken)
        })
      })

  })


  })
})