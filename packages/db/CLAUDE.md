# Database 包

Drizzle ORM + PostgreSQL，认证表由 Better-Auth adapter 自动生成。

## Schema 定义

使用 `pgTable` 定义表，`uuidv7()` 作为主键：

```typescript
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const example = pgTable("example", {
  id: text("id").primaryKey().default(sql`uuidv7()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
```

Auth 相关表（`src/schema/auth.ts`）由 Better-Auth 自动生成。

## 反模式

- **不要修改 `schema/auth.ts`** - Better-Auth 自动管理
- **不要跳过关系定义** - 始终使用 Drizzle `relations()` 获得类型安全查询
- **不要使用原始 SQL** - 使用 Drizzle query builder
