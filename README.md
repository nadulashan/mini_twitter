
# Mini Twitter

A Twitter-inspired REST API built with Node.js, Express, TypeScript, and PostgreSQL.

This project is a learning project focused on building a backend application using real-world development practices, including RESTful API design, relational databases, and secure authentication.

## Features

- [x] Create posts
- [x] Connect to PostgreSQL
- [x] User registration
- [x] Password hashing
- [x] User login
- [x] Authentication and authorization
- [ ] Retrieve posts with author information
- [ ] Update and delete posts

## Tech Stack

- **Runtime:** Node.js
- **Backend Framework:** Express
- **Language:** TypeScript
- **Database:** PostgreSQL
- **Database Client:** node-postgres (`pg`)
- **Password Hashing:** argon2
- **Session Managing:** express-session
- **Session Storing:** connect-pg-simple

## Prerequisites

Make sure you have installed:

- Node.js and npm
- PostgreSQL
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd mini-twitter
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root.

Look at .env.example file to create a matching environment variables.

### 4. Set up the database

Create a PostgreSQL database named `mini_twitter`.

Run the required database schema or migrations to create the tables.

### 5. Start the development server

Use the development command configured in `package.json`.

```bash
npm run dev
```

The server should start on the configured port.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/posts` | Create a post |
| POST | `/api/auth/register` | Register a user |



## Project Structure

```text
mini-twitter/
├── src/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```


## Development Status

This project is under active development. Features, API endpoints, and database structure may change as development progresses.

## License

No license has been selected yet.
