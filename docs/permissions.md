# User Module Permissions

## Overview

This document explains how to use the new user module permissions feature. Each user now has a `permissions` field that controls access to different modules in the application.

## Default Permissions

By default, users have the following permissions (set automatically when a user is created):

- Modules starting with `/my-` (personal modules): `['read', 'write']`
  - `/my-projects`
  - `/my-contracts`
  - `/my-claims`
  - `/my-imprest`
- All other modules: `[]` (no permissions)
  - `/projects`
  - `/contracts`
  - `/claims`
  - `/imprest`
  - `/budget`
  - `/users`

## Available Permissions

Each module can have the following permissions:

- `read`: User can view data in the module
- `write`: User can create, update, and delete data in the module

## Updating Permissions

Only admin users can update permissions using the `/auth/permissions/:userId` endpoint:

```
POST /auth/permissions/:userId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "permissions": {
    "/projects": ["read", "write"],
    "/budget": ["read"]
  }
}
```

## Checking Permissions

User permissions are included in the user profile response from:

```
GET /auth/profile
Authorization: Bearer <user_token>
```

The response will include a `permissions` field showing the user's current permissions for all modules.
