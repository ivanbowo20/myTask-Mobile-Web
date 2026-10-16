# Graph Report - todoweb  (2026-10-13)

## Corpus Check
- Corpus is ~22,627 words - fits in a single context window. You may not need a graph.

## Summary
- 278 nodes · 355 edges · 38 communities (12 shown, 26 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22

## God Nodes (most connected - your core abstractions)
1. `Task` - 22 edges
2. `TaskController` - 15 edges
3. `User` - 13 edges
4. `Category` - 10 edges
5. `scripts` - 9 edges
6. `AuthController` - 8 edges
7. `CategoryController` - 8 edges
8. `require-dev` - 7 edges
9. `Controller` - 5 edges
10. `AppServiceProvider` - 5 edges

## Surprising Connections (you probably didn't know these)
- `AuthController` --inherits--> `Controller`  [EXTRACTED]
  app/Http/Controllers/AuthController.php → app/Http/Controllers/Controller.php
- `CategoryController` --inherits--> `Controller`  [EXTRACTED]
  app/Http/Controllers/CategoryController.php → app/Http/Controllers/Controller.php
- `DashboardController` --inherits--> `Controller`  [EXTRACTED]
  app/Http/Controllers/DashboardController.php → app/Http/Controllers/Controller.php
- `TaskController` --inherits--> `Controller`  [EXTRACTED]
  app/Http/Controllers/TaskController.php → app/Http/Controllers/Controller.php
- `ExampleTest` --inherits--> `TestCase`  [EXTRACTED]
  tests/Feature/ExampleTest.php → tests/TestCase.php

## Import Cycles
- None detected.

## Communities (38 total, 26 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (14): Category, Task, User, DatabaseSeeder, Illuminate\Database\Eloquent\Attributes\Fillable, Illuminate\Database\Eloquent\Attributes\Hidden, Illuminate\Database\Eloquent\Builder, Illuminate\Database\Eloquent\Factories\HasFactory (+6 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (9): AuthController, CategoryController, Controller, DashboardController, TaskController, Illuminate\Http\JsonResponse, Illuminate\Http\Request, Illuminate\Support\Facades\Auth (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (15): {closure#1}(), {closure#2}(), {closure#3}(), {closure#1}(), {closure#2}(), {closure#1}(), {closure#2}(), {closure#3}() (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (27): dependencies, flowbite, devDependencies, axios, concurrently, laravel-vite-plugin, tailwindcss, @tailwindcss/vite (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (30): autoload, autoload-dev, psr-4, psr-4, description, extra, laravel, keywords (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (7): UserFactory, Illuminate\Database\Eloquent\Factories\Factory, Illuminate\Support\Facades\Hash, Illuminate\Support\Str, Illuminate\Validation\Rules\Password, Pdo\Mysql, static

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (9): scripts, dev, post-autoload-dump, post-create-project-cmd, post-root-package-install, post-update-cmd, pre-package-uninstall, setup (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.38
Nodes (5): {closure#1}(), {closure#2}(), Illuminate\Foundation\Application, Illuminate\Foundation\Configuration\Exceptions, Illuminate\Foundation\Configuration\Middleware

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (7): pestphp/pest-plugin, php-http/discovery, config, allow-plugins, optimize-autoloader, preferred-install, sort-packages

### Community 11 - "Community 11"
Cohesion: 0.47
Nodes (3): Illuminate\Foundation\Testing\TestCase, ExampleTest, TestCase

### Community 12 - "Community 12"
Cohesion: 0.40
Nodes (4): components.add-task-modal, components.edit-task-modal, components.navbar, components.sidebar

### Community 13 - "Community 13"
Cohesion: 0.40
Nodes (4): Monolog\Handler\NullHandler, Monolog\Handler\StreamHandler, Monolog\Handler\SyslogUdpHandler, Monolog\Processor\PsrLogMessageProcessor

## Knowledge Gaps
- **59 isolated node(s):** `$schema`, `name`, `type`, `description`, `keywords` (+54 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 135 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Task` connect `Community 0` to `Community 1`, `Community 7`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `User` connect `Community 0` to `Community 1`, `Community 5`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `TaskController` connect `Community 1` to `Community 0`, `Community 7`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `$schema`, `name`, `type` to the rest of the system?**
  _59 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08771929824561403 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08408408408408409 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10227272727272728 - nodes in this community are weakly interconnected._