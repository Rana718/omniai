-- name: CreateUser :one
INSERT INTO users (
    name,
    email,
    hashed_password,
    image
) VALUES (
    $1, $2, $3, $4
) RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: UpdateUser :one
UPDATE users
SET 
    name = COALESCE($2, name),
    image = COALESCE($3, image),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserPassword :exec
UPDATE users
SET 
    hashed_password = $2,
    updated_at = NOW()
WHERE id = $1;
