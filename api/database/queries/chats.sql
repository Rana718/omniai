-- name: CreateChat :one
INSERT INTO chats (
    user_id,
    doc_id,
    doc_text,
    created_at
) VALUES (
    $1, $2, $3, NOW()
) RETURNING *;

-- name: GetChatByDocID :one
SELECT * FROM chats
WHERE doc_id = $1 LIMIT 1;

-- name: GetChatByID :one
SELECT * FROM chats
WHERE id = $1 LIMIT 1;

-- name: GetUserChats :many
SELECT 
    id,
    doc_id,
    doc_text,
    created_at,
    user_id
FROM chats
WHERE user_id = $1
ORDER BY created_at DESC;
