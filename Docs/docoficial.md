# Property Maintenance Task Management System (PMTMS)

## Version
1.0

## Product Overview

A web-based Progressive Web App (PWA) designed for residential property operations teams to register, prioritize, assign, and track maintenance and cleaning tasks across multiple residential blocks.

The application is optimized for mobile field workers and supports offline task creation with automatic synchronization when connectivity becomes available.

---

# Problem Statement

Caretakers and Cleaners frequently identify issues while moving around residential buildings where internet connectivity may be limited or unavailable.

Current reporting processes are fragmented, causing delays in:

- Reporting incidents
- Assigning responsibility
- Tracking progress
- Closing tasks

The goal is to centralize all operational tasks into a single workflow managed by a Master Admin.

---

# User Roles

## 1. Master Admin

### Responsibilities

- Manage users
- Manage Blocks
- Manage Flats
- Review all tasks
- Set task priorities
- Assign tasks
- Reassign tasks
- Monitor progress
- Generate operational visibility

### Permissions

Full system access.

---

## 2. Caretaker

### Responsibilities

- Identify issues
- Create tasks
- Upload photos
- Update assigned tasks
- Add comments
- Change status

### Permissions

Can only view:

- Tasks assigned to them
- Tasks created by them

---

## 3. Cleaner

### Responsibilities

- Identify cleaning issues
- Create tasks
- Upload photos
- Update assigned tasks
- Add comments
- Change status

### Permissions

Can only view:

- Tasks assigned to them
- Tasks created by them

---

# Core Workflow

## Task Creation

User creates task.

Required fields:

- Photo
- Problem Category
- Complaint Category
- Description
- Block
- Flat

System creates:

Status = New

---

## Admin Review

Master Admin reviews incoming tasks.

Admin defines:

- Priority
  - P1
  - P2
  - P3

Admin assigns:

- Caretaker
- Cleaner

---

## Task Execution

Assigned user receives task.

Available statuses:

- Doing
- Done

User may add:

- Comments
- Progress updates
- Additional photos

---

## Completion

Task marked as Done.

Admin can:

- Accept completion
- Reopen task if required

---

# Task Lifecycle

New
↓
Assigned
↓
Doing
↓
Done

---

# Functional Requirements

## Authentication

### FR-001

Users must authenticate securely.

### FR-002

Role-based access control.

Roles:

- MASTER_ADMIN
- CARETAKER
- CLEANER

---

# Task Management

### FR-010

Create task.

### FR-011

Upload photos.

### FR-012

Assign priorities.

### FR-013

Assign responsible users.

### FR-014

Update status.

### FR-015

Comment on tasks.

### FR-016

View task history.

### FR-017

Attach additional images.

---

# Location Management

### FR-020

Manage Blocks.

Examples:

- Falcon
- Martlett
- Merlin
- Oak
- Northwood

### FR-021

Manage Flats.

Relationship:

Block → Flats

---

# Dashboard

## Admin Dashboard

Display:

- Total Tasks
- New Tasks
- Doing Tasks
- Done Tasks
- P1 Tasks
- P2 Tasks
- P3 Tasks

Views:

- Kanban
- Table

Filters:

- Block
- Flat
- Priority
- Status
- Assignee
- Date Range

---

## Field User Dashboard

Display:

### My Tasks

Tasks assigned to me.

### Pending Sync

Offline tasks not uploaded.

### Completed Tasks

Finished tasks.

### Recent Activity

Recent updates.

---

# Offline First Requirements

## Critical Requirement

Application must continue functioning without internet access.

---

## Offline Task Creation

User can:

- Create task
- Capture photo
- Save task locally

No internet required.

---

## Sync Engine

When connectivity returns:

System automatically:

- Uploads pending tasks
- Uploads photos
- Updates local sync state

---

## Sync Status

Task states:

- Pending Sync
- Syncing
- Synced
- Failed Sync

---

# Notifications

### Assignment Notification

When task is assigned.

### Status Change Notification

When task status changes.

### Comment Notification

When comment is added.

---

# Non-Functional Requirements

## Performance

- Mobile-first
- Fast loading
- <2 seconds dashboard load

## Security

- Secure authentication
- Role-based authorization
- Audit logging

## Availability

- Offline support
- Auto synchronization

## Scalability

Support:

- Multiple buildings
- Hundreds of users
- Thousands of tasks

---

# Suggested Technical Stack

Frontend:
- React
- TypeScript
- Vite

Backend:
- Supabase

Database:
- PostgreSQL

Storage:
- Supabase Storage

Authentication:
- Supabase Auth

Offline:
- IndexedDB
- Service Worker
- PWA

---

# Database Entities

## Users

- id
- name
- email
- role
- created_at

---

## Blocks

- id
- name

---

## Flats

- id
- block_id
- flat_number

---

## Tasks

- id
- created_by
- assigned_to
- block_id
- flat_id
- problem
- complaint
- description
- photo_url
- priority
- status
- created_at
- updated_at

---

## TaskComments

- id
- task_id
- user_id
- comment
- created_at

---

## TaskHistory

- id
- task_id
- action
- user_id
- timestamp

---

# Success Metrics

- 100% task creation capability while offline
- Automatic synchronization after connectivity restoration
- Task creation completed in less than 60 seconds
- Role permissions correctly enforced
- Full audit trail for every task
- Mobile usability score above 90