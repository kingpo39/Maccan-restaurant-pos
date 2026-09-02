import { CHARACTER_LIMIT } from "./constants.js";

export function paginate<T>(items: T[], limit: number, offset: number) {
  const slice = items.slice(offset, offset + limit);
  return {
    total: items.length,
    count: slice.length,
    offset,
    items: slice,
    has_more: items.length > offset + slice.length,
    next_offset: items.length > offset + slice.length ? offset + slice.length : undefined,
  };
}

export function truncate(result: string): string {
  if (result.length <= CHARACTER_LIMIT) return result;
  const truncated = result.slice(0, CHARACTER_LIMIT);
  return truncated + `\n\n[Response truncated at ${CHARACTER_LIMIT} chars. Use filters or pagination to narrow results.]`;
}

export function formatIngredientMd(i: any): string {
  const lines = [`## ${i.name} (${i.id})`];
  lines.push(`- **Category**: ${i.category}`);
  lines.push(`- **Unit**: ${i.baseUnit}`);
  lines.push(`- **Cost per unit**: ${i.costPerUnit}`);
  if (i.supplier_name) lines.push(`- **Supplier**: ${i.supplier_name}`);
  if (i.allergens?.length) lines.push(`- **Allergens**: ${i.allergens.join(", ")}`);
  return lines.join("\n");
}

export function formatRecipeMd(r: any): string {
  const lines = [`## ${r.name} (${r.id})`];
  lines.push(`- **Category**: ${r.category}`);
  lines.push(`- **Menu price**: ${r.menuPrice}`);
  lines.push(`- **Yield**: ${r.yieldQuantity} servings`);
  lines.push(`- **Waste factor**: ${r.wasteFactor}`);
  if (r.items?.length) {
    lines.push(`- **Ingredients**:`);
    r.items.forEach((item: any) => {
      const name = item.ingredient?.name || item.ingredientName || "?";
      lines.push(`  - ${item.quantity} ${item.ingredient?.baseUnit || ""} ${name}`);
    });
  }
  if (r.costAnalysis) {
    const c = r.costAnalysis;
    lines.push(`- **Cost per serving**: ${c.costPerServing} (${c.foodCostPercent}% food cost)`);
  }
  return lines.join("\n");
}

export function formatOrderMd(o: any): string {
  const lines = [`## Order ${o.id}`];
  lines.push(`- **Status**: ${o.status}`);
  lines.push(`- **Total**: ${o.totalAmount}`);
  if (o.table?.label) lines.push(`- **Table**: ${o.table.label}`);
  if (o.server) lines.push(`- **Server**: ${o.server.firstName} ${o.server.lastName}`);
  if (o.items?.length) {
    lines.push(`- **Items**:`);
    o.items.forEach((item: any) => {
      lines.push(`  - ${item.recipe?.name || "?"} × ${item.quantity} @ ${item.unitPrice} [${item.status}]`);
    });
  }
  return lines.join("\n");
}
