
"use strict";

/*
  دیجی‌مارکت - نسخه آزمایشی سمت مرورگر
  توجه: این نسخه هنوز حساب کاربری واقعی و سرور ندارد.
*/

const $ = (id) => document.getElementById(id);

const STORAGE_KEYS = {
  products: "digimarket_products_v1",
  cart: "digimarket_cart_v1",
  orders: "digimarket_orders_v1",
  theme: "digimarket_theme_v1"
};

const defaultProducts = [
  {
    id: "demo-1",
    name: "گوشی هوشمند سامسونگ",
    category: "موبایل",
    price: 28500000,
    stock: 5,
    seller: "فروشگاه نمونه",
    color: "مشکی",
    description: "گوشی هوشمند با نمایشگر باکیفیت، دوربین قدرتمند و طراحی مدرن. مشخصات دقیق این محصول باید توسط فروشنده تکمیل شود.",
    images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80"]
  },
  {
    id: "demo-2",
    name: "لپ‌تاپ مدرن",
    category: "لپ‌تاپ",
    price: 52000000,
    stock: 3,
    seller: "فروشگاه نمونه",
    color: "نقره‌ای",
    description: "لپ‌تاپ مناسب کارهای روزمره، مطالعه و استفاده عمومی. پیش از خرید، مشخصات سخت‌افزاری را از فروشنده بپرسید.",
    images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80"]
  },
  {
    id: "demo-3",
    name: "هدفون بی‌سیم",
    category: "لوازم جانبی",
    price: 3950000,
    stock: 8,
    seller: "فروشگاه نمونه",
    color: "مشکی",
    description: "هدفون بی‌سیم با طراحی راحت برای گوش دادن به موسیقی و استفاده روزمره.",
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80"]
  },
  {
    id: "demo-4",
    name: "ساعت هوشمند",
    category: "لوازم جانبی",
    price: 2750000,
    stock: 4,
    seller: "فروشگاه نمونه",
    color: "مشکی",
    description: "ساعت هوشمند با صفحه‌نمایش دیجیتال و ظاهر مناسب استفاده روزانه.",
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"]
  }
];

function readData(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.warn("خواندن اطلاعات ذخیره‌شده ممکن نشد.", error);
    return fallback;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("ذخیره اطلاعات ممکن نشد.", error);
    showToast("فضای ذخیره‌سازی کافی نیست؛ حجم عکس‌ها را کم کن.");
    return false;
  }
}

let products = readData(STORAGE_KEYS.products, defaultProducts);
let cart = readData(STORAGE_KEYS.cart, []);
let orders = readData(STORAGE_KEYS.orders, []);
let currentCategory = "همه";
let searchTerm = "";
let selectedImages = [];
let toastTimer;

function formatPrice(value) {
  return Number(value || 0).toLocaleString("fa-IR") + " تومان";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function safeImage(url) {
  if (typeof url !== "string") return "";
  if (url.startsWith("data:image/")) return url;
  try {
    const parsed = new URL(url, location.href);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch (_) {}
  return "";
}

function imageMarkup(images, className = "") {
  const url = safeImage(images?.[0]);
  if (!url) {
    return `<div class="product-placeholder ${className}">▯</div>`;
  }
  return `<img class="${className}" src="${escapeHTML(url)}"
    alt="تصویر محصول" loading="lazy"
    onerror="this.style.display='none'">`;
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function persistProducts() {
  return saveData(STORAGE_KEYS.products, products);
}

function persistCart() {
  saveData(STORAGE_KEYS.cart, cart);
  updateCartCount();
}

function persistOrders() {
  saveData(STORAGE_KEYS.orders, orders);
}

function showPage(pageName) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.add("hidden");
  });

  const page = $(pageName + "Page");
  if (!page) return;

  page.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pageName === "home") renderProducts();
  if (pageName === "seller") renderSeller();
  if (pageName === "cart") renderCart();
  if (pageName === "orders") renderOrders();
}

function scrollToProducts() {
  $("productsSection").scrollIntoView({ behavior: "smooth" });
}

function filterCategory(category) {
  currentCategory = category;
  $("productsTitle").textContent =
    category === "همه" ? "محصولات منتخب" : category;
  showPage("home");
  scrollToProducts();
}

function renderProducts() {
  const grid = $("productGrid");

  const filtered = products.filter((product) => {
    const matchesCategory =
      currentCategory === "همه" ||
      product.category === currentCategory;

    const text = [
      product.name,
      product.category,
      product.seller,
      product.color
    ].join(" ").toLowerCase();

    return matchesCategory && text.includes(searchTerm.toLowerCase());
  });

  $("productTotal").textContent =
    filtered.length.toLocaleString("fa-IR") + " محصول";

  $("emptyProducts").classList.toggle("hidden", filtered.length !== 0);

  grid.innerHTML = filtered.map((product) => `
    <article class="product-card">
      <div class="product-image"
        role="button" tabindex="0"
        aria-label="مشاهده ${escapeHTML(product.name)}"
        onclick="openProduct('${escapeHTML(product.id)}')"
        onkeydown="if(event.key==='Enter')openProduct('${escapeHTML(product.id)}')">
        ${imageMarkup(product.images)}
      </div>
      <div class="product-info">
        <span class="product-category">${escapeHTML(product.category)}</span>
        <h3 onclick="openProduct('${escapeHTML(product.id)}')">
          ${escapeHTML(product.name)}
        </h3>
        <div class="seller-name">فروشنده: ${escapeHTML(product.seller)}</div>
        <span class="product-price">${formatPrice(product.price)}</span>
        <div class="hint">موجودی: ${Number(product.stock).toLocaleString("fa-IR")}</div>
        <button class="btn btn-primary"
          ${Number(product.stock) < 1 ? "disabled" : ""}
          onclick="addToCart('${escapeHTML(product.id)}')">
          ${Number(product.stock) < 1 ? "ناموجود" : "افزودن به سبد خرید"}
        </button>
      </div>
    </article>
  `).join("");
}

function openProduct(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) {
    showToast("این محصول پیدا نشد.");
    return;
  }

  $("productDetail").innerHTML = `
    <div class="detail-layout">
      <div>
        <div class="detail-main-image" id="detailMainImage">
          ${imageMarkup(product.images)}
        </div>
        <div class="detail-thumbnails">
          ${(product.images || []).map((image, index) => {
            const url = safeImage(image);
            return url ? `
              <img src="${escapeHTML(url)}"
                alt="تصویر ${index + 1}"
                onclick="changeDetailImage('${escapeHTML(product.id)}',${index})">
            ` : "";
          }).join("")}
        </div>
      </div>
      <div class="detail-info">
        <span class="eyebrow">${escapeHTML(product.category)}</span>
        <h1>${escapeHTML(product.name)}</h1>
        <div class="detail-price">${formatPrice(product.price)}</div>
        <p>${escapeHTML(product.description || "توضیحی ثبت نشده است.")}</p>
        <p>رنگ: ${escapeHTML(product.color || "مشخص نشده")}</p>
        <p>فروشنده: <strong>${escapeHTML(product.seller)}</strong></p>
        <p>موجودی: ${Number(product.stock).toLocaleString("fa-IR")}</p>
        <button class="btn btn-primary"
          ${Number(product.stock) < 1 ? "disabled" : ""}
          onclick="addToCart('${escapeHTML(product.id)}')">
          افزودن به سبد خرید
        </button>
        <button class="btn btn-outline"
          onclick="contactSeller('${escapeHTML(product.id)}')">
          هماهنگی با فروشنده
        </button>
      </div>
    </div>
  `;

  showPage("detail");
}

function changeDetailImage(productId, imageIndex) {
  const product = products.find((item) => item.id === productId);
  const image = product?.images?.[imageIndex];
  const url = safeImage(image);
  if (!url) return;

  $("detailMainImage").innerHTML =
    `<img src="${escapeHTML(url)}" alt="تصویر محصول">`;
}

function contactSeller(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  showToast("برای هماهنگی، در نسخه بعدی راه ارتباطی فروشنده را اضافه می‌کنیم.");
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product || Number(product.stock) < 1) {
    showToast("این محصول در حال حاضر موجود نیست.");
    return;
  }

  const existing = cart.find((item) => item.productId === productId);
  const quantity = existing ? existing.quantity : 0;

  if (quantity >= Number(product.stock)) {
    showToast("تعداد انتخاب‌شده بیشتر از موجودی محصول است.");
    return;
  }

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ productId, quantity: 1 });
  }

  persistCart();
  showToast("محصول به سبد خرید اضافه شد.");
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  $("cartCount").textContent = count.toLocaleString("fa-IR");
}

function renderCart() {
  const validItems = cart.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return product ? { ...item, product } : null;
  }).filter(Boolean);

  $("cartItems").innerHTML = validItems.length ? validItems.map((item) => `
    <div class="panel cart-row">
      ${imageMarkup(item.product.images)}
      <div class="row-content">
        <strong>${escapeHTML(item.product.name)}</strong>
        <span class="muted">${formatPrice(item.product.price)}</span>
        <div class="seller-name">فروشنده: ${escapeHTML(item.product.seller)}</div>
      </div>
      <div class="quantity">
        <button aria-label="افزایش تعداد"
          onclick="changeQuantity('${escapeHTML(item.productId)}',1)">+</button>
        <strong>${Number(item.quantity).toLocaleString("fa-IR")}</strong>
        <button aria-label="کاهش تعداد"
          onclick="changeQuantity('${escapeHTML(item.productId)}',-1)">−</button>
      </div>
      <button class="small-btn danger"
        onclick="removeFromCart('${escapeHTML(item.productId)}')">حذف</button>
    </div>
  `).join("") : `<div class="empty">سبد خریدت خالی است.</div>`;

  const total = validItems.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity, 0
  );

  $("cartSummary").classList.toggle("hidden", validItems.length === 0);
  $("cartTotal").textContent = formatPrice(total);
}

function changeQuantity(productId, change) {
  const item = cart.find((entry) => entry.productId === productId);
  const product = products.find((entry) => entry.id === productId);
  if (!item || !product) return;

  const next = item.quantity + change;

  if (next <= 0) {
    removeFromCart(productId);
    return;
  }

  if (next > Number(product.stock)) {
    showToast("بیشتر از موجودی محصول نمی‌توان انتخاب کرد.");
    return;
  }

  item.quantity = next;
  persistCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.productId !== productId);
  persistCart();
  renderCart();
  showToast("محصول از سبد خرید حذف شد.");
}

$("checkoutForm").addEventListener("submit", (event) => {
  event.preventDefault();

  if (!cart.length) {
    showToast("سبد خرید خالی است.");
    return;
  }

  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId);
    if (!product || item.quantity > Number(product.stock)) {
      showToast("موجودی یکی از محصولات تغییر کرده است.");
      renderCart();
      return;
    }
  }

  const orderItems = cart.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return {
      productId: product.id,
      name: product.name,
      seller: product.seller,
      price: Number(product.price),
      quantity: item.quantity
    };
  });

  const order = {
    id: "DM-" + Date.now().toString(36).toUpperCase(),
    buyerName: $("buyerName").value.trim(),
    buyerPhone: $("buyerPhone").value.trim(),
    buyerAddress: $("buyerAddress").value.trim(),
    items: orderItems,
    total: orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    status: "ثبت‌شده برای هماهنگی",
    date: new Date().toLocaleString("fa-IR")
  };

  orders.unshift(order);
  if (!saveData(STORAGE_KEYS.orders, orders)) {
    orders.shift();
    return;
  }

  // کاهش موجودی در نسخه آزمایشی
  orderItems.forEach((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (product) product.stock -= item.quantity;
  });

  if (!persistProducts()) return;

  cart = [];
  persistCart();
  $("checkoutForm").reset();
  showToast("سفارش آزمایشی ثبت شد.");
  showPage("orders");
});

function renderOrders() {
  $("orderList").innerHTML = orders.length ? orders.map((order) => `
    <div class="order-card">
      <div>
        <strong>شماره سفارش: ${escapeHTML(order.id)}</strong>
        <div class="muted">${escapeHTML(order.date)}</div>
      </div>
      <span class="status">${escapeHTML(order.status)}</span>
      <div>
        ${order.items.map((item) => `
          <div>${escapeHTML(item.name)} × ${Number(item.quantity).toLocaleString("fa-IR")}</div>
          <div class="muted">فروشنده: ${escapeHTML(item.seller)}</div>
        `).join("")}
      </div>
      <strong>مبلغ: ${formatPrice(order.total)}</strong>
      <p class="hint">این سفارش فقط روی همین دستگاه ثبت شده و به فروشنده ارسال نشده است.</p>
    </div>
  `).join("") : `<div class="empty">هنوز سفارشی ثبت نکرده‌ای.</div>`;
}

$("searchInput").addEventListener("input", (event) => {
  searchTerm = event.target.value.trim();
  currentCategory = "همه";
  $("productsTitle").textContent = searchTerm ? "نتایج جست‌وجو" : "محصولات منتخب";
  showPage("home");
});

$("productImage").addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  const allowed = files.filter((file) =>
    file.type.startsWith("image/") && file.size <= 1.5 * 1024 * 1024
  );

  if (allowed.length !== files.length) {
    showToast("فقط عکس‌های معتبر تا حجم ۱٫۵ مگابایت برای هر عکس مجازند.");
  }

  try {
    const results = await Promise.all(allowed.map(readImageFile));
    selectedImages = results;
    $("imagePreview").innerHTML = selectedImages.map((src) =>
      `<img src="${escapeHTML(src)}" alt="پیش‌نمایش عکس">`
    ).join("");
  } catch (error) {
    selectedImages = [];
    $("imagePreview").innerHTML = "";
    showToast("خواندن عکس ممکن نشد.");
  }
});

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("تصویر خوانده نشد."));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

$("productForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const editId = $("editProductId").value;
  const existing = editId ? products.find((p) => p.id === editId) : null;

  if (editId && !existing) {
    showToast("محصول موردنظر پیدا نشد.");
    return;
  }

  const images = selectedImages.length
    ? selectedImages
    : (existing?.images || []);

  const product = {
    id: existing?.id || "product-" + Date.now().toString(36),
    name: $("productName").value.trim(),
    category: $("productCategory").value,
    price: Number($("productPrice").value),
    stock: Number($("productStock").value),
    seller: $("productSeller").value.trim(),
    color: $("productColor").value.trim(),
    description: $("productDescription").value.trim(),
    images
  };

  if (!product.name || !product.seller ||
      !Number.isFinite(product.price) || product.price < 0 ||
      !Number.isInteger(product.stock) || product.stock < 0) {
    showToast("اطلاعات محصول را بررسی کن.");
    return;
  }

  const previous = products.slice();

  if (existing) {
    products = products.map((p) => p.id === editId ? product : p);
  } else {
    products.unshift(product);
  }

  if (!persistProducts()) {
    products = previous;
    return;
  }

  resetProductForm();
  renderSeller();
  renderProducts();
  showToast(existing ? "محصول ویرایش شد." : "محصول اضافه شد.");
});

function editProduct(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  $("editProductId").value = product.id;
  $("productName").value = product.name;
  $("productCategory").value = product.category;
  $("productPrice").value = product.price;
  $("productStock").value = product.stock;
  $("productSeller").value = product.seller;
  $("productColor").value = product.color || "";
  $("productDescription").value = product.description || "";
  selectedImages = [];

  $("productImage").value = "";
  $("imagePreview").innerHTML = (product.images || []).map((src) =>
    `<img src="${escapeHTML(src)}" alt="عکس فعلی محصول">`
  ).join("");

  $("productFormTitle").textContent = "ویرایش محصول";
  $("productFormTitle").scrollIntoView({ behavior: "smooth" });
}

function deleteProduct(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  if (!confirm("این محصول حذف شود؟")) return;

  const previous = products.slice();
  products = products.filter((p) => p.id !== productId);

  if (!persistProducts()) {
    products = previous;
    return;
  }

  cart = cart.filter((item) => item.productId !== productId);
  persistCart();

  resetProductForm();
  renderSeller();
  renderProducts();
  showToast("محصول حذف شد.");
}

function resetProductForm() {
  $("productForm").reset();
  $("editProductId").value = "";
  $("productStock").value = "1";
  $("productFormTitle").textContent = "افزودن محصول جدید";
  selectedImages = [];
  $("imagePreview").innerHTML = "";
}

function renderSeller() {
  $("sellerProductCount").textContent =
    products.length.toLocaleString("fa-IR");
  $("sellerOrderCount").textContent =
    orders.length.toLocaleString("fa-IR");

  $("sellerProductList").innerHTML = products.length ? products.map((p) => `
    <div class="seller-row">
      ${imageMarkup(p.images)}
      <div class="row-content">
        <strong>${escapeHTML(p.name)}</strong>
        <span class="muted">${formatPrice(p.price)}</span>
        <div class="seller-name">${escapeHTML(p.seller)} · موجودی ${Number(p.stock).toLocaleString("fa-IR")}</div>
      </div>
      <div class="row-actions">
        <button class="small-btn" onclick="editProduct('${escapeHTML(p.id)}')">ویرایش</button>
        <button class="small-btn danger" onclick="deleteProduct('${escapeHTML(p.id)}')">حذف</button>
      </div>
    </div>
  `).join("") : `<div class="empty">هنوز محصولی ثبت نشده است.</div>`;
}

function applyTheme(theme) {
  if (!theme) return;

  const colorPattern = /^#[0-9a-fA-F]{6}$/;
  const primary = colorPattern.test(theme.primary) ? theme.primary : "#7257e8";
  const background = colorPattern.test(theme.background) ? theme.background : "#f5f6fb";

  document.documentElement.style.setProperty("--primary", primary);
  document.documentElement.style.setProperty("--background", background);

  $("themeColor").value = primary;
  $("backgroundColor").value = background;
}

function saveTheme() {
  const theme = {
    primary: $("themeColor").value,
    background: $("backgroundColor").value
  };

  if (saveData(STORAGE_KEYS.theme, theme)) {
    applyTheme(theme);
    showToast("رنگ‌های سایت تغییر کردند.");
  }
}

function resetTheme() {
  const theme = { primary: "#7257e8", background: "#f5f6fb" };
  if (saveData(STORAGE_KEYS.theme, theme)) {
    applyTheme(theme);
    showToast("رنگ‌ها به حالت اولیه برگشتند.");
  }
}

// راه‌اندازی اولیه
applyTheme(readData(STORAGE_KEYS.theme, {
  primary: "#7257e8",
  background: "#f5f6fb"
}));

updateCartCount();
renderProducts();
renderSeller();
