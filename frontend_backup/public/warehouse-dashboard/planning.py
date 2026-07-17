import os
import pymysql
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

class InventoryPlanningEngine:
    def __init__(self):
        self.db_host = os.getenv("DB_HOST")
        self.db_user = os.getenv("DB_USER", "rocks_user")
        self.db_password = os.getenv("DB_PASSWORD", "")
        self.db_name = os.getenv("DB_NAME", "rocks")
        self.db_port = int(os.getenv("DB_PORT", 3306))

    def _get_connection(self):
        try:
            import os
            import pymysql
            from sshtunnel import SSHTunnelForwarder
            
            db_host = os.getenv("DB_HOST")
            if not db_host or "your-aws" in db_host:
                return None
                
            db_user = os.getenv("DB_USER", "marketplace_admin")
            db_pass = os.getenv("DB_PASSWORD", "SuperSecretDBPassword123")
            db_name = os.getenv("DB_NAME", "rocks")
            
            try:
                # Direct Connection
                conn = pymysql.connect(
                    host=db_host,
                    user=db_user,
                    password=db_pass,
                    database=db_name,
                    port=int(os.getenv("DB_PORT", 3306)),
                    cursorclass=pymysql.cursors.DictCursor,
                    connect_timeout=3
                )
                return conn
            except Exception as e:
                # Fallback to SSH Tunnel
                base_dir = os.path.dirname(os.path.abspath(__file__))
                pem_file = os.path.join(base_dir, '..', 'LambdaFinancials.pem')
                tunnel = SSHTunnelForwarder(
                    (db_host, 22),
                    ssh_username='ubuntu',
                    ssh_pkey=pem_file,
                    remote_bind_address=('localhost', 3306)
                )
                tunnel.start()
                conn = pymysql.connect(
                    host='127.0.0.1',
                    user=db_user,
                    password=db_pass,
                    database=db_name,
                    port=tunnel.local_bind_port,
                    cursorclass=pymysql.cursors.DictCursor
                )
                # Store tunnel on conn so it can be closed, but for quick scripts it'll die when the process dies
                return conn
                
        except Exception as e:
            print(f"[!] MariaDB Database Connection Error: {e}")
            return None

    def get_planning_data(self, warehouse_id=None):
        conn = self._get_connection()
        if conn is None:
            # Fall back to high-fidelity actual historical ledger demo mode if offline
            return self._generate_mock_planning_data(warehouse_id)

        try:
            with conn.cursor() as cursor:
                # 1. Fetch Warehouses
                if warehouse_id:
                    cursor.execute("SELECT warehouse_id, location_name, capacity FROM warehouses WHERE warehouse_id = %s", (warehouse_id,))
                else:
                    cursor.execute("SELECT warehouse_id, location_name, capacity FROM warehouses")
                warehouses = cursor.fetchall()

                if not warehouses:
                    return {"success": False, "message": "No warehouses found in database."}

                def get_date_str(d):
                    if isinstance(d, datetime):
                        return d.strftime("%Y-%m-%d")
                    elif hasattr(d, 'strftime'):
                        return d.strftime("%Y-%m-%d")
                    return str(d)

                planning_results = []
                for wh in warehouses:
                    wh_id = wh["warehouse_id"]
                    wh_name = wh["location_name"]
                    capacity = wh["capacity"]

                    # 2. Fetch inventory ledger items for products at this warehouse
                    cursor.execute("""
                        SELECT il.product_id, p.name, p.sku, il.qty_available, il.qty_reserved 
                        FROM inventory_ledger il
                        JOIN products p ON il.product_id = p.product_id
                        WHERE il.warehouse_id = %s
                    """, (wh_id,))
                    ledger_items = cursor.fetchall()

                    product_forecasts = []
                    for item in ledger_items:
                        p_id = item["product_id"]
                        p_name = item["name"]
                        p_sku = item["sku"]
                        qty_avail = item["qty_available"]
                        qty_res = item["qty_reserved"]
                        
                        # Current real stock in the database
                        current_actual_stock = qty_avail + qty_res

                        # Query actual daily outflows for last 7 days
                        cursor.execute("""
                            SELECT DATE(o.created_at) as log_date, SUM(oi.quantity) as qty
                            FROM order_items oi
                            JOIN orders o ON oi.order_id = o.order_id
                            WHERE oi.product_id = %s AND oi.warehouse_id = %s
                              AND o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                            GROUP BY DATE(o.created_at)
                        """, (p_id, wh_id))
                        outflow_rows = cursor.fetchall()
                        outflows_by_date = {get_date_str(r["log_date"]): int(r["qty"]) for r in outflow_rows if r["log_date"]}

                        # Query actual daily inflows for last 7 days (shipments arrived at this warehouse containing this product)
                        cursor.execute("""
                            SELECT DATE(s.actual_delivery) as log_date, SUM(oi.quantity) as qty
                            FROM shipments s
                            JOIN orders o ON s.shipment_id = o.shipment_id
                            JOIN order_items oi ON o.order_id = oi.order_id
                            WHERE s.warehouse_id = %s AND oi.product_id = %s
                              AND s.actual_delivery >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                            GROUP BY DATE(s.actual_delivery)
                        """, (wh_id, p_id))
                        inflow_rows = cursor.fetchall()
                        inflows_by_date = {get_date_str(r["log_date"]): int(r["qty"]) for r in inflow_rows if r["log_date"]}

                        # Query actual daily returns for last 7 days (audit logs)
                        cursor.execute("""
                            SELECT DATE(timestamp) as log_date, COUNT(*) as qty
                            FROM audit_logs
                            WHERE entity_type = 'Product' AND entity_id = %s
                              AND action = 'RETURN_PRODUCT'
                              AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                            GROUP BY DATE(timestamp)
                        """, (str(p_id),))
                        return_rows = cursor.fetchall()
                        returns_by_date = {get_date_str(r["log_date"]): int(r["qty"]) for r in return_rows if r["log_date"]}

                        # Reconcile historical timeline going backward
                        timeline = []
                        temp_stock = current_actual_stock

                        # Loop past 7 days from today backward
                        for i in range(7):
                            target_date_dt = datetime.now() - timedelta(days=i)
                            target_date_str = target_date_dt.strftime("%Y-%m-%d")

                            outflow = outflows_by_date.get(target_date_str, 0)
                            inflow = inflows_by_date.get(target_date_str, 0)
                            returns = returns_by_date.get(target_date_str, 0)

                            # Reconcile starting stock of the day:
                            # Start = End + Outflow - Inflow - Returns
                            start_stock = temp_stock + outflow - inflow - returns
                            if start_stock < 0:
                                start_stock = 0

                            timeline.append({
                                "date": target_date_dt.strftime("%m-%d"),
                                "starting_stock": int(start_stock),
                                "outflow": int(outflow),
                                "inflow": int(inflow),
                                "returns": int(returns),
                                "ending_stock": int(temp_stock)
                            })
                            temp_stock = start_stock

                        # Reverse timeline so it is chronological (Day 1 -> Day 7)
                        timeline.reverse()
                        for idx, entry in enumerate(timeline):
                            entry["day"] = f"Day {idx + 1}"

                        # Dynamic metrics calculation
                        total_outflows = sum(outflows_by_date.values())
                        avg_outflow = round(total_outflows / 7.0, 1)
                        total_returns = sum(returns_by_date.values())
                        avg_returns = round(total_returns / 7.0, 1)

                        # Evaluate warning alerts from actual numbers
                        safety_stock = int(capacity * 0.05)
                        status = "OPTIMAL"
                        if current_actual_stock <= safety_stock:
                            status = "CRITICAL OUT-OF-STOCK RISK"
                        elif current_actual_stock < (capacity * 0.15):
                            status = "LOW STOCK WARNING"

                        product_forecasts.append({
                            "product_id": p_id,
                            "product_name": p_name,
                            "sku": p_sku,
                            "starting_stock": current_actual_stock,
                            "average_daily_outflow": avg_outflow,
                            "estimated_returns": avg_returns,
                            "forecast": timeline,
                            "risk_status": status
                        })

                    planning_results.append({
                        "warehouse_id": wh_id,
                        "warehouse_name": wh_name,
                        "capacity": capacity,
                        "items": product_forecasts
                    })

                return {"success": True, "planning": planning_results}

        except Exception as e:
            return {"success": False, "message": f"Planning query error: {str(e)}"}
        finally:
            conn.close()

    def _generate_mock_planning_data(self, warehouse_id=None):
        mock_warehouses = [
            {"warehouse_id": 10, "warehouse_name": "Chennai Main Hub", "capacity": 25000},
            {"warehouse_id": 11, "warehouse_name": "Perambur Sorting Facility", "capacity": 10000},
            {"warehouse_id": 12, "warehouse_name": "Guindy Local Hub", "capacity": 15000}
        ]

        if warehouse_id:
            mock_warehouses = [w for w in mock_warehouses if w["warehouse_id"] == warehouse_id]

        planning_results = []
        products_pool = [
            {"product_id": 201, "name": "Eco Fast Charger", "sku": "SKU-9908", "stock": 420, "outflows": [32, 28, 35, 41, 30, 25, 33], "inflows": [0, 0, 350, 0, 0, 0, 0], "returns": [2, 1, 3, 0, 1, 2, 1]},
            {"product_id": 202, "name": "Ultra Glass Protector", "sku": "SKU-4839", "stock": 180, "outflows": [10, 8, 12, 15, 9, 11, 7], "inflows": [0, 200, 0, 0, 0, 0, 0], "returns": [0, 1, 0, 2, 0, 1, 0]},
            {"product_id": 203, "name": "Premium Leather Sleeve", "sku": "SKU-2342", "stock": 900, "outflows": [14, 16, 12, 15, 18, 11, 13], "inflows": [0, 0, 0, 400, 0, 0, 0], "returns": [1, 0, 2, 1, 0, 1, 1]}
        ]

        for wh in mock_warehouses:
            wh_id = wh["warehouse_id"]
            product_forecasts = []

            for p in products_pool:
                # Add variation based on warehouse id
                starting_stock = p["stock"] + (wh_id * 10)
                outflows = [val + (wh_id % 3) for val in p["outflows"]]
                inflows = p["inflows"]
                returns = p["returns"]

                timeline = []
                temp_stock = starting_stock

                # Backward reconcile past 7 days
                for i in range(7):
                    day_idx = 6 - i
                    out = outflows[day_idx]
                    inf = inflows[day_idx]
                    ret = returns[day_idx]

                    start_stock = temp_stock + out - inf - ret
                    if start_stock < 0:
                        start_stock = 0

                    timeline.append({
                        "date": (datetime.now() - timedelta(days=i)).strftime("%m-%d"),
                        "starting_stock": int(start_stock),
                        "outflow": int(out),
                        "inflow": int(inf),
                        "returns": int(ret),
                        "ending_stock": int(temp_stock)
                    })
                    temp_stock = start_stock

                timeline.reverse()
                for idx, entry in enumerate(timeline):
                    entry["day"] = f"Day {idx + 1}"

                avg_outflow = round(sum(outflows) / 7.0, 1)
                avg_returns = round(sum(returns) / 7.0, 1)

                status = "OPTIMAL"
                safety_stock = int(wh["capacity"] * 0.05)
                if starting_stock <= safety_stock:
                    status = "CRITICAL OUT-OF-STOCK RISK"
                elif starting_stock < (wh["capacity"] * 0.15):
                    status = "LOW STOCK WARNING"

                product_forecasts.append({
                    "product_id": p["product_id"],
                    "product_name": p["name"],
                    "sku": p["sku"],
                    "starting_stock": starting_stock,
                    "average_daily_outflow": avg_outflow,
                    "estimated_returns": avg_returns,
                    "forecast": timeline,
                    "risk_status": status
                })

            planning_results.append({
                "warehouse_id": wh_id,
                "warehouse_name": wh["warehouse_name"],
                "capacity": wh["capacity"],
                "items": product_forecasts
            })

        return {"success": True, "demo_mode": True, "planning": planning_results}
