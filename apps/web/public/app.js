/* ═══════════════════════════════════════════════════════════
   JAPANVIP – Application JavaScript
   Navigation, Interactions, Animations, Live Countdowns
═══════════════════════════════════════════════════════════ */

// ── Navigation System ──────────────────────────────────────
const pages = [
  'home', 'buy-from-japan', 'product-detail',
  'auction', 'auction-detail', 'order-tracking',
  'dashboard', 'seller-dashboard', 'blog', 'contact'
];

function navigate(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Show target page
  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active-nav'));

  // Handle special pages that need display adjustment
  if (pageId === 'dashboard' || pageId === 'seller-dashboard') {
    if (target) target.style.minHeight = 'calc(100vh - 130px)';
  }

  // Show tracking by default on order-tracking page
  if (pageId === 'order-tracking') {
    setTimeout(() => {
      showTracking();
    }, 300);
  }
}

// ── Mobile Nav ─────────────────────────────────────────────
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
const mobileOverlay = document.getElementById('mobile-overlay');

mobileMenuToggle?.addEventListener('click', () => {
  mobileNav?.classList.add('open');
  mobileOverlay?.classList.add('visible');
  document.body.style.overflow = 'hidden';
});

function closeMobileNav() {
  mobileNav?.classList.remove('open');
  mobileOverlay?.classList.remove('visible');
  document.body.style.overflow = '';
}

document.getElementById('close-mobile-nav')?.addEventListener('click', closeMobileNav);

// ── Header Scroll Effect ───────────────────────────────────
let lastScroll = 0;
const header = document.getElementById('main-header');

window.addEventListener('scroll', () => {
  const currentScroll = window.scrollY;
  if (header) {
    if (currentScroll > 100) {
      header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)';
    } else {
      header.style.boxShadow = '0 1px 0 #e5e7eb';
    }
  }
  lastScroll = currentScroll;
}, { passive: true });

// ── URL Import Tool ─────────────────────────────────────────
function showProductResult() {
  const input = document.getElementById('product-url-input');
  const result = document.getElementById('product-result');

  if (input && result) {
    const url = input.value.trim();
    if (!url) {
      showToast('⚠️ Vui lòng nhập URL sản phẩm');
      return;
    }

    // Simulate loading
    const btn = document.getElementById('btn-check-url');
    if (btn) {
      btn.innerHTML = '<span class="loading-spin">⟳</span> Đang kiểm tra...';
      btn.disabled = true;
    }

    setTimeout(() => {
      result.style.display = 'block';
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (btn) {
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Kiểm Tra Ngay`;
        btn.disabled = false;
      }
      showToast('✅ Tìm thấy sản phẩm! Xem thông tin bên dưới.');
    }, 1800);
  }
}

function sendQuote() {
  showToast('📧 Yêu cầu báo giá đã được gửi! Chúng tôi sẽ liên hệ trong 30 phút.');
}

// ── Order Tracking ──────────────────────────────────────────
function showTracking() {
  const result = document.getElementById('tracking-result');
  const input = document.getElementById('tracking-input');

  if (result) {
    result.style.display = 'block';
    result.style.animation = 'fadeIn 0.4s ease';

    if (input && input.value.trim() === '') {
      showToast('⚠️ Vui lòng nhập mã đơn hàng');
      result.style.display = 'none';
      return;
    }

    setTimeout(() => {
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

// ── Auction – Bid Functions ─────────────────────────────────
function setBid(amount) {
  const input = document.getElementById('bid-amount');
  if (input) {
    input.value = amount;
    input.focus();
  }
}

function placeBid() {
  const input = document.getElementById('bid-amount');
  const amount = input ? parseInt(input.value) : 0;

  if (amount < 3250000) {
    showToast('⚠️ Số tiền phải ít nhất 3,250,000₫ (cao hơn giá hiện tại)');
    return;
  }

  const overlay = document.getElementById('bid-modal-overlay');
  const bidDisplay = overlay?.querySelector('.modal-bid-amount');
  if (bidDisplay) {
    bidDisplay.textContent = formatMoney(amount);
  }
  if (overlay) overlay.style.display = 'flex';
}

function closeBidModal() {
  const overlay = document.getElementById('bid-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function confirmBid() {
  closeBidModal();

  // Update the current bid display
  const currentBidEls = document.querySelectorAll('.bid-current');
  const input = document.getElementById('bid-amount');
  const amount = input ? parseInt(input.value) : 3250000;

  currentBidEls.forEach(el => {
    el.textContent = formatMoney(amount);
    el.style.animation = 'bidUpdate 0.5s ease';
  });

  // Add to bid history
  addBidToHistory(amount);

  showToast('🎉 Đặt giá thành công! Bạn đang dẫn đầu phiên đấu giá.');

  // Update big countdown badge
  const badge = document.querySelector('.bid-count-bar');
  if (badge) {
    badge.innerHTML = `<span class="live-dot" style="width:6px;height:6px;border-radius:50%;background:#dc2626;display:inline-block;animation:livePulse 1.2s infinite"></span> <strong>48 người</strong> đang đấu giá • Người dẫn đầu: <strong>Bạn 👑</strong>`;
  }
}

function addBidToHistory(amount) {
  const list = document.querySelector('.bid-history-list');
  if (!list) return;

  const item = document.createElement('div');
  item.className = 'bid-hist-item leader';
  item.style.animation = 'fadeIn 0.4s ease';
  item.innerHTML = `
    <div class="bid-hist-user">
      <div class="hist-avatar leader-av">BN</div>
      <div>
        <div class="hist-name">Bạn (vừa đặt)</div>
        <div class="hist-time">Vừa xong</div>
      </div>
    </div>
    <div class="hist-amount leader-amount">${formatMoney(amount)} 👑</div>
  `;

  // Remove old leader badge
  const oldLeader = list.querySelector('.bid-hist-item.leader');
  if (oldLeader) oldLeader.classList.remove('leader');

  list.insertBefore(item, list.firstChild);
}

// ── Contact Form Submit ─────────────────────────────────────
function submitContact() {
  showToast('✅ Tin nhắn đã được gửi! Chúng tôi sẽ phản hồi trong vòng 2 giờ.');
}

// ── Product Tabs ────────────────────────────────────────────
function switchTab(btn, tabId) {
  // Remove active from all tabs
  const tabBtns = btn.closest('.tabs-nav').querySelectorAll('.tab-btn');
  const contents = btn.closest('.product-tabs').querySelectorAll('.tab-content');

  tabBtns.forEach(b => b.classList.remove('active'));
  contents.forEach(c => { c.style.display = 'none'; c.classList.remove('active'); });

  // Activate selected
  btn.classList.add('active');
  const target = document.getElementById(tabId);
  if (target) { target.style.display = 'block'; target.classList.add('active'); }
}

// ── Quantity Control ────────────────────────────────────────
function changeQty(delta) {
  const input = document.getElementById('qty-input');
  if (!input) return;
  const val = parseInt(input.value) + delta;
  if (val >= 1 && val <= 10) input.value = val;
}

// ── FAQ Toggle ──────────────────────────────────────────────
function toggleFaq(el) {
  const item = el.closest('.faq-item');
  const isOpen = item.classList.contains('open');

  // Close all
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));

  if (!isOpen) item.classList.add('open');
}

// ── Platform Chip Toggle ────────────────────────────────────
document.querySelectorAll('.platform-chip').forEach(chip => {
  chip.addEventListener('click', function() {
    document.querySelectorAll('.platform-chip').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
  });
});

// ── Gallery Thumbs ──────────────────────────────────────────
document.querySelectorAll('.thumb').forEach(thumb => {
  thumb.addEventListener('click', function() {
    const gallery = this.closest('.product-gallery, .auction-gallery');
    if (gallery) {
      gallery.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    }
  });
});

// ── Color Options ───────────────────────────────────────────
document.querySelectorAll('.color-opt').forEach(opt => {
  opt.addEventListener('click', function() {
    document.querySelectorAll('.color-opt').forEach(o => o.classList.remove('active'));
    this.classList.add('active');
  });
});

// ── Blog Category Buttons ───────────────────────────────────
document.querySelectorAll('.blog-cat-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.blog-cat-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
  });
});

// ── View Toggle ─────────────────────────────────────────────
document.querySelectorAll('.view-toggle').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.view-toggle').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
  });
});

// ── Toast Notification ──────────────────────────────────────
function showToast(message, duration = 3500) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// ── Format Money ────────────────────────────────────────────
function formatMoney(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

// ── Live Countdown Timers ───────────────────────────────────
class Countdown {
  constructor(hoursEl, minsEl, secsEl, endSeconds) {
    this.hoursEl = hoursEl;
    this.minsEl = minsEl;
    this.secsEl = secsEl;
    this.remaining = endSeconds;
    this.interval = null;
    this.start();
  }

  start() {
    this.update();
    this.interval = setInterval(() => {
      this.remaining--;
      if (this.remaining <= 0) {
        clearInterval(this.interval);
        this.showEnded();
        return;
      }
      this.update();
    }, 1000);
  }

  update() {
    const h = Math.floor(this.remaining / 3600);
    const m = Math.floor((this.remaining % 3600) / 60);
    const s = this.remaining % 60;

    if (this.hoursEl) this.hoursEl.textContent = String(h).padStart(2, '0');
    if (this.minsEl) this.minsEl.textContent = String(m).padStart(2, '0');
    if (this.secsEl) this.secsEl.textContent = String(s).padStart(2, '0');

    // Add urgency class when < 1 hour
    if (h === 0 && this.hoursEl) {
      this.hoursEl.classList.add('urgent');
      if (this.minsEl) this.minsEl.classList.add('urgent');
    }
  }

  showEnded() {
    if (this.hoursEl) this.hoursEl.textContent = '00';
    if (this.minsEl) this.minsEl.textContent = '00';
    if (this.secsEl) this.secsEl.textContent = '00';
  }
}

// Initialize countdowns
const bigH = document.getElementById('big-h');
const bigM = document.getElementById('big-m');
const bigS = document.getElementById('big-s');
if (bigH) new Countdown(bigH, bigM, bigS, 2 * 3600 + 34 * 60 + 18);

const cd1H = document.getElementById('cd1-h');
const cd1M = document.getElementById('cd1-m');
const cd1S = document.getElementById('cd1-s');
if (cd1H) new Countdown(cd1H, cd1M, cd1S, 2 * 3600 + 34 * 60 + 18);

// ── Hero Slideshow ──────────────────────────────────────────
let currentSlide = 0;
const indicators = document.querySelectorAll('.hero-indicator');

indicators.forEach((ind, i) => {
  ind.addEventListener('click', () => {
    setSlide(i);
  });
});

function setSlide(idx) {
  document.querySelectorAll('.hero-slide').forEach((s, i) => {
    s.classList.toggle('active', i === idx);
  });
  document.querySelectorAll('.indicator').forEach((ind, i) => {
    ind.classList.toggle('active', i === idx);
  });
  currentSlide = idx;
}

// Auto advance slides (if multiple)
setInterval(() => {
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length > 1) {
    currentSlide = (currentSlide + 1) % slides.length;
    setSlide(currentSlide);
  }
}, 5000);

// ── Bid Input Real-time Format ──────────────────────────────
const bidAmountInput = document.getElementById('bid-amount');
if (bidAmountInput) {
  bidAmountInput.addEventListener('input', function() {
    const val = parseInt(this.value);
    if (!isNaN(val) && val >= 3250000) {
      this.style.color = '#c41e3a';
    } else {
      this.style.color = '#9ca3af';
    }
  });
}

// ── Search Bar Submit ───────────────────────────────────────
const searchBtn = document.querySelector('.search-btn');
const mainSearch = document.getElementById('main-search');

searchBtn?.addEventListener('click', () => {
  const term = mainSearch?.value.trim();
  if (term) {
    navigate('auction');
    showToast(`🔍 Đang tìm kiếm: "${term}"`);
  }
});

mainSearch?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchBtn?.click();
});

// ── Hero URL Input quick navigate ───────────────────────────
const heroUrlInput = document.getElementById('hero-url-input');
heroUrlInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    navigate('buy-from-japan');
    setTimeout(() => {
      const buyInput = document.getElementById('product-url-input');
      if (buyInput && heroUrlInput.value) {
        buyInput.value = heroUrlInput.value;
        showProductResult();
      }
    }, 400);
  }
});

// ── Clear URL Input ─────────────────────────────────────────
document.getElementById('clear-url')?.addEventListener('click', () => {
  const input = document.getElementById('product-url-input');
  if (input) { input.value = ''; input.focus(); }
  const result = document.getElementById('product-result');
  if (result) result.style.display = 'none';
});

// ── Bid Suggestions ─────────────────────────────────────────
document.querySelectorAll('.bid-sug').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.bid-sug').forEach(b => b.style.borderColor = '');
    this.style.borderColor = '#c41e3a';
    this.style.color = '#c41e3a';
  });
});

// ── Wishlist Toggle ─────────────────────────────────────────
document.querySelectorAll('.product-wishlist').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    const isLiked = this.getAttribute('data-liked');
    if (isLiked) {
      this.removeAttribute('data-liked');
      this.textContent = '♡';
      this.style.background = 'rgba(255,255,255,0.9)';
      this.style.color = '';
      showToast('Đã xóa khỏi danh sách yêu thích');
    } else {
      this.setAttribute('data-liked', '1');
      this.textContent = '♥';
      this.style.background = '#c41e3a';
      this.style.color = 'white';
      showToast('❤️ Đã thêm vào danh sách yêu thích!');
    }
  });
});

// ── Pagination ──────────────────────────────────────────────
document.querySelectorAll('.page-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    if (this.classList.contains('next-page')) {
      document.querySelectorAll('.page-btn:not(.next-page)').forEach(b => b.classList.remove('active'));
      const activeBtn = document.querySelector('.page-btn.active');
      if (activeBtn && activeBtn.nextElementSibling && !activeBtn.nextElementSibling.classList.contains('next-page')) {
        activeBtn.nextElementSibling.classList.add('active');
      }
    } else {
      document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ── Floating Animation Enhancement ─────────────────────────
function addHoverEffect(selector, scale = 1.03) {
  document.querySelectorAll(selector).forEach(el => {
    el.addEventListener('mouseenter', () => {
      el.style.transform = `translateY(-5px) scale(${scale})`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}

// ── Intersection Observer for Animations ───────────────────
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

function setupAnimations() {
  const animateEls = document.querySelectorAll(
    '.product-card, .auction-card, .testimonial-card, .blog-card, .cat-card, .why-stat, .widget, .tracking-info-card'
  );
  animateEls.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.5s ease ${i * 0.05}s, transform 0.5s ease ${i * 0.05}s`;
    observer.observe(el);
  });
}

setupAnimations();

// ── Live Bid Counter Simulation ─────────────────────────────
function simulateLiveBids() {
  setInterval(() => {
    const page = document.getElementById('page-auction-detail');
    if (!page || !page.classList.contains('active')) return;

    // Randomly update watcher count
    const watchers = document.querySelector('.watchers-bar strong');
    if (watchers && Math.random() > 0.7) {
      const current = parseInt(watchers.textContent.replace(/\D/g, ''));
      watchers.textContent = current + Math.floor(Math.random() * 3);
    }
  }, 5000);
}

simulateLiveBids();

// ── Contact Form Validation ─────────────────────────────────
document.querySelectorAll('.contact-form input, .contact-form select, .contact-form textarea').forEach(el => {
  el.addEventListener('blur', function() {
    if (this.hasAttribute('required') || this.type === 'email') {
      if (!this.value.trim()) {
        this.style.borderColor = '#dc2626';
      } else {
        this.style.borderColor = '#059669';
      }
    }
  });
  el.addEventListener('focus', function() {
    this.style.borderColor = '#c41e3a';
  });
});

// ── Seller Dashboard Action ─────────────────────────────────
document.querySelectorAll('.btn-outline-sm.red').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn dừng phiên đấu giá này không?')) {
      const item = this.closest('.seller-auction-item');
      if (item) {
        item.style.opacity = '0.5';
        item.style.pointerEvents = 'none';
        showToast('⏸ Phiên đấu giá đã được dừng');
      }
    }
  });
});

// ── Dashboard Nav Items ─────────────────────────────────────
document.querySelectorAll('.dash-nav-item').forEach(item => {
  item.addEventListener('click', function() {
    this.closest('nav').querySelectorAll('.dash-nav-item').forEach(i => i.classList.remove('active'));
    this.classList.add('active');
  });
});

// ── Price Range Filter ──────────────────────────────────────
const rangeSlider = document.querySelector('.range-slider');
const priceMax = document.querySelector('.price-range-values span:last-child');
if (rangeSlider && priceMax) {
  rangeSlider.addEventListener('input', function() {
    const val = parseInt(this.value);
    priceMax.textContent = new Intl.NumberFormat('vi-VN').format(val) + '₫';
  });
}

// ── Modal Click Outside to Close ───────────────────────────
document.getElementById('bid-modal-overlay')?.addEventListener('click', function(e) {
  if (e.target === this) closeBidModal();
});

// ── Keyboard Shortcuts ──────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeBidModal();
    closeMobileNav();
  }
});

// ── Tracking Input Demo ─────────────────────────────────────
const trackingInput = document.getElementById('tracking-input');
if (trackingInput && !trackingInput.value) {
  trackingInput.placeholder = 'Ví dụ: JVP-2026-001234';
}

// ── Dynamic "Just Bid" Notifications ───────────────────────
const bidAlerts = [
  'nguyenminh*** vừa đặt giá 3,250,000₫',
  'tranhuong*** vừa đặt giá 3,300,000₫',
  'phando*** vừa đặt giá 3,350,000₫',
  'minhtu*** vừa đặt giá 3,400,000₫',
];
let alertIdx = 0;

function showBidAlert() {
  const page = document.getElementById('page-auction-detail');
  if (page && page.classList.contains('active')) {
    const msg = bidAlerts[alertIdx % bidAlerts.length];
    showToast(`🔨 ${msg}`);
    alertIdx++;
  }
}

// Show random bid alerts on auction detail page
setInterval(showBidAlert, 15000);

// ── Smooth Counter Animation ────────────────────────────────
function animateCounter(el, target, duration = 2000) {
  let start = 0;
  const increment = target / (duration / 16);
  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      el.textContent = target.toLocaleString('vi-VN');
      clearInterval(timer);
      return;
    }
    el.textContent = Math.floor(start).toLocaleString('vi-VN');
  }, 16);
}

// Animate stats when visible
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const text = el.textContent;
      if (text.includes('K+')) {
        const num = parseFloat(text) * 1000;
        // Don't animate text with K+ as it breaks format
      }
      statObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.why-stat-num').forEach(el => statObserver.observe(el));

// ── Product Card Hover Sound Effect (Visual) ────────────────
document.querySelectorAll('.auction-card, .product-card').forEach(card => {
  card.addEventListener('mouseenter', function() {
    this.style.borderColor = 'rgba(196,30,58,0.15)';
  });
  card.addEventListener('mouseleave', function() {
    this.style.borderColor = '';
  });
});

// ── Initialize ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Make sure home page is visible
  navigate('home');

  // Show welcome toast
  setTimeout(() => {
    showToast('🇯🇵 Chào mừng đến với JapanVip – Gia Dụng Nhật Bản Cao Cấp!', 4000);
  }, 1000);

  // Setup animations
  setupAnimations();

  console.log('%c JapanVip 🇯🇵 ', 'background: #c41e3a; color: white; font-size: 14px; font-weight: bold; padding: 8px 16px; border-radius: 4px;');
  console.log('%c Premium Japanese Marketplace Platform', 'color: #c41e3a; font-size: 12px;');
});

// ── Add CSS animation for bid update ───────────────────────
const style = document.createElement('style');
style.textContent = `
  @keyframes bidUpdate {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); color: #059669; }
    100% { transform: scale(1); }
  }
  @keyframes livePulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .loading-spin {
    display: inline-block;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
