-- Migration: Add Telegram fields to projects table
ALTER TABLE projects ADD COLUMN telegram_chat_id text;
ALTER TABLE projects ADD COLUMN telegram_bot_token text;
