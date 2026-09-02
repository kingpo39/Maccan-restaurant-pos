"""Maccan RMS — Restaurant Dashboard (Streamlit)"""

import streamlit as st
import requests
import pandas as pd
from datetime import datetime

# ─── Config ─────────────────────────────────────────────────────

st.set_page_config(page_title="Maccan RMS", page_icon="🍽️", layout="wide")

API = st.sidebar.text_input("API URL", value="http://localhost:3001/api")
EMAIL = st.sidebar.text_input("Email", value="bijan@maccan.com")
PASSWORD = st.sidebar.text_input("Password", value="Maccan@6", type="password")

# ─── Auth ───────────────────────────────────────────────────────

def login():
    try:
        r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=10)
        if r.ok:
            data = r.json()
            st.session_state["token"] = data.get("token") or data.get("access_token")
            st.session_state["user"] = data.get("user", {})
            return True
    except Exception:
        pass
    return False

def api_get(path: str, params: dict | None = None):
    token = st.session_state.get("token")
    if not token:
        return None
    try:
        r = requests.get(f"{API}{path}", headers={"Authorization": f"Bearer {token}"}, params=params, timeout=15)
        if r.ok:
            return r.json()
    except Exception:
        pass
    return None

if "token" not in st.session_state:
    if not login():
        st.error("Login failed. Check API URL and credentials in the sidebar.")
        st.stop()

# ─── Title ──────────────────────────────────────────────────────

st.title(":material/restaurant: Maccan RMS dashboard")

# ─── Data loaders (cached) ─────────────────────────────────────

@st.cache_data(ttl="2m")
def load_stats():
    return api_get("/dashboard/stats") or {}

@st.cache_data(ttl="2m")
def load_stock():
    return api_get("/inventory/stock") or []

@st.cache_data(ttl="2m")
def load_alerts():
    return api_get("/inventory/alerts") or {}

@st.cache_data(ttl="2m")
def load_cost_analysis():
    return api_get("/dashboard/cost-analysis") or []

@st.cache_data(ttl="2m")
def load_active_orders():
    return api_get("/orders", {"active": "true"}) or []

@st.cache_data(ttl="2m")
def load_recipes():
    return api_get("/recipes") or []

# ─── KPI Row ────────────────────────────────────────────────────

stats = load_stats()

with st.container(horizontal=True):
    st.metric("Ingredients", stats.get("total_ingredients", 0), border=True)
    st.metric("Recipes", stats.get("total_recipes", 0), border=True)
    st.metric("Suppliers", stats.get("total_suppliers", 0), border=True)
    st.metric("Today's orders", stats.get("today_orders", 0), border=True)
    st.metric("Avg food cost", f"{stats.get('avg_food_cost_percent', 0)}%", border=True)

# ─── Main content ───────────────────────────────────────────────

col1, col2 = st.columns(2)

# ─── Cost analysis chart ────────────────────────────────────────

with col1:
    with st.container(border=True):
        st.subheader(":material/analytics: Cost analysis")
        cost_data = load_cost_analysis()
        if cost_data:
            df = pd.DataFrame(cost_data)
            if "name" in df.columns and "foodCostPercent" in df.columns:
                df_sorted = df.sort_values("foodCostPercent", ascending=False).head(15)
                st.bar_chart(df_sorted, x="name", y="foodCostPercent", horizontal=True)
            else:
                st.info("No cost data available")
        else:
            st.info("No cost data available")

# ─── Inventory alerts ───────────────────────────────────────────

with col2:
    with st.container(border=True):
        st.subheader(":material/warning: Inventory alerts")
        alerts = load_alerts()
        summary = alerts.get("summary", {})
        level = summary.get("alertLevel", "OK")
        color = "green" if level == "OK" else "orange" if level == "WARNING" else "red"
        st.markdown(f"**Alert level:** :{color}[{level}]")

        out_of_stock = alerts.get("outOfStock", [])
        if out_of_stock:
            st.markdown(f"**Out of stock** ({len(out_of_stock)})")
            for item in out_of_stock[:10]:
                st.markdown(f"- :red[{item.get('name', '?')}]")
        else:
            st.success("All ingredients in stock")

        expiring = alerts.get("expiringSoon", [])
        if expiring:
            st.markdown(f"**Expiring soon** ({len(expiring)})")
            for item in expiring[:5]:
                st.markdown(f"- {item.get('name', '?')} — {item.get('daysLeft', '?')} days left")

# ─── Active orders ──────────────────────────────────────────────

with st.container(border=True):
    st.subheader(":material/receipt_long: Active orders")
    orders = load_active_orders()
    if orders:
        rows = []
        for o in orders:
            table = o.get("table", {}).get("label", "-") if o.get("table") else "-"
            items = ", ".join(
                f"{it.get('recipe', {}).get('name', '?')} ×{it.get('quantity', 1)}"
                for it in o.get("items", [])
            )
            rows.append({"id": o.get("id", "?")[:8], "table": table, "status": o.get("status"), "total": o.get("totalAmount", 0), "items": items})
        df = pd.DataFrame(rows)
        st.dataframe(df, hide_index=True, use_container_width=True)
    else:
        st.info("No active orders")

# ─── Inventory table ────────────────────────────────────────────

with st.container(border=True):
    st.subheader(":material/inventory_2: Inventory stock")
    stock = load_stock()
    if stock:
        df = pd.DataFrame(stock)
        show_cols = [c for c in ["name", "category", "baseUnit", "currentStock", "costPerUnit", "status", "supplier"] if c in df.columns]
        if "supplier" in df.columns:
            df["supplier"] = df["supplier"].apply(lambda s: s.get("name", "-") if isinstance(s, dict) else "-")
        st.dataframe(df[show_cols] if show_cols else df, hide_index=True, use_container_width=True)
    else:
        st.info("No stock data")

# ─── Sidebar: refresh ───────────────────────────────────────────

if st.sidebar.button("Refresh data", icon=":material/refresh:"):
    st.cache_data.clear()
    st.rerun()

st.sidebar.caption(f"Last updated: {datetime.now().strftime('%H:%M:%S')}")
