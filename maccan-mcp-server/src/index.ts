#!/usr/bin/env node
/**
 * Maccan POS MCP Server
 *
 * Provides tools for LLMs to interact with the Maccan Restaurant Management System.
 * Supports recipes, ingredients, inventory, orders, suppliers, nutrition, and dashboard data.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { authenticate, setToken, apiRequest, handleApiError } from "./api.js";
import { ResponseFormat } from "./constants.js";
import { paginate, truncate, formatIngredientMd, formatRecipeMd, formatOrderMd } from "./formatters.js";

// ─── Server ────────────────────────────────────────────────────

const server = new McpServer({ name: "maccan-mcp-server", version: "1.0.0" });

// ─── Auth ──────────────────────────────────────────────────────

server.registerTool(
  "maccan_login",
  {
    title: "Login to Maccan POS",
    description: `Authenticate with the Maccan POS backend. Required before using other tools.\n\nArgs:\n  - email (string): Login email\n  - password (string): Login password\n\nReturns:\n  - Success message with user info, or error.`,
    inputSchema: { email: z.string().email(), password: z.string().min(1) },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ email, password }) => {
    try {
      const data = await apiRequest<any>("/auth/login", "POST", { email, password });
      const token = data.token || data.access_token;
      if (token) setToken(token);
      const user = data.user || data;
      return {
        content: [{ type: "text", text: `Logged in as ${user.firstName || user.email} (${user.role || "user"})` }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

// ─── Dashboard ─────────────────────────────────────────────────

server.registerTool(
  "maccan_dashboard_stats",
  {
    title: "Dashboard Stats",
    description: `Get restaurant dashboard statistics including counts, revenue, and food cost.\n\nReturns:\n  JSON with total_ingredients, total_recipes, total_suppliers, total_orders, today_orders, avg_food_cost_percent.`,
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      const data = await apiRequest<any>("/dashboard/stats");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

server.registerTool(
  "maccan_dashboard_cost_analysis",
  {
    title: "Cost Analysis",
    description: `Get recipe cost ranking for menu pricing decisions.\n\nReturns:\n  Array of recipes with rawCost, costPerServing, foodCostPercent, profit.`,
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      const data = await apiRequest<any>("/dashboard/cost-analysis");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

// ─── Ingredients ───────────────────────────────────────────────

const IngredientListSchema = z.object({
  search: z.string().optional().describe("Search by name"),
  supplier_id: z.string().optional().describe("Filter by supplier ID"),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
}).strict();

server.registerTool(
  "maccan_list_ingredients",
  {
    title: "List Ingredients",
    description: `List all ingredients with optional search and supplier filter.\n\nArgs:\n  - search (string, optional): Filter by name\n  - supplier_id (string, optional): Filter by supplier\n  - limit (number): Max results (default 50)\n  - offset (number): Pagination offset\n  - response_format ('markdown'|'json')\n\nReturns:\n  List of ingredients with category, unit, cost, allergens.`,
    inputSchema: IngredientListSchema.shape,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async (params) => {
    try {
      const data = await apiRequest<any[]>("/ingredients", "GET", undefined, { search: params.search, supplier_id: params.supplier_id });
      const p = paginate(data, params.limit, params.offset);
      if (params.response_format === ResponseFormat.JSON) {
        return { content: [{ type: "text", text: truncate(JSON.stringify(p, null, 2)) }], structuredContent: p };
      }
      const md = [`# Ingredients (${p.total} total, showing ${p.count})`, "", ...p.items.map(formatIngredientMd)];
      return { content: [{ type: "text", text: truncate(md.join("\n")) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

server.registerTool(
  "maccan_get_ingredient",
  {
    title: "Get Ingredient Details",
    description: `Get full details for a single ingredient by ID.\n\nArgs:\n  - id (string): Ingredient ID\n\nReturns:\n  Full ingredient record with stock, nutrition, supplier info.`,
    inputSchema: { id: z.string().describe("Ingredient ID") },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ id }) => {
    try {
      const data = await apiRequest<any>(`/ingredients/${id}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

// ─── Recipes ───────────────────────────────────────────────────

const RecipeListSchema = z.object({
  category: z.string().optional().describe("Filter by category (starter, main, dessert, beverage, side, salad, quick, local)"),
  search: z.string().optional().describe("Search by name"),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
}).strict();

server.registerTool(
  "maccan_list_recipes",
  {
    title: "List Recipes",
    description: `List all recipes with live cost analysis.\n\nArgs:\n  - category (string, optional): starter, main, dessert, beverage, side, salad, quick, local\n  - search (string, optional): Search by name\n  - limit (number): Max results (default 50)\n  - offset (number): Pagination offset\n  - response_format ('markdown'|'json')\n\nReturns:\n  Recipes with ingredients, cost breakdown, food cost percentage.`,
    inputSchema: RecipeListSchema.shape,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async (params) => {
    try {
      const data = await apiRequest<any[]>("/recipes", "GET", undefined, { category: params.category, search: params.search });
      const p = paginate(data, params.limit, params.offset);
      if (params.response_format === ResponseFormat.JSON) {
        return { content: [{ type: "text", text: truncate(JSON.stringify(p, null, 2)) }], structuredContent: p };
      }
      const md = [`# Recipes (${p.total} total, showing ${p.count})`, "", ...p.items.map(formatRecipeMd)];
      return { content: [{ type: "text", text: truncate(md.join("\n")) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

server.registerTool(
  "maccan_get_recipe",
  {
    title: "Get Recipe Details",
    description: `Get full recipe with ingredient breakdown and cost analysis.\n\nArgs:\n  - id (string): Recipe ID\n\nReturns:\n  Full recipe with items, costAnalysis, profit.`,
    inputSchema: { id: z.string().describe("Recipe ID") },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ id }) => {
    try {
      const data = await apiRequest<any>(`/recipes/${id}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

// ─── Inventory ─────────────────────────────────────────────────

server.registerTool(
  "maccan_inventory_stock",
  {
    title: "Inventory Stock Levels",
    description: `Get current stock levels for all ingredients.\n\nReturns:\n  List of ingredients with currentStock, status (OK/OUT_OF_STOCK), lastCostPerUnit.`,
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      const data = await apiRequest<any[]>("/inventory/stock");
      const md = [`# Inventory Stock (${data.length} items)`, ""];
      data.forEach((item: any) => {
        md.push(`- **${item.name}**: ${item.currentStock} ${item.baseUnit} [${item.status}] - ${item.costPerUnit}/unit`);
      });
      return { content: [{ type: "text", text: truncate(md.join("\n")) }], structuredContent: data };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

server.registerTool(
  "maccan_inventory_alerts",
  {
    title: "Inventory Alerts",
    description: `Get inventory alerts: expired, expiring soon, out of stock.\n\nReturns:\n  Alerts with expired items, expiring within 7 days, and out-of-stock ingredients.`,
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      const data = await apiRequest<any>("/inventory/alerts");
      const summary = data.summary || {};
      const md = [`# Inventory Alerts`, `**Level**: ${summary.alertLevel || "OK"}`, ""];
      if (data.outOfStock?.length) {
        md.push(`## Out of Stock (${data.outOfStock.length})`);
        data.outOfStock.forEach((i: any) => md.push(`- ${i.name}`));
      }
      if (data.expiringSoon?.length) {
        md.push(`## Expiring Soon (${data.expiringSoon.length})`);
        data.expiringSoon.forEach((i: any) => md.push(`- ${i.name}: ${i.daysLeft} days left`));
      }
      return { content: [{ type: "text", text: truncate(md.join("\n")) }], structuredContent: data };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

// ─── Orders ────────────────────────────────────────────────────

server.registerTool(
  "maccan_list_active_orders",
  {
    title: "List Active Orders",
    description: `List all active (non-closed) orders with items.\n\nReturns:\n  Orders with status, table, server, items, totalAmount.`,
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      const data = await apiRequest<any[]>("/orders", "GET", undefined, { active: "true" });
      const md = [`# Active Orders (${data.length})`, ""];
      data.forEach((o: any) => md.push(formatOrderMd(o)));
      return { content: [{ type: "text", text: truncate(md.join("\n")) }], structuredContent: data };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

server.registerTool(
  "maccan_get_tables",
  {
    title: "Get Table Status",
    description: `Get all tables with their current status (FREE/OCCUPIED/RESERVED).\n\nReturns:\n  List of tables with label, capacity, zone, status.`,
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      const data = await apiRequest<any[]>("/orders/tables");
      const md = [`# Tables (${data.length})`, ""];
      data.forEach((t: any) => md.push(`- **${t.label}** (${t.zone}, ${t.capacity} seats): ${t.status}`));
      return { content: [{ type: "text", text: truncate(md.join("\n")) }], structuredContent: data };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

// ─── Suppliers ─────────────────────────────────────────────────

server.registerTool(
  "maccan_list_suppliers",
  {
    title: "List Suppliers",
    description: `List all suppliers with ingredient counts.\n\nReturns:\n  Suppliers with name, contact, payment terms, ingredient_count.`,
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      const data = await apiRequest<any[]>("/suppliers");
      const md = [`# Suppliers (${data.length})`, ""];
      data.forEach((s: any) => md.push(`- **${s.name}** (${s.id}): ${s.ingredient_count || 0} ingredients, ${s.contactPerson || "no contact"}`));
      return { content: [{ type: "text", text: truncate(md.join("\n")) }], structuredContent: data };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

server.registerTool(
  "maccan_get_supplier",
  {
    title: "Get Supplier Details",
    description: `Get full supplier details including ingredients, price history, and cost trends.\n\nArgs:\n  - id (string): Supplier ID\n\nReturns:\n  Supplier info, ingredients, price_history, cost_trends.`,
    inputSchema: { id: z.string().describe("Supplier ID") },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ id }) => {
    try {
      const data = await apiRequest<any>(`/suppliers/${id}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

// ─── Nutrition ─────────────────────────────────────────────────

server.registerTool(
  "maccan_get_recipe_nutrition",
  {
    title: "Recipe Nutrition",
    description: `Get nutritional breakdown for a recipe (total and per-serving).\n\nArgs:\n  - recipeId (string): Recipe ID\n\nReturns:\n  calories, protein, fat, carbs (total and per_serving), item breakdown.`,
    inputSchema: { recipeId: z.string().describe("Recipe ID") },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ recipeId }) => {
    try {
      const data = await apiRequest<any>(`/nutrition/recipe/${recipeId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

server.registerTool(
  "maccan_allergens",
  {
    title: "Allergen Summary",
    description: `Get allergen summary for all recipes.\n\nReturns:\n  Recipes with their aggregated allergen lists.`,
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      const data = await apiRequest<any[]>("/nutrition/allergens");
      const md = [`# Allergen Summary (${data.length} recipes)`, ""];
      data.forEach((r: any) => {
        md.push(`- **${r.name}**: ${r.allergens?.length ? r.allergens.join(", ") : "none"}`);
      });
      return { content: [{ type: "text", text: truncate(md.join("\n")) }], structuredContent: data };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

// ─── Analytics ─────────────────────────────────────────────────

server.registerTool(
  "maccan_analytics_overview",
  {
    title: "Analytics Overview",
    description: `Get comprehensive analytics including counts, revenue, cost analysis, and alerts.\n\nReturns:\n  counts, today revenue, costAnalysis array, avgFoodCostPercent, alerts.`,
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      const data = await apiRequest<any>("/analytics/overview");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  },
);

// ─── Run ───────────────────────────────────────────────────────

async function main() {
  const email = process.env.MACCAN_EMAIL;
  const password = process.env.MACCAN_PASSWORD;

  if (email && password) {
    try {
      await authenticate(email, password);
      console.error(`✓ Authenticated as ${email}`);
    } catch (e) {
      console.error(`⚠ Auto-login failed: ${e instanceof Error ? e.message : e}`);
      console.error("  Other tools will fail until you call maccan_login.");
    }
  } else {
    console.error("ℹ No MACCAN_EMAIL/MACCAN_PASSWORD set. Call maccan_login tool to authenticate.");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Maccan POS MCP server running via stdio");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
