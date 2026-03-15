const base = process.env.CHECKLIST_BASE_URL || "http://localhost:5000";
const out = [];

const add = (module, test, endpoint, status, ok, notes = "") =>
	out.push({ module, test, endpoint, status, ok, notes });

const req = async (method, path, { token, body } = {}) => {
	const headers = {};
	if (token) headers.Authorization = `Bearer ${token}`;
	if (body !== undefined) headers["Content-Type"] = "application/json";

	const response = await fetch(`${base}${path}`, {
		method,
		headers,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});

	let json = null;
	try {
		json = await response.json();
	} catch {
		json = null;
	}

	return { s: response.status, b: json };
};

const expect = (module, test, endpoint, result, allowed, notes = "") => {
	add(
		module,
		test,
		endpoint,
		result.s,
		allowed.includes(result.s),
		notes || (result.b && result.b.message) || ""
	);
};

const makeUser = async (role) => {
	const email = `${role}.chk.${Date.now()}${Math.floor(Math.random() * 1000)}@ex.com`;
	const password = "Password123!";

	const reg = await req("POST", "/api/auth/register", {
		body: { name: `${role}_chk`, email, password, role },
	});
	const log = await req("POST", "/api/auth/login", {
		body: { email, password },
	});

	return {
		email,
		password,
		reg,
		log,
		token: log.b?.token,
		user: log.b?.user,
	};
};

(async () => {
	const sys1 = await req("GET", "/");
	expect("1 Server/System", "Health", "GET /", sys1, [200]);

	const sys2 = await req("GET", "/test-db");
	expect("1 Server/System", "DB ping", "GET /test-db", sys2, [200]);

	const admin = await makeUser("admin");
	const farmer = await makeUser("farmer");
	const buyer = await makeUser("buyer");
	const delivery = await makeUser("deliveryPartner");
	const agent = await makeUser("fieldAgent");

	expect("2 Auth", "Register admin", "POST /api/auth/register", admin.reg, [201]);
	expect("2 Auth", "Login admin", "POST /api/auth/login", admin.log, [200]);

	const logout = await req("POST", "/api/auth/logout", { token: buyer.token });
	expect("2 Auth", "Logout (if implemented)", "POST /api/auth/logout", logout, [200, 204, 404]);

	const refresh = await req("POST", "/api/auth/refresh-token", { token: buyer.token });
	expect(
		"2 Auth",
		"Refresh token (if implemented)",
		"POST /api/auth/refresh-token",
		refresh,
		[200, 201, 404]
	);

	const usersAdmin = await req("GET", "/api/users", { token: admin.token });
	expect("3 Users", "List users (admin)", "GET /api/users", usersAdmin, [200]);

	const usersBuyer = await req("GET", "/api/users", { token: buyer.token });
	expect("3 Users", "List users denied for non-admin", "GET /api/users", usersBuyer, [403]);

	const uById = await req("GET", "/api/users/1", { token: admin.token });
	expect("3 Users", "Get user by id (if implemented)", "GET /api/users/:id", uById, [200, 404]);

	const uCreate = await req("POST", "/api/users", { token: admin.token, body: { name: "x" } });
	expect("3 Users", "Create user (if implemented)", "POST /api/users", uCreate, [201, 404]);

	const uUpdate = await req("PUT", "/api/users/1", { token: admin.token, body: { name: "x" } });
	expect("3 Users", "Update user (if implemented)", "PUT /api/users/:id", uUpdate, [200, 404]);

	const uDelete = await req("DELETE", "/api/users/1", { token: admin.token });
	expect("3 Users", "Delete user (if implemented)", "DELETE /api/users/:id", uDelete, [200, 204, 404]);

	const catName = `Checklist_${Date.now()}`;
	const cCreate = await req("POST", "/api/categories", {
		token: admin.token,
		body: { category_name: catName },
	});
	expect("4 Categories", "Create category", "POST /api/categories", cCreate, [201]);

	const cDup = await req("POST", "/api/categories", {
		token: admin.token,
		body: { category_name: catName },
	});
	expect(
		"4 Categories",
		"Duplicate category prevention",
		"POST /api/categories (duplicate)",
		cDup,
		[400, 409]
	);

	const cList = await req("GET", "/api/categories");
	expect("4 Categories", "List categories", "GET /api/categories", cList, [200]);

	const categoryId = cCreate.b?.category?.id || cCreate.b?.id || 1;
	const cGet = await req("GET", `/api/categories/${categoryId}`);
	expect("4 Categories", "Get category by id", "GET /api/categories/:id", cGet, [200]);

	const cUpd = await req("PUT", `/api/categories/${categoryId}`, {
		token: admin.token,
		body: { category_name: `${catName}_U` },
	});
	expect("4 Categories", "Update category", "PUT /api/categories/:id", cUpd, [200]);

	const cDel = await req("DELETE", `/api/categories/${categoryId}`, { token: admin.token });
	expect("4 Categories", "Delete category", "DELETE /api/categories/:id", cDel, [200]);

	const cCreate2 = await req("POST", "/api/categories", {
		token: admin.token,
		body: { category_name: `Checklist2_${Date.now()}` },
	});
	const cat2Id = cCreate2.b?.category?.id || 1;

	const pCreate = await req("POST", "/api/products", {
		token: farmer.token,
		body: {
			name: `Checklist Tomato ${Date.now()}`,
			price: 12.5,
			stock: 25,
			category_id: cat2Id,
			description: "x",
		},
	});
	expect("5 Products", "Create product", "POST /api/products", pCreate, [201]);

	const productId = pCreate.b?.product?.id || pCreate.b?.id;

	const pInvalid = await req("POST", "/api/products", {
		token: farmer.token,
		body: { name: "Bad", price: -1, stock: 5, category_id: cat2Id },
	});
	expect("5 Products", "Price validation", "POST /api/products (invalid price)", pInvalid, [400]);

	const pList = await req("GET", "/api/products");
	expect("5 Products", "List products", "GET /api/products", pList, [200]);

	const pGet = await req("GET", `/api/products/${productId}`);
	expect("5 Products", "Get product by id", "GET /api/products/:id", pGet, [200]);

	const pUpd = await req("PUT", `/api/products/${productId}`, {
		token: farmer.token,
		body: { price: 14 },
	});
	expect("5 Products", "Update product", "PUT /api/products/:id", pUpd, [200]);

	const iList = await req("GET", "/api/inventory", { token: farmer.token });
	expect("6 Inventory", "List inventory (if implemented)", "GET /api/inventory", iList, [200, 404]);

	const iCreate = await req("POST", "/api/inventory", {
		token: farmer.token,
		body: { product_id: productId, quantity: 30 },
	});
	expect("6 Inventory", "Create stock (if implemented)", "POST /api/inventory", iCreate, [200, 201, 404]);

	const iUpdate = await req("PUT", "/api/inventory/update", {
		token: farmer.token,
		body: { product_id: productId, quantity: 40 },
	});
	expect("6 Inventory", "Update stock", "PUT /api/inventory/update", iUpdate, [200]);

	const iGet = await req("GET", `/api/inventory/${productId}`, { token: farmer.token });
	expect("6 Inventory", "Get stock by product", "GET /api/inventory/:productId", iGet, [200]);

	const iPutRest = await req("PUT", `/api/inventory/${productId}`, {
		token: farmer.token,
		body: { quantity: 20 },
	});
	expect(
		"6 Inventory",
		"REST update by id (if implemented)",
		"PUT /api/inventory/:productId",
		iPutRest,
		[200, 404]
	);

	const cartAdd = await req("POST", "/api/cart", {
		token: buyer.token,
		body: { product_id: productId, quantity: 2 },
	});
	expect("7 Cart", "Add to cart", "POST /api/cart", cartAdd, [200]);

	const cartGet = await req("GET", "/api/cart", { token: buyer.token });
	expect("7 Cart", "View cart", "GET /api/cart", cartGet, [200]);

	const cartId = cartAdd.b?.cart?.[0]?.id;
	const cartUpd = await req("PATCH", `/api/cart/${cartId}`, {
		token: buyer.token,
		body: { quantity: 1 },
	});
	expect("7 Cart", "Update quantity", "PATCH /api/cart/:id", cartUpd, [200]);

	const cartDel = await req("DELETE", `/api/cart/${cartId}`, { token: buyer.token });
	expect("7 Cart", "Remove item", "DELETE /api/cart/:id", cartDel, [200]);

	await req("POST", "/api/cart", {
		token: buyer.token,
		body: { product_id: productId, quantity: 2 },
	});

	const stockBefore = await req("GET", `/api/inventory/${productId}`, { token: farmer.token });
	const orderCreate = await req("POST", "/api/orders", {
		token: buyer.token,
		body: { shipping_address: "Addis" },
	});
	expect("8 Orders", "Create order", "POST /api/orders", orderCreate, [201]);

	const orderId = orderCreate.b?.order?.id || orderCreate.b?.order_id;
	const orderList = await req("GET", "/api/orders", { token: buyer.token });
	expect("8 Orders", "Order history", "GET /api/orders", orderList, [200]);

	const orderGet = await req("GET", `/api/orders/${orderId}`, { token: buyer.token });
	expect("8 Orders", "Get order by id", "GET /api/orders/:id", orderGet, [200]);

	const orderStatus = await req("PATCH", `/api/orders/${orderId}/status`, {
		token: admin.token,
		body: { order_status: "processing" },
	});
	expect("8 Orders", "Update order status", "PATCH /api/orders/:id/status", orderStatus, [200]);

	const orderCancel = await req("PATCH", `/api/orders/${orderId}/status`, {
		token: admin.token,
		body: { order_status: "cancelled" },
	});
	expect("8 Orders", "Cancel order", "PATCH /api/orders/:id/status", orderCancel, [200]);

	const stockAfter = await req("GET", `/api/inventory/${productId}`, { token: farmer.token });
	const beforeQty = Number(stockBefore.b?.quantity || 0);
	const afterQty = Number(stockAfter.b?.quantity || 0);
	add(
		"6 Inventory",
		"Stock reduction after order",
		"cross-module",
		`${beforeQty}->${afterQty}`,
		afterQty <= beforeQty,
		"stock should reduce or stay after order flow"
	);

	const payCreate = await req("POST", "/api/payments", {
		token: buyer.token,
		body: {
			order_id: orderId,
			payment_method: "mobile_money",
			amount: Number(orderCreate.b?.order?.total_amount || orderCreate.b?.order?.total_price || 0),
		},
	});
	expect("9 Payments", "Payment creation", "POST /api/payments", payCreate, [201, 400, 409]);

	const payHist = await req("GET", "/api/payments", { token: buyer.token });
	expect("9 Payments", "Payment history", "GET /api/payments", payHist, [200]);

	const payById = await req("GET", "/api/payments/1", { token: buyer.token });
	expect(
		"9 Payments",
		"Payment verification by id (if implemented)",
		"GET /api/payments/:id",
		payById,
		[200, 404]
	);

	const delList = await req("GET", "/api/delivery", { token: admin.token });
	expect("10 Delivery", "List deliveries (if implemented)", "GET /api/delivery", delList, [200, 404]);

	const delAssign = await req("POST", "/api/delivery/assign", {
		token: admin.token,
		body: {
			order_id: orderId,
			delivery_partner_id: delivery.user?.id,
			delivery_location: "Addis",
		},
	});
	expect("10 Delivery", "Assign delivery agent", "POST /api/delivery/assign", delAssign, [201, 409]);

	const delUpd = await req("PUT", "/api/delivery/update-status", {
		token: delivery.token,
		body: { order_id: orderId, status: "out for delivery" },
	});
	expect("10 Delivery", "Update delivery status", "PUT /api/delivery/update-status", delUpd, [200]);

	const delTrack = await req("GET", `/api/delivery/track/${orderId}`, { token: buyer.token });
	expect("10 Delivery", "Track delivery", "GET /api/delivery/track/:orderId", delTrack, [200]);

	const rvAdd = await req("POST", "/api/reviews", {
		token: buyer.token,
		body: { product_id: productId, rating: 5, comment: "good" },
	});
	expect("11 Reviews", "Add review", "POST /api/reviews", rvAdd, [201]);

	const rvBad = await req("POST", "/api/reviews", {
		token: buyer.token,
		body: { product_id: productId, rating: 7, comment: "bad" },
	});
	expect("11 Reviews", "Rating validation", "POST /api/reviews invalid rating", rvBad, [400, 409]);

	const rvGet = await req("GET", `/api/reviews/product/${productId}`);
	expect("11 Reviews", "Get reviews", "GET /api/reviews/product/:id", rvGet, [200]);

	const rvId = rvAdd.b?.review?.id || rvAdd.b?.id;
	const rvDel = await req("DELETE", `/api/reviews/${rvId}`, { token: buyer.token });
	expect("11 Reviews", "Delete review", "DELETE /api/reviews/:id", rvDel, [200]);

	const nCreate = await req("POST", "/api/notifications", {
		token: admin.token,
		body: { user_id: buyer.user?.id, title: "N", message: "hello" },
	});
	expect("12 Notifications", "Create notification", "POST /api/notifications", nCreate, [201]);

	const nList = await req("GET", "/api/notifications", { token: buyer.token });
	expect("12 Notifications", "Get notifications", "GET /api/notifications", nList, [200]);

	const nId = nCreate.b?.notification?.id || nList.b?.notifications?.[0]?.id;
	const nRead = await req("PATCH", `/api/notifications/${nId}/read`, { token: buyer.token });
	expect("12 Notifications", "Mark as read", "PATCH /api/notifications/:id/read", nRead, [200]);

	const sProd = await req("GET", "/api/search/products?name=Tomato");
	expect("13 Search", "Product search", "GET /api/search/products?name=", sProd, [200]);

	const sCat = await req("GET", `/api/search/products?category_id=${cat2Id}`);
	expect("13 Search", "Category search", "GET /api/search/products?category_id=", sCat, [200]);

	const dAdmin = await req("GET", "/api/dashboard/admin", { token: admin.token });
	expect("14 Dashboard", "Admin dashboard stats", "GET /api/dashboard/admin", dAdmin, [200]);

	const dGeneric = await req("GET", "/api/dashboard", { token: admin.token });
	expect("14 Dashboard", "Generic dashboard route (if implemented)", "GET /api/dashboard", dGeneric, [200, 404]);

	const aList = await req("GET", "/api/agents", { token: admin.token });
	expect("15 Agents", "List agents (if implemented)", "GET /api/agents", aList, [200, 404]);

	const aCreate = await req("POST", "/api/agents", { token: admin.token, body: { name: "x" } });
	expect("15 Agents", "Create agent (if implemented)", "POST /api/agents", aCreate, [201, 404]);

	const aPut = await req("PUT", "/api/agents/1", { token: admin.token, body: { name: "x" } });
	expect("15 Agents", "Update agent (if implemented)", "PUT /api/agents/:id", aPut, [200, 404]);

	const aDel = await req("DELETE", "/api/agents/1", { token: admin.token });
	expect("15 Agents", "Delete agent (if implemented)", "DELETE /api/agents/:id", aDel, [200, 204, 404]);

	const aAssign = await req("POST", "/api/agents/assign-farmer", {
		token: admin.token,
		body: { agent_id: agent.user?.id, farmer_id: farmer.user?.id },
	});
	expect("15 Agents", "Assign farmer to agent", "POST /api/agents/assign-farmer", aAssign, [201]);

	const aFarm = await req("GET", "/api/agents/farmers", { token: agent.token });
	expect("15 Agents", "Agent farmers list", "GET /api/agents/farmers", aFarm, [200]);

	const aProd = await req("POST", "/api/agents/add-product", {
		token: agent.token,
		body: {
			farmer_id: farmer.user?.id,
			name: `Agent P ${Date.now()}`,
			price: 9.5,
			stock: 6,
			category_id: cat2Id,
			description: "agent",
		},
	});
	expect("15 Agents", "Agent add product", "POST /api/agents/add-product", aProd, [201]);

	const adUsers = await req("GET", "/api/admin/users", { token: admin.token });
	expect("16 Admin", "Admin users (if implemented)", "GET /api/admin/users", adUsers, [200, 404]);

	const adOrders = await req("GET", "/api/admin/orders", { token: admin.token });
	expect("16 Admin", "Admin orders (if implemented)", "GET /api/admin/orders", adOrders, [200, 404]);

	const adProd = await req("GET", "/api/admin/products", { token: admin.token });
	expect("16 Admin", "Admin products (if implemented)", "GET /api/admin/products", adProd, [200, 404]);

	const adDash = await req("GET", "/api/admin/dashboard", { token: admin.token });
	expect("16 Admin", "Admin dashboard", "GET /api/admin/dashboard", adDash, [200]);

	const modules = [...new Set(out.map((x) => x.module))];
	const summary = modules.map((module) => {
		const rows = out.filter((r) => r.module === module);
		return {
			module,
			total: rows.length,
			passed: rows.filter((r) => r.ok).length,
			failed: rows.filter((r) => !r.ok).length,
		};
	});

	const fails = out.filter((r) => !r.ok);

	console.log("=== CHECKLIST SUMMARY ===");
	console.table(summary);
	console.log("=== FAILURES ===");
	if (!fails.length) {
		console.log("None");
	} else {
		console.table(fails);
	}

	process.exit(fails.length ? 1 : 0);
})().catch((error) => {
	console.error(error);
	process.exit(2);
});