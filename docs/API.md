# API contract

Base URL: `http://127.0.0.1:8000`

## GET /health

Returns 200 with `{"status":"ok","service":"word-explainer"}`.

## POST /api/v1/explanations

Content-Type: `application/json`

Request: `{"text":"borrower","detail":"short"}`

`text`: required, non-blank string, at most 1000 characters after trimming.
`detail`: `short` or `detailed`; defaults to `detailed`.

Returns 200 with `text`, `detail`, `prompt`, `chatgpt_url`, and `mode` (`prepared_prompt`). This prepares a prompt; it does not call ChatGPT or generate a definition.

Errors: 400 invalid JSON or input, 404 unknown route, 413 invalid/oversized body length, 415 unsupported content type. Error bodies contain an `error` string. The HTTP scaffold requires Content-Length and does not support chunked request bodies.
