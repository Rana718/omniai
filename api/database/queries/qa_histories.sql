-- name: CreateQAHistory :one
INSERT INTO qa_histories (
    chat_id,
    question,
    answer,
    timestamp
) VALUES (
    $1, $2, $3, $4
) RETURNING *;

-- name: GetQAHistoriesByChatID :many
SELECT * FROM qa_histories
WHERE chat_id = $1
ORDER BY timestamp ASC;

-- name: CreateQAHistoryBatch :copyfrom
INSERT INTO qa_histories (
    id,
    chat_id,
    question,
    answer,
    timestamp
) VALUES (
    $1, $2, $3, $4, $5
);
